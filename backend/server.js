const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const _path = require('path');
const cors = require('cors');
const os = require('os');
const ethSigUtil = require('@metamask/eth-sig-util');
const axios = require('axios');

// Prevent native worker crashes or unhandled rejections from taking down the API server
process.on('uncaughtException', (err) => {
    console.error('[Global Error] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Global Error] Unhandled Rejection at:', promise, 'reason:', reason);
});
const pythonExecutable = os.platform() === 'win32'
    ? _path.join(__dirname, 'venv', 'Scripts', 'python.exe')
    : _path.join(__dirname, 'venv', 'bin', 'python');
const Tesseract = require('tesseract.js');
const stringSimilarity = require('string-similarity');
const { PDFParse } = require('pdf-parse');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Setup certificates directory
const certificatesDir = _path.join(__dirname, 'certificates');
if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
}
app.use('/certificates', express.static(certificatesDir));

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
                    timeout: 4000, // 4-second timeout to fail-fast
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=${fd._boundary}`,
                        pinata_api_key: '55dbd419da653685ca05',
                        pinata_secret_api_key: process.env.PINATA_SECRET || '1533eae3308e666d9ad8ec7ae2dc5641718c8f40fd601906f1595f50fa54b756',
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



// Function to generate professional PDF certificate using PDFKit
const createCertificatePDF = async ({ certificateId, studentName, certificateTitle, course, organization, issueDate, description, timestamp, verificationUrl, pdfPath }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const qrBuffer = await QRCode.toBuffer(verificationUrl, { width: 140, margin: 1 });

            // A4 Landscape: 841.89 x 595.28 points
            const doc = new PDFDocument({
                size: 'A4',
                layout: 'landscape',
                margin: 0
            });

            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);

            const width = doc.page.width;
            const height = doc.page.height;

            // Background fill
            doc.rect(0, 0, width, height).fill('#080a10');

            // Outer cyan border
            doc.rect(20, 20, width - 40, height - 40)
               .lineWidth(3)
               .stroke('#00f3ff');

            // Inner pink border
            doc.rect(28, 28, width - 56, height - 56)
               .lineWidth(1)
               .stroke('#ff0055');

            // Corner decorative accents
            const drawCorner = (x, y) => {
                doc.rect(x, y, 15, 15).fill('#00f3ff');
            };
            drawCorner(20, 20);
            drawCorner(width - 35, 20);
            drawCorner(20, height - 35);
            drawCorner(width - 35, height - 35);

            // Header Title
            doc.fillColor('#00f3ff')
               .fontSize(16)
               .font('Helvetica-Bold')
               .text('[ SECURE-VAULT DIGITAL CERTIFICATE SYSTEM ]', 0, 50, { align: 'center' });

            doc.fillColor('#888888')
               .fontSize(10)
               .font('Helvetica')
               .text('GOVERNMENT & INSTITUTIONAL IMMUTABLE CERTIFICATE NOTARIZATION', 0, 72, { align: 'center' });

            // Main Certificate Header
            doc.fillColor('#ffffff')
               .fontSize(28)
               .font('Helvetica-Bold')
               .text('CERTIFICATE OF ACHIEVEMENT', 0, 110, { align: 'center' });

            doc.fillColor('#ff0055')
               .fontSize(12)
               .font('Helvetica')
               .text('THIS IS PROUDLY PRESENTED TO', 0, 150, { align: 'center' });

            // Student Name
            doc.fillColor('#00f3ff')
               .fontSize(32)
               .font('Helvetica-Bold')
               .text(studentName.toUpperCase(), 0, 175, { align: 'center' });

            // Line separator under student name
            doc.moveTo(width / 2 - 150, 215)
               .lineTo(width / 2 + 150, 215)
               .lineWidth(1.5)
               .stroke('#00f3ff');

            doc.fillColor('#cccccc')
               .fontSize(12)
               .font('Helvetica')
               .text('FOR SUCCESSFUL COMPLETION AND RECOGNITION OF', 0, 230, { align: 'center' });

            // Certificate Title & Course
            doc.fillColor('#ffffff')
               .fontSize(22)
               .font('Helvetica-Bold')
               .text(certificateTitle, 0, 255, { align: 'center' });

            if (course) {
                doc.fillColor('#ff0055')
                   .fontSize(14)
                   .font('Helvetica-Bold')
                   .text(`PROGRAM / COURSE: ${course.toUpperCase()}`, 0, 285, { align: 'center' });
            }

            if (description) {
                doc.fillColor('#aaaaaa')
                   .fontSize(11)
                   .font('Helvetica-Oblique')
                   .text(`"${description}"`, 80, 315, { align: 'center', width: width - 160 });
            }

            // Issuing Organization
            doc.fillColor('#00f3ff')
               .fontSize(14)
               .font('Helvetica-Bold')
               .text(`ISSUED BY: ${organization.toUpperCase()}`, 0, 365, { align: 'center' });

            doc.fillColor('#888888')
               .fontSize(11)
               .font('Helvetica')
               .text(`ISSUE DATE: ${issueDate}`, 0, 385, { align: 'center' });

            // Bottom Footer metadata box
            doc.rect(45, height - 145, width - 230, 95)
               .fillAndStroke('rgba(0, 243, 255, 0.05)', '#00f3ff');

            doc.fillColor('#ff0055')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('SECURE-VAULT VERIFICATION ANCHOR', 60, height - 135);

            doc.fillColor('#ffffff')
               .fontSize(9)
               .font('Helvetica')
               .text(`CERTIFICATE ID: ${certificateId}`, 60, height - 118)
               .text(`TIMESTAMP: ${timestamp}`, 60, height - 104)
               .text(`ISSUER NODE: OFFICIAL GOVT / ACADEMIC VAULT`, 60, height - 90);

            doc.fillColor('#888888')
               .fontSize(8)
               .font('Helvetica')
               .text(`VERIFY AT: ${verificationUrl}`, 60, height - 74);

            // Embed QR Code
            doc.image(qrBuffer, width - 170, height - 150, { width: 110, height: 110 });

            doc.end();

            stream.on('finish', () => resolve(pdfPath));
            stream.on('error', reject);

        } catch (err) {
            reject(err);
        }
    });
};

// POST /generate-certificate
app.post('/generate-certificate', async (req, res) => {
    try {
        const { studentName, certificateTitle, course, organization, issueDate, description } = req.body;
        if (!studentName || !certificateTitle || !organization) {
            return res.status(400).json({ error: 'Missing required fields: studentName, certificateTitle, organization' });
        }

        // Generate Certificate ID: e.g., SV-2026-0001
        const year = new Date().getFullYear();
        const certKeys = Object.keys(blockchainStorage).filter(k => k.startsWith(`SV-${year}-`));
        const nextNum = String(certKeys.length + 1).padStart(4, '0');
        const certificateId = `SV-${year}-${nextNum}`;

        const timestamp = new Date().toISOString();
        const verificationUrl = `http://localhost:5173/verify/${certificateId}`;
        const pdfFileName = `${certificateId}.pdf`;
        const pdfPath = _path.join(certificatesDir, pdfFileName);

        // Generate PDF file
        await createCertificatePDF({
            certificateId,
            studentName,
            certificateTitle,
            course,
            organization,
            issueDate: issueDate || new Date().toISOString().split('T')[0],
            description,
            timestamp,
            verificationUrl,
            pdfPath
        });

        // Compute SHA-256 hash of generated PDF
        const pdfHash = await calculateHash(pdfPath);
        const certificateUrl = `http://localhost:5000/certificates/${pdfFileName}`;

        // Save record to database.json
        const certRecord = {
            id: certificateId,
            certificateId: certificateId,
            type: 'certificate',
            studentName,
            certificateTitle,
            course: course || '',
            organization,
            issueDate: issueDate || new Date().toISOString().split('T')[0],
            description: description || '',
            hash: pdfHash,
            timestamp,
            filename: pdfFileName,
            pdfPath: `certificates/${pdfFileName}`,
            certificateUrl,
            verificationUrl,
            ipfsCID: 'none'
        };

        blockchainStorage[certificateId] = certRecord;
        saveStorage();

        console.log(`[Certificate] Successfully generated and anchored certificate: ${certificateId}`);

        res.json({
            success: true,
            certificateId,
            certificateUrl,
            hash: pdfHash
        });

    } catch (error) {
        console.error('[Certificate] Error generating certificate:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /certificate/:certificateId
app.get('/certificate/:certificateId', (req, res) => {
    const certId = req.params.certificateId;
    const record = blockchainStorage[certId];
    if (!record) {
        return res.status(404).json({ error: 'Certificate not found' });
    }
    res.json({
        success: true,
        certificate: record
    });
});

// GET /verify/:certificateId
app.get('/verify/:certificateId', (req, res) => {
    const searchId = req.params.certificateId;
    let record = blockchainStorage[searchId];

    if (!record) {
        record = Object.values(blockchainStorage).find(r => r.hash === searchId || r.certificateId === searchId || r.id === searchId);
    }

    if (!record) {
        return res.status(404).json({
            status: 'INVALID CERTIFICATE',
            valid: false,
            message: 'Certificate ID or Document Hash not found in vault registry.'
        });
    }

    res.json({
        status: 'VERIFIED',
        valid: true,
        certificateId: record.certificateId || record.id,
        studentName: record.studentName || null,
        certificateTitle: record.certificateTitle || record.filename || 'Document Record',
        course: record.course || null,
        organization: record.organization || 'SecureVault Anchor Node',
        issueDate: record.issueDate || null,
        timestamp: record.timestamp,
        hash: record.hash,
        certificateUrl: record.certificateUrl || null,
        ipfsCID: record.ipfsCID || 'none',
        type: record.type || 'document'
    });
});

app.get('/info', (req, res) => {
    const fileId = req.query.fileId;
    const record = blockchainStorage[fileId] || Object.values(blockchainStorage).find(r => r.certificateId === fileId || r.hash === fileId);
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({
        status: "Blockchain Record",
        hash: record.hash,
        timestamp: record.timestamp,
        filename: record.filename || '',
        keyFields: record.keyFields || [],
        normalizedText: record.normalizedText || '',
        ipfsCID: record.ipfsCID || 'none',
        encryptedKeyPayload: record.encryptedKeyPayload || null,
        certificateId: record.certificateId || record.id,
        studentName: record.studentName || null,
        certificateTitle: record.certificateTitle || null,
        course: record.course || null,
        organization: record.organization || null,
        issueDate: record.issueDate || null,
        certificateUrl: record.certificateUrl || null,
        type: record.type || 'document'
    });
});

app.listen(PORT, () => console.log(`Blockchain prototype API running on http://localhost:${PORT}`));
