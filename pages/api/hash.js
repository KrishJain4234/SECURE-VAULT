import { generateHash } from '../../lib/crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { data } = req.body;
    const hash = generateHash(data);
    res.status(200).json({ hash });
  } catch (error) {
    res.status(500).json({ message: 'Hash generation failed', error: error.message });
  }
}