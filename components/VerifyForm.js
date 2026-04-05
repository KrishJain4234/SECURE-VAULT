import { useState } from 'react';

export default function VerifyForm() {
  const [hash, setHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async () => {
    setVerifying(true);
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash }),
    });
    const data = await response.json();
    setResult(data.verified);
    setVerifying(false);
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Enter document hash"
        value={hash}
        onChange={(e) => setHash(e.target.value)}
      />
      <button onClick={handleVerify} disabled={verifying}>
        {verifying ? 'Verifying...' : 'Verify'}
      </button>
      {result !== null && (
        <p>{result ? 'Document is verified' : 'Document not verified'}</p>
      )}
    </div>
  );
}