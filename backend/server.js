const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const _path = require('path');
const cors = require('cors');
const QRCode = require('qrcode');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');

const SECRET_KEY = "my_super_secure_key";

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

const generateSignature = (hash) => {
    return crypto
        .createHmac("sha256", SECRET_KEY)
        .update(hash)
        .digest("hex");
};

app.post('/upload', upload.single('document'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const filePath = req.file.path;
        const fileHash = await calculateHash(filePath);
        const fileId = crypto.randomUUID();
        const username = req.body.username || "Anonymous";

        // 🔥 Generate signature
        const signature = generateSignature(fileHash);

        // 🔥 Blockchain linking
        const lastBlock = Object.values(blockchainStorage).slice(-1)[0];
        const previousHash = lastBlock ? lastBlock.hash : "GENESIS";
        const blockNumber = Object.keys(blockchainStorage).length + 1;

        // Optional text extraction Integration
        let keyFields = [];
        try {
            console.log(`[Upload] Extracting key fields for ${req.file.originalname}...`);
            let text = '';
            const isPDF = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
            if (isPDF) {
                const dataBuffer = fs.readFileSync(filePath);
                const parser = new PDFParse({ data: dataBuffer });
                const data = await parser.getText();
                await parser.destroy();
                text = data.text;
            } else {
                const result = await Tesseract.recognize(filePath, 'eng');
                text = result.data.text;
            }
            
            // Extract potential ID numbers (alphanumeric, at least 5 chars)
            const idMatches = text.match(/\b(?:\d{5,}|[a-zA-Z0-9-]{6,})\b/g) || [];
            
            // Extract potential Names (capitalized words like "John Doe")
            const nameMatches = text.match(/\b[A-Z][a-z]+(?: [A-Z][a-z]+){1,2}\b/g) || [];

            // Extract potential Dates
            const dateMatches = text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi) || [];
            
            // Merge and normalize text by removing spaces and case sensitivity
            keyFields = [...idMatches, ...nameMatches, ...dateMatches]
                 .map(k => k.replace(/\s+/g, '').toLowerCase())
                 .filter(k => k.length > 3); // filter out tiny garbage
                 
            req.normalizedText = text.replace(/\s+/g, '').toLowerCase();
                 
            console.log(`[Upload] Extracted Key Fields:`, keyFields);
        } catch (error) {
            console.error('[Upload] OCR failed (likely not an image):', error.message);
        }

        // Save to our simulated blockchain structure
        blockchainStorage[fileId] = {
            id: fileId,
            hash: fileHash,
            signature: signature, // 🔥 NEW
            previousHash: previousHash, // 🔥 NEW
            blockNumber: blockNumber, // 🔥 NEW
            filename: req.file.originalname,
            username: username,
            keyFields: keyFields,
            normalizedText: req.normalizedText || "",
            timestamp: new Date().toISOString()
        };
        saveStorage();

        res.json({
            message: 'File successfully uploaded and anchored',
            fileId,
            hash: fileHash
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/verify', upload.single('document'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No document provided' });

    try {
        const filePath = req.file.path;
        const currentHash = await calculateHash(filePath);
        const newSignature = generateSignature(currentHash);

        // Find the record matching the hash
        const storedRecs = Object.values(blockchainStorage);
        const exactMatch = storedRecs.find(
            p => p.hash === currentHash && p.signature === newSignature
        );

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
                const dataBuffer = fs.readFileSync(filePath);
                const parser = new PDFParse({ data: dataBuffer });
                const data = await parser.getText();
                await parser.destroy();
                text = data.text;
            } else {
                const result = await Tesseract.recognize(filePath, 'eng');
                text = result.data.text;
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
                if (rec.keyFields && rec.keyFields.length > 0) {
                    let matchCount = 0;
                    for (const field of rec.keyFields) {
                        if (currentText.includes(field)) {
                            matchCount++;
                        }
                    }
                    
                    const ratio = matchCount / rec.keyFields.length;
                    
                    if (ratio === 1) {
                        isVerified = true;
                        matchedId = rec.id;
                        console.log(`[Verify] PERFECT TEXT MATCH! Key fields matched completely.`);
                        break;
                    } else if (ratio >= 0.5) {
                        isValidMinor = true;
                        if (!matchedId) matchedId = rec.id;
                    }
                }
                
                // Compare overall normalized text for small text differences
                if (rec.normalizedText && Math.abs(rec.normalizedText.length - currentText.length) < 50) {
                    isValidMinor = true;
                    if (!matchedId) matchedId = rec.id;
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

app.get('/generate-qr', async (req, res) => {
    const { fileId } = req.query;
    
    if (!fileId || !blockchainStorage[fileId]) {
        return res.status(404).json({ error: 'File ID not found in simulated blockchain' });
    }

    try {
        // Pointing to a generic dashboard or verification URL
        const verifyUrl = `${req.protocol}://${req.get('host')}/info?fileId=${fileId}`;
        const qrCodeImage = await QRCode.toDataURL(verifyUrl);

        res.send(`<img src="${qrCodeImage}" alt="QR Code" />`);
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
         blockNumber: record.blockNumber,
         previousHash: record.previousHash,
         timestamp: record.timestamp,
         filename: record.filename || '',
         keyFields: record.keyFields || [],
         normalizedText: record.normalizedText || ''
     });
});

app.get('/ledger/:username', (req, res) => {
    const { username } = req.params;

    const userDocs = Object.values(blockchainStorage).filter(
        doc => doc.username === username
    );

    res.json(userDocs);
});

app.listen(PORT, () => console.log(`Blockchain prototype API running on http://localhost:${PORT}`));
