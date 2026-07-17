# SECURE-VAULT: Zero-Knowledge Decentralized Document Notarization

SecureVault is an immersive, cyberpunk-themed decentralized application (dApp) designed for secure, tamper-proof document archiving and verification. It integrates **MetaMask**, **IPFS (via Pinata)**, and a **dual-engine OCR pipeline** to notarize documents without storing cleartext files on the server or public cloud.

---

## 🚀 Key Talking Points for Interviews

If an interviewer asks you to explain this project, here are the **4 core design principles** to highlight:

1. **Zero-Knowledge Privacy Architecture:**
   * *Talking Point:* *"My server operates on a zero-knowledge policy. When you upload a document, the server extracts its text and hash, encrypts the file in-memory using a symmetric AES key, and immediately deletes the original document from the server's disk. The raw file is never saved or exposed."*
2. **MetaMask Cryptographic Key Exchange:**
   * *Talking Point:* *"To ensure only the document owner can access the file, we request the user's MetaMask encryption public key (`eth_getEncryptionPublicKey`). We encrypt the AES symmetric key with their public key and upload the encrypted package to IPFS. Only the owner can request MetaMask to decrypt it (`eth_decrypt`) via their private key."*
3. **Fuzzy Document Verification (Tamper Detection):**
   * *Talking Point:* *"Traditional blockchain notarization fails if a user uploads a slightly resized, compressed, or reformatted version of the same PDF because the file hash changes completely. My app solves this by extracting the text layer and performing fuzzy text-similarity matching. If the hash matches, it's 100% verified. If only the text aligns, it flags it as 'Valid with Minor Changes' (e.g. format compression). Otherwise, it flags it as 'TAMPERED'."*
4. **Resilient Fail-Safe Integrations:**
   * *Talking Point:* *"I implemented fail-safe timeouts (e.g. 4 seconds on Pinata upload, 3 seconds on local LLM preprocessing). If external APIs or local models are offline, the app instantly falls back to mock local IPFS storage and raw OCR text, preventing the user interface from hanging or crashing."*

---

## 🛠️ System Architecture & Workflow

Here is how data flows through the application:

### 1. Document Upload / Notarization Flow
```
[User Selects File] 
        ↓
[MetaMask Sign-In & Verification] (Must match AUTHORIZED_WALLETS list)
        ↓
[Fetch MetaMask Encryption Public Key]
        ↓
[Generate Symmetric AES-256 Key] ───→ [Encrypt Document]
        ↓                                      ↓
[Encrypt AES Key with Public Key]        [Upload Encrypted PDF to IPFS]
        ↓                                      ↓
[Store IPFS CID & Encrypted Key Payload] ←─────┘
        ↓
[Hash & Extract Text (PDF-Parse/Tesseract/OpenCV)]
        ↓
[Store Meta Records (Hash, KeyFields, Normalized Text) in database.json]
```

### 2. Verification Flow
```
[User Uploads Document to Verify]
        ↓
[Calculate SHA-256 Hash of Uploaded File]
        ↓
[Check database.json for Exact Hash Match] ──(Match Found)──→ [VERIFIED (100% Perfect Match)]
        ↓ (No Hash Match)
[Run OCR / Text Extraction]
        ↓
[Normalize Extracted Text (Spaces & Cases removed)]
        ↓
[Run String-Similarity match with database.json records]
        ├──────→ (Similarity = 100%) ───→ [VERIFIED (Text Match)]
        ├──────→ (Similarity >= 95%) ───→ [VALID (Minor Format Changes)]
        └──────→ (Similarity < 95%) ────→ [ALERT: DOCUMENT TAMPERED]
```

---

## 💻 Tech Stack

* **Frontend:** React (React 19), Vite, React Router DOM, Tailwind/Vanilla CSS (Cyberpunk glassmorphic design).
* **Backend:** Node.js (Express), Multer (File upload handler).
* **Cryptographic Keys:** Ethers/MetaMask API (`personal_sign`, `eth_getEncryptionPublicKey`, `eth_decrypt`), Web Crypto API (AES-GCM in-browser decryption).
* **Storage:** Decentralized IPFS via Pinata API.
* **OCR Engines:** 
  * Primary: `pdf-parse` (fast digital extraction).
  * Secondary: `Tesseract.js` (browser/Node optical character recognition).
  * Fallback: OpenCV Python script preprocessing (Contrast enhancement, CLAHE filter) coupled with the OCR Space API.

---

## ⚙️ Setup & Configuration

### Prerequisites
* Node.js installed (v18+)
* MetaMask Extension installed on your web browser.

### Configuration
1. **Authorized Wallets:** Add your MetaMask address to the `AUTHORIZED_WALLETS` array in [src/DocumentManager.jsx](file:///c:/Users/kj896/SECURE-VAULT/src/DocumentManager.jsx#L12) to grant yourself upload privileges.
2. **Pinata Credentials:** The Pinata IPFS keys are configured in [backend/server.js](file:///c:/Users/kj896/SECURE-VAULT/backend/server.js#L182) using:
   * `pinata_api_key`
   * `pinata_secret_api_key`

### Installation
1. Install root dependencies:
   ```bash
   npm install
   ```
2. Start the Frontend development server:
   ```bash
   npm run dev
   ```
3. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
4. Start the Backend API server:
   ```bash
   npm start
   ```

---

## 🔒 Security Summary
* **Encrypted at Rest:** Files on IPFS are AES-GCM encrypted and cannot be read without the owner's MetaMask private key.
* **Transient File Processing:** No uploaded cleartext files are saved to the server's disk permanently.
* **Tamper Proof:** The file hash on the registry database guarantees the cryptographic immutability of the uploaded records.
