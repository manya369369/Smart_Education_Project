import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LearnerProfilePage.css';

const normalizeSelectedSubjects = (goalData, setupData) => {
  const sources = [setupData, goalData];
  
  try {
    const rawSetup = localStorage.getItem('neurolearn_setup_data');
    if (rawSetup) sources.push(JSON.parse(rawSetup));
  } catch (err) {
    console.warn("Silent catch rawSetup:", err.message);
  }
  try {
    const rawGoal = localStorage.getItem('neurolearn_goal_data');
    if (rawGoal) sources.push(JSON.parse(rawGoal));
  } catch (err) {
    console.warn("Silent catch rawGoal:", err.message);
  }

  for (const src of sources) {
    if (!src) continue;

    if (Array.isArray(src.subjects) && src.subjects.length > 0) {
      if (typeof src.subjects[0] === 'object' && src.subjects[0] !== null) {
        const normalized = src.subjects.map(item => {
          const sub = item.subject || item.name || '';
          const chap = item.chapter || item.topic || item.chapterTopic || item.selectedChapter || item.topChapter || (Array.isArray(item.topChapters) ? item.topChapters[0] : '') || '';
          return { subject: sub, chapter: chap };
        }).filter(item => item.subject);
        if (normalized.length > 0) return normalized;
      } else if (typeof src.subjects[0] === 'string') {
        const normalized = src.subjects.map((sub, idx) => {
          let chap = '';
          if (src.chapters && typeof src.chapters === 'object') {
            chap = src.chapters[sub] || src.chapters[idx] || '';
          }
          if (!chap && src.selectedChapters && typeof src.selectedChapters === 'object') {
            chap = src.selectedChapters[sub] || src.selectedChapters[idx] || '';
          }
          if (!chap && src.chapter) {
            chap = src.chapter;
          }
          return { subject: sub, chapter: chap || 'General Learning' };
        }).filter(item => item.subject);
        if (normalized.length > 0) return normalized;
      }
    }

    if (Array.isArray(src.selectedSubjects) && src.selectedSubjects.length > 0) {
      if (typeof src.selectedSubjects[0] === 'object' && src.selectedSubjects[0] !== null) {
        const normalized = src.selectedSubjects.map(item => {
          const sub = item.subject || item.name || '';
          const chap = item.chapter || item.topic || item.chapterTopic || item.selectedChapter || item.topChapter || (Array.isArray(item.topChapters) ? item.topChapters[0] : '') || '';
          return { subject: sub, chapter: chap };
        }).filter(item => item.subject);
        if (normalized.length > 0) return normalized;
      } else if (typeof src.selectedSubjects[0] === 'string') {
        const normalized = src.selectedSubjects.map((sub, idx) => {
          let chap = '';
          if (src.chapters && typeof src.chapters === 'object') {
            chap = src.chapters[sub] || src.chapters[idx] || '';
          }
          if (!chap && src.selectedChapters && typeof src.selectedChapters === 'object') {
            chap = src.selectedChapters[sub] || src.selectedChapters[idx] || '';
          }
          if (!chap && src.chapter) {
            chap = src.chapter;
          }
          return { subject: sub, chapter: chap || 'General Learning' };
        }).filter(item => item.subject);
        if (normalized.length > 0) return normalized;
      }
    }

    if (src.subject) {
      const sub = src.subject;
      const chap = src.chapter || src.topic || src.chapterTopic || src.selectedChapter || src.topChapter || (Array.isArray(src.topChapters) ? src.topChapters[0] : '') || 'General Learning';
      return [{ subject: sub, chapter: chap }];
    }
  }

  return [{ subject: 'General Knowledge', chapter: 'Logical Reasoning' }];
};

const getRoadmapsList = () => {
  const keys = [
    'roadmaps',
    'neurolearn_roadmaps',
    'neurolearn_generated_roadmaps',
    'neurolearn_ai_roadmap',
    'roadmap'
  ];
  for (const key of keys) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') {
          if (parsed.subject) return [parsed];
          if (Array.isArray(parsed.roadmaps)) return parsed.roadmaps;
        }
      }
    } catch (e) {
      console.warn(`Error reading roadmap key ${key}`, e);
    }
  }
  return [];
};

const LearnerProfilePage = () => {
  const navigate = useNavigate();

  // Try-catch wrapped loading state
  const [dataState] = useState(() => {
    console.log("[LearnerProfilePage] Initializing states and reading localStorage...");
    
    let parsedResult = null;
    let parsedGoal = null;
    let parsedSetup = null;
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

    // 2b. Read student setup data
    try {
      const savedSetup = localStorage.getItem('neurolearn_setup_data');
      if (savedSetup) {
        parsedSetup = JSON.parse(savedSetup);
      }
    } catch (e) {
      console.error("[LearnerProfilePage] Failed to parse neurolearn_setup_data JSON:", e);
    }

    // 3. Complete validation checks
    const isDataMissing = !parsedResult || 
                          (typeof parsedResult.score === 'undefined' && typeof parsedResult.totalScore === 'undefined') || 
                          (typeof parsedResult.percentage === 'undefined');

    return {
      result: parsedResult || {},
      goal: parsedGoal || {},
      setup: parsedSetup || {},
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

  // Normalize subjects and get subject scores
  const normalizedSubjects = normalizeSelectedSubjects(dataState.goal, dataState.setup);
  const selectedSubjects = normalizedSubjects.map(s => s.subject);

  const getSubjectScores = (generatedQuestions, selSubjects) => {
    const scores = {};
    selSubjects.forEach(sub => {
      const subQs = generatedQuestions.filter(q => q.subject?.toLowerCase() === sub?.toLowerCase());
      if (subQs.length === 0) {
        scores[sub] = percentage || 50;
      } else {
        const correct = subQs.filter(q => q.userAnswer === q.correctAnswer).length;
        scores[sub] = Math.round((correct / subQs.length) * 100);
      }
    });
    return scores;
  };

  const subjectScores = getSubjectScores(dataState.result.generatedQuestions || [], selectedSubjects);

  // Parse daily study time to minutes
  const parseStudyTimeToMinutes = (studyTimeStr) => {
    if (!studyTimeStr) return 120;
    const str = studyTimeStr.toLowerCase();
    if (str.includes('hour')) {
      const hours = parseFloat(str) || 2;
      return Math.round(hours * 60);
    }
    const mins = parseInt(str, 10);
    if (!isNaN(mins)) return mins;
    return 120;
  };

  const totalMinutes = parseStudyTimeToMinutes(dataState.goal.studyTime);
  const recommendedTimes = {};

  if (selectedSubjects.length === 1) {
    recommendedTimes[selectedSubjects[0]] = totalMinutes;
  } else if (selectedSubjects.length === 2) {
    const sub1 = selectedSubjects[0];
    const sub2 = selectedSubjects[1];
    const score1 = subjectScores[sub1] || 50;
    const score2 = subjectScores[sub2] || 50;
    
    if (Math.abs(score1 - score2) >= 15) {
      if (score1 < score2) {
        recommendedTimes[sub1] = Math.round(totalMinutes * 0.6);
        recommendedTimes[sub2] = totalMinutes - recommendedTimes[sub1];
      } else {
        recommendedTimes[sub2] = Math.round(totalMinutes * 0.6);
        recommendedTimes[sub1] = totalMinutes - recommendedTimes[sub2];
      }
    } else {
      recommendedTimes[sub1] = Math.round(totalMinutes / 2);
      recommendedTimes[sub2] = totalMinutes - recommendedTimes[sub1];
    }
  } else {
    const share = Math.round(totalMinutes / selectedSubjects.length);
    selectedSubjects.forEach((sub, idx) => {
      if (idx === selectedSubjects.length - 1) {
        let sum = 0;
        selectedSubjects.slice(0, -1).forEach(s => sum += recommendedTimes[s]);
        recommendedTimes[sub] = totalMinutes - sum;
      } else {
        recommendedTimes[sub] = share;
      }
    });
  }

  const allRoadmaps = getRoadmapsList();

  const handleContinueDashboard = (subjectJourneyData) => {
    try {
      localStorage.setItem('neurolearn_active_subject_journey', JSON.stringify(subjectJourneyData));
      localStorage.setItem('activeSubjectJourney', JSON.stringify(subjectJourneyData));
      localStorage.setItem('neurolearn_active_journey', JSON.stringify(subjectJourneyData));
      console.log("[LearnerProfilePage] Saved active subject journey:", subjectJourneyData);
    } catch (e) {
      console.error("Failed to save journey to localStorage", e);
    }
    navigate('/dashboard');
  };

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

        {/* Today's Roadmap-Based Learning Plan Section */}
        <section className="profile-section" style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h2 className="profile-section-title" style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>
            Today's Roadmap-Based Learning Plan
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', marginBottom: '1.5rem' }}>
            Based on your diagnostic assessment and generated roadmap.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {selectedSubjects.map(sub => {
              const scoreVal = subjectScores[sub] || percentage || 0;
              const recTime = recommendedTimes[sub] || 60;
              
              const matchingR = allRoadmaps.find(
                r => r.subject?.toLowerCase() === sub?.toLowerCase()
              );
              
              let currentTopic = null;
              let topicIndex = 0;
              let progressVal = 0;
              
              if (matchingR && Array.isArray(matchingR.topics) && matchingR.topics.length > 0) {
                const topics = matchingR.topics;
                const completedCount = topics.filter(t => t.completed || t.isCompleted || t.status === 'completed').length;
                progressVal = Math.round((completedCount / topics.length) * 100);
                
                const incIdx = topics.findIndex(t => !t.completed && !t.isCompleted && t.status !== 'completed');
                if (incIdx !== -1) {
                  currentTopic = topics[incIdx];
                  topicIndex = incIdx;
                } else {
                  currentTopic = topics[0];
                  topicIndex = 0;
                }
              }
              
              const topicTitle = currentTopic?.title || 'Introductory Concepts';
              const topicEstTime = currentTopic?.estimatedMinutes || currentTopic?.estimatedTime || 25;
              const topicObjective = currentTopic?.learningObjective || 'Establish baseline terms and relationships.';
              
              const isWeak = weakTopics.some(wt => 
                wt?.toLowerCase().includes(topicTitle.toLowerCase()) || 
                topicTitle.toLowerCase().includes(wt?.toLowerCase())
              );
              
              const statusText = isWeak ? "Needs Extra Focus" : "Ready to Learn";
              const statusColor = isWeak ? "#fbbf24" : "#34d399";
              
              const subjectJourneyData = {
                subject: sub,
                chapter: matchingR?.chapter || dataState.goal.chapter || 'Foundations',
                recommendedStudyTime: recTime,
                currentRoadmapTopic: topicTitle,
                currentTopicIndex: topicIndex,
                progress: progressVal,
                weakTopics,
                strongTopics,
                assessmentScore: scoreVal
              };

              return (
                <div 
                  key={sub} 
                  className="competency-box" 
                  style={{ 
                    padding: '1.5rem', 
                    borderRadius: '12px', 
                    background: 'rgba(30, 41, 59, 0.4)', 
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#f8fafc' }}>{sub}</h3>
                    <span 
                      style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: '700', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '20px', 
                        backgroundColor: isWeak ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: statusColor,
                        border: `1px solid ${isWeak ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                      }}
                    >
                      {statusText}
                    </span>
                  </div>

                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
                    Chapter: <strong>{matchingR?.chapter || dataState.goal.chapter || 'General Foundations'}</strong>
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '1rem 0' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assessment Score</span>
                      <strong style={{ fontSize: '1.2rem', color: '#f8fafc' }}>{scoreVal}%</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recommended Time</span>
                      <strong style={{ fontSize: '1.2rem', color: '#818cf8' }}>{recTime} mins</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Roadmap Progress</span>
                      <strong style={{ fontSize: '1.2rem', color: '#f8fafc' }}>{progressVal}%</strong>
                    </div>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>NEXT ROADMAP TOPIC</span>
                    <strong style={{ display: 'block', fontSize: '1.1rem', color: '#f8fafc', marginBottom: '0.25rem' }}>{topicTitle}</strong>
                    <span style={{ display: 'block', fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '0.5rem' }}>{topicObjective}</span>
                    <span style={{ fontSize: '0.85rem', color: '#818cf8' }}>⏱️ Est. Time: {topicEstTime} mins</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleContinueDashboard(subjectJourneyData)}
                    className="submit-button"
                    style={{ marginTop: '0.5rem', width: '100%' }}
                  >
                    Continue {sub} Dashboard
                  </button>
                </div>
              );
            })}
          </div>
        </section>


      </div>
    </div>
  );
};

export default LearnerProfilePage;
