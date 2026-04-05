# eVault - Secure Document Storage

A decentralized application for secure document storage using blockchain and IPFS.

## Features

- Upload documents to IPFS
- Store document hashes on Ethereum blockchain
- Verify document authenticity
- OCR text extraction from images
- Government document management

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env.local`

3. Compile smart contracts:
   ```bash
   npm run compile
   ```

4. Deploy contracts:
   ```bash
   npm run deploy
   ```

5. Run the application:
   ```bash
   npm run dev
   ```

## Project Structure

- `contracts/` - Solidity smart contracts
- `scripts/` - Deployment scripts
- `pages/` - Next.js pages and API routes
- `components/` - React components
- `lib/` - Core logic and utilities
- `styles/` - CSS styles

## Technologies

- Next.js
- Ethereum (Hardhat)
- IPFS (Pinata)
- Tesseract.js (OCR)
- Ethers.js