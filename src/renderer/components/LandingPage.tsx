import React, { useState, useEffect } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onEnterChat: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnterChat }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleEnterChat = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    onEnterChat();
  };

  return (
    <div className={`landing-page ${isLoaded ? 'loaded' : ''}`}>
      <div className="landing-container">
        {/* Animated Background */}
        <div className="animated-background">
          {/* Geometric Shapes */}
          <div className="geometric-shapes">
            <div className="geo-shape geo-circle-1"></div>
            <div className="geo-shape geo-square-1"></div>
            <div className="geo-shape geo-triangle-1"></div>
            <div className="geo-shape geo-circle-2"></div>
            <div className="geo-shape geo-square-2"></div>
            <div className="geo-shape geo-line-1"></div>
            <div className="geo-shape geo-line-2"></div>
            <div className="geo-shape geo-dot-1"></div>
            <div className="geo-shape geo-dot-2"></div>
            <div className="geo-shape geo-dot-3"></div>
          </div>
          
          {/* Grid Pattern */}
          <div className="grid-overlay"></div>
        </div>

        {/* Main Content */}
        <div className="landing-content">
          {/* Logo Section */}
          <div className="logo-container">
            <div className="logo-wrapper">
              <div className="logo-hexagon">
                <div className="hexagon-inner">
                  <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="11" width="14" height="10" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
              </div>
              <div className="logo-orbit orbit-1"></div>
              <div className="logo-orbit orbit-2"></div>
              <div className="logo-orbit orbit-3"></div>
            </div>
            <h1 className="app-title">
              <span className="title-line">SECURE</span>
              <span className="title-line">MESSENGER</span>
            </h1>
            <div className="subtitle-wrapper">
              <div className="subtitle-line"></div>
              <p className="app-subtitle">END-TO-END ENCRYPTED</p>
              <div className="subtitle-line"></div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="features-container">
            <div className="feature-item" style={{ animationDelay: '0.1s' }}>
              <div className="feature-icon-wrapper">
                <div className="icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
              </div>
              <h3>MILITARY ENCRYPTION</h3>
              <div className="feature-bar"></div>
            </div>

            <div className="feature-item" style={{ animationDelay: '0.2s' }}>
              <div className="feature-icon-wrapper">
                <div className="icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                </div>
              </div>
              <h3>INSTANT DELIVERY</h3>
              <div className="feature-bar"></div>
            </div>

            <div className="feature-item" style={{ animationDelay: '0.3s' }}>
              <div className="feature-icon-wrapper">
                <div className="icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </div>
              </div>
              <h3>WORLDWIDE ACCESS</h3>
              <div className="feature-bar"></div>
            </div>
          </div>

          {/* Enter Button */}
          <div className="enter-section">
            <button 
              className={`enter-button ${isLoading ? 'loading' : ''}`}
              onClick={handleEnterChat}
              disabled={isLoading}
            >
              <div className="button-background">
                <div className="button-scan"></div>
              </div>
              {isLoading ? (
                <div className="button-text">
                  <div className="spinner-box">
                    <div className="spinner-square"></div>
                    <div className="spinner-square"></div>
                    <div className="spinner-square"></div>
                    <div className="spinner-square"></div>
                  </div>
                  <span>ESTABLISHING SECURE CONNECTION</span>
                </div>
              ) : (
                <div className="button-text">
                  <span>ENTER SECURE CHAT</span>
                  <div className="button-arrow">
                    <div className="arrow-line"></div>
                    <div className="arrow-head"></div>
                  </div>
                </div>
              )}
            </button>
            
            <div className="security-badge">
              <div className="badge-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"></path>
                </svg>
              </div>
              <span>256-BIT ENCRYPTION ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="landing-footer">
          <div className="footer-left">
            <div className="status-indicator">
              <div className="status-pulse"></div>
              <span>ALL SYSTEMS OPERATIONAL</span>
            </div>
          </div>
          <div className="footer-right">
            <span className="version">VERSION 1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;