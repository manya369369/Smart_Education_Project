import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/GoalSetupPage.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const accountsRaw = localStorage.getItem('neurolearn_accounts');
      const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
      const targetEmail = email.trim().toLowerCase();

      if (accounts[targetEmail]) {
        setSuccessMessage('Password reset is not available in offline mode. Please create a new account or contact admin.');
      } else {
        setErrorMessage('No account found with this email address.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('An error occurred. Please try again.');
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
            <div className="error-banner" style={{ background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#818cf8' }}>
              <span className="error-icon">ℹ</span>
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="button-container">
            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? 'SENDING REQUEST...' : 'SEND PASSWORD RESET LINK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
