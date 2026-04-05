import { useEffect, useState } from 'react'
import './index.css'
import HowItWorks from './HowItWorks'
import DocumentManager from './DocumentManager'
import Navbar from './Navbar'
import Features from './Features'
import { Routes, Route } from 'react-router-dom'
import VerificationPage from './VerificationPage'

const CHARS = ['V', 'M', 'S', 'W', 'O', 'T', 'F', 'D', 'I', 'u', 'e', 'X', '1', '0', '>', '<', '//', '#', '@']

function App() {
  const [chars, setChars] = useState([])
  const [particles, setParticles] = useState([])
  const [streams, setStreams] = useState([])
  const [currentPage, setCurrentPage] = useState('home')

  useEffect(() => {
    // Generate random background characters
    const generateChars = () => Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      char: CHARS[Math.floor(Math.random() * CHARS.length)],
      top: `${Math.random() * 100}vh`,
      left: `${Math.random() * 100}vw`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 7}s`,
    }))
    
    setChars(generateChars())

    // Intermittently scramble some characters
    const charInterval = setInterval(() => {
      setChars(prevChars => prevChars.map(c => 
        Math.random() > 0.8 ? { ...c, char: CHARS[Math.floor(Math.random() * CHARS.length)] } : c
      ))
    }, 500)

    // Generate floating particles
    const newParticles = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      size: `${2 + Math.random() * 4}px`,
      delay: `${Math.random() * 5}s`,
      duration: `${5 + Math.random() * 10}s`,
      color: Math.random() > 0.5 ? 'var(--neon-blue)' : 'var(--neon-pink)',
    }))
    setParticles(newParticles)

    // Generate data streams (diagonal lines)
    const newStreams = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 120 - 20}vw`, // Allow streams to start off-screen
      delay: `${Math.random() * 5}s`,
      duration: `${1.5 + Math.random() * 3}s`,
      color: Math.random() > 0.7 ? 'var(--neon-pink)' : 'var(--neon-blue)',
      width: `${1 + Math.random() * 3}px`,
    }))
    setStreams(newStreams)

    return () => clearInterval(charInterval)
  }, [])

  return (
    <>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <div className="grid-container">
        <div className="grid-bg"></div>
      </div>
      <div className="vignette"></div>
      <div className="scanlines"></div>

      {streams.map(s => (
        <div key={`stream-${s.id}`} className="data-stream" style={{
          left: s.left,
          width: s.width,
          animationDelay: s.delay,
          animationDuration: s.duration,
          background: `linear-gradient(to bottom, transparent, ${s.color}, ${s.color}, transparent)`
        }}></div>
      ))}

      {chars.map(c => (
        <div key={`char-${c.id}`} className="floating-char" style={{
          top: c.top, left: c.left, 
          animationDelay: c.delay,
          animationDuration: c.duration,
        }}>
          {c.char}
        </div>
      ))}

      {particles.map(p => (
        <div key={`particle-${p.id}`} className="particle" style={{
          left: p.left, width: p.size, height: p.size,
          backgroundColor: p.color,
          color: p.color, // For box-shadow currentColor
          animationDelay: p.delay,
          animationDuration: p.duration,
        }}></div>
      ))}

      <div style={{ paddingTop: '100px', minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={
            <>
              {currentPage === 'home' && (
                <div className="container">
                  <h1 className="hero-title" data-text="SECURE-VAULT">SECURE-VAULT</h1>
                  
                  <div className="hero-tag">
                    <span>Tamper-Proof Documents</span>
                    <span className="bullet">•</span>
                    <span>Powered by Blockchain</span>
                  </div>

                  <div className="slider-container">
                    <div className="slider-track">
                      <div className="slider-thumb-blue"></div>
                      <div className="slider-thumb-pink"></div>
                    </div>
                  </div>

                  <div className="status-bar">
                    <span>[ SYSTEM STATUS: ACTIVE ]</span>
                    <span>•</span>
                    <span>[ ENCRYPTION: MAXIMUM ]</span>
                  </div>
                </div>
              )}

              {currentPage === 'how-it-works' && <HowItWorks />}
              
              {currentPage === 'features' && <Features />}

              {currentPage === 'upload' && <DocumentManager mode="upload" />}
              
              {currentPage === 'verify' && <DocumentManager mode="verify" />}
            </>
          } />
          <Route path="/verify/:documentId" element={<VerificationPage />} />
        </Routes>
      </div>
    </>
  )
}

export default App
