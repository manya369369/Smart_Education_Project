import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MistakeAnalysisPage.css';

const MistakeAnalysisPage = () => {
  const navigate = useNavigate();

  // Load results from quiz or fallback to diagnostic assessment mistakes
  const [dataSources] = useState(() => {
    let quizData = null;
    let diagnosticData = null;

    try {
      const savedQuiz = localStorage.getItem('neurolearn_quiz_result');
      if (savedQuiz) {
        quizData = JSON.parse(savedQuiz);
      }
    } catch (e) {
      console.error("Error reading quiz result", e);
    }

    try {
      const savedAssessment = localStorage.getItem('neurolearn_assessment_results') || localStorage.getItem('neurolearn_assessment_result');
      if (savedAssessment) {
        diagnosticData = JSON.parse(savedAssessment);
      }
    } catch (e) {
      console.error("Error reading assessment result", e);
    }

    return {
      quiz: quizData,
      diagnostic: diagnosticData
    };
  });

  const { quiz, diagnostic } = dataSources;

  // Determine active view details
  let pageTitle = 'Mistake Analysis';
  let activeTopic = '';
  let activeScore = 0;
  let activeTotal = 0;
  let activePercentage = 0;
  let activeMistakes = [];
  let isQuizData = false;

  if (quiz) {
    pageTitle = 'Quiz Mistake Analysis';
    activeTopic = quiz.topic;
    activeScore = quiz.score;
    activeTotal = quiz.totalQuestions || 5;
    activePercentage = quiz.percentage;
    activeMistakes = quiz.mistakes || [];
    isQuizData = true;
  } else if (diagnostic && diagnostic.mistakes && diagnostic.mistakes.length > 0) {
    pageTitle = 'Diagnostic Mistake Analysis';
    activeTopic = 'Diagnostic Assessment';
    activeScore = diagnostic.totalScore || 0;
    activeTotal = diagnostic.totalQuestions || 10;
    activePercentage = diagnostic.percentage || 0;
    activeMistakes = diagnostic.mistakes || [];
  }

  // 1. Render Empty State
  if (activeMistakes.length === 0) {
    return (
      <div className="mistakes-wrapper animate-fadeIn">
        <div className="mistakes-card empty-card">
          <div className="empty-icon">🎉</div>
          <h1 className="empty-title">No mistakes found!</h1>
          <p className="empty-desc">
            Outstanding! You have no recorded mistakes in your local sessions. Keep up the great work!
          </p>
          <div className="empty-actions">
            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              Go to Dashboard
            </button>
            <button onClick={() => navigate('/study-plan')} className="btn-secondary">
              View Study Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Render Mistake Analysis
  return (
    <div className="mistakes-wrapper animate-fadeIn">
      {/* Top Left Navigation Back button */}
      <button 
        className="back-button" 
        onClick={() => navigate(isQuizData ? '/learning' : '/dashboard')} 
        type="button"
      >
        ← Back
      </button>

      {/* Main card */}
      <div className="mistakes-card">
        {/* Header */}
        <header className="mistakes-header">
          <span className="mistakes-label">{pageTitle}</span>
          <h1 className="mistakes-title">Concept Review & Mistake Analysis</h1>
          <p className="mistakes-subtitle">
            Study the detailed explanations below to correct misunderstandings and master these concepts.
          </p>
        </header>

        {/* Results Overview */}
        <section className="results-summary-card">
          <div className="summary-meta-item">
            <span className="summary-label">Topic:</span>
            <strong>{activeTopic}</strong>
          </div>
          <div className="summary-meta-item">
            <span className="summary-label">Score:</span>
            <strong>{activeScore} / {activeTotal} ({activePercentage}%)</strong>
          </div>
          <div className="summary-meta-item">
            <span className="summary-label">Mistakes Flagged:</span>
            <span className="mistake-count-badge">{activeMistakes.length}</span>
          </div>
        </section>

        {/* Mistakes List */}
        <div className="mistakes-list">
          {activeMistakes.map((m, idx) => (
            <article className="mistake-item-card" key={idx}>
              {/* Question metadata header */}
              <div className="mistake-item-meta">
                <span className="question-number-badge">Question {idx + 1}</span>
                <div className="badge-group">
                  <span className="badge badge-topic">{m.topic}</span>
                  <span className={`badge badge-${m.difficulty.toLowerCase()}`}>
                    {m.difficulty}
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <h3 className="mistake-question-text">{m.question || m.questionText}</h3>

              {/* Answers Display comparison */}
              <div className="answers-comparison">
                <div className="answer-row incorrect-answer">
                  <span className="answer-indicator-cross">❌</span>
                  <div className="answer-text-block">
                    <span className="answer-label-text">Your Answer:</span>
                    <p className="answer-content">{m.selectedAnswer}</p>
                  </div>
                </div>

                <div className="answer-row correct-answer">
                  <span className="answer-indicator-check">✅</span>
                  <div className="answer-text-block">
                    <span className="answer-label-text">Correct Answer:</span>
                    <p className="answer-content">{m.correctAnswer}</p>
                  </div>
                </div>
              </div>

              {/* Explanations section */}
              <div className="explanation-section">
                <h4 className="explanation-title">Explanation</h4>
                <p className="explanation-text">{m.explanation}</p>
              </div>

              {m.reason && (
                <div className="reason-section">
                  <span className="reason-icon">💡</span>
                  <p className="reason-text"><strong>Recommendation:</strong> {m.reason}</p>
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Footer Actions */}
        <footer className="mistakes-footer">
          <button 
            type="button" 
            onClick={() => {
              localStorage.setItem('neurolearn_generate_tomorrow_from_mistakes', 'true');
              navigate('/tomorrow-plan');
            }} 
            className="btn-primary"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)'
            }}
          >
            Generate Tomorrow Plan
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/dashboard')} 
            className="btn-secondary"
          >
            Go to Dashboard
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/study-plan')} 
            className="btn-secondary"
          >
            View Study Plan
          </button>
        </footer>
      </div>
    </div>
  );
};

export default MistakeAnalysisPage;
