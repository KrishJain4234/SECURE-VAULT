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
        const res = await fetch(`http://localhost:5000/info?fileId=${documentId}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setRecord(data);
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
           BLOCKCHAIN IMMUTABLE RECORD VALIDATION
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
               &#10008; DOCUMENT NOT FOUND / TAMPERED
            </h3>
            <p style={{textAlign: 'center', color: '#ff003c', fontSize: '1.1rem'}}>
               The scanned document ID does not exist on the simulated blockchain. It may have been tampered with or is invalid.
            </p>
            <p style={detailRowStyle}><strong style={labelStyle}>SCANNED ID:</strong> <span style={valueStyle}>{documentId}</span></p>
          </div>
        ) : (
          <div style={{...resultDetailsBox, borderColor: '#39ff14'}}>
            <h3 style={{color: '#39ff14', textShadow: '0 0 15px #39ff14', textAlign: 'center', marginBottom: '1.5rem'}}>
               &#10004; DOCUMENT VERIFIED (AUTHENTIC RECORD)
            </h3>
            
            <p style={detailRowStyle}>
               <strong style={labelStyle}>DOCUMENT STATUS:</strong> 
               <span style={{ color: '#39ff14', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 0 10px #39ff14' }}>
                  Verified ✅
               </span>
            </p>
            <p style={detailRowStyle}>
               <strong style={labelStyle}>DOCUMENT ID:</strong> 
               <span style={valueStyle}>{documentId}</span>
            </p>
            <p style={detailRowStyle}>
               <strong style={labelStyle}>SHA-256 HASH:</strong> 
               <span style={valueStyleHash}>{record.hash}</span>
            </p>
            <p style={detailRowStyle}>
               <strong style={labelStyle}>TIMESTAMP:</strong> 
               <span style={valueStyle}>{new Date(record.timestamp).toLocaleString()}</span>
            </p>
            <p style={detailRowStyle}>
               <strong style={labelStyle}>ISSUER:</strong> 
               <span style={valueStyle}>SECURE-VAULT SYSTEM NODE</span>
            </p>
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
