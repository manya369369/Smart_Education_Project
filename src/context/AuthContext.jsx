/**
 * AuthContext.jsx
 * 
 * React context providing Firebase authentication state and actions.
 * Uses onAuthStateChanged for persistent session detection.
 * Syncs neurolearn_user localStorage for backward compatibility.
 * 
 * Never stores passwords. Never logs tokens.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase';
import {
  registerUser,
  loginUser,
  logoutUser,
  sendVerification,
  resetPassword as resetPw,
  reloadCurrentUser,
  getFirebaseErrorMessage,
  loginWithGoogle
} from '../services/authService';

// ============================================================
// Create Context
// ============================================================
const AuthContext = createContext(null);

/**
 * Custom hook to access auth context.
 * Must be used within an AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ============================================================
// Auth Provider
// ============================================================
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // --------------------------------------------------------
  // Listen for Firebase auth state changes
  // --------------------------------------------------------
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      setLoading(false);
      setAuthError(
        "Firebase Authentication is not configured correctly."
      );
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Sync non-sensitive session metadata to localStorage
        // for backward compatibility with existing pages
        syncUserToLocalStorage(firebaseUser);
      } else {
        setUser(null);
        // Do NOT remove neurolearn_user here automatically —
        // let explicit logout handle cleanup to avoid race conditions
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --------------------------------------------------------
  // Sync Firebase user to localStorage (compatibility bridge)
  // --------------------------------------------------------
  const syncUserToLocalStorage = (firebaseUser, provider = null) => {
    if (!firebaseUser) return;
    try {
      const isGoogle = provider === 'google' || firebaseUser.providerData?.some(p => p.providerId === 'google.com');
      const sessionData = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        loggedIn: true,
        emailVerified: firebaseUser.emailVerified,
        authProvider: isGoogle ? 'google' : 'firebase'
      };
      localStorage.setItem('neurolearn_user', JSON.stringify(sessionData));
    } catch (e) {
      console.error('[AuthContext] Error syncing user to localStorage:', e);
    }
  };

  // --------------------------------------------------------
  // Auth Actions
  // --------------------------------------------------------

  /**
   * Sign up a new user.
   * Returns { success, user, message } on success.
   * Throws error with friendly message on failure.
   */
  const signup = async (fullName, email, password) => {
    try {
      const result = await registerUser(fullName, email, password);
      // Don't sync to localStorage yet — user must verify email first
      return result;
    } catch (error) {
      throw new Error(getFirebaseErrorMessage(error));
    }
  };

  /**
   * Login an existing user.
   * Returns { success, user, emailVerified } on success.
   * Throws error with friendly message on failure.
   */
  const login = async (email, password) => {
    try {
      const result = await loginUser(email, password);
      // Sync verified user to localStorage
      if (result.user) {
        syncUserToLocalStorage(result.user);
      }
      return result;
    } catch (error) {
      throw new Error(getFirebaseErrorMessage(error));
    }
  };

  /**
   * Login/Signup with Google provider.
   * Returns user on success, throws error with friendly message on failure.
   */
  const loginGoogle = async () => {
    try {
      const result = await loginWithGoogle();
      if (result) {
        syncUserToLocalStorage(result, 'google');
      }
      return result;
    } catch (error) {
      throw new Error(getFirebaseErrorMessage(error));
    }
  };

  /**
   * Logout the current user.
   * Removes only session metadata — preserves learning progress.
   */
  const logout = async () => {
    try {
      await logoutUser();
      // Remove only user session metadata
      localStorage.removeItem('neurolearn_user');
      setUser(null);
    } catch (error) {
      throw new Error(getFirebaseErrorMessage(error));
    }
  };

  /**
   * Resend email verification.
   */
  const resendVerification = async () => {
    try {
      await sendVerification();
    } catch (error) {
      throw new Error(getFirebaseErrorMessage(error));
    }
  };

  /**
   * Send password reset email.
   */
  const resetPasswordAction = async (email) => {
    try {
      await resetPw(email);
    } catch (error) {
      // For security, don't reveal if account exists
      // But still throw for network/config errors
      const code = error?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        // Silently succeed — don't reveal account existence
        return;
      }
      throw new Error(getFirebaseErrorMessage(error));
    }
  };

  /**
   * Refresh the current user's profile (for checking emailVerified).
   */
  const refreshUser = async () => {
    try {
      const updatedUser = await reloadCurrentUser();
      setUser({ ...updatedUser });
      syncUserToLocalStorage(updatedUser);
      return updatedUser;
    } catch (error) {
      throw new Error(getFirebaseErrorMessage(error));
    }
  };

  // --------------------------------------------------------
  // Derived State
  // --------------------------------------------------------
  const isAuthenticated = !!user;
  const isEmailVerified = user?.emailVerified || user?.providerData?.some(p => p.providerId === 'google.com') || false;

  // --------------------------------------------------------
  // Context Value
  // --------------------------------------------------------
  const value = {
    user,
    isAuthenticated,
    isEmailVerified,
    loading,
    authError,
    login,
    loginGoogle,
    signup,
    logout,
    resendVerification,
    resetPassword: resetPasswordAction,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
