import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/GoalSetupPage.css';

const SignUpPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validatePassword = (pass) => {
    if (pass.length < 8) return false;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasDigit = /\d/.test(pass);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);
    return hasUpper && hasLower && hasDigit && hasSpecial;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const { name, email, password, confirmPassword } = formData;

    if (!name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (name.trim().length < 3) {
      setErrorMessage('Full name must be at least 3 characters.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!validatePassword(password)) {
      setErrorMessage(
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const accountsRaw = localStorage.getItem('neurolearn_accounts');
      const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
      const targetEmail = email.trim().toLowerCase();

      if (accounts[targetEmail]) {
        setErrorMessage('Account already exists. Please login.');
        setIsLoading(false);
        return;
      }

      // Save new account
      accounts[targetEmail] = {
        name: name.trim(),
        email: email.trim(),
        password: password,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem('neurolearn_accounts', JSON.stringify(accounts));

      // Auto login
      localStorage.setItem('neurolearn_user', JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        loggedIn: true,
        loginTime: new Date().toISOString()
      }));

      setSuccessMessage('Account created successfully!');
      setTimeout(() => {
        navigate('/goal-setup');
      }, 1000);
    } catch (err) {
      console.error("Local signup error:", err);
      setErrorMessage('An error occurred during sign up.');
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
          <h1 className="goal-card-title">Create Account</h1>
          <p className="goal-card-subtitle">
            Sign up to build your custom AI learning roadmap.
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
            <label htmlFor="signup-name-input" className="form-label">
              Full Name
            </label>
            <input
              id="signup-name-input"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Min 3 characters"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-email-input" className="form-label">
              Email Address
            </label>
            <input
              id="signup-email-input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="name@domain.com"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-password-input" className="form-label">
              Password
            </label>
            <input
              id="signup-password-input"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-confirm-password-input" className="form-label">
              Confirm Password
            </label>
            <input
              id="signup-confirm-password-input"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Re-enter your password"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="button-container">
            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? 'CREATING ACCOUNT...' : 'SIGN UP'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#94a3b8' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
