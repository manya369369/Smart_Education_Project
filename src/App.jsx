import React from 'react';
import { Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
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
    <div className="app">
      <main>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/goal-setup" element={<GoalSetupPage />} />
          <Route path="/learning-mode-setup" element={<LearningModeSubjectPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/profile" element={<LearnerProfilePage />} />
          <Route path="/learner-profile" element={<LearnerProfilePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/study-plan" element={<StudyPlanPage />} />
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/mistakes" element={<MistakeAnalysisPage />} />
          <Route path="/tomorrow" element={<TomorrowPlanPage />} />
          <Route path="/tomorrow-plan" element={<TomorrowPlanPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
