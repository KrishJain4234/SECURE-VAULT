import { useState } from 'react';
import { Buffer } from 'buffer';

if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

function DownloadDecrypt() {
  const [statusText, setStatusText] = useState('ENTER DOCUMENT ID TO FETCH...');
  const [walletAddress, setWalletAddress] = useState('');
  const [fetchFileId, setFetchFileId] = useState('');
  const [fetchedInfo, setFetchedInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setStatusText("WAITING FOR WALLET APPROVAL...");
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];

        setStatusText("SIGNATURE REQUIRED...");
        await window.ethereum.request({
          method: 'personal_sign',
          params: ["SecureVault authentication request", account]
        });

        setWalletAddress(account);
        setStatusText("WALLET CONNECTED. ENTER A DOCUMENT ID.");
      } catch (error) {
        console.error(error);
        if (error.code === 4001) {
          setStatusText("ERROR: USER REJECTED CONNECTION");
        } else {
          setStatusText("ERROR: WALLET CONNECTION FAILED");
        }
      }
    } else {
      setStatusText("ERROR: METAMASK NOT INSTALLED");
    }
  };

  const handleFetchInfo = async () => {
    if (!fetchFileId.trim()) {
      setStatusText("ERROR: PLEASE ENTER A DOCUMENT ID");
      return;
    }
    setLoading(true);
    setLoadingPhase('QUERYING BLOCKCHAIN LEDGER...');
    setStatusText("QUERYING BLOCKCHAIN LEDGER...");
    try {
      const infoRes = await fetch(`http://localhost:5000/info?fileId=${fetchFileId.trim()}`);
      if (!infoRes.ok) throw new Error("Document ID not found on the blockchain.");
      const infoData = await infoRes.json();
      setFetchedInfo(infoData);
      setStatusText("RECORD FOUND. READY TO DECRYPT.");
    } catch (err) {
      setStatusText("ERROR: " + (err.message || "FETCH FAILED").toUpperCase());
      setFetchedInfo(null);
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  const handleDecryptDownload = async () => {
    if (!fetchedInfo) return;
    setLoading(true);
    setStatusText("FETCHING SECURE ENCRYPTED DOCUMENT...");
    setLoadingPhase("FETCHING SECURE ENCRYPTED DOCUMENT...");
    try {
      // 1. Get encryption key payload
      const infoRes = await fetch(`http://localhost:5000/info?fileId=${fetchFileId.trim()}`);
      if (!infoRes.ok) throw new Error("Document ID not found on the blockchain.");
      const infoData = await infoRes.json();

      if (!infoData.encryptedKeyPayload) {
        setStatusText("ERROR: NO ENCRYPTION PAYLOAD FOUND FOR THIS DOCUMENT");
        setLoading(false);
        return;
      }

      const cid = infoData.ipfsCID;
      if (!cid || cid === 'none') {
        setStatusText("ERROR: NO IPFS CID ASSOCIATED WITH THIS DOCUMENT");
        setLoading(false);
        return;
      }

      // 2. Ask MetaMask to decrypt the AES key
      setStatusText("METAMASK: WAITING FOR DECRYPTION APPROVAL...");
      setLoadingPhase("METAMASK: WAITING FOR DECRYPTION APPROVAL...");

      const payloadHex = window.Buffer.from(
        JSON.stringify(infoData.encryptedKeyPayload),
        'utf8'
      ).toString('hex');

      const decryptedAesBase64 = await window.ethereum.request({
        method: 'eth_decrypt',
        params: [`0x${payloadHex}`, walletAddress],
      });

      if (!decryptedAesBase64) throw new Error("MetaMask returned empty decryption result.");
      console.log("MetaMask decryption successful.");

      // 3. Fetch the encrypted IPFS blob
      setStatusText("IPFS: DOWNLOADING ENCRYPTED BLOB...");
      setLoadingPhase("IPFS: DOWNLOADING ENCRYPTED BLOB...");
      const ipfsUrl = `http://localhost:5000/mock-ipfs/${cid}`;
      const blobRes = await fetch(ipfsUrl);
      if (!blobRes.ok) throw new Error("Failed to fetch IPFS blob.");
      const encryptedBlobArrayBuffer = await blobRes.arrayBuffer();

      // 4. Decrypt the blob with SubtleCrypto
      setStatusText("VAULT: DECRYPTING IN-MEMORY...");
      setLoadingPhase("VAULT: DECRYPTING IN-MEMORY...");
      const finalBuffer = window.Buffer.from(encryptedBlobArrayBuffer);
      const iv = finalBuffer.slice(0, 12);
      const encryptedData = finalBuffer.slice(12);

      const rawAesKey = window.Buffer.from(decryptedAesBase64.trim(), 'base64');
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        rawAesKey,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      const decryptedMimeBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        cryptoKey,
        new Uint8Array(encryptedData)
      );

      // 5. Trigger download
      setStatusText("VAULT: TRIGGERING DOWNLOAD...");
      setLoadingPhase("VAULT: TRIGGERING DOWNLOAD...");
      const decBlob = new window.Blob([decryptedMimeBuffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(decBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DECRYPTED_${fetchFileId.trim()}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setStatusText("DOCUMENT DECRYPTED AND SAVED SUCCESSFULLY.");
    } catch (err) {
      console.error("Secure Download Error:", err);
      setStatusText("ERROR: " + (err.message || "DECRYPTION FAILED"));
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  return (
    <>
      <style>{`
        .blinking-cursor {
          display: inline-block;
          width: 10px;
          height: 1.2rem;
          background-color: var(--neon-blue);
          animation: blink 1s step-end infinite;
          vertical-align: middle;
          margin-left: 5px;
        }
        @keyframes blink { 50% { opacity: 0; } }

        .pulse-border {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 5px var(--neon-blue); }
          50% { box-shadow: 0 0 20px var(--neon-blue); }
          100% { box-shadow: 0 0 5px var(--neon-blue); }
        }

        .download-btn-hover:hover {
          background: rgba(0, 243, 255, 0.2) !important;
          box-shadow: 0 0 20px rgba(0, 243, 255, 0.5) !important;
          text-shadow: 0 0 10px #fff !important;
        }

        .metamask-btn-hover:hover {
          background: rgba(246, 133, 27, 0.2) !important;
          box-shadow: 0 0 20px rgba(246, 133, 27, 0.5) !important;
          text-shadow: 0 0 10px #fff !important;
        }

        .decrypt-btn-hover:hover {
          background: rgba(255, 0, 85, 0.2) !important;
          box-shadow: 0 0 20px rgba(255, 0, 85, 0.5) !important;
          text-shadow: 0 0 10px #fff !important;
        }

        .fetch-input:focus {
          border-color: var(--neon-blue) !important;
          box-shadow: 0 0 20px rgba(0, 243, 255, 0.3) !important;
        }
      `}</style>

      <div style={containerStyle}>

        {/* HEADER */}
        <div style={headerStyle}>
          <div style={{ color: 'var(--neon-pink)', textShadow: '0 0 8px var(--neon-pink)', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {statusText}
          </div>
        </div>

        {/* BODY */}
        <div style={bodyStyle}>

          {/* WALLET CONNECT */}
          {!walletAddress ? (
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <button className="metamask-btn-hover" style={connectWalletBtnStyle} onClick={connectWallet}>
                CONNECT METAMASK
              </button>
              <p style={{ color: '#666', marginTop: '1rem', fontSize: '0.9rem', letterSpacing: '1px' }}>
                CONNECT THE WALLET USED TO ENCRYPT THE DOCUMENT
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <div style={{
                padding: '1rem',
                border: '2px solid #00f3ff',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '4px',
                display: 'inline-block',
                boxShadow: '0 0 15px rgba(0, 243, 255, 0.3)'
              }}>
                <p style={{ margin: 0, color: '#00f3ff', fontWeight: 'bold', letterSpacing: '1px' }}>
                  WALLET: {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
                </p>
              </div>
            </div>
          )}

          {/* FILE ID INPUT */}
          {walletAddress && (
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <label style={{ color: '#888', fontSize: '0.9rem', letterSpacing: '2px', marginBottom: '0.8rem', display: 'block' }}>
                DOCUMENT ID
              </label>
              <input
                type="text"
                className="fetch-input"
                value={fetchFileId}
                onChange={(e) => { setFetchFileId(e.target.value); setFetchedInfo(null); }}
                placeholder="paste-your-document-id-here"
                style={{
                  width: '80%',
                  padding: '1rem',
                  background: 'rgba(0, 243, 255, 0.05)',
                  border: '2px solid rgba(0, 243, 255, 0.4)',
                  borderRadius: '4px',
                  color: 'var(--neon-blue)',
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: '1.05rem',
                  letterSpacing: '1px',
                  outline: 'none',
                  textAlign: 'center',
                  transition: 'all 0.3s',
                }}
              />
            </div>
          )}

          <div style={dividerStyle}></div>

          {/* ACTION BUTTONS */}
          {walletAddress && (
            <div style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="download-btn-hover"
                style={{ ...actionBtnStyle, flex: '1', maxWidth: '280px' }}
                disabled={loading || !fetchFileId.trim()}
                onClick={handleFetchInfo}
              >
                {loading && !fetchedInfo ? 'QUERYING...' : '🔍 LOOKUP RECORD'}
              </button>
              {fetchedInfo && fetchedInfo.ipfsCID && fetchedInfo.ipfsCID !== 'none' && (
                <button
                  className="decrypt-btn-hover"
                  style={{
                    ...actionBtnStyle,
                    flex: '1',
                    maxWidth: '280px',
                    borderColor: 'var(--neon-pink)',
                    color: 'var(--neon-pink)',
                    textShadow: '0 0 10px var(--neon-pink)',
                    boxShadow: 'inset 0 0 15px rgba(255, 0, 85, 0.2)'
                  }}
                  disabled={loading}
                  onClick={handleDecryptDownload}
                >
                  {loading ? 'DECRYPTING...' : '🔓 DECRYPT & DOWNLOAD'}
                </button>
              )}
            </div>
          )}

          {/* LOADING PHASE */}
          {loading && loadingPhase && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--neon-pink)', fontSize: '1.1rem', letterSpacing: '2px' }}>
              {loadingPhase} <div className="blinking-cursor"></div>
            </div>
          )}

          {/* FETCHED RECORD INFO */}
          {fetchedInfo && (
            <div style={resultStyle} className="pulse-border">
              <h3 style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '2px', marginBottom: '1.5rem', fontWeight: 'bold', color: '#39ff14', textShadow: '0 0 15px #39ff14' }}>
                &#10004; BLOCKCHAIN RECORD FOUND
              </h3>

              <div style={resultDetailsBox}>
                <p style={detailRowStyle}>
                  <strong style={labelStyle}>FILENAME:</strong>
                  <span style={valueStyle}>{fetchedInfo.filename || 'N/A'}</span>
                </p>
                <p style={detailRowStyle}>
                  <strong style={labelStyle}>SHA-256 HASH:</strong>
                  <span style={valueStyleHash}>{fetchedInfo.hash}</span>
                </p>
                <p style={detailRowStyle}>
                  <strong style={labelStyle}>IPFS CID:</strong>
                  <span style={{ ...valueStyleHash, color: 'var(--neon-pink)', textShadow: '0 0 5px rgba(255, 0, 85, 0.5)' }}>
                    {fetchedInfo.ipfsCID || 'none'}
                  </span>
                </p>
                <p style={detailRowStyle}>
                  <strong style={labelStyle}>TIMESTAMP:</strong>
                  <span style={valueStyle}>
                    {new Date(fetchedInfo.timestamp).toLocaleString('en-US', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true
                    })}
                  </span>
                </p>
              </div>

              {(!fetchedInfo.ipfsCID || fetchedInfo.ipfsCID === 'none') && (
                <div style={{ textAlign: 'center', padding: '1rem', border: '1px solid #ff003c', borderRadius: '4px', backgroundColor: 'rgba(255, 0, 60, 0.05)' }}>
                  <p style={{ margin: 0, color: '#ff003c', letterSpacing: '1px' }}>
                    ⚠ THIS DOCUMENT WAS NOT ENCRYPTED TO IPFS
                  </p>
                </div>
              )}

              {!fetchedInfo.encryptedKeyPayload && fetchedInfo.ipfsCID && fetchedInfo.ipfsCID !== 'none' && (
                <div style={{ textAlign: 'center', padding: '1rem', border: '1px solid #ffaa00', borderRadius: '4px', backgroundColor: 'rgba(255, 170, 0, 0.05)' }}>
                  <p style={{ margin: 0, color: '#ffaa00', letterSpacing: '1px' }}>
                    ⚠ NO ENCRYPTION KEY PAYLOAD — CANNOT DECRYPT
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// Inline styles (matching existing app aesthetics)
const containerStyle = {
  margin: '4rem auto',
  maxWidth: '750px',
  border: '2px solid rgba(0, 243, 255, 0.5)',
  backgroundColor: 'rgba(10, 10, 15, 0.85)',
  boxShadow: '0 0 25px rgba(0, 243, 255, 0.1)',
  fontFamily: '"Courier New", Courier, monospace',
  position: 'relative',
  zIndex: 10,
  backdropFilter: 'blur(5px)'
};

const headerStyle = {
  borderBottom: '2px solid rgba(0, 243, 255, 0.5)',
  padding: '1.5rem',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 243, 255, 0.05)',
  letterSpacing: '1px'
};

const bodyStyle = {
  padding: '3rem',
  display: 'flex',
  flexDirection: 'column',
};

const connectWalletBtnStyle = {
  padding: '1rem 2rem',
  background: 'rgba(246, 133, 27, 0.1)',
  border: '2px solid #f6851b',
  color: '#f6851b',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 'bold',
  fontSize: '1.2rem',
  letterSpacing: '2px',
  textShadow: '0 0 8px #f6851b',
  boxShadow: '0 0 15px rgba(246, 133, 27, 0.3)',
  transition: 'all 0.3s',
  borderRadius: '4px'
};

const dividerStyle = {
  height: '2px',
  width: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(0, 243, 255, 0.5), transparent)',
  marginTop: '1.5rem',
  marginBottom: '1.5rem'
};

const actionBtnStyle = {
  padding: '1.2rem 3rem',
  background: 'rgba(0, 243, 255, 0.1)',
  border: '2px solid var(--neon-blue)',
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 'bold',
  fontSize: '1.2rem',
  letterSpacing: '2px',
  textShadow: '0 0 10px var(--neon-blue)',
  boxShadow: 'inset 0 0 15px rgba(0, 243, 255, 0.2)',
  transition: 'all 0.3s',
  borderRadius: '4px'
};

const resultStyle = {
  marginTop: '2.5rem',
  width: '100%',
  padding: '2rem',
  border: '1px solid rgba(0, 243, 255, 0.4)',
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  color: '#fff',
  fontSize: '1rem',
  lineHeight: '1.6',
  borderRadius: '8px'
};

const resultDetailsBox = {
  width: '100%',
  backgroundColor: 'rgba(255,255,255,0.03)',
  padding: '1.5rem',
  borderRadius: '4px',
  borderLeft: '4px solid #39ff14',
  marginBottom: '1rem'
};

const detailRowStyle = {
  marginBottom: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '5px'
};

const labelStyle = {
  color: '#888',
  fontSize: '0.9rem',
  letterSpacing: '1px'
};

const valueStyle = {
  color: '#fff',
  fontSize: '1.1rem',
  wordBreak: 'break-all',
  fontWeight: 'bold'
};

const valueStyleHash = {
  color: 'var(--neon-blue)',
  fontSize: '1.1rem',
  wordBreak: 'break-all',
  fontFamily: 'monospace',
  textShadow: '0 0 5px rgba(0, 243, 255, 0.5)'
};

export default DownloadDecrypt;
