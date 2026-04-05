const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const _path = require('path');
const cors = require('cors');
const QRCode = require('qrcode');
const Tesseract = require('tesseract.js');

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

        // Optional OCR Integration
        let extractedText = '';
        try {
            // Tesseract mostly works with images. For PDF, it might need preprocessing.
            const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
            extractedText = text.trim();
        } catch (error) {
            console.error('OCR skip or failed (expected if PDF without ghostscript):', error.message);
        }

        // Save to our simulated blockchain structure
        blockchainStorage[fileId] = {
            id: fileId,
            hash: fileHash,
            filename: req.file.originalname,
            extractedText: extractedText,
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
        const storedRec = Object.values(blockchainStorage).find(p => p.hash === currentHash);

        // Optional OCR on the verification document
        let currentText = '';
        try {
            const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
            currentText = text.trim();
        } catch (error) {
            // Ignore if it fails OCR
        }
        
        // Remove the temporary file used for verification
        fs.unlinkSync(filePath);

        if (storedRec) {
            let ocrMatchMessage = null;
            if (storedRec.extractedText && currentText) {
                if (storedRec.extractedText === currentText) {
                    ocrMatchMessage = "Data match confirmed";
                } else {
                    ocrMatchMessage = "Valid with minor changes";
                }
            } else if (currentText && !storedRec.extractedText) {
                 ocrMatchMessage = "Data mismatch detected";
            }

            return res.json({
                status: 'VERIFIED',
                message: 'Document matched with blockchain record',
                ocrStatus: ocrMatchMessage,
                fileId: storedRec.id
            });
        }

        // If Hash does not match entirely but maybe OCR does? 
        // We'll consider it TAMPERED if hash fails, but we can check OCR mismatch
        const possibleRec = Object.values(blockchainStorage).find(p => p.filename === req.file.originalname);
        
        let ocrStatusForTampering = null;
        if (possibleRec && possibleRec.extractedText !== currentText && currentText) {
             ocrStatusForTampering = "Data mismatch detected";
        }

        return res.json({
            status: 'TAMPERED',
            message: 'Document hash does not match original record.',
            ocrStatus: ocrStatusForTampering
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
