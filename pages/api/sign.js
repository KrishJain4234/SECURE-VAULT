import { signDocument } from '../../lib/crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { data, privateKey } = req.body;
    const signature = signDocument(data, privateKey);
    res.status(200).json({ signature });
  } catch (error) {
    res.status(500).json({ message: 'Signing failed', error: error.message });
  }
}