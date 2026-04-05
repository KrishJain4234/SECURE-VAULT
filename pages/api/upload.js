import { uploadToIPFS } from '../../lib/ipfs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { file } = req.body;
    const ipfsHash = await uploadToIPFS(file);
    res.status(200).json({ ipfsHash });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
}