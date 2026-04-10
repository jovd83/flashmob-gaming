/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React from 'react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    return (
        <div className="landing-container">
            <div className="background-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>
            
            <main className="landing-main">
                <div className="hero-content">
                    <div className="subtitle-reveal">
                        <span>EST. 2026 // OPERATIONAL</span>
                    </div>
                    
                    <h1 className="main-title">
                        FLASHMOB<br/>
                        <span className="accent-text">GAMES</span>
                    </h1>
                    
                    <div className="description-text">
                        The Collective Gaming Experience. <br/>
                        Connect. Play. Dominate.
                    </div>
                    
                    <div className="status-indicator">
                        <div className="status-dot"></div>
                        <span className="status-text">NETWORK ACTIVE</span>
                    </div>
                </div>
            </main>
            
            <footer className="landing-footer">
                <div className="footer-line"></div>
                <div className="footer-content">
                    <span>© 2026 FLASHMOB GAMING PLATFORM</span>
                    <span className="version-tag">V3.0.0-GOLD</span>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
