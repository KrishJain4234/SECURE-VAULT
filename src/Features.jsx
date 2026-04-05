export default function Features() {
  const features = [
    {
      title: "IMMUTABLE STORAGE",
      desc: "Doc hashes are firmly anchored into our simulated blockchain node, ensuring mathematical proof of existence at a specific timestamp.",
      icon: "⛓️"
    },
    {
      title: "DEEP OCR ANALYSIS",
      desc: "Each uploaded document undergoes text extraction. Verify mode compares characters side-by-side to detect micro-variations that hashing alone might miss.",
      icon: "👁️"
    },
    {
      title: "INSTANT QR VERIFICATION",
      desc: "Every secured document is issued a unique dynamic QR code. Anyone scanning the code can visually confirm the document's authenticity from the network.",
      icon: "📱"
    },
    {
      title: "ZERO TRUST ARCHITECTURE",
      desc: "Local nodes don't retain underlying documents after processing. The system solely verifies against highly-encrypted SHA-256 signatures.",
      icon: "🛡️"
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
               <div style={iconStyle}>{f.icon}</div>
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

const iconStyle = {
  fontSize: '3rem',
  marginBottom: '1.5rem',
  filter: 'drop-shadow(0 0 10px rgba(0, 243, 255, 0.5))'
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
