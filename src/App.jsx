import React from 'react';
import { Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

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

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <main>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Protected Routes */}
            <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
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
    </AuthProvider>
  );
}

export default App;
