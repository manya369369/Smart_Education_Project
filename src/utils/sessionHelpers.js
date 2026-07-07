/**
 * sessionHelpers.js
 * Shared utility functions for topic session state, progress calculation,
 * and completed topics tracking across Dashboard, LearningPage, QuizPage, and StudyPlanPage.
 */

// ============================================================
// SESSION KEY
// ============================================================

/**
 * Build a unique session key for a specific topic.
 * Format: subject__chapter__topic__topicIndex
 */
export const buildTopicSessionKey = (subject, chapter, topic, topicIndex) => {
  const s = subject || 'General Learning';
  const c = chapter || 'General Foundations';
  const t = topic || 'Unknown Topic';
  const i = typeof topicIndex === 'number' ? topicIndex : 0;
  return `${s}__${c}__${t}__${i}`;
};

// ============================================================
// PROGRESS FORMULA (single source of truth)
// ============================================================

/**
 * Calculate topicProgressPercent from session fields.
 * Returns { topicProgressPercent, topicCompleted }
 *
 * Formula:
 *   videoCompleted  → +30
 *   notesCompleted  → +30
 *   quizCompleted   → +20
 *   quizScore >= 70 → +20 (only if quizCompleted)
 */
export const calcTopicProgress = (session) => {
  if (!session) return { topicProgressPercent: 0, topicCompleted: false };

  let progress = 0;
  if (session.videoCompleted) progress += 30;
  if (session.notesCompleted) progress += 30;
  if (session.quizCompleted) progress += 20;
  if (session.quizCompleted && session.quizScore >= 70) progress += 20;
  if (progress > 100) progress = 100;

  const topicCompleted = progress === 100;
  return { topicProgressPercent: progress, topicCompleted };
};

// ============================================================
// GET / CREATE TOPIC SESSION
// ============================================================

/**
 * Read the session for a specific topic from localStorage.
 * Returns the session object or null.
 */
export const getTopicSession = (subject, chapter, topic, topicIndex) => {
  const key = buildTopicSessionKey(subject, chapter, topic, topicIndex);
  try {
    const raw = localStorage.getItem('neurolearn_learning_sessions');
    if (raw) {
      const sessions = JSON.parse(raw);
      if (sessions && typeof sessions === 'object') {
        return sessions[key] || null;
      }
    }
  } catch (e) {
    console.error('[sessionHelpers] Error reading topic session:', e);
  }
  return null;
};

/**
 * Initialize a fresh session for a new topic (all zeros, no completion).
 * Does NOT overwrite an existing session for the same key.
 * Returns the session key.
 */
export const initFreshTopicSession = (subject, chapter, topic, topicIndex, allocatedMinutes) => {
  const sessionKey = buildTopicSessionKey(subject, chapter, topic, topicIndex);
  let sessions = {};
  try {
    const raw = localStorage.getItem('neurolearn_learning_sessions');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') sessions = parsed;
    }
  } catch (e) {
    sessions = {};
  }

  // Only create if not already existing
  if (!sessions[sessionKey]) {
    sessions[sessionKey] = {
      subject: subject || 'General Learning',
      chapter: chapter || 'General Foundations',
      currentTopic: topic || 'Unknown Topic',
      currentTopicIndex: typeof topicIndex === 'number' ? topicIndex : 0,
      allocatedMinutes: allocatedMinutes || 60,
      videoSeconds: 0,
      notesSeconds: 0,
      quizSeconds: 0,
      totalSecondsSpent: 0,
      remainingSeconds: (allocatedMinutes || 60) * 60,
      videoCompleted: false,
      videoCompletedAt: null,
      notesCompleted: false,
      notesCompletedAt: null,
      quizCompleted: false,
      quizCompletedAt: null,
      quizScore: null,
      topicProgressPercent: 0,
      topicCompleted: false,
      needsRevision: false,
      revisionScheduled: false,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('neurolearn_learning_sessions', JSON.stringify(sessions));
  }

  return sessionKey;
};

// ============================================================
// COMPLETED TOPICS TRACKING
// ============================================================

/**
 * Save a completed topic permanently into neurolearn_subject_progress.
 * Structure: { "subject__chapter": { completedTopics: [...] } }
 */
export const saveCompletedTopic = (subject, chapter, topicData) => {
  const progressKey = `${subject}__${chapter}`;
  let progress = {};
  try {
    const raw = localStorage.getItem('neurolearn_subject_progress');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') progress = parsed;
    }
  } catch (e) {
    progress = {};
  }

  if (!progress[progressKey]) {
    progress[progressKey] = { completedTopics: [] };
  }

  const existing = progress[progressKey].completedTopics;

  // Don't duplicate — check by topic + topicIndex
  const alreadySaved = existing.some(
    ct => ct.topic === topicData.topic && ct.topicIndex === topicData.topicIndex
  );

  if (!alreadySaved) {
    existing.push({
      topic: topicData.topic,
      topicIndex: topicData.topicIndex,
      completedAt: topicData.completedAt || new Date().toISOString(),
      quizScore: topicData.quizScore || null,
      videoSeconds: topicData.videoSeconds || 0,
      notesSeconds: topicData.notesSeconds || 0,
      quizSeconds: topicData.quizSeconds || 0,
      totalSecondsSpent: topicData.totalSecondsSpent || 0
    });
  }

  localStorage.setItem('neurolearn_subject_progress', JSON.stringify(progress));
  console.log("Completed topics:", progress[progressKey].completedTopics);

  // Sync to the flat, structured subject progress object
  try {
    syncSubjectProgress(subject, chapter, topicData.weakTopics || [], topicData.strongTopics || []);
  } catch (err) {
    console.error('[sessionHelpers] Error auto-syncing subject progress:', err);
  }
};

/**
 * Get completed topics array for a given subject + chapter.
 * Returns an array of completed topic objects.
 */
export const getCompletedTopics = (subject, chapter) => {
  const progressKey = `${subject}__${chapter}`;
  try {
    const raw = localStorage.getItem('neurolearn_subject_progress');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed[progressKey] && Array.isArray(parsed[progressKey].completedTopics)) {
        return parsed[progressKey].completedTopics;
      }
    }
  } catch (e) {
    console.error('[sessionHelpers] Error reading completed topics:', e);
  }
  return [];
};

/**
 * Get count of completed topics for a given subject + chapter.
 */
export const getCompletedTopicCount = (subject, chapter) => {
  return getCompletedTopics(subject, chapter).length;
};

/**
 * Format total seconds into min/sec display.
 * If less than 1 minute, shows seconds (e.g. "8 sec").
 * Otherwise, shows minutes and seconds (e.g. "29 min 52 sec").
 */
export const formatStudyTime = (totalSeconds) => {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds <= 0) {
    return '0 sec';
  }
  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (secs === 0) {
    return `${mins} min`;
  }
  return `${mins} min ${secs} sec`;
};

// ============================================================
// SINGLE SOURCE OF TRUTH SUBJECT PROGRESS PERSISTENCE
// ============================================================

/**
 * Get the permanent subject progress object for a given subject.
 */
export const getSubjectProgress = (subject) => {
  if (!subject) return null;
  try {
    const raw = localStorage.getItem('neurolearn_subject_progress');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // Try exact match first
        if (parsed[subject] && typeof parsed[subject] === 'object') {
          return parsed[subject];
        }
        // Try case-insensitive matching
        const foundKey = Object.keys(parsed).find(k => k.toLowerCase() === subject.toLowerCase());
        if (foundKey && parsed[foundKey] && typeof parsed[foundKey] === 'object') {
          return parsed[foundKey];
        }
        // Try matching by checking property inside object
        const val = Object.values(parsed).find(
          item => item && typeof item === 'object' &&
                  (item.subject?.toLowerCase() === subject.toLowerCase() ||
                   item.subjectName?.toLowerCase() === subject.toLowerCase())
        );
        if (val) return val;
      }
    }
  } catch (e) {
    console.error('[sessionHelpers] Error reading subject progress:', e);
  }
  return null;
};

/**
 * Manually update/save the permanent subject progress object.
 */
export const saveSubjectProgress = (subject, progressData) => {
  if (!subject) return;
  try {
    const raw = localStorage.getItem('neurolearn_subject_progress') || '{}';
    let progress = {};
    try {
      progress = JSON.parse(raw);
      if (!progress || typeof progress !== 'object') progress = {};
    } catch (e) {
      progress = {};
    }

    const foundKey = Object.keys(progress).find(k => k.toLowerCase() === subject.toLowerCase()) || subject;
    progress[foundKey] = {
      ...progress[foundKey],
      ...progressData,
      subjectName: foundKey,
      subject: progressData.subject || progress[foundKey]?.subject || foundKey,
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem('neurolearn_subject_progress', JSON.stringify(progress));
    console.log(`[sessionHelpers] Saved subject progress for ${foundKey}:`, progress[foundKey]);
  } catch (e) {
    console.error('[sessionHelpers] Error saving subject progress:', e);
  }
};

/**
 * Synchronize and recalculate the single-source-of-truth progress for a subject.
 * Stores/updates the flat progress schema under neurolearn_subject_progress.
 */
export const syncSubjectProgress = (subject, chapter, weakTopics = [], strongTopics = []) => {
  if (!subject) return;

  // 1. Resolve roadmapKey
  let goal = null;
  let cos = localStorage.getItem('neurolearn_student_class_or_semester') || '';
  let studentType = localStorage.getItem('neurolearn_student_type') || '';
  try {
    const savedGoal = localStorage.getItem('neurolearn_goal_data');
    if (savedGoal) goal = JSON.parse(savedGoal);
  } catch (e) {}
  try {
    const savedSetup = localStorage.getItem('neurolearn_setup_data');
    if (savedSetup) {
      const setup = JSON.parse(savedSetup);
      if (!cos) cos = setup.classOrSemester || '';
      if (!studentType) studentType = setup.studentType || '';
    }
  } catch (e) {}
  const resolved = resolveClassAndSemester(studentType, cos);
  const roadmapKey = createRoadmapKey({
    studentType,
    classLevel: resolved.classLevel,
    semester: resolved.semester,
    subject,
    chapter,
    examGoal: gVal
  });

  console.log("Roadmap key:", roadmapKey);

  // Load existing progress by roadmapKey immediately to avoid ReferenceError / hoisting issues
  let existingProgress = {};
  try {
    const rawProgressObj = localStorage.getItem('neurolearn_subject_progress');
    if (rawProgressObj) {
      const parsed = JSON.parse(rawProgressObj);
      if (parsed && parsed[roadmapKey]) {
        existingProgress = parsed[roadmapKey];
      } else if (parsed && parsed[subject]) {
        existingProgress = parsed[subject];
      }
    }
  } catch (e) {}

  // 2. Resolve matching roadmap
  let roadmap = null;
  try {
    const roadmapsRaw = localStorage.getItem('neurolearn_roadmaps_by_key');
    if (roadmapsRaw) {
      const roadmapsMap = JSON.parse(roadmapsRaw);
      if (roadmapsMap && roadmapsMap[roadmapKey]) {
        roadmap = roadmapsMap[roadmapKey];
      }
    }
  } catch (e) {}

  if (!roadmap) {
    const roadmapKeys = ['roadmaps', 'neurolearn_roadmaps', 'neurolearn_generated_roadmaps', 'neurolearn_ai_roadmap', 'roadmap'];
    for (const key of roadmapKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            roadmap = parsed.find(
              r => r.subject?.toLowerCase() === subject.toLowerCase() &&
                   (chapter ? r.chapter?.toLowerCase() === chapter.toLowerCase() : true)
            );
            if (!roadmap) {
              roadmap = parsed.find(r => r.subject?.toLowerCase() === subject.toLowerCase());
            }
            if (roadmap) break;
          }
        }
      } catch (e) {}
    }
  }

  if (!roadmap || !Array.isArray(roadmap.topics) || roadmap.topics.length === 0) {
    console.warn(`[sessionHelpers] No roadmap found to sync progress for subject: ${subject}`);
    return;
  }

  const totalTopics = roadmap.topics.length;
  const roadmapId = roadmap.id || roadmap.roadmapId || "";

  // 3. Fetch completed list from traditional chapter-keyed storage
  const progressKey = `${subject}__${roadmap.chapter || chapter || 'General'}`;
  let completedList = [];
  try {
    const raw = localStorage.getItem('neurolearn_subject_progress');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Try roadmapKey first, then fallback to subject, then fallback to progressKey
      if (parsed && parsed[roadmapKey] && Array.isArray(parsed[roadmapKey].completedTopics)) {
        completedList = parsed[roadmapKey].completedTopics;
      } else if (parsed && parsed[subject] && Array.isArray(parsed[subject].completedTopics)) {
        completedList = parsed[subject].completedTopics;
      } else if (parsed && parsed[progressKey] && Array.isArray(parsed[progressKey].completedTopics)) {
        completedList = parsed[progressKey].completedTopics;
      }
    }
  } catch (e) {}

  const completedTopicIndexes = completedList.map(t => t.topicIndex);

  // 4. Find first incomplete index
  const nextIncompleteIdx = roadmap.topics.findIndex((t, idx) => {
    return !completedTopicIndexes.includes(idx);
  });
  const currentTopicIndex = nextIncompleteIdx !== -1 ? nextIncompleteIdx : totalTopics;
  const roadmapProgressPercent = Math.round((completedTopicIndexes.length / totalTopics) * 100);

  // 5. Calculate progress of current topic session
  let currentTopicProgress = 0;
  if (currentTopicIndex < totalTopics) {
    const currentTopicObj = roadmap.topics[currentTopicIndex];
    const sessionKey = resolveSessionKey(subject, roadmap.chapter || chapter || 'General', currentTopicObj.title, currentTopicIndex);
    try {
      const sessionsRaw = localStorage.getItem('neurolearn_learning_sessions');
      if (sessionsRaw) {
        const sessions = JSON.parse(sessionsRaw);
        const session = sessions[sessionKey];
        if (session) {
          const { topicProgressPercent } = calcTopicProgress(session);
          currentTopicProgress = topicProgressPercent;
        }
      }
    } catch (e) {}
  }

  // 6. Determine last completed topic
  let lastCompletedTopic = "";
  if (completedList.length > 0) {
    const sorted = [...completedList].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    lastCompletedTopic = sorted[0].topic || "";
  }

  const finalWeak = (weakTopics && weakTopics.length > 0) ? weakTopics : (existingProgress.weakTopics || []);
  const finalStrong = (strongTopics && strongTopics.length > 0) ? strongTopics : (existingProgress.strongTopics || []);

  // 7. Build the user-requested subjectProgress object structured by roadmapKey
  const subjectProgressObj = {
    roadmapKey,
    subject,
    chapter: roadmap.chapter || chapter,
    completedTopicIndexes,
    currentTopicIndex,
    roadmapProgressPercent,
    currentTopicProgress,
    completedTopics: completedList,
    lastCompletedTopic,
    weakTopics: finalWeak,
    strongTopics: finalStrong,
    lastUpdated: new Date().toISOString()
  };

  // 8. Save into map under neurolearn_subject_progress
  try {
    const raw = localStorage.getItem('neurolearn_subject_progress') || '{}';
    let progressMap = JSON.parse(raw) || {};
    
    // Save under both roadmapKey (Rule 3) and subject (for fallback lookup)
    progressMap[roadmapKey] = subjectProgressObj;
    progressMap[subject] = subjectProgressObj;
    
    // Also save legacy key for compatibility
    progressMap[progressKey] = { completedTopics: completedList };

    localStorage.setItem('neurolearn_subject_progress', JSON.stringify(progressMap));
    console.log("Subject progress:", subjectProgressObj);
    console.log("Completed topic indexes:", completedTopicIndexes);
  } catch (e) {
    console.error('[sessionHelpers] Error writing to progressMap:', e);
  }

  // 9. Auto-sync active subject journey stored keys
  try {
    const activeKeys = ['neurolearn_active_subject_journey', 'activeSubjectJourney', 'neurolearn_active_journey'];
    for (const key of activeKeys) {
      const rawActive = localStorage.getItem(key);
      if (rawActive) {
        const activeJourney = JSON.parse(rawActive);
        if (activeJourney && activeJourney.subject?.toLowerCase() === subject.toLowerCase()) {
          const nextTopicObj = roadmap.topics[currentTopicIndex] || roadmap.topics[0];
          activeJourney.currentTopicIndex = currentTopicIndex;
          activeJourney.progress = roadmapProgressPercent;
          activeJourney.currentRoadmapTopic = nextTopicObj?.title || 'Introductory Concepts';
          activeJourney.currentTopic = nextTopicObj || null;
          activeJourney.roadmapKey = roadmapKey;
          activeJourney.roadmapProgressPercent = roadmapProgressPercent;
          
          localStorage.setItem(key, JSON.stringify(activeJourney));
          console.log(`[sessionHelpers] Auto-synced active journey ${key} to index ${currentTopicIndex}`);
        }
      }
    }
  } catch (e) {}
};

/**
 * Resolves school class or college semester from flat classOrSemester string.
 */
export const resolveClassAndSemester = (studentType = "", classOrSemester = "") => {
  let classLevel = "";
  let semester = "";
  const sType = (studentType || "").toLowerCase().trim();
  const cos = (classOrSemester || "").toLowerCase().trim();
  if (sType.includes("school")) {
    classLevel = cos;
  } else if (sType.includes("college")) {
    semester = cos;
  } else {
    if (cos.includes("class") || cos.includes("grade")) {
      classLevel = cos;
    } else if (cos.includes("semester") || cos.includes("sem")) {
      semester = cos;
    } else {
      classLevel = cos;
    }
  }
  return { classLevel, semester };
};

/**
 * Normalizes input components and builds a stable, hyphenated roadmap key joined by double-underscores.
 */
export function normalizeKeyPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function createRoadmapKey(data) {
  let studentType = data.studentType;
  let classLevel = data.classLevel;
  let semester = data.semester;
  let subject = data.subject;
  let chapter = data.chapter;
  let examGoal = data.examGoal;

  if (!classLevel && !semester) {
    const rawSetup = localStorage.getItem('neurolearn_setup_data');
    let cos = localStorage.getItem('neurolearn_student_class_or_semester') || '';
    let st = studentType || localStorage.getItem('neurolearn_student_type') || '';
    if (rawSetup) {
      try {
        const setup = JSON.parse(rawSetup);
        if (!cos) cos = setup.classOrSemester || '';
        if (!st) st = setup.studentType || '';
      } catch (e) {}
    }
    const resolved = resolveClassAndSemester(st, cos);
    classLevel = resolved.classLevel;
    semester = resolved.semester;
    if (!studentType) studentType = st;
  }

  return [
    normalizeKeyPart(studentType),
    normalizeKeyPart(classLevel || semester),
    normalizeKeyPart(subject),
    normalizeKeyPart(chapter),
    normalizeKeyPart(examGoal)
  ].join("__");
}

export const generateRoadmapKey = (studentType, classOrSemester, subject, chapter, goal) => {
  const resolved = resolveClassAndSemester(studentType, classOrSemester);
  return createRoadmapKey({
    studentType,
    classLevel: resolved.classLevel,
    semester: resolved.semester,
    subject,
    chapter,
    examGoal: goal
  });
};

/**
 * Get the current attempt ID for a given topic in a roadmap.
 */
export const getTopicAttemptId = (roadmapKey, topicIndex) => {
  const normIndex = typeof topicIndex === 'number' ? topicIndex : 0;
  const attemptsKey = `neurolearn_topic_attempts`;
  try {
    const raw = localStorage.getItem(attemptsKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      const key = `${roadmapKey}__topic_${normIndex}`;
      if (parsed && typeof parsed[key] === 'number') {
        return parsed[key];
      }
    }
  } catch (e) {}
  return 1; // Default first attempt
};

/**
 * Increment the attempt count for a topic to start fresh.
 */
export const incrementTopicAttempt = (roadmapKey, topicIndex) => {
  const normIndex = typeof topicIndex === 'number' ? topicIndex : 0;
  const attemptsKey = `neurolearn_topic_attempts`;
  try {
    const raw = localStorage.getItem(attemptsKey) || '{}';
    const parsed = JSON.parse(raw) || {};
    const key = `${roadmapKey}__topic_${normIndex}`;
    const current = parsed[key] || 1;
    parsed[key] = current + 1;
    localStorage.setItem(attemptsKey, JSON.stringify(parsed));
    console.log(`[sessionHelpers] Incremented attempt for ${key} to ${parsed[key]}`);
    return parsed[key];
  } catch (e) {
    console.error('Error incrementing topic attempt:', e);
  }
  return 1;
};

/**
 * Resolves the correct session key to use.
 * Returns a stable key containing the attempt number to isolate revisions.
 */
export const resolveSessionKey = (subject, chapter, topic, topicIndex) => {
  const normIndex = typeof topicIndex === 'number' ? topicIndex : 0;
  
  // 1. Build current roadmap key
  let goal = null;
  let cos = localStorage.getItem('neurolearn_student_class_or_semester') || '';
  let studentType = localStorage.getItem('neurolearn_student_type') || '';
  try {
    const savedGoal = localStorage.getItem('neurolearn_goal_data');
    if (savedGoal) goal = JSON.parse(savedGoal);
  } catch (e) {}
  try {
    const savedSetup = localStorage.getItem('neurolearn_setup_data');
    if (savedSetup) {
      const setup = JSON.parse(savedSetup);
      if (!cos) cos = setup.classOrSemester || '';
      if (!studentType) studentType = setup.studentType || '';
    }
  } catch (e) {}
  
  const gVal = goal?.goal || goal?.examGoal || 'General Study';
  const resolved = resolveClassAndSemester(studentType, cos);
  const roadmapKey = createRoadmapKey({
    studentType,
    classLevel: resolved.classLevel,
    semester: resolved.semester,
    subject,
    chapter,
    examGoal: gVal
  });

  // 2. Resolve attempt count
  const attemptId = getTopicAttemptId(roadmapKey, normIndex);

  // 3. Return attempts-isolated session key
  return `${roadmapKey}__topic_${normIndex}__attempt_${attemptId}`;
};
