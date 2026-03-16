import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useNotifications } from '../hooks';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [banError, setBanError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();
  const { login, isAuthenticated, error: authError } = useAuth();
  const { showSuccess } = useNotifications();

  useEffect(() => {
    if (isAuthenticated) navigate('/chat');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    setBanError(false);
    setErrorMsg('');

    try {
      const result = await login(username, password);

      if (result.success) {
        if (rememberMe) localStorage.setItem('rememberMe', 'true');
        showSuccess('Login successful! Welcome back!', 'Welcome');
        navigate('/chat');
      } else {
        const msg = result.error || 'Invalid username or password';
        console.log('[Login] Failed:', msg);
        // 403 = banned account
        if (msg.toLowerCase().includes('banned') || msg.toLowerCase().includes('access denied') || msg.toLowerCase().includes('suspended')) {
          setBanError(true);
          setErrorMsg(msg);
        } else {
          setErrorMsg(msg === 'Invalid credentials' ? 'Invalid username or password' : msg);
        }
      }
    } catch (err) {
      console.error('Login Error:', err);
      const msg = err.message || 'An error occurred during login';
      if (msg.toLowerCase().includes('banned') || msg.toLowerCase().includes('access denied')) {
        setBanError(true);
        setErrorMsg(msg);
      } else {
        setErrorMsg(msg === 'Invalid credentials' ? 'Invalid username or password' : msg);
      }
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <style>{`
        .ban-banner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%);
          border: 1.5px solid #ef4444;
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 20px;
          text-align: center;
          animation: ban-shake 0.4s ease;
        }
        @keyframes ban-shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .ban-icon {
          width: 52px; height: 52px;
          border-radius: 50%;
          background: #ef444422;
          border: 2px solid #ef4444;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          color: #ef4444;
        }
        .ban-title {
          font-size: 17px;
          font-weight: 800;
          color: #fca5a5;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .ban-subtitle {
          font-size: 13px;
          color: #f87171;
          margin: 0;
          line-height: 1.5;
        }
        .ban-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #ef444430;
          border: 1px solid #ef444466;
          color: #fca5a5;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 20px;
        }
        .auth-error-plain {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 16px;
          color: #fca5a5;
          font-size: 13px;
        }
        .form-group input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-left-content">
            <i className="fas fa-comments"></i>
            <h2>Welcome to ChatConnect</h2>
            <p>Connect with friends and family instantly</p>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-box">
            <div className="auth-logo">
              <i className="fas fa-comments"></i>
              <h1>ChatConnect</h1>
            </div>

            <p className="auth-subtitle">Welcome back! Please login to your account.</p>

            {/* ── Banned account banner ── */}
            {banError && (
              <div className="ban-banner">
                <div className="ban-icon">
                  <i className="fas fa-ban"></i>
                </div>
                <div className="ban-badge">
                  <i className="fas fa-shield-alt" style={{ fontSize: 9 }}></i>
                  Account Suspended
                </div>
                <p className="ban-title">Access Denied</p>
                <p className="ban-subtitle">
                  Your account has been banned by an administrator.<br />
                  If you believe this is a mistake, please contact support.
                </p>
              </div>
            )}

            {/* ── Regular error ── */}
            {!banError && errorMsg && (
              <div className="auth-error-plain">
                <i className="fas fa-exclamation-circle" style={{ color: '#ef4444', flexShrink: 0 }}></i>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setBanError(false); setErrorMsg(''); }}
                  placeholder="Username or Email"
                  required
                  disabled={localLoading}
                  autoComplete="username"
                  style={banError ? { borderColor: '#ef4444', opacity: 0.7 } : {}}
                />
                <i className="fas fa-user input-icon"></i>
              </div>

              <div className="form-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setBanError(false); setErrorMsg(''); }}
                  placeholder="Password"
                  required
                  disabled={localLoading}
                  autoComplete="current-password"
                  style={banError ? { borderColor: '#ef4444', opacity: 0.7 } : {}}
                />
                <i className="fas fa-lock input-icon"></i>
                <i
                  className={`fas fa-${showPassword ? 'eye-slash' : 'eye'} toggle-password`}
                  onClick={() => setShowPassword(!showPassword)}
                ></i>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={localLoading}
                  />
                  <span>Remember me</span>
                </label>
                <a href="#forgot" className="forgot-password">Forgot password?</a>
              </div>

              <button
                type="submit"
                className="btn-full"
                disabled={localLoading || banError}
                style={banError ? { background: '#374151', cursor: 'not-allowed', opacity: 0.6 } : {}}
              >
                {localLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Logging in...
                  </>
                ) : banError ? (
                  <>
                    <i className="fas fa-ban"></i> Account Banned
                  </>
                ) : (
                  <>
                    <span>Log In</span>
                    <i className="fas fa-arrow-right"></i>
                  </>
                )}
              </button>
            </form>

            {/* Legacy authError fallback */}
            {authError && !errorMsg && (
              <div className="auth-error">
                <i className="fas fa-exclamation-circle"></i>
                {authError}
              </div>
            )}
          </div>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
          </div>

          <div className="auth-links">
            <Link to="/">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;