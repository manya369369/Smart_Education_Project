import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/TomorrowPlanPage.css';

// Helper function to dynamically generate plan from latest localStorage data
const generateTomorrowPlanPayload = () => {
  let quizResult = null;
  let assessmentResult = null;
  let goalData = null;

  try {
    const savedQuiz = localStorage.getItem('neurolearn_quiz_result');
    if (savedQuiz) quizResult = JSON.parse(savedQuiz);
  } catch (err) {
    console.error("Error reading quiz results", err);
  }

  try {
    const savedAssessment = localStorage.getItem('neurolearn_assessment_results') || localStorage.getItem('neurolearn_assessment_result');
    if (savedAssessment) assessmentResult = JSON.parse(savedAssessment);
  } catch (err) {
    console.error("Error reading assessment results", err);
  }

  try {
    const savedGoal = localStorage.getItem('neurolearn_user_profile') || localStorage.getItem('neurolearn_goal_data');
    if (savedGoal) goalData = JSON.parse(savedGoal);
  } catch (err) {
    console.error("Error reading goal data", err);
  }

  // Prioritize topics:
  // 1. quizResult.topic
  // 2. quizResult.weakConcepts
  // 3. quizResult.mistakes (topics)
  // 4. assessmentResult.weakTopics
  // 5. goalData.subjects
  const topics = [];
  if (quizResult?.topic) {
    topics.push(quizResult.topic);
  }
  if (quizResult?.weakConcepts && quizResult.weakConcepts.length > 0) {
    topics.push(...quizResult.weakConcepts);
  }
  if (quizResult?.mistakes && quizResult.mistakes.length > 0) {
    const mistakeTopics = quizResult.mistakes.map(m => m.topic).filter(Boolean);
    topics.push(...mistakeTopics);
  }
  if (assessmentResult?.weakTopics && assessmentResult.weakTopics.length > 0) {
    topics.push(...assessmentResult.weakTopics);
  }
  if (goalData?.subjects && goalData.subjects.length > 0) {
    topics.push(...goalData.subjects);
  }

  const priorityTopics = [];
  topics.forEach(t => {
    if (t && !priorityTopics.includes(t)) {
      priorityTopics.push(t);
    }
  });

  if (priorityTopics.length === 0) {
    priorityTopics.push("General Learning");
  }

  const p1 = priorityTopics[0] || 'General Learning';
  const p2 = priorityTopics[1] || p1;

  // Define times
  const times = ["9:15 AM", "9:45 AM", "10:15 AM", "10:45 AM", "11:15 AM"];

  // 5 Schedule cards matching standardized task types
  const tasks = [
    {
      time: times[0],
      icon: "📹",
      type: "Personalized Video",
      taskType: "Personalized Video",
      topic: p1,
      reason: `Reviewing concepts after quiz performance in ${p1}.`
    },
    {
      time: times[1],
      icon: "📝",
      type: "AI Notes",
      taskType: "AI Notes",
      topic: p1,
      reason: `Read refined notes focusing on key problem areas.`
    },
    {
      time: times[2],
      icon: "🧠",
      type: "Adaptive Quiz",
      taskType: "Adaptive Quiz",
      topic: p1,
      reason: `Re-evaluate concepts with a short practice session.`
    },
    {
      time: times[3],
      icon: "🤖",
      type: "AI Tutor",
      taskType: "AI Tutor",
      topic: p1,
      reason: `Resolve questions about mistakes flagged and clear core concept queries.`
    },
    {
      time: times[4],
      icon: "🔄",
      type: "Quick Recap",
      taskType: "Quick Recap",
      topic: p2,
      reason: `Review progress and solidify conceptual understanding of ${p2}.`
    }
  ];

  // Why This Plan Changed reasons
  const reasonsList = [];
  if (quizResult) {
    if (quizResult.topic) {
      reasonsList.push(`You made mistakes in ${quizResult.topic}.`);
    }
    if (quizResult.percentage !== undefined) {
      reasonsList.push(
        quizResult.percentage < 60
          ? `Your quiz accuracy was below 60% (${quizResult.percentage}%).`
          : `Your quiz accuracy was ${quizResult.percentage}%.`
      );
    }
    reasonsList.push("Revision and practice have been added before new topics.");
  } else {
    reasonsList.push("Tomorrow's plan was generated from your weak diagnostic topics.");
    reasonsList.push("Revision and practice are prioritized to solidify your foundations.");
  }

  return {
    priorityTopics,
    tasks,
    reasons: reasonsList,
    generatedFrom: quizResult ? "quiz-mistakes" : "diagnostic-diagnose",
    createdAt: new Date().toISOString()
  };
};

const TomorrowPlanPage = () => {
  const navigate = useNavigate();

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [currentPlan, setCurrentPlan] = useState(() => {
    const fromMistakes = localStorage.getItem('neurolearn_generate_tomorrow_from_mistakes') === 'true';
    const savedPlan = localStorage.getItem('neurolearn_tomorrow_plan');

    if (fromMistakes) {
      localStorage.removeItem('neurolearn_generate_tomorrow_from_mistakes');
    }

    if (fromMistakes || !savedPlan) {
      const freshPlan = generateTomorrowPlanPayload();
      localStorage.setItem('neurolearn_tomorrow_plan', JSON.stringify(freshPlan));
      return freshPlan;
    } else {
      try {
        return JSON.parse(savedPlan);
      } catch (err) {
        console.error("Error parsing saved tomorrow plan", err);
        const freshPlan = generateTomorrowPlanPayload();
        localStorage.setItem('neurolearn_tomorrow_plan', JSON.stringify(freshPlan));
        return freshPlan;
      }
    }
  });

  // Regenerate tomorrow plan handler
  const handleRegenerateTomorrowPlan = () => {
    setLoadingText("AI is adjusting tomorrow's schedule...");
    setIsRegenerating(true);
    setSuccessMessage("");

    setTimeout(() => {
      const freshPlan = generateTomorrowPlanPayload();
      localStorage.setItem('neurolearn_tomorrow_plan', JSON.stringify(freshPlan));
      setCurrentPlan(freshPlan);
      setIsRegenerating(false);
      setSuccessMessage("Tomorrow's plan has been adjusted based on latest data.");

      // Auto-clear success banner after 4 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);

      console.log("[TomorrowPlanPage] Tomorrow plan successfully regenerated.");
    }, 1500); // 1.5 seconds loading simulation
  };

  // Start tomorrow plan handler
  const handleStartTomorrowPlan = () => {
    if (currentPlan && currentPlan.tasks && currentPlan.tasks.length > 0) {
      const firstTask = currentPlan.tasks[0];
      const taskPayload = {
        time: firstTask.time,
        taskType: firstTask.type,
        topic: firstTask.topic,
        reason: firstTask.reason
      };
      localStorage.setItem('neurolearn_current_learning_task', JSON.stringify(taskPayload));
    }
    navigate('/learning');
  };

  return (
    <div className="tomorrow-plan-wrapper animate-fadeIn">
      {/* Background Orbs */}
      <div className="background-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* REGENERATING OVERLAY */}
      {isRegenerating && (
        <div className="regenerating-overlay">
          <div className="loading-container">
            <div className="loading-spinner">
              <div className="spinner-outer"></div>
              <div className="spinner-inner"></div>
            </div>
            <p className="regenerating-text">{loadingText}</p>
          </div>
        </div>
      )}

      <div className="tomorrow-plan-container">
        {/* BACK NAVIGATION */}
        <button 
          className="tomorrow-plan-back-btn"
          onClick={() => navigate('/dashboard')}
          type="button"
        >
          ← Back
        </button>

        {/* HEADER */}
        <header className="tomorrow-plan-header">
          <h1 className="page-title">Tomorrow's AI Study Plan</h1>
          <p className="page-subtitle">A dynamic, predictive roadmap generated to prepare you for tomorrow's challenges.</p>
        </header>

        {/* SUCCESS BANNER */}
        {successMessage && (
          <div className="success-banner" style={{
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            color: '#c084fc',
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            fontSize: '0.95rem',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(168, 85, 247, 0.1)',
            animation: 'cardFadeIn 0.3s ease-in-out'
          }}>
            🎉 {successMessage}
          </div>
        )}

        {/* PRIORITY BANNER */}
        <section className="priority-banner-card glass-card">
          <div className="priority-card-header">
            <span className="badge-ai-optimized">Tomorrow's Focus</span>
            <span className="priority-time-label">Status</span>
          </div>
          <div className="priority-card-body">
            <div className="priority-details">
              <h3 className="priority-card-title">Priority Concept</h3>
              <p className="priority-focus-text">
                Your next plan was updated based on today's quiz mistakes.
              </p>
            </div>
            <div className="priority-time-box">
              <span className="time-value">Ready</span>
            </div>
          </div>
        </section>

        {/* LAYOUT SPLIT */}
        <div className="tomorrow-plan-grid-layout">
          
          {/* LEFT: TIMELINE SCHEDULE CARDS */}
          <div className="tomorrow-plan-timeline-section">
            <h2 className="section-title">Tomorrow's Timeline</h2>

            <div className="timeline-track-container">
              <div className="timeline-line"></div>
              
              <div className="timeline-tasks-list">
                {currentPlan?.tasks?.map((task, idx) => (
                  <div key={idx} className="timeline-card-wrapper">
                    {/* Node Dot */}
                    <div className="timeline-node">
                      <span className="node-icon">{task.icon}</span>
                    </div>

                    {/* Schedule Card */}
                    <div className="timeline-task-card glass-card">
                      <div className="task-header-row">
                        <span className="task-time">{task.time}</span>
                        <span className="task-type-badge">{task.taskType || task.type}</span>
                      </div>
                      <div className="task-body">
                        <h4 className="task-topic">{task.topic}</h4>
                        <p className="task-reason">{task.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: WHY IT CHANGED & ACTIONS */}
          <div className="tomorrow-plan-right-sidebar">
            
            {/* WHY PLAN CHANGED CARD */}
            <div className="glass-card sidebar-panel-card">
              <h3 className="panel-title text-purple-title">Why this plan changed?</h3>
              <ul className="rationale-list">
                {currentPlan?.reasons?.map((reason, idx) => (
                  <li key={idx} className="rationale-item">
                    <span className="rationale-bullet">✦</span>
                    <span className="rationale-text">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* BUTTON CONTROLS */}
            <div className="sidebar-action-container flex-column gap-3">
              <button 
                type="button"
                className="action-button-primary start-tomorrow-cta width-full"
                onClick={handleStartTomorrowPlan}
              >
                Start Tomorrow Plan
              </button>
              <button 
                type="button"
                className="btn-secondary-action width-full"
                onClick={handleRegenerateTomorrowPlan}
              >
                Regenerate Tomorrow Plan
              </button>
              <button 
                type="button"
                className="btn-secondary-action width-full"
                onClick={() => navigate('/dashboard')}
              >
                Return to Dashboard
              </button>
            </div>

          </div>

        </div>

      </div>
      <DebugPanel />
    </div>
  );
};

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);

  const isDev = process.env.NODE_ENV === 'development' || 
                window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';

  if (!isDev) return null;

  let profile = {};
  let assessment = {};
  let plan = {};
  let currentTask = {};
  let progress = {};

  try {
    profile = JSON.parse(localStorage.getItem('neurolearn_user_profile') || '{}');
  } catch (e) {}
  try {
    assessment = JSON.parse(localStorage.getItem('neurolearn_assessment_results') || '{}');
  } catch (e) {}
  try {
    plan = JSON.parse(localStorage.getItem('neurolearn_study_plan') || '{}');
  } catch (e) {}
  try {
    currentTask = JSON.parse(localStorage.getItem('neurolearn_current_learning_task') || '{}');
  } catch (e) {}
  try {
    progress = JSON.parse(localStorage.getItem('neurolearn_learning_progress') || '{}');
  } catch (e) {}

  return (
    <div className="debug-data-flow-panel" style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      zIndex: 9999,
      background: '#1e293b',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '0.8rem',
      width: '320px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      overflow: 'hidden'
    }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#0f172a',
          padding: '8px 12px',
          cursor: 'pointer',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none'
        }}
      >
        <span>🛠️ Debug Data Flow</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && (
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
          <div>
            <strong>User Profile:</strong>
            <pre style={{ margin: '4px 0', fontSize: '0.75rem', background: '#0f172a', padding: '4px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
          <div>
            <strong>Assessment Results:</strong>
            <pre style={{ margin: '4px 0', fontSize: '0.75rem', background: '#0f172a', padding: '4px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(assessment, null, 2)}
            </pre>
          </div>
          <div>
            <strong>Study Plan:</strong>
            <pre style={{ margin: '4px 0', fontSize: '0.75rem', background: '#0f172a', padding: '4px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(plan, null, 2)}
            </pre>
          </div>
          <div>
            <strong>Current Task:</strong>
            <pre style={{ margin: '4px 0', fontSize: '0.75rem', background: '#0f172a', padding: '4px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(currentTask, null, 2)}
            </pre>
          </div>
          <div>
            <strong>Progress:</strong>
            <pre style={{ margin: '4px 0', fontSize: '0.75rem', background: '#0f172a', padding: '4px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(progress, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TomorrowPlanPage;
