import React, { useEffect, useState } from 'react';
import './Preloader.css';

const Preloader = () => {
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  
  const loadingTexts = [
    "Initializing SecureVault...",
    "Loading Encryption Modules...",
    "Connecting to Blockchain..."
  ];

  useEffect(() => {
    // Smooth progress reaching 100% in ~2.5 seconds
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return Math.min(prev + Math.random() * 2 + 0.8, 100);
      });
    }, 30);

    const textInterval = setInterval(() => {
      setTextIndex((prev) => {
        if (prev < loadingTexts.length - 1) {
            return prev + 1;
        }
        return prev;
      });
    }, 850); 

    return () => {
      clearInterval(progressInterval);
      clearInterval(textInterval);
    };
  }, []);

  return (
    <div className="sv-preloader-container">
      <div className="sv-preloader-glow top-glow"></div>
      <div className="sv-preloader-glow bottom-glow"></div>

      <div className="sv-preloader-content">
        <div className="sv-loader-spinner">
           <div className="sv-spinner-ring blue-ring"></div>
           <div className="sv-spinner-ring pink-ring"></div>
        </div>
        
        <h2 className="sv-loading-text" key={textIndex}>
          {loadingTexts[textIndex]}
        </h2>
        
        <div className="sv-progress-wrapper">
          <div className="sv-progress-bar">
            <div 
              className="sv-progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="sv-progress-percentage">
            {Math.floor(progress)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preloader;
