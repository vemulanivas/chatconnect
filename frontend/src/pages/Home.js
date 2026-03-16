import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useUI } from '../hooks';

function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { initTheme } = useUI();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="gradient-text">ChatConnect</span>
              <br />
              Simple. Secure. Reliable messaging.
            </h1>
            <p className="hero-subtitle">
              Stay connected with friends and family. Send messages, make calls, 
              and share moments - all for free.
            </p>
            <div className="hero-buttons">
              <Link to="/signup" className="btn btn-primary-modern">
                <i className="fas fa-user-plus"></i>
                Get Started
              </Link>
              <Link to="/login" className="btn btn-secondary-modern">
                <i className="fas fa-sign-in-alt"></i>
                Log In
              </Link>
            </div>
            <div className="hero-features-mini">
              <div className="mini-feature">
                <i className="fas fa-check-circle"></i>
                <span>Free forever</span>
              </div>
              <div className="mini-feature">
                <i className="fas fa-lock"></i>
                <span>End-to-end encrypted</span>
              </div>
              <div className="mini-feature">
                <i className="fas fa-globe"></i>
                <span>Available worldwide</span>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-image-wrapper">
              <div className="hero-mockup">
                <div className="mockup-content">
                  <div className="mockup-header">
                    <div className="mockup-avatar">
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="mockup-user-info">
                      <div className="mockup-name">John Doe</div>
                      <div className="mockup-status">Online</div>
                    </div>
                  </div>
                  <div className="mockup-messages">
                    <div className="mockup-message received">
                      Hey! How are you doing? 👋
                    </div>
                    <div className="mockup-message sent">
                      I'm great! Thanks for asking 😊
                    </div>
                  </div>
                </div>
              </div>
              <div className="hero-badge">
                <i className="fas fa-star"></i>
                <span>Trusted by millions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="section-header">
          <h2>Why Choose ChatConnect?</h2>
          <p>Everything you need for seamless communication</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-comments"></i>
            </div>
            <h3>Instant Messaging</h3>
            <p>Send text, photos, videos, and files instantly to anyone, anywhere in the world.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-video"></i>
            </div>
            <h3>Video & Voice Calls</h3>
            <p>Crystal clear video and voice calls with your contacts, no matter the distance.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-users"></i>
            </div>
            <h3>Group Chats</h3>
            <p>Create groups with up to 256 members. Share moments with everyone at once.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3>Secure & Private</h3>
            <p>Your messages are protected with end-to-end encryption. Your privacy matters.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-microphone"></i>
            </div>
            <h3>Voice Messages</h3>
            <p>Record and send voice messages when typing isn't convenient.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-desktop"></i>
            </div>
            <h3>Multi-Device</h3>
            <p>Access your chats from any device - phone, tablet, or computer.</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">2B+</div>
            <div className="stat-label">Active Users</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">100B+</div>
            <div className="stat-label">Messages Daily</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">180+</div>
            <div className="stat-label">Countries</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">99.9%</div>
            <div className="stat-label">Uptime</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to get started?</h2>
          <p>Join millions of people using ChatConnect to stay in touch with what matters most.</p>
          <Link to="/signup" className="btn btn-cta">
            <i className="fas fa-rocket"></i>
            Create Free Account
          </Link>
          <p className="cta-note">No credit card required • Free forever</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>ChatConnect</h3>
            <p>Simple, secure, reliable messaging.</p>
            <div className="social-links">
              <button type="button" aria-label="Facebook" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}><i className="fab fa-facebook"></i></button>
              <button type="button" aria-label="Twitter" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}><i className="fab fa-twitter"></i></button>
              <button type="button" aria-label="Instagram" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}><i className="fab fa-instagram"></i></button>
              <button type="button" aria-label="LinkedIn" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}><i className="fab fa-linkedin"></i></button>
            </div>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li><button type="button" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}>Features</button></li>
              <li><button type="button" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}>Security</button></li>
              <li><button type="button" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}>Business</button></li>
              <li><button type="button" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}>Download</button></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <ul>
              <li><button type="button" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}>About</button></li>
              <li><button type="button" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}>Careers</button></li>
              <li><button type="button" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}>Blog</button></li>
              <li><button type="button" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}>Press</button></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><button type="button" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}>Help Center</button></li>
              <li><button type="button" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}>Contact</button></li>
              <li><button type="button" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}>Privacy</button></li>
              <li><button type="button" style={{background:"none",border:"none",cursor:"pointer",padding:0,color:"inherit"}}>Terms</button></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 ChatConnect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;