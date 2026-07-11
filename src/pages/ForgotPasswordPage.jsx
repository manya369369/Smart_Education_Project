import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/GoalSetupPage.css';
import '../styles/AuthPages.css';

const ForgotPasswordPage = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(email);
      // Always show privacy-safe message (don't reveal if account exists)
      setSuccessMessage('If an account exists for this email, a password reset link has been sent. Please check your inbox.');
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="goal-setup-wrapper animate-fadeIn">
      <Link to="/login" className="back-button" style={{ textDecoration: 'none' }}>
        ← Back to Login
      </Link>

      <div className="goal-card">
        <header className="goal-card-header">
          <h1 className="goal-card-title">Reset Password</h1>
          <p className="goal-card-subtitle">
            Enter your email to receive password reset instructions.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="goal-form">
          {errorMessage && (
            <div className="error-banner">
              <span className="error-icon">!</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="error-banner" style={{ background: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.3)', color: '#34d399' }}>
              <span className="error-icon" style={{ background: '#34d399', color: '#020617' }}>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reset-email-input" className="form-label">
              Email Address
            </label>
            <input
              id="reset-email-input"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="name@domain.com"
              className="form-input"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="button-container">
            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? (
                <span className="btn-loading-content">
                  <span className="btn-spinner"></span>
                  SENDING...
                </span>
              ) : (
                'SEND PASSWORD RESET LINK'
              )}
            </button>
          </div>

          {/* Back to Login link */}
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#94a3b8' }}>
            Remember your password?{' '}
            <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
