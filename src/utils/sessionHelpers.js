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
