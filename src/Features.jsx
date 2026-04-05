export default function Features() {
  const features = [
    {
      title: "IMMUTABLE STORAGE",
      desc: "Document hashes are securely anchored to the blockchain ledger. This guarantees mathematical proof that a file existed in its exact state at a specific point in time."
    },
    {
      title: "DEEP OCR ANALYSIS",
      desc: "Our engine extracts and analyzes the text of every document. If visual tweaks alter the file's hash, our OCR seamlessly kicks in to cross-check the core data."
    },
    {
      title: "INSTANT QR VERIFICATION",
      desc: "Every secured document gets a unique QR code. A quick scan is all it takes for anyone to immediately confirm its authenticity and origin."
    },
    {
      title: "ZERO TRUST ARCHITECTURE",
      desc: "Your raw data never stays on our servers. Processing is ephemeral, and the system only ever retains the cryptographic signatures required for verification."
    }
  ];

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>CORE SYSTEM FEATURES</h2>
      <div style={dividerStyle}></div>
      <div style={gridStyle}>
         {features.map((f, i) => (
            <div key={i} style={cardStyle} className="feature-card">
               <style>{`
                 .feature-card:hover {
                    box-shadow: 0 0 20px rgba(255, 0, 85, 0.3) !important;
                    border-color: var(--neon-pink) !important;
                    transform: translateY(-5px);
                 }
               `}</style>
               <h3 style={cardTitleStyle}>{f.title}</h3>
               <p style={cardDescStyle}>{f.desc}</p>
            </div>
         ))}
      </div>
    </div>
  );
}

const containerStyle = {
  padding: '6rem 2rem',
  maxWidth: '1000px',
  margin: '0 auto',
  textAlign: 'center',
  fontFamily: '"Courier New", Courier, monospace',
  zIndex: 10,
  position: 'relative'
};

const titleStyle = {
  fontSize: '2.5rem',
  color: '#fff',
  textShadow: '0 0 15px var(--neon-blue)',
  letterSpacing: '3px',
  marginBottom: '1rem'
};

const dividerStyle = {
  height: '2px',
  width: '150px',
  margin: '0 auto 4rem auto',
  background: 'linear-gradient(90deg, transparent, var(--neon-pink), transparent)'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '2rem'
};

const cardStyle = {
  background: 'rgba(10, 10, 15, 0.8)',
  border: '1px solid rgba(0, 243, 255, 0.3)',
  borderRadius: '8px',
  padding: '2rem',
  transition: 'all 0.3s ease',
  textAlign: 'left'
};

const cardTitleStyle = {
  fontSize: '1.4rem',
  color: 'var(--neon-blue)',
  marginBottom: '1rem',
  letterSpacing: '1px'
};

const cardDescStyle = {
  color: '#aaa',
  lineHeight: '1.6',
  fontSize: '1rem'
};
