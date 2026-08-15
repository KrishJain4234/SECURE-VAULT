import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function CertificateIssuance() {
  const [formData, setFormData] = useState({
    studentName: '',
    certificateTitle: '',
    course: '',
    organization: '',
    issueDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const loadingPhases = [
    'INITIALIZING CERTIFICATE ENGINE...',
    'COMPUTING CRYPTOGRAPHIC EMBEDDINGS...',
    'GENERATING SHA-256 DOCUMENT HASH...',
    'BUILDING VECTOR PDF CERTIFICATE...',
    'EMBEDDING QR CODE VERIFICATION LINK...',
    'ANCHORING METADATA TO VAULT DATABASE...'
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingPhase(prev => (prev + 1) % loadingPhases.length);
      }, 600);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.studentName || !formData.certificateTitle || !formData.organization) {
      setError('Please fill in all required fields (Student Name, Certificate Title, Organization)');
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingPhase(0);
    setResult(null);

    try {
      const res = await fetch('http://localhost:5000/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate certificate');
      }

      setResult(data);

      // Store in local audit trail
      if (data.certificateId) {
        const storedAudits = JSON.parse(localStorage.getItem('documentAudits') || '{}');
        storedAudits[data.certificateId] = {
          uploadTime: new Date().toISOString(),
          lastVerified: new Date().toISOString(),
          verifyCount: 1,
          type: 'certificate',
          title: formData.certificateTitle,
          student: formData.studentName
        };
        localStorage.setItem('documentAudits', JSON.stringify(storedAudits));
      }
    } catch (err) {
      setError(err.message || 'Error communicating with certificate issuance API.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setError(null);
    setFormData({
      studentName: '',
      certificateTitle: '',
      course: '',
      organization: '',
      issueDate: new Date().toISOString().split('T')[0],
      description: ''
    });
  };

  const verificationUrl = result ? `${window.location.origin}/verify/${result.certificateId}` : '';

  return (
    <div style={containerStyle}>
      <div className="terminal-header" style={headerStyle}>
        <div style={{ color: 'var(--neon-pink)', fontWeight: 'bold', textShadow: '0 0 5px var(--neon-pink)', fontSize: '1.1rem' }}>
          OFFICIAL DIGITAL CERTIFICATE ISSUANCE ENGINE
        </div>
        <div style={{ color: '#666', fontSize: '0.85rem' }}>
          [ MODE: ISSUANCE ]
        </div>
      </div>

      <div style={bodyStyle}>
        {loading ? (
          <div style={loadingBoxStyle}>
            <div className="blinking-cursor" style={spinnerStyle}></div>
            <p style={loadingTextStyle}>
              {loadingPhases[loadingPhase]}
            </p>
            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '1rem' }}>
              Generating secure PDF, QR code payload, and SHA-256 anchor...
            </p>
          </div>
        ) : result ? (
          <div style={successBoxStyle}>
            <h3 style={{ color: '#39ff14', textShadow: '0 0 10px #39ff14', textAlign: 'center', marginTop: 0 }}>
              ✔ DIGITAL CERTIFICATE SUCCESSFULLY ISSUED
            </h3>

            <div style={badgeContainerStyle}>
              <div style={detailItemStyle}>
                <span style={labelStyle}>CERTIFICATE ID:</span>
                <span style={{ ...valueStyle, color: 'var(--neon-pink)', fontSize: '1.3rem' }}>{result.certificateId}</span>
              </div>

              <div style={detailItemStyle}>
                <span style={labelStyle}>STUDENT NAME:</span>
                <span style={valueStyle}>{formData.studentName}</span>
              </div>

              <div style={detailItemStyle}>
                <span style={labelStyle}>TITLE:</span>
                <span style={valueStyle}>{formData.certificateTitle}</span>
              </div>

              <div style={detailItemStyle}>
                <span style={labelStyle}>ORGANIZATION:</span>
                <span style={valueStyle}>{formData.organization}</span>
              </div>

              <div style={detailItemStyle}>
                <span style={labelStyle}>SHA-256 FINGERPRINT:</span>
                <span style={hashStyle}>{result.hash}</span>
              </div>
            </div>

            <div style={qrSectionStyle}>
              <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', display: 'inline-block' }}>
                <QRCodeSVG value={verificationUrl} size={150} />
              </div>
              <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.8rem' }}>
                QR Code points to public verification portal: <br />
                <a href={`/verify/${result.certificateId}`} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-blue)' }}>
                  /verify/{result.certificateId}
                </a>
              </p>
            </div>

            <div style={actionRowStyle}>
              <a
                href={result.certificateUrl}
                target="_blank"
                rel="noreferrer"
                style={primaryBtnStyle}
              >
                📥 DOWNLOAD OFFICIAL PDF CERTIFICATE
              </a>

              <a
                href={`/verify/${result.certificateId}`}
                target="_blank"
                rel="noreferrer"
                style={secondaryBtnStyle}
              >
                🔍 TEST VERIFICATION PORTAL
              </a>

              <button
                onClick={resetForm}
                style={outlineBtnStyle}
              >
                ➕ ISSUE ANOTHER CERTIFICATE
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={formStyle}>
            {error && (
              <div style={errorBoxStyle}>
                ⚠️ {error}
              </div>
            )}

            <div style={inputGroupStyle}>
              <label style={fieldLabelStyle}>STUDENT / RECIPIENT NAME *</label>
              <input
                type="text"
                name="studentName"
                value={formData.studentName}
                onChange={handleChange}
                placeholder="e.g., Krish Jain"
                required
                style={inputStyle}
              />
            </div>

            <div style={inputGridStyle}>
              <div style={inputGroupStyle}>
                <label style={fieldLabelStyle}>CERTIFICATE TITLE *</label>
                <input
                  type="text"
                  name="certificateTitle"
                  value={formData.certificateTitle}
                  onChange={handleChange}
                  placeholder="e.g., Certificate of Academic Excellence"
                  required
                  style={inputStyle}
                />
              </div>

              <div style={inputGroupStyle}>
                <label style={fieldLabelStyle}>COURSE / PROGRAM</label>
                <input
                  type="text"
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  placeholder="e.g., B.Tech Computer Science"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={inputGridStyle}>
              <div style={inputGroupStyle}>
                <label style={fieldLabelStyle}>ISSUING ORGANIZATION *</label>
                <input
                  type="text"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  placeholder="e.g., National Institute of Technology"
                  required
                  style={inputStyle}
                />
              </div>

              <div style={inputGroupStyle}>
                <label style={fieldLabelStyle}>ISSUE DATE *</label>
                <input
                  type="date"
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={fieldLabelStyle}>CERTIFICATE DESCRIPTION / REMARKS</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g., In recognition of outstanding academic performance and thesis completion."
                rows={3}
                style={textareaStyle}
              />
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button type="submit" style={submitBtnStyle}>
                🛡️ GENERATE & ANCHOR DIGITAL CERTIFICATE
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Styling tokens matching neon cyberpunk aesthetic
const containerStyle = {
  margin: '2rem auto 4rem auto',
  maxWidth: '800px',
  border: '2px solid rgba(0, 243, 255, 0.4)',
  backgroundColor: 'rgba(10, 10, 15, 0.9)',
  boxShadow: '0 0 25px rgba(0, 243, 255, 0.15)',
  fontFamily: '"Courier New", Courier, monospace',
  backdropFilter: 'blur(10px)',
  borderRadius: '4px'
};

const headerStyle = {
  borderBottom: '2px solid rgba(0, 243, 255, 0.4)',
  padding: '1.2rem 1.8rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 243, 255, 0.05)'
};

const bodyStyle = {
  padding: '2rem'
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.2rem'
};

const inputGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem'
};

const inputGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem'
};

const fieldLabelStyle = {
  color: 'var(--neon-blue)',
  fontSize: '0.85rem',
  fontWeight: 'bold',
  letterSpacing: '1px'
};

const inputStyle = {
  padding: '0.8rem 1rem',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  border: '1px solid rgba(0, 243, 255, 0.3)',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: '0.95rem',
  borderRadius: '4px',
  outline: 'none'
};

const textareaStyle = {
  ...inputStyle,
  resize: 'vertical'
};

const submitBtnStyle = {
  padding: '1rem 2.5rem',
  background: 'rgba(0, 243, 255, 0.15)',
  border: '2px solid var(--neon-blue)',
  color: '#fff',
  fontSize: '1rem',
  fontWeight: 'bold',
  letterSpacing: '2px',
  cursor: 'pointer',
  borderRadius: '4px',
  boxShadow: '0 0 15px rgba(0, 243, 255, 0.3)',
  transition: 'all 0.3s ease'
};

const loadingBoxStyle = {
  textAlign: 'center',
  padding: '3rem 1rem'
};

const spinnerStyle = {
  width: '20px',
  height: '20px',
  backgroundColor: 'var(--neon-blue)',
  margin: '0 auto 1.5rem auto'
};

const loadingTextStyle = {
  color: 'var(--neon-blue)',
  fontSize: '1.1rem',
  letterSpacing: '2px',
  fontWeight: 'bold'
};

const successBoxStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem'
};

const badgeContainerStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderLeft: '4px solid #39ff14',
  padding: '1.2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.8rem'
};

const detailItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem'
};

const labelStyle = {
  color: '#888',
  fontSize: '0.8rem',
  letterSpacing: '1px'
};

const valueStyle = {
  color: '#fff',
  fontSize: '1.05rem',
  fontWeight: 'bold'
};

const hashStyle = {
  color: 'var(--neon-blue)',
  fontSize: '0.9rem',
  wordBreak: 'break-all',
  fontFamily: 'monospace'
};

const qrSectionStyle = {
  textAlign: 'center',
  padding: '1rem',
  backgroundColor: 'rgba(0, 243, 255, 0.03)',
  borderRadius: '4px',
  border: '1px dashed rgba(0, 243, 255, 0.2)'
};

const actionRowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.8rem',
  marginTop: '1rem'
};

const primaryBtnStyle = {
  display: 'block',
  textAlign: 'center',
  padding: '1rem',
  backgroundColor: '#39ff14',
  color: '#000',
  fontWeight: 'bold',
  textDecoration: 'none',
  borderRadius: '4px',
  letterSpacing: '1px',
  boxShadow: '0 0 15px rgba(57, 255, 20, 0.4)'
};

const secondaryBtnStyle = {
  display: 'block',
  textAlign: 'center',
  padding: '0.8rem',
  backgroundColor: 'rgba(0, 243, 255, 0.1)',
  border: '1px solid var(--neon-blue)',
  color: 'var(--neon-blue)',
  fontWeight: 'bold',
  textDecoration: 'none',
  borderRadius: '4px',
  letterSpacing: '1px'
};

const outlineBtnStyle = {
  padding: '0.8rem',
  backgroundColor: 'transparent',
  border: '1px solid #666',
  color: '#aaa',
  fontWeight: 'bold',
  cursor: 'pointer',
  borderRadius: '4px',
  fontFamily: 'inherit'
};

const errorBoxStyle = {
  padding: '0.8rem 1rem',
  backgroundColor: 'rgba(255, 0, 85, 0.15)',
  border: '1px solid var(--neon-pink)',
  color: 'var(--neon-pink)',
  fontSize: '0.9rem',
  borderRadius: '4px'
};
