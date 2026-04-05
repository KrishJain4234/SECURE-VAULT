import { useState, useRef, useEffect } from 'react';

function DocumentManager({ mode }) {
  const activeTab = mode || 'upload'; // controlled externally now
  const [statusText, setStatusText] = useState(activeTab === 'upload' ? 'AWAITING UPLOAD...' : 'AWAITING VERIFICATION...');
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
        'ANALYZING DOCUMENT...',
        'GENERATING SHA-256 HASH...',
        'STORING ON BLOCKCHAIN...',
        'FINALIZING...'
      ];
      let i = 0;
      setLoadingPhase(phases[0]);
      interval = setInterval(() => {
        i++;
        if (i < phases.length) setLoadingPhase(phases[i]);
      }, 600);
    } else {
      setLoadingPhase('');
    }
    return () => clearInterval(interval);
  }, [loading]);

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

    try {
      const res = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatusText('UPLOAD SUCCESSFUL. HASH GENERATED.');
        setResult(data);
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
        
        .file-select-hover:hover {
          background: rgba(255, 0, 85, 0.15) !important;
          box-shadow: 0 0 15px rgba(255, 0, 85, 0.3) !important;
        }
      `}</style>
      
      <div className="doc-manager-container" style={containerStyle}>
        
        {/* HEADER */}
        <div className="terminal-header" style={{...headerStyle, justifyContent: 'center'}}>
          <div style={{color: 'var(--neon-pink)', textShadow: '0 0 8px var(--neon-pink)', fontSize: '1.2rem', fontWeight: 'bold'}}>
             {statusText}
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="terminal-body" style={bodyStyle}>
          
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
               <div style={{marginTop: '1.5rem', color: 'var(--neon-blue)', fontSize: '1.1rem', padding: '10px', borderLeft: '4px solid var(--neon-blue)', background: 'rgba(0, 243, 255, 0.05)'}}>
                 <span style={{color: '#fff'}}>FILE:</span> {file.name} 
                 <span style={{color: '#aaa', marginLeft: '10px'}}>({(file.size / 1024).toFixed(2)} KB)</span>
               </div>
             )}
          </div>

          <div style={dividerStyle}></div>

          {/* ACTION SECTION */}
          <div style={{marginTop: '2rem', textAlign: 'center'}}>
            <button 
              className="upload-btn-hover"
              style={actionBtnStyle}
              disabled={loading}
              onClick={activeTab === 'upload' ? handleUpload : handleVerify}
            >
              {loading ? 'PROCESSING...' : activeTab === 'upload' ? 'INITIATE UPLOAD' : 'INITIATE VERIFICATION'}
            </button>
            {loading && (
              <div style={{marginTop: '1.5rem', color: 'var(--neon-pink)', fontSize: '1.1rem', letterSpacing: '2px'}}>
                {loadingPhase} <div className="blinking-cursor"></div>
              </div>
            )}
          </div>

          {/* RESULT / STATUS SECTION */}
          {result && (
            <div style={resultStyle} className="pulse-border">
              {activeTab === 'upload' ? (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                  <h3 style={{...successTitleStyle, color: '#39ff14', textShadow: '0 0 15px #39ff14'}}>
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
                         <img src={`http://localhost:5000/generate-qr?fileId=${result.fileId}`} alt="QR Code" style={{width: '180px', height: '180px', display: 'block'}} />
                       </div>
                     </div>
                  )}
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column'}}>
                   
                  {result.status === 'VERIFIED' ? (
                     <h3 style={{...successTitleStyle, color: '#39ff14', textShadow: '0 0 15px #39ff14'}}>
                       &#10004; DOCUMENT VERIFIED SUCCESSFULLY
                     </h3>
                  ) : (
                     <h3 style={{...successTitleStyle, color: '#ff003c', textShadow: '0 0 15px #ff003c'}}>
                       &#10008; ALERT: DOCUMENT TAMPERED
                     </h3>
                  )}

                  <div style={{...resultDetailsBox, borderColor: result.status === 'VERIFIED' ? '#39ff14' : '#ff003c'}}>
                    <p style={detailRowStyle}><strong style={labelStyle}>STATUS:</strong> 
                      <span style={{ 
                        color: result.status === 'VERIFIED' ? '#39ff14' : '#ff003c', 
                        fontWeight: 'bold', fontSize: '1.2rem',
                        textShadow: result.status === 'VERIFIED' ? '0 0 10px #39ff14' : '0 0 10px #ff003c'
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
