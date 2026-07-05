import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DashboardPage.css';

// Animated counter component for numbers
const AnimatedCounter = ({ value, duration = 1200, suffix = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = parseInt(value, 10);
    if (isNaN(end) || end <= 0) {
      setCount(value);
      return;
    }
    
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{count}{suffix}</span>;
};

// Animated progress bar component for subjects
const SubjectProgressBar = ({ subject, score }) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(score);
    }, 200);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="subject-progress-card">
      <div className="subject-progress-header">
        <span className="subject-name">{subject}</span>
        <span className="subject-percentage">{score}%</span>
      </div>
      <div className="progress-track">
        <div 
          className="progress-fill" 
          style={{ width: `${width}%` }}
        ></div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Analyzing learning patterns...");

  // Data State
  const [dashboardData, setDashboardData] = useState(() => {
    console.log("[DashboardPage] Reading local storage data...");
    
    let goal = null;
    let assessment = null;
    let hasError = false;

    try {
      const savedGoal = localStorage.getItem('neurolearn_user_profile') || localStorage.getItem('neurolearn_goal_data');
      if (savedGoal) {
        goal = JSON.parse(savedGoal);
      }
    } catch (e) {
      console.error("[DashboardPage] Failed to parse neurolearn_user_profile:", e);
      hasError = true;
    }

    try {
      const savedAssessment = localStorage.getItem('neurolearn_assessment_results') || localStorage.getItem('neurolearn_assessment_result');
      if (savedAssessment) {
        assessment = JSON.parse(savedAssessment);
      }
    } catch (e) {
      console.error("[DashboardPage] Failed to parse neurolearn_assessment_results:", e);
      hasError = true;
    }

    const isDataMissing = !goal || !assessment;

    return {
      goal,
      assessment,
      isInvalid: isDataMissing || hasError
    };
  });

  // 2 Seconds Rotating Loading Animation
  useEffect(() => {
    const loadingPhrases = [
      "Analyzing learning patterns...",
      "Calculating strengths...",
      "Preparing recommendations...",
      "Generating AI insights..."
    ];

    let currentPhase = 0;
    const interval = setInterval(() => {
      currentPhase++;
      if (currentPhase < loadingPhrases.length) {
        setLoadingText(loadingPhrases[currentPhase]);
      }
    }, 500);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setIsLoading(false);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  // Safe destructuring of data
  const { goal, assessment, isInvalid } = dashboardData;

  const studentName = goal?.name || 'Learner';
  const examGoal = goal?.goal || goal?.examGoal || 'General Study';
  const examDate = goal?.examDate || '';
  const selectedSubjects = goal?.subjects || [];

  const overallScore = assessment?.percentage ?? (assessment?.score !== undefined ? Math.round((assessment.score / 10) * 100) : 0);
  const learningLevel = assessment?.currentLevel || 'Beginner';

  const strongTopics = assessment?.strongTopics || [];
  const weakTopics = assessment?.weakTopics || [];

  const strongTopicsCount = strongTopics.length;
  const weakTopicsCount = weakTopics.length;

  const subjectScores = { [assessment?.subject || 'General Learning']: overallScore };

  // Format Date for UI display
  const formattedExamDate = useMemo(() => {
    if (!examDate) return 'Not Scheduled';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(examDate).toLocaleDateString(undefined, options);
    } catch (e) {
      return examDate;
    }
  }, [examDate]);

  // Generate dynamic AI Insights
  const aiInsights = useMemo(() => {
    if (isInvalid) return [];
    const insights = [];

    // Overall assessment insights
    if (overallScore >= 80) {
      insights.push("You perform exceptionally well in conceptual questions and advanced problem-solving.");
    } else if (overallScore >= 50) {
      insights.push("You show stable conceptual understanding but struggle slightly with complex application problems.");
    } else {
      insights.push("Foundational concept reinforcement is highly recommended before tackling multi-step questions.");
    }

    // Subject competence insights
    const subjectsList = Object.keys(subjectScores);
    if (subjectsList.length > 0) {
      // Find highest score subject
      const highestSub = subjectsList.reduce((a, b) => subjectScores[a] > subjectScores[b] ? a : b);
      if (subjectScores[highestSub] >= 70) {
        insights.push(`${highestSub} is a clear strong point. Database normalization and key schemas are solid.`);
      }

      // Find lowest score subject
      const lowestSub = subjectsList.reduce((a, b) => subjectScores[a] < subjectScores[b] ? a : b);
      if (subjectScores[lowestSub] < 60) {
        insights.push(`${lowestSub} calculations and reasoning require more active practice.`);
      }
    }

    // Topic insights
    if (strongTopics.includes('Normalization') || strongTopics.includes('SQL Queries')) {
      insights.push("Database design and relational queries are among your top performance metrics.");
    }
    if (weakTopics.includes('Probability')) {
      insights.push("Physics and mathematical probability calculations need more practical exercises.");
    }
    if (weakTopics.includes('Trees') || weakTopics.includes('Recursion') || weakTopics.includes('Graphs')) {
      insights.push("You tend to struggle with multi-step recursive reasoning and complex graph structures.");
    }

    // Default general learning insight
    insights.push("Your learning speed suggests that structured active recall yields the highest retention rate.");

    // Ensure we display exactly 4-5 insights
    return insights.slice(0, 5);
  }, [isInvalid, overallScore, subjectScores, strongTopics, weakTopics]);

  // Generate dynamic Recommendations
  const aiRecommendations = useMemo(() => {
    if (isInvalid) return [];
    const recommendations = [];

    // Rec 1: Topic dependencies / focus priority
    if (weakTopics.includes('Trees') && strongTopics.includes('Graphs')) {
      recommendations.push("Focus on Trees before starting Graphs.");
    } else if (weakTopics.includes('Trees')) {
      recommendations.push("Focus on Trees concepts to establish a foundation for graphs.");
    } else if (weakTopics.length > 0) {
      recommendations.push(`Focus on ${weakTopics[0]} before proceeding to next topics.`);
    }

    // Rec 2: Revision schedule
    if (weakTopics.includes('Probability')) {
      recommendations.push("Revise Probability tomorrow.");
    } else if (weakTopics.length > 1) {
      recommendations.push(`Revise ${weakTopics[weakTopics.length - 1]} tomorrow.`);
    } else {
      recommendations.push("Revise your weakest topic tomorrow.");
    }

    // Rec 3: Question volume recommendation
    if (learningLevel === 'Beginner') {
      recommendations.push("Increase basic practice question volume to reinforce fundamentals.");
    } else if (learningLevel === 'Intermediate') {
      recommendations.push("Increase practice question volume with medium-difficulty problems.");
    } else {
      recommendations.push("Increase mock test practice volume under timed conditions.");
    }

    // Rec 4: Daily study time habits
    recommendations.push("Spend 20 minutes on weak concepts daily.");

    return recommendations;
  }, [isInvalid, weakTopics, strongTopics, learningLevel]);

  // Handle Return action for missing data card
  const handleGoToGoalSetup = () => {
    navigate('/goal-setup');
  };

  const handleStartLearning = () => {
    try {
      const savedPlan = localStorage.getItem('neurolearn_study_plan');
      if (savedPlan) {
        const plan = JSON.parse(savedPlan);
        if (plan && plan.tasks && plan.tasks.length > 0) {
          const firstTask = plan.tasks[0];
          const taskPayload = {
            time: firstTask.time,
            taskType: firstTask.taskType || firstTask.type || "Personalized Video",
            topic: firstTask.topic,
            reason: firstTask.reason
          };
          localStorage.setItem('neurolearn_current_learning_task', JSON.stringify(taskPayload));
          navigate('/learning');
          return;
        }
      }
    } catch (e) {
      console.error("Error reading study plan for Start Learning", e);
    }
    navigate('/study-plan');
  };


  // Render Page Loading State
  if (isLoading) {
    return (
      <div className="dashboard-loading-wrapper">
        <div className="loading-card">
          <div className="scanner-container">
            <div className="glow-circle"></div>
            <div className="scanner-line"></div>
          </div>
          <h2 className="loading-title">Configuring Core Command Center</h2>
          <p className="loading-text-rotator">{loadingText}</p>
        </div>
      </div>
    );
  }

  // Render Missing Data Warning Screen
  if (isInvalid) {
    return (
      <div className="dashboard-wrapper">
        <div className="missing-data-card">
          <div className="alert-icon">⚠️</div>
          <h2 className="alert-title">Dashboard data unavailable.</h2>
          <p className="alert-desc">Please complete assessment first.</p>
          <button 
            className="action-button-primary"
            onClick={handleGoToGoalSetup}
          >
            Start Setup & Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper animate-fadeIn">
      {/* Background Glows */}
      <div className="background-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      <div className="dashboard-container">
        
        {/* PAGE HEADER */}
        <header className="dashboard-header animate-slideUp">
          <div className="header-title-container">
            <h1 className="header-title">Welcome Back, {studentName}</h1>
            <p className="header-subtitle">Your personalized AI learning dashboard is ready.</p>
          </div>
          <div className="header-meta-grid">
            <div className="meta-badge-card">
              <span className="meta-label">Goal Target</span>
              <strong className="meta-value">{examGoal}</strong>
            </div>
            <div className="meta-badge-card">
              <span className="meta-label">Exam Date</span>
              <strong className="meta-value">{formattedExamDate}</strong>
            </div>
            <div className="meta-badge-card subjects-card">
              <span className="meta-label">Active Subjects</span>
              <div className="meta-subjects-chips">
                {selectedSubjects.map(sub => (
                  <span key={sub} className="subject-chip">{sub}</span>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* TOP STATISTICS SECTION */}
        <section className="stats-section-grid">
          <div className="stat-card glass-card animate-stagger" style={{ '--delay': 1 }}>
            <span className="stat-label">Overall Score</span>
            <h3 className="stat-value text-indigo">
              <AnimatedCounter value={overallScore} suffix="%" />
            </h3>
            <div className="stat-indicator-bg">
              <div className="stat-indicator-fill" style={{ width: `${overallScore}%` }}></div>
            </div>
          </div>

          <div className="stat-card glass-card animate-stagger" style={{ '--delay': 2 }}>
            <span className="stat-label">Learning Level</span>
            <h3 className={`stat-value text-level-${learningLevel.toLowerCase()}`}>
              {learningLevel}
            </h3>
            <span className="stat-sub-label">Assessed from diagnostic</span>
          </div>

          <div className="stat-card glass-card animate-stagger" style={{ '--delay': 3 }}>
            <span className="stat-label">Strong Topics</span>
            <h3 className="stat-value text-emerald">
              <AnimatedCounter value={strongTopicsCount} />
            </h3>
            <span className="stat-sub-label">Verified competency</span>
          </div>

          <div className="stat-card glass-card animate-stagger" style={{ '--delay': 4 }}>
            <span className="stat-label">Weak Topics</span>
            <h3 className="stat-value text-rose">
              <AnimatedCounter value={weakTopicsCount} />
            </h3>
            <span className="stat-sub-label">Needs focus & practice</span>
          </div>
        </section>

        {/* MAIN BODY GRID */}
        <div className="dashboard-grid-layout">
          
          {/* LEFT PANEL: INSIGHTS & PERFORMANCE */}
          <div className="dashboard-left-panel">
            
            {/* AI INSIGHTS SECTION */}
            <div className="glass-card panel-card animate-stagger" style={{ '--delay': 5 }}>
              <div className="panel-header">
                <span className="panel-icon-ai">✦</span>
                <h2 className="panel-title">AI Learning Insights</h2>
              </div>
              <div className="insights-list">
                {aiInsights.map((insight, idx) => (
                  <div key={idx} className="insight-item-card">
                    <span className="insight-bullet"></span>
                    <p className="insight-text">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* PERFORMANCE BREAKDOWN */}
            <div className="glass-card panel-card animate-stagger" style={{ '--delay': 6 }}>
              <div className="panel-header">
                <h2 className="panel-title">Performance Breakdown</h2>
              </div>
              <div className="performance-list">
                {Object.keys(subjectScores).length > 0 ? (
                  Object.entries(subjectScores).map(([sub, score]) => (
                    <SubjectProgressBar key={sub} subject={sub} score={score} />
                  ))
                ) : (
                  <p className="empty-panel-text">No subject score data available.</p>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: STRENGTHS, WEAKNESSES, RECOMMENDATIONS */}
          <div className="dashboard-right-panel">
            
            {/* STRENGTHS */}
            <div className="glass-card panel-card animate-stagger" style={{ '--delay': 7 }}>
              <h2 className="panel-title text-emerald-header">Your Strengths</h2>
              <div className="topics-chips-container">
                {strongTopics.length > 0 ? (
                  strongTopics.map(topic => (
                    <span key={topic} className="glowing-chip-success">{topic}</span>
                  ))
                ) : (
                  <p className="empty-panel-text">No strong topics identified yet.</p>
                )}
              </div>
            </div>

            {/* WEAKNESSES */}
            <div className="glass-card panel-card animate-stagger" style={{ '--delay': 8 }}>
              <h2 className="panel-title text-rose-header">Needs Improvement</h2>
              <div className="topics-chips-container">
                {weakTopics.length > 0 ? (
                  weakTopics.map(topic => (
                    <span key={topic} className="glowing-chip-warning">{topic}</span>
                  ))
                ) : (
                  <p className="empty-panel-text">Zero weak topics! Excellent performance.</p>
                )}
              </div>
            </div>

            {/* RECOMMENDATIONS */}
            <div className="glass-card panel-card animate-stagger" style={{ '--delay': 9 }}>
              <div className="panel-header">
                <span className="panel-icon-ai">✦</span>
                <h2 className="panel-title">AI Recommendations</h2>
              </div>
              <div className="recommendations-list">
                {aiRecommendations.map((rec, idx) => (
                  <div key={idx} className="recommendation-item">
                    <span className="rec-number">{idx + 1}</span>
                    <p className="rec-text">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* QUICK ACTIONS SECTION */}
        <section className="quick-actions-section animate-stagger" style={{ '--delay': 10 }}>
          <h2 className="section-title">Quick Actions</h2>
          <div className="quick-actions-grid">
            
            <button 
              className="action-card glass-card"
              onClick={() => navigate('/study-plan')}
            >
              <div className="action-icon-wrapper text-indigo">📅</div>
              <h4 className="action-card-title">Generate Study Plan</h4>
              <p className="action-card-desc">Create a customized day-by-day roadmap</p>
            </button>

            <button 
              className="action-card glass-card"
              onClick={handleStartLearning}
            >
              <div className="action-icon-wrapper text-emerald">🚀</div>
              <h4 className="action-card-title">Start Learning</h4>
              <p className="action-card-desc">Access personalized learning resources</p>
            </button>

            <button 
              className="action-card glass-card"
              onClick={() => navigate('/quiz')}
            >
              <div className="action-icon-wrapper text-amber">📝</div>
              <h4 className="action-card-title">Take Adaptive Quiz</h4>
              <p className="action-card-desc">Test yourself with level-adjusting quizzes</p>
            </button>

            <button 
              className="action-card glass-card"
              onClick={() => navigate('/mistakes')}
            >
              <div className="action-icon-wrapper text-rose">🔍</div>
              <h4 className="action-card-title">View Mistake Analysis</h4>
              <p className="action-card-desc">Review past mistakes and explanations</p>
            </button>

          </div>
        </section>

      </div>
    </div>
  );
};

export default DashboardPage;
