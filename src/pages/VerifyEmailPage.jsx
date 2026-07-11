import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/GoalSetupPage.css';
import '../styles/AuthPages.css';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isEmailVerified, loading, resendVerification, logout, refreshUser } = useAuth();

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);

  // ---- Redirect logic ----
  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isEmailVerified) {
      // Already verified — go to Welcome Page
      navigate('/welcome');
    }
  }, [loading, isAuthenticated, isEmailVerified, navigate]);

  // ---- Cleanup cooldown timer ----
  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, []);

  // ---- Start cooldown ----
  const startCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);

    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * Determine post-verification destination.
   */
  const getPostVerifyRoute = () => {
    return '/welcome';
  };

  // ---- Check verification ----
  const handleCheckVerification = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsChecking(true);

    try {
      const updatedUser = await refreshUser();

      if (updatedUser.emailVerified) {
        setSuccessMessage('Email verified successfully! Redirecting...');
        setTimeout(() => {
          navigate(getPostVerifyRoute());
        }, 1200);
      } else {
        setErrorMessage('Your email is not verified yet. Please open the verification link sent to your inbox.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error checking verification status.');
    } finally {
      setIsChecking(false);
    }
  };

  // ---- Resend verification ----
  const handleResendVerification = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (resendCooldown > 0) return;

    setIsChecking(true);

    try {
      await resendVerification();
      setSuccessMessage('Verification email resent! Please check your inbox.');
      startCooldown(60);
    } catch (err) {
      setErrorMessage(err.message || 'Error resending verification email.');
    } finally {
      setIsChecking(false);
    }
  };

  // ---- Use another account ----
  const handleUseAnotherAccount = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('[VerifyEmailPage] Error during logout:', err);
    }
  };

  // Don't render until auth state is resolved
  if (loading || !user) return null;

  return (
    <div className="goal-setup-wrapper animate-fadeIn">
      <div className="goal-card">
        <header className="goal-card-header">
          <h1 className="goal-card-title">Verify Your Email</h1>
          <p className="goal-card-subtitle">
            We have sent a verification email to <strong>{user.email}</strong>.
          </p>
        </header>

        <div className="goal-form">
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

          <div style={{ textAlign: 'center', margin: '1rem 0', color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Please click on the link in the email to verify your address, then click below to continue.
          </div>

          <div className="button-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              type="button"
              onClick={handleCheckVerification}
              className="submit-button"
              disabled={isChecking}
            >
              {isChecking ? (
                <span className="btn-loading-content">
                  <span className="btn-spinner"></span>
                  CHECKING...
                </span>
              ) : (
                'I HAVE VERIFIED MY EMAIL'
              )}
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              className="submit-button"
              style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8' }}
              disabled={isChecking || resendCooldown > 0}
            >
              {resendCooldown > 0
                ? `RESEND AVAILABLE IN ${resendCooldown}s`
                : 'RESEND VERIFICATION EMAIL'
              }
            </button>

            <button
              type="button"
              onClick={handleUseAnotherAccount}
              className="submit-button"
              style={{ background: 'transparent', border: '1px solid rgba(248, 113, 113, 0.3)', color: '#f87171' }}
              disabled={isChecking}
            >
              USE ANOTHER ACCOUNT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
