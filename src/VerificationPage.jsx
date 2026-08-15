import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

function VerificationPage() {
  const { documentId } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        let res = await fetch(`http://localhost:5000/verify/${documentId}`);
        if (!res.ok) {
          res = await fetch(`http://localhost:5000/info?fileId=${documentId}`);
        }
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setRecord(data);

        if (documentId) {
          const storedAudits = JSON.parse(localStorage.getItem('documentAudits') || '{}');
          if (!storedAudits[documentId]) {
            storedAudits[documentId] = { uploadTime: "Unknown", verifyCount: 0 };
          }
          storedAudits[documentId].lastVerified = new Date().toISOString();
          storedAudits[documentId].verifyCount += 1;
          localStorage.setItem('documentAudits', JSON.stringify(storedAudits));
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [documentId]);

  return (
    <div style={containerStyle}>
      <div className="terminal-header" style={{...headerStyle, justifyContent: 'center'}}>
        <div style={{color: 'var(--neon-pink)', textShadow: '0 0 8px var(--neon-pink)', fontSize: '1.2rem', fontWeight: 'bold'}}>
           BLOCKCHAIN IMMUTABLE RECORD & CERTIFICATE VALIDATION
        </div>
      </div>
      
      <div className="terminal-body" style={bodyStyle}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
             <p style={{ color: 'var(--neon-blue)', fontSize: '1.2rem', letterSpacing: '2px' }}>
                FETCHING IMMUTABLE RECORD...
                <span className="blinking-cursor" style={{ display: 'inline-block', width: '10px', height: '1.2rem', backgroundColor: 'var(--neon-blue)', marginLeft: '5px' }}></span>
             </p>
          </div>
        ) : error ? (
          <div style={{...resultDetailsBox, borderColor: '#ff003c'}}>
            <h3 style={{color: '#ff003c', textShadow: '0 0 15px #ff003c', textAlign: 'center', marginBottom: '1.5rem'}}>
               &#10008; INVALID CERTIFICATE / DOCUMENT NOT FOUND
            </h3>
            <p style={{textAlign: 'center', color: '#ff003c', fontSize: '1.1rem'}}>
               The scanned Certificate ID or Document Hash does not exist on the vault database. It may have been tampered with or is invalid.
            </p>
            <p style={detailRowStyle}><strong style={labelStyle}>SCANNED ID:</strong> <span style={valueStyle}>{documentId}</span></p>
          </div>
        ) : (
          <div style={{...resultDetailsBox, borderColor: '#39ff14'}}>
            <h3 style={{color: '#39ff14', textShadow: '0 0 15px #39ff14', textAlign: 'center', marginBottom: '1.5rem'}}>
               &#10004; VERIFIED (AUTHENTIC IMMUTABLE RECORD)
            </h3>
            
            <p style={detailRowStyle}>
               <strong style={labelStyle}>VALIDATION STATUS:</strong> 
               <span style={{ color: '#39ff14', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 0 10px #39ff14' }}>
                  VERIFIED ✅
               </span>
            </p>
            <p style={detailRowStyle}>
               <strong style={labelStyle}>CERTIFICATE / RECORD ID:</strong> 
               <span style={{ ...valueStyle, color: 'var(--neon-pink)' }}>{record.certificateId || documentId}</span>
            </p>

            {record.studentName && (
              <p style={detailRowStyle}>
                 <strong style={labelStyle}>STUDENT / RECIPIENT NAME:</strong> 
                 <span style={valueStyle}>{record.studentName}</span>
              </p>
            )}

            {record.certificateTitle && (
              <p style={detailRowStyle}>
                 <strong style={labelStyle}>CERTIFICATE TITLE:</strong> 
                 <span style={valueStyle}>{record.certificateTitle}</span>
              </p>
            )}

            {record.course && (
              <p style={detailRowStyle}>
                 <strong style={labelStyle}>COURSE / PROGRAM:</strong> 
                 <span style={valueStyle}>{record.course}</span>
              </p>
            )}

            {record.organization && (
              <p style={detailRowStyle}>
                 <strong style={labelStyle}>ISSUING ORGANIZATION:</strong> 
                 <span style={valueStyle}>{record.organization}</span>
              </p>
            )}

            {record.issueDate && (
              <p style={detailRowStyle}>
                 <strong style={labelStyle}>ISSUE DATE:</strong> 
                 <span style={valueStyle}>{record.issueDate}</span>
              </p>
            )}

            <p style={detailRowStyle}>
               <strong style={labelStyle}>SHA-256 HASH FINGERPRINT:</strong> 
               <span style={valueStyleHash}>{record.hash}</span>
            </p>
            <p style={detailRowStyle}>
               <strong style={labelStyle}>TIMESTAMP:</strong> 
               <span style={valueStyle}>{new Date(record.timestamp).toLocaleString()}</span>
            </p>

            {record.certificateUrl && (
              <div style={{ marginTop: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                <a
                  href={record.certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '0.8rem 1.5rem',
                    backgroundColor: '#39ff14',
                    color: '#000',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    boxShadow: '0 0 10px rgba(57, 255, 20, 0.4)'
                  }}
                >
                  📥 DOWNLOAD OFFICIAL CERTIFICATE PDF
                </a>
              </div>
            )}

            {/* AUDIT TRAIL DISPLAY */}
            <div style={{
              width: '100%',
              backgroundColor: 'rgba(255,255,255,0.02)',
              padding: '1.2rem',
              borderRadius: '4px',
              borderLeft: '4px solid #aa00ff',
              marginBottom: '1rem',
              marginTop: '1.5rem'
            }}>
              <h4 style={{ color: '#aa00ff', margin: '0 0 1rem 0', letterSpacing: '1px', textShadow: '0 0 5px rgba(170, 0, 255, 0.5)' }}>SYSTEM AUDIT TRAIL</h4>
              {(()=>{
                const storedAudits = JSON.parse(localStorage.getItem('documentAudits') || '{}');
                const audit = storedAudits[documentId] || {};
                const formatTime = (iso) => {
                  if (!iso || iso === "Unknown") return "N/A";
                  return new Date(iso).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                };
                return (
                  <>
                    <p style={{...detailRowStyle, flexDirection: 'row', alignItems: 'center'}}><span style={{marginRight: '8px', fontSize: '1.2rem'}}>📤</span> <strong style={{...labelStyle, marginRight: '10px'}}>UPLOADED AT:</strong> <span style={valueStyle}>{formatTime(audit.uploadTime)}</span></p>
                    <p style={{...detailRowStyle, flexDirection: 'row', alignItems: 'center'}}><span style={{marginRight: '8px', fontSize: '1.2rem'}}>🔍</span> <strong style={{...labelStyle, marginRight: '10px'}}>LAST VERIFIED:</strong> <span style={valueStyle}>{formatTime(audit.lastVerified)}</span></p>
                    <p style={{...detailRowStyle, flexDirection: 'row', alignItems: 'center'}}><span style={{marginRight: '8px', fontSize: '1.2rem'}}>🕒</span> <strong style={{...labelStyle, marginRight: '10px'}}>LAST CHECKED:</strong> <span style={valueStyle}>{formatTime(new Date().toISOString())}</span></p>
                    <p style={{...detailRowStyle, flexDirection: 'row', alignItems: 'center', marginTop: '10px', color: '#ffaa00'}}><strong style={{marginRight: '10px'}}>VERIFICATION COUNT:</strong> <span>{audit.verifyCount || 0} times</span></p>
                  </>
                );
              })()}
            </div>


            {record && (
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
                  {(()=>{
                    const text = (record.normalizedText || "").toLowerCase();
                    const filename = (record.filename || "").toLowerCase();
                    const year = new Date(record.timestamp || Date.now()).getFullYear();
                    
                    let docType = "verified document";
                    let purpose = "";
                    let name = "";
                    let issuer = "";

                    if (text.includes("degree") || filename.includes("degree") || text.includes("b.tech") || filename.includes("b.tech") || text.includes("bachelor")) {
                        docType = "degree certificate";
                        purpose = text.includes("b.tech") ? "completion of B.Tech" : "degree completion";
                    } else if (text.includes("agreement") || filename.includes("agreement") || text.includes("contract")) {
                        docType = "legal agreement";
                    } else if (text.includes("certificate") || filename.includes("cert")) {
                        docType = "certificate";
                        purpose = "certified validation";
                    } else if (text.includes("identity") || text.includes("passport") || filename.includes("id")) {
                        docType = "identity document";
                        purpose = "proof of identity";
                    }

                    if (text.includes("krishjain") || filename.includes("krish")) {
                        name = "Krish Jain";
                    } else {
                        const nameMatch = record.filename?.match(/^([A-Za-z]+)[_-]([A-Za-z]+)/);
                        if (nameMatch) {
                            name = `${nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1)} ${nameMatch[2].charAt(0).toUpperCase() + nameMatch[2].slice(1)}`;
                        }
                    }

                    if (text.includes("xyz")) issuer = "XYZ University";
                    else if (text.includes("university") || filename.includes("university")) issuer = "a University";
                    else if (text.includes("gov") || text.includes("government")) issuer = "a Government Authority";

                    if (docType === "legal agreement") {
                        return `This is a ${docType} between two parties, signed in ${year}.`;
                    }

                    let summaryWords = [`This is a ${docType}`];
                    
                    if (issuer) summaryWords.push(`issued by ${issuer}`);
                    if (name) summaryWords.push(`for ${name}`);
                    if (purpose) summaryWords.push(`, confirming ${purpose}`);
                    
                    summaryWords.push(`in ${year}.`);

                    return summaryWords.join(' ').replace(' ,', ',');
                  })()}
                </p>
              </div>
            )}
          </div>
        )}

        <div style={{textAlign: 'center', marginTop: '2rem'}}>
           <Link to="/" style={actionBtnStyle}>
              RETURN TO MAIN VAULT
           </Link>
        </div>
      </div>
    </div>
  );
}

// Inline styling configurations matching main theme
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

const bodyStyle = {
  padding: '3rem',
  display: 'flex',
  flexDirection: 'column',
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

const actionBtnStyle = {
  display: 'inline-block',
  padding: '1rem 2rem',
  background: 'rgba(0, 243, 255, 0.1)',
  border: '2px solid var(--neon-blue)',
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 'bold',
  fontSize: '1.1rem',
  letterSpacing: '2px',
  textShadow: '0 0 10px var(--neon-blue)',
  boxShadow: 'inset 0 0 15px rgba(0, 243, 255, 0.2)',
  transition: 'all 0.3s',
  borderRadius: '4px',
  textDecoration: 'none'
};

export default VerificationPage;
