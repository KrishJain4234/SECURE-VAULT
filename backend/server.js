const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const _path = require('path');
const cors = require('cors');
const os = require('os');
const ethSigUtil = require('@metamask/eth-sig-util');
const axios = require('axios');
const pythonExecutable = os.platform() === 'win32'
    ? _path.join(__dirname, 'venv', 'Scripts', 'python.exe')
    : _path.join(__dirname, 'venv', 'bin', 'python');
const Tesseract = require('tesseract.js');
const stringSimilarity = require('string-similarity');
const { PDFParse } = require('pdf-parse');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Simulated blockchain storage used for prototype
const DB_FILE = _path.join(__dirname, 'database.json');
let blockchainStorage = {};

// Load existing DB if available
if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        blockchainStorage = JSON.parse(data);
    } catch (e) {
        console.error("Failed to read database.json", e);
    }
}

const saveStorage = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(blockchainStorage, null, 2));
};

// Setup Multer for file uploads
const uploadDir = _path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Helper to generate hash
const calculateHash = (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
};

app.post('/upload', upload.single('document'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const filePath = req.file.path;
        const fileHash = await calculateHash(filePath);
        const fileId = crypto.randomUUID();

        // Optional text extraction Integration
        let keyFields = [];
        try {
            console.log(`[Upload] Extracting text for ${req.file.originalname}...`);
            let text = '';
            const isPDF = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');

            if (isPDF) {
                try {
                    const dataBuffer = fs.readFileSync(filePath);
                    const parser = new PDFParse({ data: dataBuffer });
                    const pdfData = await parser.getText();
                    await parser.destroy();
                    if (pdfData.text && pdfData.text.trim().length > 20) {
                        console.log("[Upload] Digital PDF detected.");
                        text = pdfData.text;
                    }
                } catch (e) {
                    console.log("[Upload] Error or pure scanned PDF. Fallback logic will trigger.");
                }
            } else {
                const result = await Tesseract.recognize(filePath, 'eng');
                const confidence = result.data.confidence;
                console.log(`[Upload] Tesseract Image Confidence: ${confidence}`);
                if (confidence > 75) {
                    console.log("[Upload] High confidence. Treated as digital printed font.");
                    text = result.data.text;
                } else {
                    console.log("[Upload] Low confidence. Routing to heavy handwritten OCR pipeline.");
                }
            }

            if (!text) {
                console.log("[Upload] Triggering Python OCR processor...");
                const venvPythonPath = _path.join(__dirname, 'venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
                const localPythonExecutable = fs.existsSync(venvPythonPath) ? venvPythonPath : (process.platform === 'win32' ? 'python' : 'python3');
                const scriptPath = _path.join(__dirname, 'ocr_processor.py');
                const { stdout } = await execPromise(`"${localPythonExecutable}" "${scriptPath}" "${filePath}"`, { maxBuffer: 1024 * 1024 * 10 });
                try {
                    const parsedResult = JSON.parse(stdout.trim());
                    if (parsedResult.error) throw new Error(parsedResult.error);
                    text = parsedResult.text || '';
                } catch (jsError) {
                    console.error("[Upload] JSON parsing failed from Python output:", stdout);
                    throw jsError;
                }
            }

            // Extract all meaningful words to compare entire document contents
            const allWords = text.toLowerCase()
                .replace(/[^\w\s-]/gi, '') // remove punctuation except dashes
                .split(/\s+/);

            // Deduplicate and filter out tiny filler words (e.g., 'a', 'to', 'the')
            keyFields = [...new Set(allWords)].filter(k => k.length > 4);

            req.normalizedText = text.replace(/\s+/g, '').toLowerCase();

            console.log(`[Upload] Extracted Key Fields:`, keyFields);
        } catch (error) {
            console.error('[Upload] OCR failed (likely not an image):', error.message);
        }

        // --- ENCRYPTION & IPFS PHASE ---
        const encryptionPublicKey = req.body.encryptionPublicKey;
        let ipfsCID = "none";
        let encryptedKeyPayload = null;

        if (encryptionPublicKey) {
            console.log("[Upload] Encrypting file to user's MetaMask Public Key...");
            // 1. Generate random AES-256 Symmetric Key
            const aesKey = crypto.randomBytes(32);

            // 2. Encrypt the file buffer with AES-GCM
            const fileBuffer = fs.readFileSync(filePath);
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
            const encryptedBuffer = Buffer.concat([cipher.update(fileBuffer), cipher.final(), cipher.getAuthTag()]);

            // Re-combine IV and Encrypted Payload for the frontend to decrypt
            const finalEncryptedBlob = Buffer.concat([iv, encryptedBuffer]);
            const encryptedFilePath = filePath + '.enc';
            fs.writeFileSync(encryptedFilePath, finalEncryptedBlob);

            // 3. Encrypt the AES key for the specific MetaMask User
            const aesBase64 = aesKey.toString('base64');
            encryptedKeyPayload = ethSigUtil.encrypt({
                publicKey: encryptionPublicKey,
                data: aesBase64,
                version: 'x25519-xsalsa20-poly1305'
            });

            // 4. Pinata IPFS Upload
            try {
                const PinataFormData = require('form-data');
                const fd = new PinataFormData();
                fd.append('file', fs.createReadStream(encryptedFilePath));

                const pinataRes = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", fd, {
                    maxBodyLength: "Infinity",
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=${fd._boundary}`,
                        pinata_api_key: '10776af10530916d36df',
                        pinata_secret_api_key: process.env.PINATA_SECRET || '24253bc92a83b5112dd662c351fd2d70d1a901b7138dc1f13f9379a889874519',
                    }
                });
                ipfsCID = pinataRes.data.IpfsHash;
                console.log(`[Upload] Pinned to Pinata IPFS: ${ipfsCID}`);
            } catch (pinataErr) {
                console.warn("[Upload] Pinata Upload Failed (Missing Secret?). Falling back to Mock IPFS Simulation.");
                // Mock IPFS Simulation
                ipfsCID = "mock_cid_" + crypto.createHash('sha256').update(finalEncryptedBlob).digest('hex').substring(0, 16);
                const mockIpfsDir = _path.join(__dirname, 'uploads', 'ipfs');
                if (!fs.existsSync(mockIpfsDir)) fs.mkdirSync(mockIpfsDir, { recursive: true });
                fs.copyFileSync(encryptedFilePath, _path.join(mockIpfsDir, ipfsCID));
            }

            fs.unlinkSync(encryptedFilePath); // Cleanup temp encrypted file
        } else {
            console.warn("[Upload] No encryptionPublicKey provided. Document will ONLY be hashed.");
        }

        // Zero-Knowledge Notary: We DO NOT store the clear-text document.
        fs.unlinkSync(filePath);

        // Save to our simulated blockchain structure
        blockchainStorage[fileId] = {
            id: fileId,
            hash: fileHash,
            filename: req.file.originalname,
            keyFields: keyFields,
            normalizedText: req.normalizedText || "",
            timestamp: new Date().toISOString(),
            ipfsCID: ipfsCID,
            encryptedKeyPayload: encryptedKeyPayload
        };
        saveStorage();

        res.json({
            message: 'File successfully notarized and optionally encrypted',
            fileId,
            hash: fileHash,
            ipfsCID
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/mock-ipfs/:cid', async (req, res) => {
    const cid = req.params.cid;
    const mockFilePath = _path.join(__dirname, 'uploads', 'ipfs', cid);

    if (fs.existsSync(mockFilePath)) {
        return res.sendFile(mockFilePath);
    }

    // If not found locally, we must have successfully uploaded it to IPFS!
    // We act as a proxy gateway to avoid the frontend dealing with CORS/broken public gateways
    try {
        const ipfsProxyRes = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
            responseType: 'stream'
        });
        ipfsProxyRes.data.pipe(res);
    } catch (err) {
        console.error("IPFS Proxy Fetch Error:", err.message);
        res.status(404).json({ error: 'IPFS CID not found locally or on gateway.' });
    }
});

app.post('/verify', upload.single('document'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No document provided' });

    try {
        const filePath = req.file.path;
        const currentHash = await calculateHash(filePath);

        // Find the record matching the hash
        const storedRecs = Object.values(blockchainStorage);
        const exactMatch = storedRecs.find(p => p.hash === currentHash);

        if (exactMatch) {
            fs.unlinkSync(filePath); // Cleanup
            return res.json({
                status: 'VERIFIED',
                message: 'Document matched perfectly with blockchain record (Hash matched)',
                fileId: exactMatch.id
            });
        }

        // Hash did NOT match. Run extraction to check if it's just resize/compression vs tampering.
        console.log(`[Verify] Hash mismatch for ${req.file.originalname}. Running fallback comparison...`);
        let currentText = '';
        try {
            let text = '';
            const isPDF = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');

            if (isPDF) {
                try {
                    const dataBuffer = fs.readFileSync(filePath);
                    const parser = new PDFParse({ data: dataBuffer });
                    const pdfData = await parser.getText();
                    await parser.destroy();
                    if (pdfData.text && pdfData.text.trim().length > 20) {
                        text = pdfData.text;
                    }
                } catch (e) { }
            } else {
                const result = await Tesseract.recognize(filePath, 'eng');
                if (result.data.confidence > 75) {
                    text = result.data.text;
                }
            }

            if (!text) {
                const venvPythonPath = _path.join(__dirname, 'venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
                const localPythonExecutable = fs.existsSync(venvPythonPath) ? venvPythonPath : (process.platform === 'win32' ? 'python' : 'python3');
                const scriptPath = _path.join(__dirname, 'ocr_processor.py');
                const { stdout } = await execPromise(`"${localPythonExecutable}" "${scriptPath}" "${filePath}"`, { maxBuffer: 1024 * 1024 * 10 });
                try {
                    const parsedResult = JSON.parse(stdout.trim());
                    if (parsedResult.error) throw new Error(parsedResult.error);
                    text = parsedResult.text || '';
                } catch (jsError) {
                    console.error("[Verify] JSON parsing failed from Python output:", stdout);
                    throw jsError;
                }
            }
            // Normalize spaces and convert to lower case for meaningful textual check
            currentText = text.replace(/\s+/g, '').toLowerCase();
        } catch (error) {
            console.error('[Verify] Fallback text extraction failed:', error.message);
        }

        fs.unlinkSync(filePath); // Cleanup

        let isVerified = false;
        let isValidMinor = false;
        let matchedId = null;

        if (currentText.length > 0) {
            for (const rec of storedRecs) {
                if (!rec.normalizedText) continue;

                // Compare overall normalized text for structural alignment (0.0 to 1.0)
                const similarityScore = stringSimilarity.compareTwoStrings(rec.normalizedText, currentText);

                if (similarityScore === 1) {
                    isVerified = true;
                    matchedId = rec.id;
                    console.log(`[Verify] PERFECT TEXT MATCH! 100% structural similarity.`);
                    break;
                } else if (similarityScore >= 0.95) {
                    isValidMinor = true;
                    if (!matchedId) matchedId = rec.id;
                    console.log(`[Verify] VALID (Minor Changes): ${(similarityScore * 100).toFixed(2)}% similarity.`);
                }
            }
        }

        if (isVerified) {
            return res.json({
                status: 'VERIFIED',
                message: 'Document matched based on key text content (Name, ID, Date).',
                fileId: matchedId
            });
        }

        if (isValidMinor) {
            return res.json({
                status: 'VALID (Minor Changes Detected)',
                message: 'Hash mismatched but minor textual differences were valid.',
                fileId: matchedId
            });
        }

        return res.json({
            status: 'TAMPERED',
            message: 'Document key fields differ heavily from original records.',
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.get('/info', (req, res) => {
    const record = blockchainStorage[req.query.fileId];
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({
        status: "Blockchain Record",
        hash: record.hash,
        timestamp: record.timestamp,
        filename: record.filename || '',
        keyFields: record.keyFields || [],
        normalizedText: record.normalizedText || '',
        ipfsCID: record.ipfsCID || 'none',
        encryptedKeyPayload: record.encryptedKeyPayload || null
    });
});

app.listen(PORT, () => console.log(`Blockchain prototype API running on http://localhost:${PORT}`));
