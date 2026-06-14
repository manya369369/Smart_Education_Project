import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LearnerProfilePage.css';

const LearnerProfilePage = () => {
  const navigate = useNavigate();

  // Try-catch wrapped loading state
  const [dataState, setDataState] = useState(() => {
    console.log("[LearnerProfilePage] Initializing states and reading localStorage...");
    
    let parsedResult = null;
    let parsedGoal = null;
    let hasError = false;

    // 1. Read assessment results
    try {
      const savedResult = localStorage.getItem('neurolearn_assessment_result');
      if (savedResult) {
        parsedResult = JSON.parse(savedResult);
        console.log("[LearnerProfilePage] Loaded assessment results successfully:", parsedResult);
      } else {
        console.warn("[LearnerProfilePage] No item found for key: neurolearn_assessment_result");
      }
    } catch (e) {
      console.error("[LearnerProfilePage] Failed to parse neurolearn_assessment_result JSON:", e);
      hasError = true;
    }

    // 2. Read student goal data
    try {
      const savedGoal = localStorage.getItem('neurolearn_goal_data');
      if (savedGoal) {
        parsedGoal = JSON.parse(savedGoal);
        console.log("[LearnerProfilePage] Loaded student goal data successfully:", parsedGoal);
      } else {
        console.warn("[LearnerProfilePage] No item found for key: neurolearn_goal_data");
      }
    } catch (e) {
      console.error("[LearnerProfilePage] Failed to parse neurolearn_goal_data JSON:", e);
      hasError = true;
    }

    // 3. Complete validation checks
    const isDataMissing = !parsedResult || 
                          (typeof parsedResult.score === 'undefined' && typeof parsedResult.totalScore === 'undefined') || 
                          (typeof parsedResult.percentage === 'undefined');

    return {
      result: parsedResult || {},
      goal: parsedGoal || {},
      isInvalid: isDataMissing || hasError
    };
  });

  useEffect(() => {
    if (!dataState.isInvalid) {
      const { result, goal } = dataState;
      const studentName = goal.name || 'Learner';
      const primarySubject = result.primarySubject || goal.subjects?.[0] || 'General Learning';
      const selectedSubjects = goal.subjects || [primarySubject];
      const currentLevel = result.currentLevel || 'Beginner';
      const strongTopics = result.strongTopics || [];
      const weakTopics = result.weakTopics || [primarySubject + " Fundamentals"];
      const recommendedFocusAreas = weakTopics;
      const learningSummary = `The learner ${studentName} is working towards their ${goal.examGoal || 'General Study'} goal in ${primarySubject}. Their current level is ${currentLevel}.`;

      try {
        localStorage.setItem('neurolearn_learner_profile', JSON.stringify({
          studentName,
          primarySubject,
          selectedSubjects,
          currentLevel,
          strongTopics,
          weakTopics,
          recommendedFocusAreas,
          learningSummary
        }));
        console.log("Learner profile saved");
      } catch (e) {
        console.error("Error saving learner profile", e);
      }
    }
  }, [dataState]);

  const handleReturn = () => {
    console.log("[LearnerProfilePage] Redirecting user to assessment...");
    navigate('/assessment');
  };

  const handleBack = () => {
    console.log("[LearnerProfilePage] Redirecting user to goal setup...");
    navigate('/goal-setup');
  };

  // If there's an error or no data is found, show the friendly card warning
  if (dataState.isInvalid) {
    console.warn("[LearnerProfilePage] Displaying warning card: assessment data not found");
    return (
      <div className="profile-wrapper">
        <button className="back-button" onClick={handleBack} type="button">
          ← Back
        </button>

        <div className="profile-card error-card">
          <div className="error-icon-big">⚠️</div>
          <h2 className="error-title">No assessment data found.</h2>
          <p className="error-text">Please complete the assessment first.</p>
          <button className="submit-button" onClick={handleReturn} type="button">
            Return to Assessment
          </button>
        </div>
      </div>
    );
  }

  // Safe destructuring of result properties with default values
  const {
    score = 0,
    totalQuestions = 10,
    percentage = 0,
    weakTopics = [],
    strongTopics = [],
    mistakes = [],
    currentLevel = 'Beginner',
    adaptiveSummary = {},
    subject = 'General Learning'
  } = dataState.result;

  const totalScore = score || dataState.result.totalScore || 0;
  const strongSubjects = percentage >= 70 ? [subject] : [];
  const weakSubjects = percentage < 50 ? [subject] : [];
  const subjectScores = { [subject]: percentage };

  // Safe destructuring of adaptiveSummary
  const {
    highestDifficultyReached = 'Medium',
    easiestDifficultyReached = 'Medium',
    overallLearningLevel = 'Beginner',
    recommendedStartingLevel = 'Beginner'
  } = adaptiveSummary;

  // Safe destructuring of goal data
  const studentName = dataState.goal.name || 'Learner';
  const examGoal = dataState.goal.examGoal || 'General Study';

  return (
    <div className="profile-wrapper">
      {/* Small Back button at top-left */}
      <button className="back-button" onClick={handleBack} type="button">
        ← Back
      </button>

      {/* Main card */}
      <div className="profile-card">
        <header className="profile-card-header">
          <span className="profile-badge">Onboarding Completed</span>
          <h1 className="profile-card-title">{studentName}'s Learner Profile</h1>
          <p className="profile-card-subtitle">
            Diagnostic insights generated for <strong>{examGoal}</strong>
          </p>
        </header>

        {/* Level & Percentage Summary Grid */}
        <section className="profile-summary-grid">
          <div className="summary-stat-box">
            <span className="summary-stat-label">Overall Score</span>
            <div className="summary-stat-value text-indigo">{percentage}%</div>
            <span className="summary-stat-sub">{totalScore} of {totalQuestions} Correct</span>
          </div>

          <div className="summary-stat-box">
            <span className="summary-stat-label">Assessed Level</span>
            <div className="summary-stat-value text-purple">{currentLevel}</div>
            <span className="summary-stat-sub">Starting Level: {recommendedStartingLevel}</span>
          </div>
        </section>

        {/* Adaptive Assessment Summary Details */}
        <section className="profile-section">
          <h2 className="profile-section-title">Adaptive Diagnostics</h2>
          <div className="adaptive-details-list">
            <div className="adaptive-detail-item">
              <span className="adaptive-label">Peak Difficulty Reached:</span>
              <span className={`difficulty-badge badge-${highestDifficultyReached.toLowerCase()}`}>
                {highestDifficultyReached}
              </span>
            </div>
            <div className="adaptive-detail-item">
              <span className="adaptive-label">Lowest Difficulty Reached:</span>
              <span className={`difficulty-badge badge-${easiestDifficultyReached.toLowerCase()}`}>
                {easiestDifficultyReached}
              </span>
            </div>
          </div>
        </section>

        {/* Strong / Weak Subjects & Topics */}
        <section className="profile-section">
          <h2 className="profile-section-title">Subject Competency</h2>
          
          <div className="competency-container">
            {/* Strong subjects list */}
            <div className="competency-box">
              <h3 className="competency-title text-green">Strong Subjects (≥ 70%)</h3>
              {strongSubjects.length > 0 ? (
                <ul className="competency-list">
                  {strongSubjects.map(sub => (
                    <li key={sub} className="competency-item">
                      <span>{sub}</span>
                      <span className="score-percentage">({subjectScores[sub]}%)</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="competency-empty">No subjects met this threshold yet.</p>
              )}
            </div>

            {/* Weak subjects list */}
            <div className="competency-box">
              <h3 className="competency-title text-red">Needs Focus (&lt; 50%)</h3>
              {weakSubjects.length > 0 ? (
                <ul className="competency-list">
                  {weakSubjects.map(sub => (
                    <li key={sub} className="competency-item">
                      <span>{sub}</span>
                      <span className="score-percentage">({subjectScores[sub]}%)</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="competency-empty">Excellent work! No subject targets here.</p>
              )}
            </div>
          </div>
        </section>

        {/* Mistakes & Reviews Summary */}
        <section className="profile-section">
          <h2 className="profile-section-title">Concept Review Required</h2>
          {mistakes.length > 0 ? (
            <div className="mistakes-count-banner">
              You flagged <strong>{mistakes.length} mistakes</strong> during the diagnostic.
              A custom study plan focusing on these topics is ready!
            </div>
          ) : (
            <div className="mistakes-count-banner banner-success">
              🎉 <strong>Perfect Performance!</strong> You had zero mistakes in your assessment.
            </div>
          )}
        </section>

        {/* CTA Button */}
        <div className="profile-actions">
          <button 
            type="button" 
            onClick={() => navigate('/dashboard')} 
            className="submit-button"
          >
            CONTINUE TO DASHBOARD
          </button>
        </div>
      </div>
    </div>
  );
};

export default LearnerProfilePage;
