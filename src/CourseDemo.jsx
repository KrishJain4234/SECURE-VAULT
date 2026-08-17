import React, { useState } from 'react';

export default function CourseDemo() {
  const [studentName, setStudentName] = useState('Alex Rivera');
  const [course, setCourse] = useState('Advanced Web Security & Cryptography');
  const [organization, setOrganization] = useState('CyberLearn Academy');
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleIssueCertificate = async () => {
    setLoading(true);
    setError(null);
    setApiResponse(null);

    try {
      const response = await fetch('http://localhost:5000/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName,
          certificateTitle: `Certificate of Completion - ${course}`,
          course,
          organization,
          issueDate: new Date().toISOString().split('T')[0],
          description: `Successfully completed all modules for ${course} with distinction.`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate certificate');
      }

      setApiResponse(data);
    } catch (err) {
      console.error('Error generating certificate:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header Badge */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-block',
          padding: '0.4rem 1.2rem',
          background: 'rgba(0, 243, 255, 0.1)',
          border: '1px solid var(--neon-blue)',
          borderRadius: '20px',
          color: 'var(--neon-blue)',
          fontSize: '0.85rem',
          fontFamily: '"Courier New", Courier, monospace',
          letterSpacing: '1px',
          marginBottom: '1rem'
        }}>
          ⚡ LIVE DEMO: EXTERNAL COURSE INTEGRATION
        </div>
        <h1 style={{
          fontSize: '2.5rem',
          color: '#fff',
          margin: '0.5rem 0',
          fontFamily: '"Courier New", Courier, monospace',
          textShadow: '0 0 10px rgba(255, 255, 255, 0.3)'
        }}>
          CyberLearn LMS Portal
        </h1>
        <p style={{ color: '#aaa', fontSize: '1rem', maxWidth: '650px', margin: '0 auto' }}>
          Simulating a third-party online learning website calling the <strong>SECURE-VAULT API</strong> automatically upon course completion.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: apiResponse ? '1fr 1fr' : '1fr', gap: '2rem', transition: 'all 0.5s ease' }}>
        
        {/* Course Card */}
        <div style={{
          background: 'rgba(15, 18, 30, 0.85)',
          border: '1px solid rgba(0, 243, 255, 0.3)',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 0 25px rgba(0, 243, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{
              background: 'rgba(57, 255, 20, 0.15)',
              border: '1px solid #39ff14',
              color: '#39ff14',
              padding: '0.3rem 0.8rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}>
              ✓ COURSE COMPLETED (100%)
            </span>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>ID: CS-9942</span>
          </div>

          <h2 style={{ color: 'var(--neon-blue)', fontSize: '1.4rem', marginTop: 0, marginBottom: '1rem' }}>
            {course}
          </h2>

          <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
            All 12 modules, lab assignments, and final cryptographic evaluation completed with an average score of 98%.
          </p>

          <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Student Name:</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(0, 243, 255, 0.4)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Course Name:</label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(0, 243, 255, 0.4)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Issuing Platform / Institution:</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(0, 243, 255, 0.4)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            onClick={handleIssueCertificate}
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading ? '#555' : 'linear-gradient(135deg, var(--neon-pink), var(--neon-blue))',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 0 15px rgba(255, 0, 127, 0.4)',
              transition: 'all 0.3s'
            }}
          >
            {loading ? '⚡ Calling SECURE-VAULT API...' : '🎓 Complete Course & Request Secured Certificate'}
          </button>

          {error && (
            <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(255, 0, 0, 0.2)', border: '1px solid red', borderRadius: '6px', color: '#ff6b6b', fontSize: '0.85rem' }}>
              ❌ Error: {error}
            </div>
          )}
        </div>

        {/* Live API Response Display */}
        {apiResponse && (
          <div style={{
            background: 'rgba(10, 14, 25, 0.95)',
            border: '1px solid var(--neon-pink)',
            borderRadius: '12px',
            padding: '1.8rem',
            boxShadow: '0 0 25px rgba(255, 0, 127, 0.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#39ff14', boxShadow: '0 0 8px #39ff14' }}></div>
                <h3 style={{ color: 'var(--neon-pink)', margin: 0, fontSize: '1.2rem', fontFamily: '"Courier New", Courier, monospace' }}>
                  SECURE-VAULT API RESPONSE
                </h3>
              </div>

              <div style={{ background: '#05070e', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(0, 243, 255, 0.2)', marginBottom: '1.2rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.4rem' }}>CREDENTIAL ID:</div>
                <div style={{ color: 'var(--neon-blue)', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {apiResponse.certificateId}
                </div>

                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.8rem', marginBottom: '0.4rem' }}>SHA-256 FINGERPRINT:</div>
                <div style={{ color: '#39ff14', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {apiResponse.hash}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.5rem' }}>
                <p style={{ color: '#ddd', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>
                  <strong>Embedded Security:</strong>
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#aaa', fontSize: '0.8rem', lineHeight: '1.6' }}>
                  <td>QR Code pointing to public verification page</td>
                  <li>SHA-256 cryptographic hash embedded in footer</li>
                  <li>Tamper-proof record registered in Vault database</li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <a
                href={apiResponse.certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '0.9rem',
                  background: 'rgba(0, 243, 255, 0.15)',
                  border: '1px solid var(--neon-blue)',
                  borderRadius: '6px',
                  color: 'var(--neon-blue)',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  boxShadow: '0 0 10px rgba(0, 243, 255, 0.2)'
                }}
              >
                📥 Download Issued PDF Certificate
              </a>

              <a
                href={`/verify/${apiResponse.certificateId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '0.7rem',
                  background: 'transparent',
                  border: '1px dashed rgba(255, 255, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#ccc',
                  textDecoration: 'none',
                  fontSize: '0.85rem'
                }}
              >
                🔍 Open Public Verification Portal
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
