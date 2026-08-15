# SECURE-VAULT — Prototype Status Brief

> **Purpose:** Quick-reference for AI assistants or collaborators to understand the *current, actual state* of this prototype — what works, what is broken, and what is missing.

---

## What This Project Is

**SecureVault** is a document notarization + integrity verification prototype. It lets authorised issuers upload documents and later lets anyone verify whether a document has been tampered with.

Core idea:
- Compute a **SHA-256 hash** of the document → store it as the fingerprint
- Run **OCR** on the document → store normalized text for fuzzy matching
- **Encrypt** the file with AES-256-GCM, wrap the key using the issuer's MetaMask public key
- Pin the **encrypted blob to IPFS** (Pinata)
- Verify later by exact hash match or text similarity (Dice coefficient ≥ 0.95)
- QR code on the document deep-links to a public verification page

---

## Current Tech Stack (Active Code Only)

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | Vite + React 19 SPA (`src/`) | ✅ Running |
| Backend | Node.js + Express 5 (`backend/server.js`) | ✅ Running |
| OCR (JS) | Tesseract.js (in-process, confidence-gated) | ✅ Works |
| OCR (Python) | OpenCV + OCR.space API + Ollama qwen3:4b (`backend/ocr_processor.py`) | ✅ Works (if Ollama running) |
| Storage | `backend/database.json` (flat-file JSON, NOT a real blockchain) | ✅ Works |
| IPFS | Pinata Cloud (4s timeout) → local mock fallback (`backend/uploads/ipfs/`) | ✅ Works |
| Encryption | AES-256-GCM (Node crypto) + x25519-xsalsa20-poly1305 key wrap (eth-sig-util) | ⚠️ Broken on modern MetaMask |
| Smart Contract | `contracts/DocumentVault.sol` (Solidity, Hardhat) | ❌ Disconnected — never called |

---

## What Actually Works (Prototype Demo)

1. **Upload flow** — Connect MetaMask → select file → backend hashes + OCRs + encrypts → stores record in `database.json` → returns fileId + hash + IPFS CID
2. **Verify flow** — Upload file → backend tries exact hash match → falls back to OCR + string similarity → returns `VERIFIED` / `VALID (Minor Changes Detected)` / `TAMPERED`
3. **Fetch & Decrypt** — Enter fileId → MetaMask decrypts AES key → download decrypted PDF
4. **Public verification page** — `/verify/:documentId` — fetches record from backend, shows hash + timestamp + issuer

---

## Critical Broken / Blocked Things

| # | Problem | Impact |
|---|---------|--------|
| 1 | `eth_getEncryptionPublicKey` & `eth_decrypt` **removed in MetaMask v11** | Entire upload encryption + decrypt flow is broken on modern MetaMask |
| 2 | Backend API URL **hardcoded to `http://localhost:5000`** in all frontend files | Cannot deploy frontend anywhere |
| 3 | Pinata API key & OCR.space API key **hardcoded in source code** | Security risk; must move to env vars |
| 4 | **No server-side auth** — wallet whitelist is client-side JS only | Anyone can bypass issuer restriction |
| 5 | **CORS fully open** (`app.use(cors())`) | Any origin can call the backend |
| 6 | Smart contract layer is **100% dead code** — the "blockchain" is a JSON file | Misleading to users/stakeholders |
| 7 | Navigation is **state-based, not URL-based** — deep links to `/upload`, `/verify` etc. don't work | Poor UX; breaks sharing |
| 8 | `normalizedText` (full document content) returned by unauthenticated `GET /info` | Data leakage |
| 9 | **No `requirements.txt`** for Python OCR dependencies | Manual setup required |
| 10 | **No rate limiting** — easy to DoS or exhaust OCR.space free quota | Production blocker |

---

## What Does NOT Exist Yet (Missing Features)

- ❌ Certificate PDF generation (no template, no endpoint — `qrcode` npm package installed but never called)
- ❌ Real blockchain integration (contract written, never wired to the active app)
- ❌ Server-side audit trail (current "audit" is `localStorage` only — not shared between devices)
- ❌ Environment variable setup (`dotenv`, `.env` files, `VITE_` prefix vars)
- ❌ Any authentication / session management on the backend
- ❌ File type validation on upload
- ❌ Rate limiting
- ❌ URL-driven routing for main pages

---

## Folder Map (What Matters vs. Dead Code)

```
SECURE-VAULT/
├── src/                  ← ACTIVE: Vite/React frontend
├── backend/              ← ACTIVE: Express API + Python OCR
│   ├── server.js         ← all backend logic (387 LOC)
│   ├── ocr_processor.py  ← heavy OCR (OpenCV + OCR.space + Ollama)
│   └── database.json     ← flat-file "blockchain" store
├── contracts/            ← DEAD: Solidity contract (never called)
├── lib/                  ← DEAD: Next.js-era helpers
├── pages/                ← DEAD: Old Next.js pages
├── components/           ← DEAD: Old Next.js components
├── scripts/              ← DEAD: Hardhat deploy script
└── styles/               ← DEAD: Next.js global CSS
```

---

## Ports

| Service | Port |
|---------|------|
| Vite dev server (frontend) | `5173` |
| Express backend | `5000` |
| Ollama LLM (local, optional) | `11434` |

---

## How to Run Locally

```bash
# Terminal 1 — Backend
cd backend
node server.js

# Terminal 2 — Frontend
npm run dev

# Optional: Ollama for LLM OCR correction
ollama run qwen3:4b
```

---

## 🎯 Presentation Technical Q&A Cheat Sheet

1. **Q: What is the backend technology stack?**
   - **A:** **Node.js** (JavaScript runtime) + **Express.js** (REST API framework), paired with **Python** (OpenCV/OCR) and **PDFKit** for PDF generation.

2. **Q: How does certificate tampering detection work?**
   - **A:** SHA-256 cryptographic hashing. Even a single character or pixel modification changes the SHA-256 digest completely, failing verification.

3. **Q: Why use QR codes on certificates?**
   - **A:** The QR code embeds a deep link (`/verify/SV-2026-XXXX`). Scanning it instantly opens the public verification portal to validate the certificate's authenticity against stored records.

4. **Q: Why is OCR included if certificates are digital PDFs?**
   - **A:** OCR acts as a secondary verification fallback for scanned physical certificate printouts or images where digital PDF hashes cannot match.

5. **Q: How are certificates stored securely?**
   - **A:** Certificate PDFs are saved on disk (`/certificates`), metadata is stored with SHA-256 fingerprints in `database.json`, and encrypted document payloads are pinned to IPFS (Pinata).

---

*Last updated: 2026-08-15 | Prototype stage — not production-ready*
