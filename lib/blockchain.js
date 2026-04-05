import { ethers } from 'ethers';
import DocumentVaultABI from '../artifacts/contracts/DocumentVault.sol/DocumentVault.json';

const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_URL || 'http://127.0.0.1:8545');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = process.env.CONTRACT_ADDRESS; // Set after deployment

const contract = new ethers.Contract(contractAddress, DocumentVaultABI.abi, signer);

export const storeDocument = async (hash) => {
  const tx = await contract.storeDocument(hash);
  await tx.wait();
  return tx;
};

export const verifyDocument = async (hash) => {
  return await contract.verifyDocument(hash);
};

export const getDocument = async (hash) => {
  return await contract.getDocument(hash);
};

export const getUserDocuments = async (user) => {
  return await contract.getUserDocuments(user);
};

export const markVerified = async (hash) => {
  const tx = await contract.markVerified(hash);
  await tx.wait();
  return tx;
};