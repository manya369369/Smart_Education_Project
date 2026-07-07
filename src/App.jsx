import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

import GoalSetupPage from './pages/GoalSetupPage';
import LearningModeSubjectPage from './pages/LearningModeSubjectPage';
import RoadmapPage from './pages/RoadmapPage';
import AssessmentPage from './pages/AssessmentPage';
import LearnerProfilePage from './pages/LearnerProfilePage';
import DashboardPage from './pages/DashboardPage';
import StudyPlanPage from './pages/StudyPlanPage';
import LearningPage from './pages/LearningPage';
import QuizPage from './pages/QuizPage';
import MistakeAnalysisPage from './pages/MistakeAnalysisPage';
import TomorrowPlanPage from './pages/TomorrowPlanPage';

import './App.css';

// Protected Route wrapper component
function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const userRaw = localStorage.getItem('neurolearn_user');
      if (userRaw) {
        const userObj = JSON.parse(userRaw);
        if (userObj.loggedIn) {
          setUser(userObj);
        }
      }
    } catch (e) {}
    setLoading(false);
  }, []);

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <div className="app">
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected Routes */}
          <Route path="/goal-setup" element={<ProtectedRoute><GoalSetupPage /></ProtectedRoute>} />
          <Route path="/learning-mode-setup" element={<ProtectedRoute><LearningModeSubjectPage /></ProtectedRoute>} />
          <Route path="/roadmap" element={<ProtectedRoute><RoadmapPage /></ProtectedRoute>} />
          <Route path="/assessment" element={<ProtectedRoute><AssessmentPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><LearnerProfilePage /></ProtectedRoute>} />
          <Route path="/learner-profile" element={<ProtectedRoute><LearnerProfilePage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/study-plan" element={<ProtectedRoute><StudyPlanPage /></ProtectedRoute>} />
          <Route path="/learning" element={<ProtectedRoute><LearningPage /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="/mistakes" element={<ProtectedRoute><MistakeAnalysisPage /></ProtectedRoute>} />
          <Route path="/tomorrow" element={<ProtectedRoute><TomorrowPlanPage /></ProtectedRoute>} />
          <Route path="/tomorrow-plan" element={<ProtectedRoute><TomorrowPlanPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
