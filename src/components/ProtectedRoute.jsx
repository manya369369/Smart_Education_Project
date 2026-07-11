/**
 * ProtectedRoute.jsx
 * 
 * Firebase-aware route protection component.
 * 
 * Rules:
 * 1. While auth loading → show branded loading screen
 * 2. Not authenticated → redirect to /login
 * 3. Authenticated but email not verified → redirect to /verify-email
 * 4. Authenticated and verified → render children
 * 
 * Does NOT create redirect loops (public routes are outside this wrapper).
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/AuthPages.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isEmailVerified, loading } = useAuth();

  // 1. Auth state still loading — show branded spinner
  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-brand">NeuroLearn AI</div>
        <div className="auth-loading-spinner"></div>
        <div className="auth-loading-text">Loading your session...</div>
      </div>
    );
  }

  // 2. Not authenticated — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. Authenticated but email not verified — redirect to verification
  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // 4. Authenticated and verified — render the protected content
  return children;
};

export default ProtectedRoute;
