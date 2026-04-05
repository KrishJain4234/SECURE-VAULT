import { verifyDocument } from '../../lib/blockchain';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { hash } = req.body;
    const isVerified = await verifyDocument(hash);
    res.status(200).json({ verified: isVerified });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
}