import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DashboardPage.css';
import { buildTopicSessionKey, calcTopicProgress, getCompletedTopicCount, getCompletedTopics, formatStudyTime, initFreshTopicSession, getSubjectProgress, resolveSessionKey, createRoadmapKey, resolveClassAndSemester, formatDashboardTime, getTimeTrackingData } from '../utils/sessionHelpers';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

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

  // ============================================================
  // BUG 1 FIX: Read goal from neurolearn_goal_data FIRST (single source of truth)
  // neurolearn_user_profile may contain stale/demo data — use as last resort
  // ============================================================
  const [dashboardData, setDashboardData] = useState(() => {
    console.log("[DashboardPage] Reading local storage data...");

    let goal = null;
    let assessment = null;
    let hasError = false;

    try {
      // PRIORITY: neurolearn_goal_data first (set by GoalSetupPage), then neurolearn_user_profile as fallback
      const savedGoal = localStorage.getItem('neurolearn_goal_data') || localStorage.getItem('neurolearn_user_profile');
      if (savedGoal) {
        goal = JSON.parse(savedGoal);
      }
    } catch (e) {
      console.error("[DashboardPage] Failed to parse goal data:", e);
      hasError = true;
    }

    try {
      const savedAssessment = localStorage.getItem('neurolearn_assessment_results') || localStorage.getItem('neurolearn_assessment_result');
      if (savedAssessment) {
        assessment = JSON.parse(savedAssessment);
      }
    } catch (e) {
      console.error("[DashboardPage] Failed to parse assessment data:", e);
      hasError = true;
    }

    // Determine active subject based on priority guidelines
    let activeSubject = 'General Learning';
    try {
      const rawJourney = localStorage.getItem('neurolearn_active_subject_journey') ||
        localStorage.getItem('activeSubjectJourney') ||
        localStorage.getItem('neurolearn_active_journey');
      if (rawJourney) {
        const parsed = JSON.parse(rawJourney);
        if (parsed?.subject) activeSubject = parsed.subject;
      }
    } catch (e) { }

    if (activeSubject === 'General Learning') {
      try {
        const rawTask = localStorage.getItem('neurolearn_current_learning_task');
        if (rawTask) {
          const parsed = JSON.parse(rawTask);
          if (parsed?.subject) activeSubject = parsed.subject;
        }
      } catch (e) { }
    }

    if (activeSubject === 'General Learning') {
      try {
        const rawGoal = localStorage.getItem('neurolearn_goal_data');
        if (rawGoal) {
          const parsed = JSON.parse(rawGoal);
          if (parsed?.subjects && parsed.subjects.length > 0) {
            activeSubject = parsed.subjects[0];
          }
        }
      } catch (e) { }
    }

    // Load progress for this active subject
    let progress = null;
    try {
      const rawProgress = localStorage.getItem('neurolearn_subject_progress');
      if (rawProgress) {
        const progressMap = JSON.parse(rawProgress);
        const matchKey = Object.keys(progressMap).find(k => {
          const p = progressMap[k];
          return p && String(p.subject || '').toLowerCase() === activeSubject.toLowerCase();
        });
        if (matchKey) {
          progress = progressMap[matchKey];
        }
      }
    } catch (e) { }

    const isDataMissing = !goal || !assessment;

    console.log("[DashboardPage] Goal data:", goal);
    console.log("[DashboardPage] Assessment data:", assessment);
    console.log("[DashboardPage] Resolved active subject:", activeSubject);

    return {
      goal,
      assessment,
      activeSubject,
      progress,
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
  const { goal, assessment, activeSubject, progress, isInvalid } = dashboardData;

  // ============================================================
  // BUG 2 FIX: Read active journey and use its subject as source of truth
  // ============================================================
  const activeJourney = useMemo(() => {
    try {
      const raw = localStorage.getItem('neurolearn_active_subject_journey') ||
        localStorage.getItem('activeSubjectJourney') ||
        localStorage.getItem('neurolearn_active_journey');
      if (raw) {
        const parsed = JSON.parse(raw);
        console.log("[DashboardPage] Active journey:", parsed);
        return parsed;
      }
    } catch (e) {
      console.error("[DashboardPage] Failed to parse active journey:", e);
    }
    return null;
  }, []);

  const [showPopup, setShowPopup] = useState(() => {
    return !sessionStorage.getItem('neurolearn_dashboard_popup_seen');
  });

  const handleDismissPopup = () => {
    setShowPopup(false);
    sessionStorage.setItem('neurolearn_dashboard_popup_seen', 'true');
  };

  let userName = '';
  try {
    const userRaw = localStorage.getItem('neurolearn_user');
    if (userRaw) {
      const userObj = JSON.parse(userRaw);
      userName = userObj.name;
    }
  } catch (e) { }
  const studentName = userName || goal?.name || 'Learner';
  const examGoal = goal?.goal || goal?.examGoal || 'General Study';
  const examDate = goal?.examDate || '';

  // BUG 2 FIX: Merge subjects from goal AND active journey
  const selectedSubjects = useMemo(() => {
    const goalSubjects = goal?.subjects || [];
    // If active journey has a subject, ensure it's included and shown first
    if (activeJourney?.subject) {
      const journeySubject = activeJourney.subject;
      if (!goalSubjects.includes(journeySubject)) {
        return [journeySubject, ...goalSubjects];
      }
      // Move journey subject to front
      return [journeySubject, ...goalSubjects.filter(s => s !== journeySubject)];
    }
    return goalSubjects;
  }, [goal, activeJourney]);

  // Helper to filter weak/strong topics by active subject and clean up cross-subject topics
  const isTopicMatchingSubject = (topicObj, activeSub) => {
    if (!topicObj) return false;

    const subjNormalized = String(activeSub || '').toLowerCase();

    // Determine the subject and topic name
    let topicSubject = '';
    let topicName = '';

    if (typeof topicObj === 'object' && topicObj !== null) {
      topicSubject = String(topicObj.subject || '').toLowerCase();
      topicName = String(topicObj.topic || '').toLowerCase();
    } else {
      // It's a string (legacy format)
      topicName = String(topicObj).toLowerCase();
      // Guess subject based on keywords
      const englishKeywords = ['noun', 'pronoun', 'verb', 'adjective', 'adverb', 'plural', 'countable', 'uncountable', 'morphology', 'grammar'];
      const isEnglishGrammar = englishKeywords.some(keyword => topicName.includes(keyword));

      const dbmsKeywords = ['dbms', 'sql', 'database', 'relational', 'normalization', 'transaction', 'indexing', 'query', '1nf', '2nf', '3nf', 'bcnf', 'functional dependencies', 'lossless join', 'keys'];
      const isDbms = dbmsKeywords.some(keyword => topicName.includes(keyword));

      if (isEnglishGrammar) {
        topicSubject = 'english';
      } else if (isDbms) {
        topicSubject = 'dbms';
      } else {
        // Fallback: assume matches current subject context
        topicSubject = subjNormalized;
      }
    }

    // 1. subject must match currentSubject (case-insensitive)
    if (topicSubject !== subjNormalized) {
      return false;
    }

    // 2. Extra Validation
    const isEnglishSub = subjNormalized.includes('english') || subjNormalized.includes('grammar');
    const isDbmsSub = subjNormalized.includes('dbms') || subjNormalized.includes('database');

    if (isEnglishSub) {
      // Never display DBMS topics
      const forbiddenInEnglish = ['1nf', '2nf', '3nf', 'bcnf', 'functional dependencies', 'lossless join', 'normalization', 'database', 'sql', 'keys'];
      if (forbiddenInEnglish.some(word => topicName.includes(word))) {
        return false;
      }
    }

    if (isDbmsSub) {
      // Never display English grammar topics
      const forbiddenInDbms = ['noun', 'pronoun', 'verb', 'adjective', 'plural', 'grammar', 'countable', 'uncountable'];
      if (forbiddenInDbms.some(word => topicName.includes(word))) {
        return false;
      }
    }

    // Check DSA subject too
    if (subjNormalized.includes('dsa') || subjNormalized.includes('structure') || subjNormalized.includes('algorithm')) {
      const forbiddenInDsa = ['noun', 'pronoun', 'verb', 'adjective', 'plural', 'grammar', 'countable', 'uncountable'];
      if (forbiddenInDsa.some(word => topicName.includes(word))) {
        return false;
      }
    }

    return true;
  };

  // Determine dynamic diagnostic score & learning level strictly for the active subject
  const overallScore = useMemo(() => {
    if (!assessment) return 0;
    if (String(assessment.subject || '').toLowerCase() === activeSubject.toLowerCase()) {
      return assessment.percentage ?? (assessment.score !== undefined ? Math.round((assessment.score / 10) * 100) : 0);
    }
    if (progress && typeof progress.assessmentScore === 'number') {
      return progress.assessmentScore;
    }
    return 0;
  }, [assessment, activeSubject, progress]);

  const learningLevel = useMemo(() => {
    if (!assessment) return 'Beginner';
    if (String(assessment.subject || '').toLowerCase() === activeSubject.toLowerCase()) {
      return assessment.currentLevel || 'Beginner';
    }
    if (overallScore >= 75) return 'Advanced';
    if (overallScore >= 50) return 'Intermediate';
    return 'Beginner';
  }, [assessment, activeSubject, overallScore]);

  const strongTopics = useMemo(() => {
    const rawStrong = [
      ...(assessment?.strongTopics || []),
      ...(progress?.strongTopics || [])
    ];
    const filtered = rawStrong.filter(t => isTopicMatchingSubject(t, activeSubject));
    const names = filtered.map(t => (typeof t === 'object' && t !== null) ? t.topic : t);
    return [...new Set(names)].filter(Boolean);
  }, [assessment, progress, activeSubject]);

  const weakTopics = useMemo(() => {
    const rawWeak = [
      ...(assessment?.weakTopics || []),
      ...(progress?.weakTopics || [])
    ];
    const filtered = rawWeak.filter(t => isTopicMatchingSubject(t, activeSubject));
    const names = filtered.map(t => (typeof t === 'object' && t !== null) ? t.topic : t);
    return [...new Set(names)].filter(Boolean);
  }, [assessment, progress, activeSubject]);

  const strongTopicsCount = strongTopics.length;
  const weakTopicsCount = weakTopics.length;

  const subjectScores = { [activeSubject || 'General Learning']: overallScore };

  // ============================================================
  // BUG 7: Developer-safe reset helper for testing
  // ============================================================
  useEffect(() => {
    window.resetNeurolearnSession = function () {
      localStorage.removeItem('activeSubjectJourney');
      localStorage.removeItem('neurolearn_active_subject_journey');
      localStorage.removeItem('neurolearn_active_journey');
      localStorage.removeItem('neurolearn_current_learning_task');
      localStorage.removeItem('neurolearn_learning_sessions');
      localStorage.removeItem('neurolearn_subject_timetables');
      localStorage.removeItem('neurolearn_subject_progress');
      localStorage.removeItem('neurolearn_user_profile');
      console.log('[resetNeurolearnSession] Session data cleared. Reloading...');
      location.reload();
    };
    return () => { delete window.resetNeurolearnSession; };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('[Dashboard] Firebase signOut error:', e);
    }
    localStorage.removeItem('neurolearn_user');
    navigate('/login');
  };

  // ============================================================
  // BUG 4 & 5 FIX: Use state + useEffect instead of useMemo([])
  // This re-reads fresh localStorage on EVERY mount/navigation return
  // ============================================================
  const [todayStudy, setTodayStudy] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  // Function to read fresh data from localStorage
  const refreshTodayStudy = () => {
    try {
      // 1. Read the active subject journey
      const journeyRaw = localStorage.getItem('neurolearn_active_subject_journey') ||
        localStorage.getItem('activeSubjectJourney') ||
        localStorage.getItem('neurolearn_active_journey');
      if (!journeyRaw) { setTodayStudy(null); setActiveSession(null); return; }
      const journey = JSON.parse(journeyRaw);
      if (!journey || !journey.subject) { setTodayStudy(null); setActiveSession(null); return; }

      console.log("[DashboardPage] Active journey:", journey);
      console.log("[DashboardPage] Dashboard subject:", journey.subject);

      // 2. Read the cached roadmap from neurolearn_roadmaps_by_key using roadmapKey
      let matchingRoadmap = null;
      if (journey.roadmapKey) {
        try {
          const roadmapsMap = JSON.parse(localStorage.getItem('neurolearn_roadmaps_by_key') || '{}');
          matchingRoadmap = roadmapsMap[journey.roadmapKey];
        } catch (e) { }
      }

      if (!matchingRoadmap) {
        const roadmapKeys = ['roadmaps', 'neurolearn_roadmaps', 'neurolearn_generated_roadmaps', 'neurolearn_ai_roadmap'];
        let allRoadmaps = [];
        for (const key of roadmapKeys) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                allRoadmaps = parsed;
                break;
              }
            }
          } catch (e) { /* skip */ }
        }

        matchingRoadmap = allRoadmaps.find(
          r => r.subject?.toLowerCase() === journey.subject?.toLowerCase() &&
            r.chapter?.toLowerCase() === journey.chapter?.toLowerCase()
        );
        if (!matchingRoadmap) {
          matchingRoadmap = allRoadmaps.find(
            r => r.subject?.toLowerCase() === journey.subject?.toLowerCase()
          );
        }
      }

      if (!matchingRoadmap || !Array.isArray(matchingRoadmap.topics) || matchingRoadmap.topics.length === 0) {
        setTodayStudy(null); setActiveSession(null); return;
      }

      const topics = matchingRoadmap.topics;

      // 3. Resolve roadmapKey
      let goal = null;
      let cos = localStorage.getItem('neurolearn_student_class_or_semester') || '';
      let studentType = localStorage.getItem('neurolearn_student_type') || '';
      try {
        const savedGoal = localStorage.getItem('neurolearn_goal_data');
        if (savedGoal) goal = JSON.parse(savedGoal);
      } catch (e) { }
      try {
        const savedSetup = localStorage.getItem('neurolearn_setup_data');
        if (savedSetup) {
          const setup = JSON.parse(savedSetup);
          if (!cos) cos = setup.classOrSemester || '';
          if (!studentType) studentType = setup.studentType || '';
        }
      } catch (e) { }
      const gVal = goal?.goal || goal?.examGoal || 'General Study';

      const resolved = resolveClassAndSemester(studentType, cos);
      const roadmapKey = journey.roadmapKey || createRoadmapKey({
        studentType,
        classLevel: resolved.classLevel,
        semester: resolved.semester,
        subject: journey.subject,
        chapter: matchingRoadmap.chapter || journey.chapter || 'General',
        examGoal: gVal
      });

      // Load progress by roadmapKey
      let savedProgress = null;
      try {
        const rawProgress = localStorage.getItem('neurolearn_subject_progress');
        if (rawProgress) {
          const parsed = JSON.parse(rawProgress);
          if (parsed && parsed[roadmapKey]) {
            savedProgress = parsed[roadmapKey];
          }
        }
      } catch (e) { }

      const completedList = getCompletedTopics(journey.subject, matchingRoadmap.chapter || journey.chapter || 'General');
      let completedTopicIndexes = [];
      if (savedProgress && Array.isArray(savedProgress.completedTopicIndexes)) {
        completedTopicIndexes = savedProgress.completedTopicIndexes;
      } else {
        completedTopicIndexes = completedList.map(t => t.topicIndex);
      }

      let progressMap = {};
      try {
        progressMap = JSON.parse(localStorage.getItem('neurolearn_subject_progress') || '{}');
      } catch (e) { }
      let progress = progressMap[roadmapKey];
      if (!progress) {
        progress = {
          roadmapKey,
          currentTopicIndex: 0,
          completedTopicIndexes: [],
          revisionScheduled: false,
          revisionTopicIndex: null,
          lastQuizScore: null,
          roadmapProgressPercent: 0,
          lastUpdated: new Date().toISOString()
        };
        progressMap[roadmapKey] = progress;
        localStorage.setItem('neurolearn_subject_progress', JSON.stringify(progressMap));
      }

      let currentIdx = 0;
      let isRevision = false;
      if (progress.revisionScheduled === true && typeof progress.revisionTopicIndex === 'number') {
        currentIdx = progress.revisionTopicIndex;
        isRevision = true;
      } else {
        currentIdx = progress.currentTopicIndex ?? 0;
      }

      // Cap index at last topic if completed
      const displayIdx = currentIdx >= topics.length ? Math.max(0, topics.length - 1) : currentIdx;
      const selectedTopic = topics[displayIdx] || topics[0];
      const currentTopic = selectedTopic;

      // Debug Logs
      const existingRoadmap = matchingRoadmap;
      const currentTopicIndex = currentIdx;
      savedProgress = progress;
      let finalCompletedCount = progress.completedTopicIndexes?.length ?? 0;
      let overallProgressPercent = progress.roadmapProgressPercent ?? 0;

      const shouldCallGemini = !existingRoadmap;
      const activeTopic = currentTopic;

      console.log("ROADMAP KEY:", roadmapKey);
      console.log("EXISTING ROADMAP FOUND:", !!existingRoadmap);
      console.log("CALLING GEMINI ROADMAP:", shouldCallGemini);
      console.log("LOADED PROGRESS:", progress);
      console.log("CURRENT TOPIC INDEX:", currentTopicIndex);
      console.log("REVISION SCHEDULED:", isRevision);
      console.log("TIMETABLE ACTIVE TOPIC:", activeTopic);

      // Ensure the session is initialized fresh if it doesn't exist
      initFreshTopicSession(journey.subject, matchingRoadmap.chapter || journey.chapter || 'General', currentTopic.title, displayIdx, journey.recommendedStudyTime || 60);

      let topicProgressPercent = 0;
      let revisionScheduled = isRevision;
      let topicCompleted = false;
      let sessionAllocatedMinutes = journey.recommendedStudyTime || 60;

      // Read time tracked in the independent time storage
      let spentSeconds = 0;
      try {
        const timeData = getTimeTrackingData();
        const roadmapTracking = timeData[roadmapKey];
        if (roadmapTracking) {
          const topicTrack = roadmapTracking[String(displayIdx)];
          if (topicTrack) {
            spentSeconds = topicTrack.totalStudySeconds || 0;
          }
        }
      } catch (e) {
        console.error("Error reading time tracking:", e);
      }

      let remainingSeconds = Math.max(0, (sessionAllocatedMinutes * 60) - spentSeconds);

      const sessionKey = resolveSessionKey(journey.subject, matchingRoadmap.chapter || journey.chapter || 'General', currentTopic.title, displayIdx);
      console.log("Current learning session key:", sessionKey);

      let currentSession = null;
      try {
        const sessionsRaw = localStorage.getItem('neurolearn_learning_sessions');
        if (sessionsRaw) {
          const sessions = JSON.parse(sessionsRaw);
          const session = sessions[sessionKey];
          if (session) {
            currentSession = session;
            const { topicProgressPercent: calcProg } = calcTopicProgress(session);
            topicProgressPercent = calcProg;
            revisionScheduled = !!(session.revisionScheduled || session.needsRevision) || revisionScheduled;
            topicCompleted = !!session.topicCompleted;
            sessionAllocatedMinutes = session.allocatedMinutes || 60;
            remainingSeconds = Math.max(0, (sessionAllocatedMinutes * 60) - spentSeconds);
          }
        }
      } catch (e) { }

      console.log("[DashboardPage] Learning session:", currentSession);
      console.log("[DashboardPage] Spent seconds:", spentSeconds, "Remaining:", remainingSeconds);

      // Adjust overall progress to account for current topic session micro-progress if not fully completed
      if (!savedProgress) {
        overallProgressPercent = Math.round(((finalCompletedCount + (topicProgressPercent / 100)) / topics.length) * 100);
      }
      if (overallProgressPercent > 100) overallProgressPercent = 100;

      setTodayStudy({
        subject: journey.subject,
        chapter: matchingRoadmap.chapter || journey.chapter || 'General',
        topicTitle: currentTopic.title || `Topic ${displayIdx + 1}`,
        topicIndex: displayIdx,
        totalTopics: topics.length,
        completedTopics: finalCompletedCount,
        progressPercent: overallProgressPercent,
        topicProgressPercent,
        revisionScheduled,
        topicCompleted,
        estimatedMinutes: currentTopic.estimatedMinutes || currentTopic.estimatedTime || journey.recommendedStudyTime || 60,
        learningObjective: currentTopic.learningObjective || '',
        difficulty: currentTopic.difficulty || 'Medium',
        allocatedTime: sessionAllocatedMinutes,
        spentSeconds,
        remainingSeconds
      });
      setActiveSession(currentSession);
    } catch (e) {
      console.error('[DashboardPage] Error reading roadmap timetable:', e);
      setTodayStudy(null);
      setActiveSession(null);
    }
  };

  // BUG 5 FIX: Read fresh data on mount AND when window regains focus (user returns from learning)
  useEffect(() => {
    refreshTodayStudy();

    const interval = setInterval(() => {
      refreshTodayStudy();
    }, 1000);

    const handleFocus = () => {
      console.log("[DashboardPage] Window focused — refreshing time data");
      refreshTodayStudy();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log("[DashboardPage] Page visible — refreshing time data");
        refreshTodayStudy();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const popupMessage = useMemo(() => {
    if (!todayStudy) return "";
    const spentSeconds = todayStudy.spentSeconds || 0;
    const allocatedMinutes = todayStudy.allocatedTime || 60;
    const remainingSeconds = todayStudy.remainingSeconds ?? (allocatedMinutes * 60);

    if (remainingSeconds <= 0) {
      return "You have completed today's allocated study time.";
    }

    return `You studied ${formatDashboardTime(spentSeconds)} today. You still have ${formatDashboardTime(remainingSeconds)} remaining. You may continue the current subject.`;
  }, [todayStudy]);

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
    const activeSubRaw = localStorage.getItem('neurolearn_active_subject_journey') || localStorage.getItem('activeSubjectJourney') || localStorage.getItem('neurolearn_active_journey');
    let activeJourney = null;
    if (activeSubRaw) {
      try { activeJourney = JSON.parse(activeSubRaw); } catch (e) { }
    }

    const subject = activeSubject;
    const chapter = activeJourney?.chapter || todayStudy?.chapter || goal?.chapter || "General Foundations";
    const topicVal = todayStudy?.topicTitle || activeJourney?.currentRoadmapTopic || activeJourney?.currentTopic?.title || weakTopics[0];
    const topicIdx = typeof todayStudy?.topicIndex === 'number' ? todayStudy.topicIndex : (typeof activeJourney?.currentTopicIndex === 'number' ? activeJourney.currentTopicIndex : 0);
    const recTime = activeJourney?.recommendedStudyTime || todayStudy?.estimatedMinutes || 60;

    if (!subject || !topicVal) {
      console.warn("Cannot start learning: subject or topic is undefined", { subject, topicVal });
      return;
    }

    let cleanTopic = topicVal;
    if (topicVal.startsWith("Revise ")) {
      cleanTopic = topicVal.substring(7);
    }

    const taskPayload = {
      subject,
      chapter,
      topic: cleanTopic,
      currentTopicIndex: topicIdx,
      taskType: "Personalized Video",
      recommendedStudyTime: recTime,
      source: "dashboard"
    };

    console.log("Opening learning task:", taskPayload);
    localStorage.setItem('neurolearn_current_learning_task', JSON.stringify(taskPayload));
    navigate('/learning');
  };

  const handleStartTopicResource = (resourceType) => {
    const activeSubRaw = localStorage.getItem('neurolearn_active_subject_journey') || localStorage.getItem('activeSubjectJourney') || localStorage.getItem('neurolearn_active_journey');
    let activeJourney = null;
    if (activeSubRaw) {
      try { activeJourney = JSON.parse(activeSubRaw); } catch (e) { }
    }

    const subject = activeSubject;
    const chapter = activeJourney?.chapter || todayStudy?.chapter || goal?.chapter || "General Foundations";
    const topicVal = todayStudy?.topicTitle || activeJourney?.currentRoadmapTopic || activeJourney?.currentTopic?.title || weakTopics[0];
    const topicIdx = typeof todayStudy?.topicIndex === 'number' ? todayStudy.topicIndex : (typeof activeJourney?.currentTopicIndex === 'number' ? activeJourney.currentTopicIndex : 0);
    const recTime = activeJourney?.recommendedStudyTime || todayStudy?.estimatedMinutes || 60;

    let type = resourceType;
    if (resourceType === 'AI Study Notes' || resourceType === 'AI Notes' || resourceType === 'notes') {
      type = 'AI Notes';
    } else if (resourceType === 'Personalized Video' || resourceType === 'video') {
      type = 'Personalized Video';
    } else if (resourceType === 'Adaptive Quiz' || resourceType === 'Quiz' || resourceType === 'quiz') {
      type = 'Adaptive Quiz';
    }

    if (!subject || !topicVal || !type) {
      console.warn("Cannot start learning resource: subject, topic, or taskType is undefined", { subject, topicVal, type });
      return;
    }

    let cleanTopic = topicVal;
    if (topicVal.startsWith("Revise ")) {
      cleanTopic = topicVal.substring(7);
    }

    const taskPayload = {
      subject,
      chapter,
      topic: cleanTopic,
      currentTopicIndex: topicIdx,
      taskType: type,
      recommendedStudyTime: recTime,
      source: "dashboard"
    };

    console.log("Opening learning task:", taskPayload);
    localStorage.setItem('neurolearn_current_learning_task', JSON.stringify(taskPayload));

    if (type === 'Adaptive Quiz') {
      navigate('/quiz');
    } else {
      navigate('/learning');
    }
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

        {/* AI POPUP */}
        {showPopup && todayStudy && (
          <div className="glass-card" style={{
            background: 'rgba(129, 140, 248, 0.15)',
            border: '1px solid rgba(129, 140, 248, 0.3)',
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            animation: 'fadeIn 0.5s ease',
            position: 'relative'
          }}>
            <span style={{ fontSize: '1.5rem' }}>✨</span>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>AI Study Insights</strong>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                {popupMessage}
              </p>
            </div>
            <button
              onClick={handleDismissPopup}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '1.2rem',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = '#fff'}
              onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
            >
              ✕
            </button>
          </div>
        )}

        {/* PAGE HEADER */}
        <header className="dashboard-header animate-slideUp">
          <div className="header-title-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <h1 className="header-title">Welcome Back, {studentName}</h1>
              <p className="header-subtitle">Your personalized AI learning dashboard is ready.</p>
            </div>
            <button
              onClick={handleLogout}
              className="back-button"
              style={{ position: 'static', margin: 0 }}
            >
              Logout
            </button>
          </div>
          <div className="header-meta-grid">
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

        {/* TODAY'S STUDY - ROADMAP TIMETABLE */}
        {todayStudy && (
          <section className="glass-card panel-card animate-stagger" style={{ '--delay': 1, marginBottom: '2rem', padding: '1.5rem 2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.3rem' }}>📋</span>
              <h2 className="panel-title" style={{ margin: 0 }}>Today's Study</h2>
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#818cf8', fontWeight: 600, padding: '0.2rem 0.7rem', borderRadius: '20px', background: 'rgba(129, 140, 248, 0.12)', border: '1px solid rgba(129, 140, 248, 0.25)' }}>
                {todayStudy.subject}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'start' }}>
              {/* Left: Topic Info */}
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.35rem' }}>
                  {todayStudy.revisionScheduled ? 'Revision Task' : 'Current Topic'}
                </span>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.35rem', color: '#f8fafc', fontWeight: 700 }}>
                  {todayStudy.revisionScheduled ? `Revise ${todayStudy.topicTitle}` : (todayStudy.topicCompleted ? `Next Roadmap Topic: ${todayStudy.topicTitle}` : todayStudy.topicTitle)}
                </h3>
                {todayStudy.revisionScheduled ? (
                  <p style={{ margin: '0 0 0.75rem 0', color: '#f87171', fontSize: '0.95rem', fontWeight: 600 }}>
                    ⚠️ Reason: Low quiz score detected.
                  </p>
                ) : todayStudy.learningObjective && (
                  <p style={{ margin: '0 0 0.75rem 0', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>{todayStudy.learningObjective}</p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>📚 Chapter: <strong style={{ color: '#e2e8f0' }}>{todayStudy.chapter}</strong></span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>⏱️ Estimated: <strong style={{ color: '#818cf8' }}>{todayStudy.estimatedMinutes} min</strong></span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>🎯 Allocated Study Time: <strong style={{ color: '#34d399' }}>{todayStudy.allocatedTime} min</strong></span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>⏳ Actual Study Time: <strong style={{ color: '#fbbf24' }}>{formatDashboardTime(todayStudy.spentSeconds)}</strong></span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>⏰ Remaining Study Time: <strong style={{ color: '#f87171' }}>{formatDashboardTime(todayStudy.remainingSeconds)}</strong></span>
                  <span className={`badge badge-${todayStudy.difficulty.toLowerCase()}`} style={{ fontSize: '0.8rem' }}>{todayStudy.difficulty}</span>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Topic Progress</span>
                    <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>{todayStudy.topicProgressPercent || 0}%</span>
                  </div>
                  <div className="progress-track" style={{ marginBottom: '0.75rem' }}>
                    <div className="progress-fill" style={{ width: `${todayStudy.topicProgressPercent || 0}%`, backgroundColor: '#34d399' }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Roadmap Progress</span>
                    <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>{todayStudy.completedTopics}/{todayStudy.totalTopics} topics · {todayStudy.progressPercent}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${todayStudy.progressPercent}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Right: Resource buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '140px' }}>
                <button
                  className="action-card glass-card"
                  onClick={() => handleStartTopicResource(todayStudy.revisionScheduled ? 'Personalized Video' : 'Personalized Video')}
                  style={{ padding: '0.6rem 1rem', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                    {todayStudy.revisionScheduled ? '📹 Rewatch Video' : '🎬 Video'}
                  </span>
                </button>
                <button
                  className="action-card glass-card"
                  onClick={() => handleStartTopicResource(todayStudy.revisionScheduled ? 'AI Notes' : 'AI Study Notes')}
                  style={{ padding: '0.6rem 1rem', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                    {todayStudy.revisionScheduled ? '📝 Review Notes' : '📝 Notes'}
                  </span>
                </button>
                <button
                  className="action-card glass-card"
                  onClick={() => handleStartTopicResource(todayStudy.revisionScheduled ? 'Adaptive Quiz' : 'Adaptive Quiz')}
                  style={{ padding: '0.6rem 1rem', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                    {todayStudy.revisionScheduled ? '🧠 Retake Quiz' : '🧠 Quiz'}
                  </span>
                </button>
              </div>
            </div>
          </section>
        )}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className="panel-title text-rose-header" style={{ margin: 0 }}>Needs Improvement - {activeSubject}</h2>
                <span style={{ fontSize: '0.7rem', color: '#64748b', opacity: 0.8 }}>Dashboard updated</span>
              </div>
              <div className="topics-chips-container">
                {weakTopics.length > 0 ? (
                  weakTopics.map(topic => (
                    <span key={topic} className="glowing-chip-warning">{topic}</span>
                  ))
                ) : (
                  <p className="empty-panel-text">No major weak areas detected yet.</p>
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
