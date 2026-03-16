import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useNotifications } from '../hooks';

function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  
  const navigate = useNavigate();
  const { signup, isAuthenticated, error: authError } = useAuth();
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const getStrengthDetails = () => {
    const strength = getPasswordStrength();
    const widths = ['20%', '40%', '60%', '80%', '100%'];
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#28a745'];
    const texts = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    return {
      width: widths[strength - 1] || '0',
      color: colors[strength - 1] || '#e9ecef',
      text: texts[strength - 1] || ''
    };
  };

  const validateForm = () => {
    if (formData.password.length < 6) {
      showError('Password must be at least 6 characters long', 'Validation Error');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      showError('Passwords do not match. Please check and try again.', 'Validation Error');
      return false;
    }

    if (!agreeTerms) {
      showError('You must agree to the Terms Of Service and Privacy Policy', 'Validation Error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLocalLoading(true);

    try {
      const result = await signup({
        email: formData.email,
        fullName: formData.fullName,
        username: formData.username,
        password: formData.password
      });

      if (result.success) {
        showSuccess('Account created! Welcome to ChatConnect 🎉', 'Welcome!');
        navigate('/chat');
      } else {
        showError(result.error || 'Failed to create account. Please try again.', 'Signup Failed');
      }
    } catch (err) {
      showError(err.message || 'An error occurred during signup', 'Error');
    } finally {
      setLocalLoading(false);
    }
  };

  const strength = getStrengthDetails();
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;
  const passwordsDontMatch = formData.confirmPassword && formData.password !== formData.confirmPassword;

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-left-content">
            <i className="fas fa-user-plus"></i>
            <h2>Join ChatConnect</h2>
            <p>Create an account and start connecting</p>
          </div>
        </div>
        
        <div className="auth-right">
          <div className="auth-box">
            <div className="auth-logo">
              <i className="fas fa-comments"></i>
              <h1>ChatConnect</h1>
            </div>
            
            <p className="auth-subtitle">Sign up to connect with friends and colleagues</p>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email address"
                  required
                  disabled={localLoading}
                  autoComplete="email"
                />
                <i className="fas fa-envelope input-icon"></i>
              </div>
              
              <div className="form-group">
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Full Name"
                  required
                  disabled={localLoading}
                  autoComplete="name"
                />
                <i className="fas fa-user input-icon"></i>
              </div>
              
              <div className="form-group">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username"
                  required
                  disabled={localLoading}
                  autoComplete="username"
                />
                <i className="fas fa-at input-icon"></i>
              </div>
              
              <div className="form-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password (min. 6 characters)"
                  required
                  minLength="6"
                  disabled={localLoading}
                  autoComplete="new-password"
                />
                <i className="fas fa-lock input-icon"></i>
                <i
                  className={`fas fa-${showPassword ? 'eye-slash' : 'eye'} toggle-password`}
                  onClick={() => setShowPassword(!showPassword)}
                ></i>
              </div>
              
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{
                        width: strength.width,
                        backgroundColor: strength.color
                      }}
                    ></div>
                  </div>
                  <span className="strength-text" style={{ color: strength.color }}>
                    {strength.text}
                  </span>
                </div>
              )}
              
              <div className="form-group">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm Password"
                  required
                  minLength="6"
                  disabled={localLoading}
                  autoComplete="new-password"
                  style={{
                    borderColor: passwordsDontMatch ? '#dc3545' : passwordsMatch ? '#28a745' : ''
                  }}
                />
                <i className="fas fa-lock input-icon"></i>
                <i
                  className={`fas fa-${showConfirmPassword ? 'eye-slash' : 'eye'} toggle-password`}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                ></i>
                {passwordsDontMatch && (
                  <i className="fas fa-exclamation-circle password-status-icon error"></i>
                )}
                {passwordsMatch && (
                  <i className="fas fa-check-circle password-status-icon success"></i>
                )}
              </div>
              
              {passwordsDontMatch && (
                <div className="password-match-error">
                  Passwords do not match
                </div>
              )}
              
              <div className="form-terms">
                <label>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                    disabled={localLoading}
                  />
                  <span>I agree to the <Link to="#terms">Terms of Service</Link> and <Link to="#privacy">Privacy Policy</Link></span>
                </label>
              </div>
              
              <button type="submit" className="btn-full" disabled={localLoading}>
                {localLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Creating Account...
                  </>
                ) : (
                  <>
                    <span>Sign Up</span>
                    <i className="fas fa-arrow-right"></i>
                  </>
                )}
              </button>
              

            </form>
            
            {authError && (
              <div className="auth-error">
                <i className="fas fa-exclamation-circle"></i>
                {authError}
              </div>
            )}
          </div>
          
          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Login</Link></p>
          </div>
          
          <div className="auth-links">
            <Link to="/">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;