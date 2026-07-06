import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AssessmentPage.css';

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

const getRoadmapData = () => {
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

const AssessmentPage = () => {
  const navigate = useNavigate();

  // =====================================================
  // STATE: Loading & UI
  // =====================================================
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Reading your personalized roadmap...");
  const [errorMessage, setErrorMessage] = useState('');

  // (Transition states removed - subjects are loaded sequentially via loadSubjectAssessment)

  // =====================================================
  // STATE: Data from localStorage
  // =====================================================
  const [goalData] = useState(() => {
    try {
      const saved = localStorage.getItem('neurolearn_goal_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || 'Learner',
          examGoal: parsed.examGoal || 'General Study',
          subjects: parsed.subjects || ['General Learning'],
          examDate: parsed.examDate || '',
          studyTime: parsed.studyTime || ''
        };
      }
    } catch (e) {
      console.error("Error reading goal data", e);
    }
    return {
      name: 'Learner',
      examGoal: 'General Study',
      subjects: ['General Learning'],
      examDate: '',
      studyTime: ''
    };
  });

  const [setupData] = useState(() => {
    try {
      const saved = localStorage.getItem('neurolearn_setup_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error reading setup data", e);
    }
    return { studentType: 'College Student', learningMode: 'Focus Mode', subjects: [] };
  });



  // Derived state
  const setupSubjects = normalizeSelectedSubjects(goalData, setupData);
  const learningMode = setupData.learningMode || 'Focus Mode';
  const studentType = setupData.studentType || localStorage.getItem('neurolearn_student_type') || 'College Student';
  const classOrSemester = localStorage.getItem('neurolearn_student_class_or_semester') || '';
  const totalSubjects = learningMode === 'Focus Mode' ? 1 : Math.min(setupSubjects.length, 2);
  const questionsPerSubject = 10;

  // =====================================================
  // STATE: Assessment questions & answers
  // =====================================================
  // allAssessments: array of { subject, chapter, roadmapTopics, questions }
  const [allAssessments, setAllAssessments] = useState([]);
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [loadingSubjectIndex, setLoadingSubjectIndex] = useState(0);
  const [isFallbackActive, setIsFallbackActive] = useState(false);

  const hasCalledApiRef = useRef(false);

  // =====================================================
  // Loading phrase rotation
  // =====================================================
  useEffect(() => {
    if (!isLoading) return;
    const phrases = [
      "Reading your personalized roadmap...",
      "Analyzing roadmap topics for assessment...",
      "AI is generating questions from your roadmap...",
      "Creating difficulty-adaptive questions...",
      "Personalizing your diagnostic assessment..."
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % phrases.length;
      setLoadingText(phrases[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // =====================================================
  // LOAD ASSESSMENT FOR SUBJECT: Call backend dynamically for the given subject index
  // =====================================================
  const loadSubjectAssessment = async (subjectIdx) => {
    setIsLoading(true);
    setErrorMessage('');
    setLoadingSubjectIndex(subjectIdx);
    setIsFallbackActive(false);

    if (subjectIdx === 0) {
      setCurrentSubjectIndex(0);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setAllAssessments([]);
      localStorage.removeItem('neurolearn_generated_questions');
      localStorage.removeItem('neurolearn_assessment_result');
      localStorage.removeItem('neurolearn_assessment_results');
      localStorage.removeItem('neurolearn_assessment_detailed_records');
    }

    let setupSubjects = normalizeSelectedSubjects(goalData, setupData);
    // Enforce subjects list constraints based on learning mode
    if (learningMode === 'Focus Mode' && setupSubjects.length > 1) {
      setupSubjects = [setupSubjects[0]];
    } else if (learningMode === 'Balanced Mode' && setupSubjects.length > 2) {
      setupSubjects = setupSubjects.slice(0, 2);
    }

    if (subjectIdx >= setupSubjects.length) {
      setIsLoading(false);
      return;
    }

    const setupSubject = setupSubjects[subjectIdx];
    const allRoadmaps = getRoadmapData();
    const matchingRoadmap = allRoadmaps.find(
      r => r.subject?.toLowerCase() === setupSubject.subject?.toLowerCase() &&
           r.chapter?.toLowerCase() === setupSubject.chapter?.toLowerCase()
    );

    const subjectAssessments = [{
      subject: setupSubject.subject,
      chapter: setupSubject.chapter,
      roadmapTopics: (matchingRoadmap && matchingRoadmap.topics) ? matchingRoadmap.topics.map(t => t.title || t.name || t) : []
    }];

    console.log(`[AssessmentPage] Requesting assessment for Subject ${subjectIdx + 1}: ${setupSubject.subject}`);

    try {
      const qCount = 10;
      const response = await fetch('/api/generate-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentType,
          classOrSemester,
          examGoal: goalData.examGoal,
          learningMode,
          subjectAssessments,
          questionCount: qCount,
          generationSeed: Date.now()
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();

      if (data.fallback || data.source === 'fallback') {
        setIsFallbackActive(true);
      } else {
        setIsFallbackActive(false);
      }

      if (!data.assessments || !Array.isArray(data.assessments) || data.assessments.length === 0) {
        throw new Error("No assessments returned from server");
      }

      const freshAssessment = data.assessments[0];
      if (freshAssessment.error) {
        throw new Error(freshAssessment.error);
      }

      if (!freshAssessment.questions || freshAssessment.questions.length === 0) {
        throw new Error("No questions returned for this subject");
      }

      // Normalize questions
      const normalizedQuestions = freshAssessment.questions.map((q, idx) => ({
        ...q,
        id: q.id || `q_${freshAssessment.subject}_${idx + 1}`,
        subject: q.subject || freshAssessment.subject,
        chapter: q.chapter || freshAssessment.chapter,
        topic: q.topic || q.roadmapTopic || '',
        roadmapTopic: q.topic || q.roadmapTopic || ''
      }));

      const newAssessmentObj = {
        subject: freshAssessment.subject,
        chapter: freshAssessment.chapter,
        roadmapTopics: freshAssessment.roadmapTopics || [],
        questions: normalizedQuestions
      };

      setAllAssessments(prev => {
        const updated = [...prev];
        updated[subjectIdx] = newAssessmentObj;
        return updated;
      });

      setCurrentSubjectIndex(subjectIdx);
      setCurrentQuestionIndex(0);

    } catch (err) {
      console.error("[AssessmentPage] Assessment generation failed:", err);
      setErrorMessage(`Failed to generate assessment: ${err.message}. Click "Regenerate Assessment" to try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasCalledApiRef.current) return;
    hasCalledApiRef.current = true;
    loadSubjectAssessment(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegenerateAssessment = () => {
    loadSubjectAssessment(currentSubjectIndex);
  };
  // =====================================================
  // Current assessment and question helpers
  // =====================================================
  const currentAssessment = allAssessments[currentSubjectIndex];
  const currentQuestions = currentAssessment?.questions || [];
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const totalQuestionsInSubject = Math.min(currentQuestions.length, questionsPerSubject);

  let overallQuestionIndex = currentQuestionIndex + 1;
  if (currentSubjectIndex > 0) {
    for (let i = 0; i < currentSubjectIndex; i++) {
      const prevAssessment = allAssessments[i];
      if (prevAssessment && prevAssessment.questions) {
        overallQuestionIndex += Math.min(prevAssessment.questions.length, questionsPerSubject);
      } else {
        overallQuestionIndex += questionsPerSubject;
      }
    }
  }

  const totalQuestionsOverall = totalSubjects * questionsPerSubject;

  // =====================================================
  // HANDLERS
  // =====================================================
  const handleOptionSelect = (option) => {
    if (!currentQuestion) return;
    const key = `${currentSubjectIndex}_${currentQuestion.id}`;
    setUserAnswers(prev => ({ ...prev, [key]: option }));
    setErrorMessage('');
  };

  const handleNext = () => {
    if (!currentQuestion) return;

    const key = `${currentSubjectIndex}_${currentQuestion.id}`;
    const selectedAns = userAnswers[key];
    if (!selectedAns) {
      setErrorMessage('Please select an answer before continuing.');
      return;
    }

    const nextIdx = currentQuestionIndex + 1;

    // Check if this was the last question for this subject
    if (nextIdx >= totalQuestionsInSubject) {
      // Check if there are more subjects (Balanced Mode)
      const setupSubjects = setupData.subjects || [];
      if (currentSubjectIndex + 1 < setupSubjects.length) {
        // Load the next subject dynamically!
        loadSubjectAssessment(currentSubjectIndex + 1, false);
        return;
      }
      return;
    }

    setCurrentQuestionIndex(nextIdx);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setErrorMessage('');
    }
  };

  // Check if this is the absolute last question across all subjects
  const isLastQuestionOverall = (
    currentSubjectIndex === (setupData.subjects?.length || 1) - 1 &&
    currentQuestionIndex === totalQuestionsInSubject - 1
  );

  // Check if this is the last question for the current subject (but not last subject)
  const isLastQuestionForSubject = (
    currentQuestionIndex === totalQuestionsInSubject - 1 &&
    currentSubjectIndex + 1 < (setupData.subjects?.length || 1)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentQuestion) return;

    const key = `${currentSubjectIndex}_${currentQuestion.id}`;
    const selectedAns = userAnswers[key];
    if (!selectedAns) {
      setErrorMessage('Please select an answer before continuing.');
      return;
    }

    // Compile results across all subjects
    const allQuestions = [];
    const allMistakes = [];
    const allCorrect = [];
    let totalScore = 0;

    allAssessments.forEach((assessment, assessIdx) => {
      const questionsSlice = assessment.questions.slice(0, questionsPerSubject);

      questionsSlice.forEach(q => {
        const ansKey = `${assessIdx}_${q.id}`;
        const ans = userAnswers[ansKey];
        const isCorrect = ans === q.correctAnswer;

        const enrichedQ = {
          ...q,
          subject: assessment.subject,
          chapter: assessment.chapter,
          topic: q.topic || q.roadmapTopic || '',
          roadmapTopic: q.topic || q.roadmapTopic || '',
          userAnswer: ans || null
        };

        allQuestions.push(enrichedQ);

        if (isCorrect) {
          totalScore += 1;
          allCorrect.push(enrichedQ);
        } else {
          allMistakes.push({
            questionId: q.id,
            subject: assessment.subject,
            chapter: assessment.chapter,
            topic: q.topic,
            difficulty: q.difficulty,
            questionText: q.question,
            selectedAnswer: ans,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          });
        }
      });
    });

    const totalQuestions = allQuestions.length;
    const percentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    // Compute strong and weak topics
    const strongTopics = [...new Set(allCorrect.map(q => q.topic))].filter(Boolean);
    let weakTopics = [...new Set(allMistakes.map(m => m.topic))].filter(Boolean);

    if (weakTopics.length === 0) {
      // Find topic with lowest score ratio
      const topicStats = {};
      allQuestions.forEach(q => {
        if (!topicStats[q.topic]) {
          topicStats[q.topic] = { correct: 0, total: 0 };
        }
        topicStats[q.topic].total += 1;
        const ansKey = allAssessments.findIndex(a => a.subject === q.subject);
        const ans = userAnswers[`${ansKey}_${q.id}`];
        if (ans === q.correctAnswer) {
          topicStats[q.topic].correct += 1;
        }
      });

      let lowestTopic = null;
      let lowestRatio = 1.1;
      Object.keys(topicStats).forEach(t => {
        const ratio = topicStats[t].correct / topicStats[t].total;
        if (ratio < lowestRatio) {
          lowestRatio = ratio;
          lowestTopic = t;
        }
      });
      if (lowestTopic) weakTopics = [lowestTopic];
    }

    if (weakTopics.length === 0) {
      weakTopics = [allAssessments[0]?.subject + " Fundamentals"];
    }

    // Determine user knowledge level
    let currentLevel = 'Beginner';
    if (percentage >= 75) {
      currentLevel = 'Advanced';
    } else if (percentage >= 50) {
      currentLevel = 'Intermediate';
    }

    const selectedSubjects = allAssessments.map(a => a.subject);
    const primarySubject = selectedSubjects[0] || 'General Learning';

    const finalResult = {
      subject: primarySubject,
      chapter: allAssessments[0]?.chapter || '',
      primarySubject,
      selectedSubjects,
      generatedQuestions: allQuestions,
      score: totalScore,
      totalScore: totalScore,
      totalQuestions: totalQuestions,
      percentage,
      strongTopics,
      weakTopics,
      mistakes: allMistakes,
      currentLevel,
      completedAt: new Date().toISOString(),
      assessmentDetails: allAssessments.map(a => ({
        subject: a.subject,
        chapter: a.chapter,
        roadmapTopics: a.roadmapTopics,
        questionCount: Math.min(a.questions.length, questionsPerSubject)
      }))
    };

    try {
      localStorage.setItem('neurolearn_assessment_result', JSON.stringify(finalResult));
      localStorage.setItem('neurolearn_assessment_results', JSON.stringify(finalResult));

      const detailedRecords = allQuestions.map(q => ({
        subject: q.subject,
        chapter: q.chapter,
        roadmapTopic: q.topic || q.roadmapTopic || '',
        question: q.question,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        userAnswer: q.userAnswer,
        weakTopics: weakTopics,
        strongTopics: strongTopics
      }));
      localStorage.setItem('neurolearn_assessment_detailed_records', JSON.stringify(detailedRecords));

      console.log("[AssessmentPage] Assessment result saved:", {
        subjects: selectedSubjects,
        score: `${totalScore}/${totalQuestions}`,
        percentage: `${percentage}%`,
        level: currentLevel,
        strongTopics,
        weakTopics
      });
    } catch (e) {
      console.error("Error saving assessment result", e);
    }

    navigate('/learner-profile');
  };

  const handleBack = () => {
    navigate('/roadmap');
  };

  // =====================================================
  // RENDER: Loading state
  // =====================================================
  if (isLoading) {
    const totalSubjectsCount = totalSubjects;
    const currentSubjectName = setupSubjects[loadingSubjectIndex]?.subject || 'Subject';
    
    const isTransitioning = loadingSubjectIndex > 0;
    const previousSubjectName = isTransitioning ? (setupSubjects[loadingSubjectIndex - 1]?.subject || 'Subject 1') : '';
    
    const loadingTitleText = isTransitioning 
      ? `${previousSubjectName} assessment completed.` 
      : 'AI is creating your personalized assessment...';
      
    const loadingSubtitleText = isTransitioning 
      ? `Starting ${currentSubjectName} assessment...` 
      : 'Questions are being generated...';

    return (
      <div className="assessment-wrapper">
        <div className="loading-container" style={{ padding: '3.5rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          <div className="loading-spinner" style={{ marginBottom: '1.5rem' }}>
            <div className="spinner-outer"></div>
            <div className="spinner-inner"></div>
            <div className="spinner-glow"></div>
          </div>
          
          <h2 className="loading-title" style={{ margin: '0.5rem 0 1rem 0', fontSize: '1.6rem', lineHeight: '1.4', background: 'linear-gradient(135deg, #ffffff 70%, rgba(255, 255, 255, 0.6) 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center' }}>
            {loadingTitleText}
          </h2>
          
          <h3 className="loading-subtitle" style={{ margin: '0.5rem 0 1rem 0', fontSize: '1.25rem', color: '#818cf8', fontWeight: '600', letterSpacing: '0.5px', textAlign: 'center' }}>
            {loadingSubtitleText}
          </h3>

          {totalSubjectsCount > 1 && (
            <div className="loading-subject-badge" style={{ margin: '0.5rem 0 1.5rem 0', padding: '0.4rem 1.2rem', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#a5b4fc', fontSize: '1rem', fontWeight: '700' }}>
              Loading {currentSubjectName} Assessment... (Subject {loadingSubjectIndex + 1} of {totalSubjectsCount})
            </div>
          )}
          
          <p className="loading-phrase" key={loadingText} style={{ margin: '1rem 0 0 0', fontSize: '1.05rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
            {loadingText}
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: Error state (no questions)
  // =====================================================
  if (allAssessments.length === 0 || !currentQuestion) {
    return (
      <div className="assessment-wrapper">
        <button className="back-button" onClick={handleBack} type="button">
          ← Back
        </button>
        <div className="assessment-card">
          <header className="assessment-card-header">
            <h1 className="assessment-card-title">Assessment</h1>
          </header>
          {errorMessage && (
            <div className="fallback-warning-banner">
              <span>⚠️ {errorMessage}</span>
            </div>
          )}
          <section className="student-details">
            <button
              className="regenerate-assessment-btn"
              onClick={handleRegenerateAssessment}
              type="button"
            >
              🔄 Regenerate Assessment
            </button>
          </section>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: Question interface
  // =====================================================
  const answerKey = `${currentSubjectIndex}_${currentQuestion.id}`;
  const progressPercent = (overallQuestionIndex / totalQuestionsOverall) * 100;

  return (
    <div className="assessment-wrapper">
      {/* Top-left back button */}
      <button className="back-button" onClick={handleBack} type="button">
        ← Back
      </button>

      {/* Main card */}
      <div className="assessment-card">
        {/* Card Header */}
        <header className="assessment-card-header">
          <span className="ai-label">AI-generated diagnostic assessment</span>
          <h1 className="assessment-card-title">Adaptive Diagnostic Assessment</h1>
          <p className="assessment-card-subtitle">
            Answer a few questions so NeuroLearn AI can understand your current level.
          </p>
        </header>

        {/* Student Onboarding details */}
        <section className="student-details">
          <div className="student-meta-item">
            <span className="student-meta-label">Student:</span>
            <strong>{goalData.name || 'Learner'}</strong>
          </div>
          <div className="student-meta-item">
            <span className="student-meta-label">Goal:</span>
            <strong>{goalData.examGoal || 'General Study'}</strong>
          </div>
          <div className="subjects-chips">
            {setupSubjects.map((s, idx) => (
              <span
                className={`subject-chip${idx === currentSubjectIndex ? '' : ''}`}
                key={`${s.subject}-${s.chapter}`}
                style={idx === currentSubjectIndex ? { opacity: 1 } : { opacity: 0.5 }}
              >
                {s.subject} — {s.chapter}
              </span>
            ))}
          </div>
          <button
            className="regenerate-assessment-btn"
            onClick={handleRegenerateAssessment}
            type="button"
          >
            🔄 Regenerate Assessment
          </button>
        </section>

        {/* Subject indicator for Balanced Mode */}
        {totalSubjects > 1 && currentAssessment && (
          <div className="fallback-warning-banner" style={{ background: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
            <span style={{ color: '#a5b4fc' }}>
              📚 Subject {currentSubjectIndex + 1} of {totalSubjects}: <strong>{currentAssessment.subject}</strong> — {currentAssessment.chapter}
            </span>
          </div>
        )}

        {isFallbackActive && (
          <div className="fallback-warning-banner" style={{ marginTop: '0.5rem', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <span style={{ color: '#f87171' }}>
              ⚠️ AI fallback active (using dynamic offline assessment)
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="fallback-warning-banner">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Question metadata row */}
        <>
          <div className="meta-info">
            <span className="question-count">
              Question {overallQuestionIndex} of {totalQuestionsOverall}
            </span>
            <div className="badge-group">
              <span className="badge badge-subject">{currentQuestion.subject}</span>
              <span className="badge badge-topic">{currentQuestion.topic}</span>
              <span className={`badge badge-${currentQuestion.difficulty.toLowerCase()}`}>
                Difficulty: {currentQuestion.difficulty}
              </span>
            </div>
          </div>

          {/* Question Text */}
          <h2 className="question-text">{currentQuestion.question}</h2>

          {/* Error Message inside the card */}
          {errorMessage && (
            <div className="error-banner">
              <span className="error-icon">!</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 4 Multi-choice options */}
          <div className="options-container">
            {currentQuestion.options.map((opt, index) => {
              const letter = String.fromCharCode(65 + index);
              const isSelected = userAnswers[answerKey] === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleOptionSelect(opt)}
                  className={`option-button ${isSelected ? 'selected' : ''}`}
                >
                  <span className="option-letter">{letter}</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </>

        {/* Footer controls */}
        <footer className="controls-container">
          {/* Previous button */}
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="btn-secondary"
          >
            ← Previous
          </button>

          {/* Next / Continue to Next Subject / Submit */}
          {isLastQuestionOverall ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary"
            >
              SUBMIT ASSESSMENT
            </button>
          ) : isLastQuestionForSubject ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn-primary"
            >
              Continue to {setupSubjects[currentSubjectIndex + 1]?.subject} →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="btn-primary"
            >
              Next →
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default AssessmentPage;
