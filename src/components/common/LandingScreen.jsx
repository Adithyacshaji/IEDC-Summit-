import React, { useState } from 'react';
import './LandingScreen.css';

export default function LandingScreen({ onFinish }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleEnter = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      if (onFinish) onFinish();
    }, 400);
  };

  return (
    <div 
      className={`landing-overlay ${isExiting ? 'landing-exit' : ''}`}
    >
      {/* Animated Subtle Blue/Black Grid Background */}
      <div className="landing-grid-bg" />

      {/* Main Center Container */}
      <div className="landing-content-card">
        {/* Animated Headline */}
        <div className="landing-text-container">
          <h1 className="landing-title">
            <span className="title-word title-explore">EXPLORE</span>{" "} <br/>
            <span className="title-word title-iedc">IEDC SUMMIT</span>{" "}
            <span className="title-word title-year">2026</span>
          </h1>
          <p className="landing-subtitle">
            Smart Campus Navigation & Real-Time Event Guide
          </p>
        </div>
        

        {/* Logo Frame */}
        <div className="landing-logo-wrapper">
          <img 
            src="/iedcsummit_logo.jpg" 
            alt="IEDC Summit 2026 Logo" 
            className="landing-logo-img" 
          />
        </div>

        {/* Top Summit Badge */}
        <div className="landing-top-badge">
          <span className="badge-pulse-dot" />
          <span>IEDC SUMMIT 2026</span>
        </div>

        {/* Interactive Call-To-Action Button */}
        <button className="landing-cta-btn" onClick={handleEnter}>
          <span>Locate Events</span>
          <svg className="cta-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>

        {/* Quick Features Highlight */}
        <div className="landing-features-row">
          <div className="feature-pill">
            <span className="pill-dot blue" /> Activity Hub
          </div>
          <div className="feature-pill">
            <span className="pill-dot black" /> Live Events
          </div>
          <div className="feature-pill">
            <span className="pill-dot blue" /> Venue Guide
          </div>
        </div>
      </div>
    </div>
  );
}
