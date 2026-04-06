import { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Predefined list of authorized government officials (simulated)
// For testing, users should add their MetaMask address here
const AUTHORIZED_WALLETS = [
  "0x74287b9D2882eb4a62F3B6dc9D53373676bFCfD3", // New authorized address
  "0xa029D9F1F06244745aD4DacD8C210848116e66e8", // User authorized address
  "0x123...",
  "0xABC...",
  "0x1234567890123456789012345678901234567890", // dummy
];

function DocumentManager({ mode }) {
  const activeTab = mode || 'upload'; // controlled externally now
  const [statusText, setStatusText] = useState(activeTab === 'upload' ? 'AWAITING UPLOAD...' : 'AWAITING VERIFICATION...');
  
  // Wallet state
  const [walletAddress, setWalletAddress] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(null);

  // Ensure status text resets when mode changes
  useEffect(() => {
    setStatusText(activeTab === 'upload' ? 'AWAITING UPLOAD...' : 'AWAITING VERIFICATION...');
    setResult(null);
    setFile(null);
  }, [activeTab]);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(''); // for micro-animations
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let interval;
    if (loading) {
      const phases = [
        'INITIALIZING...',
        'ANALYZING PRIMARY TEXT LAYER...',
        'CALCULATING FONT CONFIDENCE...',
        'GENERATING HASH & ANCHORING...',
        'AWAITING NODE RESPONSE...'
      ];
      let i = 0;
      setLoadingPhase(phases[0]);
      interval = setInterval(() => {
        i++;
        if (i < phases.length) {
          setLoadingPhase(phases[i]);
        } else if (i === phases.length + 2) {
          setLoadingPhase('LOW CONFIDENCE DETECTED: ROUTING TO HEAVY PYTHON LLM...');
        } else if (i === phases.length + 6) {
          setLoadingPhase('OCR.SPACE IMAGE EXTRACTION IN PROGRESS...');
        } else if (i === phases.length + 15) {
          setLoadingPhase('QWEN3 NEURAL NET: CORRECTING SEMANTIC TYPOS...');
        } else if (i > phases.length + 25) {
          const dots = '.'.repeat((i % 3) + 1);
          setLoadingPhase('LLM ANALYSIS (this may take a while)' + dots);
        }
      }, 600);
    } else {
      setLoadingPhase('');
    }
    return () => clearInterval(interval);
  }, [loading]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setStatusText("WAITING FOR WALLET APPROVAL...");

        // 1. Force explicit permissions (forces popup even if already connected)
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });

        // 2. Request accounts (now guaranteed to have interactive permission)
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];
        
        setStatusText("SIGNATURE REQUIRED...");

        // 3. Force user confirmation via signature
        await window.ethereum.request({
          method: 'personal_sign',
          params: ["SecureVault authentication request", account]
        });

        // If signature succeeds, proceed
        setWalletAddress(account);
        setStatusText("WALLET CONNECTED SUCCESSFULLY");
        
        // Check authorization logic
        const isAuth = AUTHORIZED_WALLETS.some(w => w.toLowerCase() === account.toLowerCase());
        setIsAuthorized(isAuth);
        
        if (!isAuth) {
          setTimeout(() => setStatusText(`ERROR: UNAUTHORIZED ISSUER`), 1500);
        }
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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatusText(`FILE LOADED: ${e.target.files[0].name.toUpperCase()}`);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatusText('ERROR: NO FILE SELECTED');
      return;
    }

    setLoading(true);
    setStatusText('COMMUNICATING WITH NODE...');

    const formData = new FormData();
    formData.append('document', file);
    formData.append('issuerId', walletAddress); // Attached issuer ID

    try {
      const res = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setStatusText('UPLOAD SUCCESSFUL. HASH GENERATED.');
        setResult(data);

        // Audit Trail Update for Upload
        if (data.fileId) {
          const storedAudits = JSON.parse(localStorage.getItem('documentAudits') || '{}');
          storedAudits[data.fileId] = {
            uploadTime: new Date().toISOString(),
            verifyCount: 0,
            lastVerified: null
          };
          localStorage.setItem('documentAudits', JSON.stringify(storedAudits));
        }
      } else {
        setStatusText(`ERROR: ${data.error?.toUpperCase() || 'UPLOAD FAILED'}`);
      }
    } catch (err) {
      setStatusText('ERROR: CONNECTION TO NODE FAILED');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!file) {
      setStatusText('ERROR: NO FILE SELECTED');
      return;
    }

    setLoading(true);
    setStatusText('VERIFYING BLOCKCHAIN RECORD...');

    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await fetch('http://localhost:5000/verify', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setStatusText(`ANALYSIS COMPLETE. STATUS LOGGED.`);
        setResult(data);

        // Audit Trail Update for Verify
        if (data.fileId) {
          const storedAudits = JSON.parse(localStorage.getItem('documentAudits') || '{}');
          if (!storedAudits[data.fileId]) {
            storedAudits[data.fileId] = { uploadTime: "Unknown", verifyCount: 0 };
          }
          storedAudits[data.fileId].lastVerified = new Date().toISOString();
          storedAudits[data.fileId].verifyCount += 1;
          localStorage.setItem('documentAudits', JSON.stringify(storedAudits));
        }
      } else {
        setStatusText(`ERROR: ${data.error?.toUpperCase() || 'VERIFICATION FAILED'}`);
      }
    } catch (err) {
      setStatusText('ERROR: CONNECTION TO NODE FAILED');
    } finally {
      setLoading(false);
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

        .upload-btn-hover:hover {
          background: rgba(0, 243, 255, 0.2) !important;
          box-shadow: 0 0 20px rgba(0, 243, 255, 0.5) !important;
          text-shadow: 0 0 10px #fff !important;
        }

        .metamask-btn-hover:hover {
          background: rgba(246, 133, 27, 0.2) !important;
          box-shadow: 0 0 20px rgba(246, 133, 27, 0.5) !important;
          text-shadow: 0 0 10px #fff !important;
        }
        
        .file-select-hover:hover {
          background: rgba(255, 0, 85, 0.15) !important;
          box-shadow: 0 0 15px rgba(255, 0, 85, 0.3) !important;
        }
      `}</style>

      <div className="doc-manager-container" style={containerStyle}>

        {/* HEADER */}
        <div className="terminal-header" style={{ ...headerStyle, justifyContent: 'center' }}>
          <div style={{ color: 'var(--neon-pink)', textShadow: '0 0 8px var(--neon-pink)', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {statusText}
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="terminal-body" style={bodyStyle}>
          
          {/* WALLET CONNECT SECTION (UPLOAD ONLY) */}
          {activeTab === 'upload' && (
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              {!walletAddress ? (
                <button className="metamask-btn-hover" style={connectWalletBtnStyle} onClick={connectWallet}>
                  CONNECT METAMASK
                </button>
              ) : (
                <div style={{
                  padding: '1rem',
                  border: `2px solid ${isAuthorized ? '#39ff14' : '#ff003c'}`,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  borderRadius: '4px',
                  display: 'inline-block',
                  boxShadow: `0 0 15px ${isAuthorized ? 'rgba(57, 255, 20, 0.3)' : 'rgba(255, 0, 60, 0.3)'}`
                }}>
                  <p style={{ margin: 0, color: isAuthorized ? '#39ff14' : '#ff003c', fontWeight: 'bold', letterSpacing: '1px' }}>
                    {isAuthorized 
                      ? `WALLET CONNECTED: ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}` 
                      : `UNAUTHORIZED WALLET: ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`
                    }
                  </p>
                  {!isAuthorized && (
                    <p style={{ margin: '8px 0 0 0', color: '#ff003c', fontSize: '0.9rem', letterSpacing: '1px' }}>
                      ACCESS DENIED: UNAUTHORIZED ISSUER
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* UPLOAD / SELECT SECTION */}
          <div style={inputSectionStyle}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button className="file-select-hover" style={uploadBtnStyle} onClick={() => fileInputRef.current?.click()}>
              Select Document to Secure
            </button>
            {file && (
              <div style={{ marginTop: '1.5rem', color: 'var(--neon-blue)', fontSize: '1.1rem', padding: '10px', borderLeft: '4px solid var(--neon-blue)', background: 'rgba(0, 243, 255, 0.05)' }}>
                <span style={{ color: '#fff' }}>FILE:</span> {file.name}
                <span style={{ color: '#aaa', marginLeft: '10px' }}>({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
          </div>

          <div style={dividerStyle}></div>

          {/* ACTION SECTION */}
          <div style={{marginTop: '2rem', textAlign: 'center'}}>
            {!(activeTab === 'upload' && (!walletAddress || !isAuthorized)) && (
              <button 
                className="upload-btn-hover"
                style={actionBtnStyle}
                disabled={loading}
                onClick={activeTab === 'upload' ? handleUpload : handleVerify}
              >
                {loading ? 'PROCESSING...' : activeTab === 'upload' ? 'INITIATE UPLOAD' : 'INITIATE VERIFICATION'}
              </button>
            )}
            {loading && (
              <div style={{ marginTop: '1.5rem', color: 'var(--neon-pink)', fontSize: '1.1rem', letterSpacing: '2px' }}>
                {loadingPhase} <div className="blinking-cursor"></div>
              </div>
            )}
          </div>

          {/* RESULT / STATUS SECTION */}
          {result && (
            <div style={resultStyle} className="pulse-border">
              {activeTab === 'upload' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h3 style={{ ...successTitleStyle, color: '#39ff14', textShadow: '0 0 15px #39ff14' }}>
                    &#10004; DOCUMENT SECURED SUCCESSFULLY
                  </h3>

                  <div style={resultDetailsBox}>
                    <p style={detailRowStyle}><strong style={labelStyle}>FILE ID:</strong> <span style={valueStyle}>{result.fileId}</span></p>
                    <p style={detailRowStyle}><strong style={labelStyle}>SHA-256 HASH:</strong> <span style={valueStyleHash}>{result.hash}</span></p>
                  </div>

                  {result.fileId && (
                    <div style={qrContainerStyle}>
                      <p style={qrLabelStyle}>SCAN TO VERIFY DOCUMENT</p>
                      <div style={qrBoxStyle}>
                        <QRCodeSVG value={`${window.location.origin}/verify/${result.fileId}`} size={180} fgColor="#000000" bgColor="#ffffff" style={{ display: 'block' }} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>

                  {result.status === 'VERIFIED' ? (
                    <h3 style={{ ...successTitleStyle, color: '#39ff14', textShadow: '0 0 15px #39ff14' }}>
                      &#10004; DOCUMENT VERIFIED SUCCESSFULLY
                    </h3>
                  ) : result.status.includes('VALID') ? (
                    <h3 style={{ ...successTitleStyle, color: '#ffaa00', textShadow: '0 0 15px #ffaa00' }}>
                      &#9888; VALID (MINOR CHANGES)
                    </h3>
                  ) : (
                    <h3 style={{ ...successTitleStyle, color: '#ff003c', textShadow: '0 0 15px #ff003c' }}>
                      &#10008; ALERT: DOCUMENT TAMPERED
                    </h3>
                  )}

                  <div style={{ ...resultDetailsBox, borderColor: result.status === 'VERIFIED' ? '#39ff14' : result.status.includes('VALID') ? '#ffaa00' : '#ff003c' }}>
                    <p style={detailRowStyle}><strong style={labelStyle}>STATUS:</strong>
                      <span style={{
                        color: result.status === 'VERIFIED' ? '#39ff14' : result.status.includes('VALID') ? '#ffaa00' : '#ff003c',
                        fontWeight: 'bold', fontSize: '1.2rem',
                        textShadow: result.status === 'VERIFIED' ? '0 0 10px #39ff14' : result.status.includes('VALID') ? '0 0 10px #ffaa00' : '0 0 10px #ff003c'
                      }}>
                        {result.status}
                      </span>
                    </p>
                    <p style={detailRowStyle}><strong style={labelStyle}>SYSTEM MESSAGE:</strong> <span style={valueStyle}>{result.message}</span></p>
                    {result.ocrStatus && (
                      <p style={detailRowStyle}><strong style={labelStyle}>DEEP ANALYSIS:</strong> <span style={valueStyle}>{result.ocrStatus}</span></p>
                    )}
                    {result.fileId && (
                      <p style={detailRowStyle}><strong style={labelStyle}>MATCHED ID:</strong> <span style={valueStyle}>{result.fileId}</span></p>
                    )}
                  </div>

                  {/* AUDIT TRAIL DISPLAY */}
                  {result.fileId && (
                    <div style={{
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      padding: '1.2rem',
                      borderRadius: '4px',
                      borderLeft: '4px solid #aa00ff',
                      marginBottom: '1rem'
                    }}>
                      <h4 style={{ color: '#aa00ff', margin: '0 0 1rem 0', letterSpacing: '1px', textShadow: '0 0 5px rgba(170, 0, 255, 0.5)' }}>SYSTEM AUDIT TRAIL</h4>
                      {(() => {
                        const storedAudits = JSON.parse(localStorage.getItem('documentAudits') || '{}');
                        const audit = storedAudits[result.fileId] || {};
                        const formatTime = (iso) => {
                          if (!iso || iso === "Unknown") return "N/A";
                          return new Date(iso).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                        };
                        return (
                          <>
                            <p style={{ ...detailRowStyle, flexDirection: 'row', alignItems: 'center' }}><span style={{ marginRight: '8px', fontSize: '1.2rem' }}></span> <strong style={{ ...labelStyle, marginRight: '10px' }}>UPLOADED AT:</strong> <span style={valueStyle}>{formatTime(audit.uploadTime)}</span></p>
                            <p style={{ ...detailRowStyle, flexDirection: 'row', alignItems: 'center' }}><span style={{ marginRight: '8px', fontSize: '1.2rem' }}></span> <strong style={{ ...labelStyle, marginRight: '10px' }}>LAST VERIFIED:</strong> <span style={valueStyle}>{formatTime(audit.lastVerified)}</span></p>
                            <p style={{ ...detailRowStyle, flexDirection: 'row', alignItems: 'center' }}><span style={{ marginRight: '8px', fontSize: '1.2rem' }}></span> <strong style={{ ...labelStyle, marginRight: '10px' }}>LAST CHECKED:</strong> <span style={valueStyle}>{formatTime(new Date().toISOString())}</span></p>
                            <p style={{ ...detailRowStyle, flexDirection: 'row', alignItems: 'center', marginTop: '10px', color: '#ffaa00' }}><strong style={{ marginRight: '10px' }}>VERIFICATION COUNT:</strong> <span>{audit.verifyCount || 0} times</span></p>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div style={{
                    marginTop: '2rem',
                    padding: '1.2rem',
                    backgroundColor: 'rgba(0, 243, 255, 0.05)',
                    borderLeft: '4px solid var(--neon-blue)',
                    borderRadius: '4px'
                  }}>
                    <h4 style={{
                      color: 'var(--neon-blue)',
                      margin: '0 0 0.5rem 0',
                      fontSize: '1rem',
                      letterSpacing: '1px',
                      textShadow: '0 0 5px var(--neon-blue)'
                    }}>DOCUMENT SUMMARY</h4>
                    <p style={{
                      color: '#fff',
                      margin: 0,
                      fontSize: '1.1rem',
                      lineHeight: '1.5'
                    }}>
                      {(() => {
                        const filename = (file ? file.name : "").toLowerCase();
                        const year = new Date().getFullYear();

                        let docType = "verified document";
                        let purpose = "";
                        let name = "";
                        let issuer = "";

                        if (filename.includes("degree") || filename.includes("b.tech") || filename.includes("bachelor")) {
                          docType = "degree certificate";
                          purpose = filename.includes("b.tech") ? "completion of B.Tech" : "degree completion";
                        } else if (filename.includes("agreement") || filename.includes("contract")) {
                          docType = "legal agreement";
                        } else if (filename.includes("cert")) {
                          docType = "certificate";
                          purpose = "certified validation";
                        } else if (filename.includes("id")) {
                          docType = "identity document";
                          purpose = "proof of identity";
                        }

                        if (filename.includes("krish")) {
                          name = "Krish Jain";
                        } else {
                          const nameMatch = filename.match(/^([A-Za-z]+)[_-]([A-Za-z]+)/);
                          if (nameMatch) {
                            name = `${nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1)} ${nameMatch[2].charAt(0).toUpperCase() + nameMatch[2].slice(1)}`;
                          }
                        }

                        if (filename.includes("university")) issuer = "a University";
                        else issuer = "a secured organization";

                        let summaryWords = [`This is a ${docType}`];

                        if (issuer) summaryWords.push(`issued by ${issuer}`);
                        if (name) summaryWords.push(`for ${name}`);
                        if (purpose) summaryWords.push(`, confirming ${purpose}`);

                        summaryWords.push(`in ${year}.`);

                        return summaryWords.join(' ').replace(' ,', ',');
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Inline styling configurations
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
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 243, 255, 0.05)',
  letterSpacing: '1px'
};

const connectWalletBtnStyle = {
  padding: '1rem 2rem',
  background: 'rgba(246, 133, 27, 0.1)', // MetaMask orange tint
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

const btnGroupStyle = {
  display: 'flex',
  gap: '15px'
};

const btnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#666',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '1.1rem',
  fontWeight: 'bold',
  transition: 'all 0.3s'
};

const activeBtnStyle = {
  ...btnStyle,
  color: 'var(--neon-blue)',
  textShadow: '0 0 8px var(--neon-blue)',
  borderBottom: '2px solid var(--neon-blue)',
  paddingBottom: '5px'
};

const bodyStyle = {
  padding: '3rem',
  display: 'flex',
  flexDirection: 'column',
};

const inputSectionStyle = {
  width: '100%',
  textAlign: 'center'
};

const dividerStyle = {
  height: '2px',
  width: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(0, 243, 255, 0.5), transparent)',
  marginTop: '2.5rem',
  marginBottom: '2.5rem'
};

const uploadBtnStyle = {
  width: '80%',
  padding: '1.2rem',
  background: 'rgba(255, 0, 85, 0.05)',
  border: '2px dashed var(--neon-pink)',
  color: 'var(--neon-pink)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  letterSpacing: '2px',
  textShadow: '0 0 8px rgba(255, 0, 85, 0.6)',
  transition: 'all 0.3s',
  borderRadius: '4px'
};

const actionBtnStyle = {
  padding: '1.2rem 3rem',
  background: 'rgba(0, 243, 255, 0.1)',
  border: '2px solid var(--neon-blue)',
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 'bold',
  fontSize: '1.3rem',
  letterSpacing: '2px',
  textShadow: '0 0 10px var(--neon-blue)',
  boxShadow: 'inset 0 0 15px rgba(0, 243, 255, 0.2)',
  transition: 'all 0.3s',
  borderRadius: '4px'
};

const resultStyle = {
  marginTop: '3rem',
  width: '100%',
  padding: '2rem',
  border: '1px solid rgba(0, 243, 255, 0.4)',
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  color: '#fff',
  fontSize: '1rem',
  lineHeight: '1.6',
  borderRadius: '8px'
};

const successTitleStyle = {
  textAlign: 'center',
  fontSize: '1.5rem',
  letterSpacing: '2px',
  marginBottom: '1.5rem',
  fontWeight: 'bold'
};

const resultDetailsBox = {
  width: '100%',
  backgroundColor: 'rgba(255,255,255,0.03)',
  padding: '1.5rem',
  borderRadius: '4px',
  borderLeft: '4px solid #39ff14',
  marginBottom: '2rem'
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

const qrContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginTop: '1rem',
  padding: '1.5rem',
  border: '1px solid rgba(0, 243, 255, 0.3)',
  borderRadius: '8px',
  background: 'rgba(0, 0, 0, 0.5)'
};

const qrLabelStyle = {
  color: '#fff',
  fontWeight: 'bold',
  letterSpacing: '2px',
  marginBottom: '1rem',
  textShadow: '0 0 8px var(--neon-blue)'
};

const qrBoxStyle = {
  padding: '10px',
  background: '#fff',
  border: '4px solid var(--neon-blue)',
  boxShadow: '0 0 20px var(--neon-blue)',
  borderRadius: '8px'
};

export default DocumentManager;