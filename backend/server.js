const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const _path = require('path');
const cors = require('cors');
const QRCode = require('qrcode');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');

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
            console.log(`[Upload] Extracting key fields for ${req.file.originalname}...`);
            let text = '';
            const isPDF = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
            if (isPDF) {
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdfParse(dataBuffer);
                text = data.text;
            } else {
                const result = await Tesseract.recognize(filePath, 'eng');
                text = result.data.text;
            }
            
            // Extract potential ID numbers (alphanumeric, at least 5 chars)
            const idMatches = text.match(/\b(?:\d{5,}|[a-zA-Z0-9-]{6,})\b/g) || [];
            
            // Extract potential Names (capitalized words like "John Doe")
            const nameMatches = text.match(/\b[A-Z][a-z]+(?: [A-Z][a-z]+){1,2}\b/g) || [];
            
            // Merge and normalize (lowercase, trimmed)
            keyFields = [...idMatches, ...nameMatches]
                 .map(k => k.trim().toLowerCase())
                 .filter(k => k.length > 3); // filter out tiny garbage
                 
            console.log(`[Upload] Extracted Key Fields:`, keyFields);
        } catch (error) {
            console.error('[Upload] OCR failed (likely not an image):', error.message);
        }

        // Save to our simulated blockchain structure
        blockchainStorage[fileId] = {
            id: fileId,
            hash: fileHash,
            filename: req.file.originalname,
            keyFields: keyFields,
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
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdfParse(dataBuffer);
                text = data.text;
            } else {
                const result = await Tesseract.recognize(filePath, 'eng');
                text = result.data.text;
            }
            // Normalize spaces and convert to lower case for flexible inclusion check
            currentText = text.replace(/\s+/g, ' ').toLowerCase();
        } catch (error) {
            console.error('[Verify] Fallback text extraction failed:', error.message);
        }
        
        fs.unlinkSync(filePath); // Cleanup

        let foundMinorMatch = false;
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
                    
                    // If we matched at least 1 or 2 meaningful extracted fields, it's a minor change
                    const threshold = Math.min(2, Math.max(1, Math.floor(rec.keyFields.length / 3)));
                    if (matchCount >= threshold && matchCount > 0) {
                        foundMinorMatch = true;
                        matchedId = rec.id;
                        console.log(`[Verify] Minor match found! Matched ${matchCount} out of ${rec.keyFields.length} key fields.`);
                        break;
                    }
                }
            }
        }

        if (foundMinorMatch) {
            return res.json({
                status: 'VALID (Minor Changes Detected)',
                message: 'Hash mismatched but key OCR data matched. Indicates resizing or compression.',
                fileId: matchedId
            });
        }

        return res.json({
            status: 'TAMPERED',
            message: 'Document hash and key contents do NOT match any authentic record.',
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
         timestamp: record.timestamp
     });
});

app.listen(PORT, () => console.log(`Blockchain prototype API running on http://localhost:${PORT}`));
