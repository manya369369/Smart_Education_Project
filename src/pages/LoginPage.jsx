import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/GoalSetupPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  useEffect(() => {
    try {
      const userRaw = localStorage.getItem('neurolearn_user');
      if (userRaw) {
        const userObj = JSON.parse(userRaw);
        if (userObj.loggedIn) {
          navigate('/goal-setup');
        }
      }
    } catch (e) {}
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const { email, password } = formData;

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const accountsRaw = localStorage.getItem('neurolearn_accounts');
      const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
      const targetEmail = email.trim().toLowerCase();

      const account = accounts[targetEmail];

      if (!account) {
        setErrorMessage('No account found. Please sign up first.');
        setIsLoading(false);
        return;
      }

      if (account.password !== password) {
        setErrorMessage('Incorrect password. Please try again.');
        setIsLoading(false);
        return;
      }

      // Success
      localStorage.setItem('neurolearn_user', JSON.stringify({
        name: account.name,
        email: account.email,
        loggedIn: true,
        loginTime: new Date().toISOString()
      }));

      console.log("Logged in successfully via local auth");
      navigate('/goal-setup');
    } catch (err) {
      console.error("Local login error:", err);
      setErrorMessage('An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="goal-setup-wrapper animate-fadeIn">
      {/* Small Back button at top-left corner */}
      <button className="back-button" onClick={handleBack} type="button">
        ← Back
      </button>

      {/* Main card centered on page */}
      <div className="goal-card">
        <header className="goal-card-header">
          <h1 className="goal-card-title">Welcome to NeuroLearn</h1>
          <p className="goal-card-subtitle">
            Sign in to start your personalized AI-driven learning journey.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="goal-form">
          {/* Error Message inside the card */}
          {errorMessage && (
            <div className="error-banner">
              <span className="error-icon">!</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Email Address */}
          <div className="form-group">
            <label htmlFor="login-email-input" className="form-label">
              Email Address
            </label>
            <input
              id="login-email-input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="name@domain.com"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          {/* 2. Password */}
          <div className="form-group">
            <label htmlFor="login-password-input" className="form-label">
              Password
            </label>
            <input
              id="login-password-input"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#818cf8',
                cursor: 'pointer',
                fontWeight: 500,
                padding: 0,
                fontSize: '0.85rem'
              }}
            >
              Forgot Password?
            </button>
          </div>

          {/* Continue button */}
          <div className="button-container">
            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? 'SIGNING IN...' : 'CONTINUE'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#94a3b8' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
              Sign Up
            </Link>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(2, 6, 23, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div className="goal-card animate-fadeIn" style={{ maxWidth: '450px', padding: '2rem' }}>
            <header className="goal-card-header" style={{ marginBottom: '1.5rem' }}>
              <h2 className="goal-card-title" style={{ fontSize: '1.5rem' }}>Forgot Password</h2>
            </header>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '2rem', textAlign: 'center' }}>
              Password reset is not available in local mode. Please sign up again or contact admin.
            </p>
            <div className="button-container">
              <button 
                type="button" 
                className="submit-button" 
                onClick={() => setShowForgotModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
