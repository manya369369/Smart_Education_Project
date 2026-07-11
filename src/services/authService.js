/**
 * authService.js
 * 
 * Reusable Firebase Authentication service functions.
 * Keeps all Firebase operations outside UI components.
 * Never stores passwords. Never logs tokens.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  reload,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebase';

// ============================================================
// FRIENDLY ERROR MESSAGES
// ============================================================

/**
 * Map Firebase error codes to user-friendly messages.
 * Never expose raw Firebase error strings to the user.
 */
export const getFirebaseErrorMessage = (error) => {
  // Extract error code from Firebase error
  const code = error?.code || error?.message || '';

  const errorMap = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/email-already-in-use': 'An account already exists with this email. Please sign in.',
    'auth/weak-password': 'Please choose a stronger password (at least 6 characters).',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'Firebase is not configured correctly. Please check the Firebase environment variables.',
    'auth/api-key-not-valid': 'Firebase is not configured correctly. Please check the Firebase environment variables.',
    'auth/operation-not-allowed': 'Email/password authentication is not enabled. Please enable it in the Firebase Console.',
    'auth/requires-recent-login': 'Please sign in again to complete this action.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/popup-blocked': 'Please allow pop-ups and try again.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using another sign-in method.',
    'auth/internal-error': 'An internal error occurred. Please try again later.',
    'auth/missing-email': 'Please enter your email address.',
    'auth/missing-password': 'Please enter your password.'
  };

  // Check for exact match
  if (errorMap[code]) {
    return errorMap[code];
  }

  // Check for partial match (some Firebase errors have variable suffixes)
  for (const [key, message] of Object.entries(errorMap)) {
    if (code.includes(key)) {
      return message;
    }
  }

  // Fallback for unknown errors
  console.error('[authService] Unhandled Firebase error:', code, error);
  return 'An unexpected error occurred. Please try again.';
};

// ============================================================
// AUTH FUNCTIONS
// ============================================================

/**
 * Register a new user with email and password.
 * 1. Normalizes email (trim + lowercase)
 * 2. Creates Firebase account
 * 3. Sets displayName via updateProfile
 * 4. Sends verification email
 * 5. Returns structured result
 */
export const registerUser = async (fullName, email, password) => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured.');
  }
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = fullName.trim();

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    password
  );

  const user = userCredential.user;

  // Set display name
  await updateProfile(user, {
    displayName: trimmedName
  });

  // Send verification email
  await sendEmailVerification(user);

  return {
    success: true,
    user: user,
    message: 'Account created. Please verify your email.'
  };
};

/**
 * Login with email and password.
 * 1. Normalizes email
 * 2. Signs in via Firebase
 * 3. Reloads user to get fresh emailVerified status
 * 4. Returns whether email is verified
 */
export const loginUser = async (email, password) => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured.');
  }
  const normalizedEmail = email.trim().toLowerCase();

  const userCredential = await signInWithEmailAndPassword(
    auth,
    normalizedEmail,
    password
  );

  // Reload to get fresh emailVerified status
  await reload(userCredential.user);

  return {
    success: true,
    user: auth.currentUser,
    emailVerified: auth.currentUser.emailVerified
  };
};

/**
 * Sign out the current user.
 */
export const logoutUser = async () => {
  if (!auth) return;
  await signOut(auth);
};

/**
 * Resend verification email to the current user.
 */
export const sendVerification = async () => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured.');
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user is currently signed in.');
  }
  await sendEmailVerification(user);
};

/**
 * Send password reset email.
 */
export const resetPassword = async (email) => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured.');
  }
  const normalizedEmail = email.trim().toLowerCase();
  await sendPasswordResetEmail(auth, normalizedEmail);
};

/**
 * Reload the current user's profile (to refresh emailVerified, etc.).
 */
export const reloadCurrentUser = async () => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured.');
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user is currently signed in.');
  }
  await reload(user);
  return auth.currentUser;
};

/**
 * Get the current Firebase user (synchronous).
 */
export const getCurrentUser = () => {
  return auth ? auth.currentUser : null;
};

/**
 * Login with Google.
 * Uses Firebase modular SDK signInWithPopup.
 */
export const loginWithGoogle = async () => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account"
  });
  const result = await signInWithPopup(auth, provider);
  return result.user;
};
