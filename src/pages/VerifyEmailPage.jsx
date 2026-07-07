import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import '../styles/GoalSetupPage.css'; // Reuse setup styling to match theme exactly

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      navigate('/login');
    } else {
      setUser(currentUser);
      if (currentUser.emailVerified) {
        navigate('/goal-setup');
      }
    }
  }, [navigate]);

  const handleCheckVerification = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!auth.currentUser) return;

    try {
      setIsLoading(true);
      // Reload user profile to fetch fresh emailVerified status
      await auth.currentUser.reload();
      const updatedUser = auth.currentUser;
      
      if (updatedUser.emailVerified) {
        setSuccessMessage('Email verified successfully!');
        // Sync local storage for name display
        localStorage.setItem('neurolearn_user', JSON.stringify({
          name: updatedUser.displayName || 'Learner',
          email: updatedUser.email,
          loggedIn: true
        }));
        setTimeout(() => {
          navigate('/goal-setup');
        }, 1000);
      } else {
        setErrorMessage('Your email is not verified yet. Please check your inbox.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Error reloading user profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!auth.currentUser) return;

    try {
      setIsLoading(true);
      await sendEmailVerification(auth.currentUser);
      setSuccessMessage('Verification email resent! Please check your inbox.');
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Error resending verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('neurolearn_user');
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

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
              disabled={isLoading}
            >
              I HAVE VERIFIED MY EMAIL
            </button>

            <button 
              type="button" 
              onClick={handleResendVerification} 
              className="submit-button"
              style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8' }}
              disabled={isLoading}
            >
              RESEND VERIFICATION EMAIL
            </button>

            <button 
              type="button" 
              onClick={handleLogout} 
              className="submit-button"
              style={{ background: 'transparent', border: '1px solid rgba(248, 113, 113, 0.3)', color: '#f87171' }}
              disabled={isLoading}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
