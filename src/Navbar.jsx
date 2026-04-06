export default function Navbar({ currentPage, setCurrentPage }) {
  const navItems = [
    { id: 'home', label: 'HOME' },
    { id: 'upload', label: 'UPLOAD FILE' },
    { id: 'verify', label: 'VERIFY FILE' },
    { id: 'how-it-works', label: 'HOW IT WORKS' },
    { id: 'features', label: 'FEATURES' },
  ];

  return (
    <nav style={navbarStyle}>
      <style>{`
        .nav-item-hover:hover {
          color: var(--neon-blue) !important;
          text-shadow: 0 0 10px var(--neon-blue) !important;
        }
      `}</style>
      <div style={logoStyle}>
        <span style={{color: 'var(--neon-pink)'}}>[</span> 
        SECURE-VAULT 
        <span style={{color: 'var(--neon-pink)'}}>]</span>
      </div>
      <ul style={navStyle}>
        {navItems.map(item => (
          <li 
            key={item.id} 
            className="nav-item-hover"
            style={currentPage === item.id ? activeNavItemStyle : navItemStyle}
            onClick={() => setCurrentPage(item.id)}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </nav>
  );
}

const navbarStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1.2rem 4rem',
  background: 'rgba(5, 5, 8, 0.95)',
  backdropFilter: 'blur(10px)',
  borderBottom: '2px solid rgba(0, 243, 255, 0.3)',
  boxShadow: '0 0 20px rgba(0, 243, 255, 0.15)',
  zIndex: 1000,
  boxSizing: 'border-box'
};

const logoStyle = {
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: '1.5rem',
  fontWeight: 'bold',
  color: 'var(--neon-blue)',
  textShadow: '0 0 5px var(--neon-blue)',
  letterSpacing: '2px'
};

const navStyle = {
  display: 'flex',
  gap: '2rem',
  listStyle: 'none',
  margin: 0,
  padding: 0
};

const navItemStyle = {
  cursor: 'pointer',
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: '1rem',
  fontWeight: 'bold',
  color: '#888',
  letterSpacing: '1px',
  transition: 'all 0.3s',
  padding: '0.5rem 0'
};

const activeNavItemStyle = {
  ...navItemStyle,
  color: 'var(--neon-pink)',
  textShadow: '0 0 10px var(--neon-pink)',
  borderBottom: '2px solid var(--neon-pink)',
};
