import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/GoalSetupPage.css';
import '../styles/AuthPages.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loginGoogle, authError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  /**
   * Determine post-login destination based on onboarding status.
   * Uses existing neurolearn_goal_data to check if onboarding is complete.
   */
  const getPostLoginRoute = () => {
    return '/welcome';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const { email, password } = formData;

    // ---- Client-side validation ----
    if (!email.trim()) {
      setErrorMessage('Email is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (email.trim().includes(' ')) {
      setErrorMessage('Email address cannot contain spaces.');
      return;
    }

    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    // ---- Firebase login ----
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.emailVerified) {
        // Email is verified — enter the app
        const destination = getPostLoginRoute();
        navigate(destination);
      } else {
        // Email not verified — send to verification page
        navigate('/verify-email');
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const user = await loginGoogle();
      if (user) {
        navigate('/welcome');
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during Google sign-in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };


  return (
    <div className="goal-setup-wrapper animate-fadeIn">
      {/* Back button */}
      <button className="back-button" onClick={handleBack} type="button">
        ← Back
      </button>

      {/* Main card */}
      <div className="goal-card">
        <header className="goal-card-header">
          <h1 className="goal-card-title">Welcome to NeuroLearn</h1>
          <p className="goal-card-subtitle">
            Sign in to start your personalized AI-driven learning journey.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="goal-form">
          {/* Error Message */}
          {(authError || errorMessage) && (
            <div className="error-banner">
              <span className="error-icon">!</span>
              <span>
                {authError
                  ? "Firebase Authentication is not configured. Please complete the Firebase setup."
                  : errorMessage}
              </span>
            </div>
          )}

          {/* Email */}
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
              disabled={isLoading || !!authError}
              autoComplete="email"
            />
          </div>

          {/* Password with show/hide */}
          <div className="form-group">
            <label htmlFor="login-password-input" className="form-label">
              Password
            </label>
            <div className="password-field-wrapper">
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="form-input"
                disabled={isLoading || !!authError}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(prev => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Forgot Password link */}
          <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
            <Link
              to="/forgot-password"
              style={{
                color: '#818cf8',
                fontWeight: 500,
                fontSize: '0.85rem',
                textDecoration: 'none'
              }}
            >
              Forgot Password?
            </Link>
          </div>

          {/* Continue button */}
          <div className="button-container">
            <button type="submit" className="submit-button" disabled={isLoading || !!authError}>
              {isLoading ? (
                <span className="btn-loading-content">
                  <span className="btn-spinner"></span>
                  SIGNING IN...
                </span>
              ) : (
                'CONTINUE'
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="auth-divider">OR</div>

          {/* Continue with Google button */}
          <div className="button-container">
            <button
              type="button"
              className="google-signin-btn"
              onClick={handleGoogleLogin}
              disabled={isLoading || !!authError}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.89 3.02C6.24 7.66 8.88 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.78c-.26-.77-.4-1.6-.4-2.46s.14-1.69.4-2.46L1.39 6.84C.5 8.64 0 10.66 0 12.8s.5 4.16 1.39 5.96l3.89-2.98z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.04.7-2.37 1.12-4.23 1.12-3.12 0-5.76-2.62-6.72-5.54l-3.89 3c1.98 3.89 5.96 6.56 12 6.56z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Sign Up link */}
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#94a3b8' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
              Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
