import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/QuizPage.css';
import { buildTopicSessionKey, calcTopicProgress, saveCompletedTopic, initFreshTopicSession, getCompletedTopics, syncSubjectProgress, resolveSessionKey, incrementTopicAttempt, getTopicAttemptId, createRoadmapKey, resolveClassAndSemester, incrementStudyTime, getApiUrl } from '../utils/sessionHelpers';

// Curated question pools for popular topics
const CURATED_POOLS = {
  'Arrays': [
    {
      id: 'arrays_e1',
      topic: 'Arrays',
      difficulty: 'Easy',
      question: 'Which of the following describes how elements are stored in a standard array?',
      options: [
        'Contiguous memory locations',
        'Scattered memory linked by pointers',
        'Hierarchical parent-child nodes',
        'Key-value pairs in a hash map'
      ],
      correctAnswer: 'Contiguous memory locations',
      explanation: 'Arrays allocate memory in a single continuous block, which is why indexing is fast and O(1).'
    },
    {
      id: 'arrays_e2',
      topic: 'Arrays',
      difficulty: 'Easy',
      question: 'What is the index of the first element in a standard zero-indexed array?',
      options: ['0', '1', '-1', 'Any arbitrary number'],
      correctAnswer: '0',
      explanation: 'In most modern programming languages, arrays are zero-indexed, meaning the first element is at index 0.'
    },
    {
      id: 'arrays_m1',
      topic: 'Arrays',
      difficulty: 'Medium',
      question: 'What is the time complexity of deleting an element from the middle of an array of size n?',
      options: ['O(n)', 'O(1)', 'O(log n)', 'O(n^2)'],
      correctAnswer: 'O(n)',
      explanation: 'Deleting an element from the middle of an array requires shifting all subsequent elements left to fill the gap, which takes linear time O(n).'
    },
    {
      id: 'arrays_m2',
      topic: 'Arrays',
      difficulty: 'Medium',
      question: 'Why is insertion at the end of a dynamic array (like an ArrayList) considered O(1) amortized time?',
      options: [
        'Because resizing only occurs occasionally, spreading the copying cost over many insertions',
        'Because dynamic arrays never resize or allocate new memory',
        'Because elements are inserted using a linked pointer chain',
        'Because search operations are skipped during insertion'
      ],
      correctAnswer: 'Because resizing only occurs occasionally, spreading the copying cost over many insertions',
      explanation: 'When a dynamic array is full, it doubles its capacity. Although copying takes O(n), this happens rarely enough that the average time per insertion is O(1).'
    },
    {
      id: 'arrays_h1',
      topic: 'Arrays',
      difficulty: 'Hard',
      question: 'In a multi-dimensional array stored in Column-Major Order, how is the memory address of element A[i][j] calculated?',
      options: [
        'Base + (j * rows + i) * element_size',
        'Base + (i * cols + j) * element_size',
        'Base + (i + j) * element_size',
        'Base + (i * rows + j) * element_size'
      ],
      correctAnswer: 'Base + (j * rows + i) * element_size',
      explanation: 'In column-major order, consecutive elements of a column are stored next to each other, so we multiply the column index j by the number of rows, then add the row index i.'
    },
    {
      id: 'arrays_h2',
      topic: 'Arrays',
      difficulty: 'Hard',
      question: 'Which of the following cache behaviors makes array traversal extremely efficient?',
      options: [
        'Spatial Locality (fetching contiguous elements into the CPU cache)',
        'Temporal Locality (re-using the same index repeatedly)',
        'Cache Thrashing (continuous cache eviction)',
        'Virtual Memory Paging'
      ],
      correctAnswer: 'Spatial Locality (fetching contiguous elements into the CPU cache)',
      explanation: 'Since array elements are contiguous, loading one element pulls adjacent elements into the cache line, minimizing main memory reads.'
    }
  ],
  'SQL Basics': [
    {
      id: 'sql_e1',
      topic: 'SQL Basics',
      difficulty: 'Easy',
      question: 'Which SQL keyword is used to retrieve data from a database table?',
      options: ['SELECT', 'GET', 'RETRIEVE', 'FETCH'],
      correctAnswer: 'SELECT',
      explanation: 'The SELECT statement is the foundational command used to query data from a database table.'
    },
    {
      id: 'sql_e2',
      topic: 'SQL Basics',
      difficulty: 'Easy',
      question: 'Which clause is used in SQL to filter query results based on a condition?',
      options: ['WHERE', 'FILTER', 'HAVING', 'LIMIT'],
      correctAnswer: 'WHERE',
      explanation: 'The WHERE clause filters records based on specified search criteria before returning the rows.'
    },
    {
      id: 'sql_m1',
      topic: 'SQL Basics',
      difficulty: 'Medium',
      question: 'What is the main difference between the WHERE and HAVING clauses in SQL?',
      options: [
        'WHERE filters rows before aggregation; HAVING filters groups after aggregation',
        'WHERE filters columns; HAVING filters tables',
        'WHERE is used with SELECT; HAVING is only used with INSERT',
        'There is no difference; they are interchangeable aliases'
      ],
      correctAnswer: 'WHERE filters rows before aggregation; HAVING filters groups after aggregation',
      explanation: 'WHERE filters individual row records. HAVING is specifically used to filter groups created by the GROUP BY clause.'
    },
    {
      id: 'sql_m2',
      topic: 'SQL Basics',
      difficulty: 'Medium',
      question: 'Which join type returns all records from the left table and matched records from the right table?',
      options: ['LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL OUTER JOIN'],
      correctAnswer: 'LEFT JOIN',
      explanation: 'A LEFT JOIN (or LEFT OUTER JOIN) returns all rows from the left table, and the matching rows from the right table, filling with NULL if no match exists.'
    },
    {
      id: 'sql_h1',
      topic: 'SQL Basics',
      difficulty: 'Hard',
      question: 'In SQL, what is a correlated subquery?',
      options: [
        'A subquery that references columns of the outer query, executing once for each candidate row in the outer query',
        'A subquery that is run concurrently in a separate transaction thread',
        'A subquery joined to another subquery using a FOREIGN KEY relation',
        'A subquery that returns a single scalar value and runs exactly once'
      ],
      correctAnswer: 'A subquery that references columns of the outer query, executing once for each candidate row in the outer query',
      explanation: 'A correlated subquery cannot be evaluated independently of the outer query because it relies on values from the outer query\'s current row.'
    },
    {
      id: 'sql_h2',
      topic: 'SQL Basics',
      difficulty: 'Hard',
      question: 'Which index type is best suited for range-based queries (e.g., WHERE age BETWEEN 20 AND 30)?',
      options: ['B-Tree Index', 'Hash Index', 'Bitmap Index', 'Spatial Index'],
      correctAnswer: 'B-Tree Index',
      explanation: 'B-Trees maintain a sorted order of keys, allowing log(n) range searches. Hash indices only support exact equality checks O(1).'
    }
  ],
  'Growth Mindset': [
    {
      id: 'gm_e1',
      topic: 'Growth Mindset',
      difficulty: 'Easy',
      question: 'Who coined the psychological term "Growth Mindset"?',
      options: ['Carol Dweck', 'Sigmund Freud', 'B.F. Skinner', 'Albert Bandura'],
      correctAnswer: 'Carol Dweck',
      explanation: 'Stanford psychologist Carol Dweck introduced the concepts of growth and fixed mindsets after decades of research on achievement.'
    },
    {
      id: 'gm_e2',
      topic: 'Growth Mindset',
      difficulty: 'Easy',
      question: 'What is a core belief of a person with a Growth Mindset?',
      options: [
        'Intelligence and talents can be developed through effort and strategy',
        'Talent is strictly fixed at birth and cannot change',
        'Mistakes should be avoided at all costs to protect self-esteem',
        'Feedback is a personal attack rather than an opportunity'
      ],
      correctAnswer: 'Intelligence and talents can be developed through effort and strategy',
      explanation: 'A growth mindset views capabilities as developable qualities that grow with practice and determination.'
    },
    {
      id: 'gm_m1',
      topic: 'Growth Mindset',
      difficulty: 'Medium',
      question: 'When encountering a difficult setback, how does a person with a Growth Mindset react?',
      options: [
        'They view it as a learning opportunity and adjust their strategy',
        'They immediately give up to avoid future failures',
        'They blame external factors or bad luck entirely',
        'They assume they lack the natural ability'
      ],
      correctAnswer: 'They view it as a learning opportunity and adjust their strategy',
      explanation: 'Growth-minded individuals see failures as informative feedback, prompting them to try new approaches.'
    },
    {
      id: 'gm_m2',
      topic: 'Growth Mindset',
      difficulty: 'Medium',
      question: 'How is "effort" perceived differently in a fixed mindset versus a growth mindset?',
      options: [
        'Fixed: effort is proof of low ability; Growth: effort is the path to mastery',
        'Fixed: effort leads to success; Growth: effort is unnecessary',
        'Fixed: effort creates stress; Growth: effort removes stress',
        'Both mindsets view effort as useless'
      ],
      correctAnswer: 'Fixed: effort is proof of low ability; Growth: effort is the path to mastery',
      explanation: 'In a fixed mindset, smart people shouldn\'t need to try hard. In a growth mindset, effort is what makes you smart.'
    },
    {
      id: 'gm_h1',
      topic: 'Growth Mindset',
      difficulty: 'Hard',
      question: 'According to neuroplasticity research, what physical change occurs in the brain during challenging learning experiences?',
      options: [
        'New neural connections are formed and existing pathways are strengthened',
        'The brain shrinks in size to conserve cognitive energy',
        'Neural signals slow down to prevent overload',
        'The brain shifts memory retrieval strictly to the cerebellum'
      ],
      correctAnswer: 'New neural connections are formed and existing pathways are strengthened',
      explanation: 'Learning builds and strengthens synapses, physically altering brain wiring—a key biological basis for the growth mindset.'
    },
    {
      id: 'gm_h2',
      topic: 'Growth Mindset',
      difficulty: 'Hard',
      question: 'How does praising students for their "intelligence" rather than their "process" affect their mindset?',
      options: [
        'It fosters a fixed mindset, making them avoid future challenges to maintain their "smart" label',
        'It develops a growth mindset by boosting their innate self-confidence',
        'It increases their resilience and long-term academic scores',
        'It has no measurable psychological effect'
      ],
      correctAnswer: 'It fosters a fixed mindset, making them avoid future challenges to maintain their "smart" label',
      explanation: 'Process praise ("you worked hard") builds resilience, whereas intelligence praise ("you are so smart") makes kids risk-averse.'
    }
  ]
};

// Generic dynamic template generator for any custom topic
const generateDynamicQuestions = (topic) => {
  return [
    {
      id: `${topic}_easy_1`,
      topic: topic,
      difficulty: 'Easy',
      question: `Which of the following is a primary characteristic or basic building block of ${topic}?`,
      options: [
        `Its foundational, core concepts and elementary definitions`,
        `Its advanced secondary mathematical proofs`,
        `Its external, unrelated commercial applications`,
        `Its historical origins from the 18th century`
      ],
      correctAnswer: `Its foundational, core concepts and elementary definitions`,
      explanation: `Starting with ${topic} requires understanding its simplest, most fundamental building blocks before advancing to complex usage.`
    },
    {
      id: `${topic}_easy_2`,
      topic: topic,
      difficulty: 'Easy',
      question: `Why do beginners typically start by studying the fundamentals of ${topic}?`,
      options: [
        `To establish a solid conceptual framework for future complex topics`,
        `To memorize historical trivia and names`,
        `Because advanced concepts are not useful in practice`,
        `To bypass practical implementation entirely`
      ],
      correctAnswer: `To establish a solid conceptual framework for future complex topics`,
      explanation: `Establishing a solid ground level prevents misunderstandings as the applications of ${topic} become more complex.`
    },
    {
      id: `${topic}_medium_1`,
      topic: topic,
      difficulty: 'Medium',
      question: `When implementing or applying ${topic} in practice, which process is most critical?`,
      options: [
        `Using structured, standardized methodologies and logical workflows`,
        `Proceeding purely by random trial and error without metrics`,
        `Relying strictly on legacy frameworks without optimization`,
        `Ignoring all performance constraints and error margins`
      ],
      correctAnswer: `Using structured, standardized methodologies and logical workflows`,
      explanation: `Standardization and structural logic are necessary to successfully scale and maintain systems related to ${topic}.`
    },
    {
      id: `${topic}_medium_2`,
      topic: topic,
      difficulty: 'Medium',
      question: `What is a common challenge faced when working with ${topic}?`,
      options: [
        `Managing resource utilization, implementation overhead, and accuracy`,
        `Finding any online documentation or learning materials`,
        `The complete lack of real-world use cases`,
        `Ensuring that no variables ever change during execution`
      ],
      correctAnswer: `Managing resource utilization, implementation overhead, and accuracy`,
      explanation: `Practical applications of ${topic} frequently require balancing constraints like speed, correctness, and developer overhead.`
    },
    {
      id: `${topic}_hard_1`,
      topic: topic,
      difficulty: 'Hard',
      question: `Which advanced design choice or optimization is most critical for scaling ${topic}?`,
      options: [
        `Balancing algorithmic complexity against physical resource constraints and data throughput`,
        `Hardcoding all variables to ensure zero execution memory overhead`,
        `Delegating all computations to basic client-side legacy scripts`,
        `Eliminating caching and security protocols to maximize raw processing speeds`
      ],
      correctAnswer: `Balancing algorithmic complexity against physical resource constraints and data throughput`,
      explanation: `At scale, optimizing ${topic} demands managing deep architectural trade-offs between speed, latency, and resource costs.`
    },
    {
      id: `${topic}_hard_2`,
      topic: topic,
      difficulty: 'Hard',
      question: `What complex trade-off is typically encountered when optimizing ${topic} for low-latency systems?`,
      options: [
        `Trading off memory footprint and structural complexity for raw retrieval speeds`,
        `Completely rewriting the codebase in binary machine code`,
        `Moving all computations to non-persistent local sessions`,
        `Sacrificing all accuracy and data integrity for faster responses`
      ],
      correctAnswer: `Trading off memory footprint and structural complexity for raw retrieval speeds`,
      explanation: `Low-latency optimization in ${topic} usually involves using optimized data formats, indexing, or caching at the cost of additional memory.`
    }
  ];
};

const safeParseAllocatedMinutes = (value) => {
  try {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }

    if (value && typeof value === "object") {
      if (typeof value.minutes === "number") return value.minutes;
      if (typeof value.allocatedMinutes === "number") return value.allocatedMinutes;
      if (typeof value.recommendedStudyTime === "number") return value.recommendedStudyTime;
      if (typeof value.value === "number") return value.value;
    }

    if (typeof value !== "string") {
      return 60;
    }

    const text = value.trim().toLowerCase();
    if (!text) return 60;

    const numeric = Number(text);
    if (!Number.isNaN(numeric)) return numeric;

    const hourMatch = text.match(/(\d+(\.\d+)?)\s*(hour|hours|hr|hrs)/);
    if (hourMatch) return Math.round(parseFloat(hourMatch[1]) * 60);

    const minuteMatch = text.match(/(\d+)\s*(minute|minutes|min|mins)/);
    if (minuteMatch) return parseInt(minuteMatch[1], 10);

    return 60;
  } catch (e) {
    console.error("Error parsing allocated minutes, returning default:", e);
    return 60;
  }
};

const updateSessionCompletion = (subject, chapter, topic, topicIndex, allocatedMinutes, fields) => {
  const sessionKey = resolveSessionKey(subject, chapter, topic, topicIndex);

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
  const attemptId = getTopicAttemptId(roadmapKey, topicIndex);

  const sessionsRaw = localStorage.getItem('neurolearn_learning_sessions');
  let sessions = {};
  if (sessionsRaw) {
    try {
      sessions = JSON.parse(sessionsRaw);
    } catch (e) {
      console.error(e);
    }
  }

  if (!sessions[sessionKey]) {
    sessions[sessionKey] = {
      roadmapKey,
      topicIndex: typeof topicIndex === 'number' ? topicIndex : 0,
      attemptId,
      subject,
      chapter,
      allocatedMinutes: allocatedMinutes || 60,
      currentTopic: topic,
      currentTopicIndex: typeof topicIndex === 'number' ? topicIndex : 0,
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
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }

  const s = sessions[sessionKey];
  Object.keys(fields).forEach(k => {
    s[k] = fields[k];
  });

  const { topicProgressPercent: calcProgress, topicCompleted: calcCompleted } = calcTopicProgress(s);
  s.topicProgressPercent = calcProgress;
  s.topicCompleted = calcCompleted;
  s.lastUpdated = new Date().toISOString();

  if (s.topicCompleted) {
    try {
      const roadmapKeys = ['roadmaps', 'neurolearn_roadmaps', 'neurolearn_generated_roadmaps', 'neurolearn_ai_roadmap'];
      for (const key of roadmapKeys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const matchedRoadmap = parsed.find(
              r => r.subject?.toLowerCase() === subject?.toLowerCase() &&
                   r.chapter?.toLowerCase() === chapter?.toLowerCase()
            );
            if (matchedRoadmap && Array.isArray(matchedRoadmap.topics)) {
              const topicObj = matchedRoadmap.topics.find(
                t => t.title?.toLowerCase() === topic?.toLowerCase() ||
                     t.title?.toLowerCase().includes(topic?.toLowerCase()) ||
                     topic?.toLowerCase().includes(t.title?.toLowerCase())
              );
              if (topicObj) {
                topicObj.completed = true;
                topicObj.isCompleted = true;
                topicObj.status = 'completed';
                localStorage.setItem(key, JSON.stringify(parsed));
                console.log(`Updated roadmap topic completion in ${key}`);
                break;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Error updating roadmap topic completed state:", e);
    }
  }

  localStorage.setItem('neurolearn_learning_sessions', JSON.stringify(sessions));

  // If topic just completed, save to permanent completed topics
  if (s.topicCompleted) {
    saveCompletedTopic(subject, chapter, {
      topic: topic,
      topicIndex: typeof topicIndex === 'number' ? topicIndex : 0,
      completedAt: new Date().toISOString(),
      quizScore: s.quizScore,
      videoSeconds: s.videoSeconds || 0,
      notesSeconds: s.notesSeconds || 0,
      quizSeconds: s.quizSeconds || 0,
      totalSecondsSpent: s.totalSecondsSpent || 0
    });
  } else {
    try {
      syncSubjectProgress(subject, chapter);
    } catch (err) {
      console.error('[QuizPage] Error syncing subject progress in updateSessionCompletion:', err);
    }
  }

  return s;
};

const QuizPage = () => {
  const navigate = useNavigate();

  // Load state and determine active topic
  const [topicInfo] = useState(() => {
    let activeTopic = '';
    let activeReason = '';
    let savedTaskObj = null;

    // 1. Try reading active task
    try {
      const savedTask = localStorage.getItem('neurolearn_current_learning_task');
      if (savedTask) {
        const parsed = JSON.parse(savedTask);
        if (parsed.topic) {
          activeTopic = parsed.topic;
          activeReason = parsed.reason || 'Guided learning roadmap';
          savedTaskObj = parsed;
        }
      }
    } catch (e) {
      console.error("Error reading current task", e);
    }

    // 2. Try reading assessment results first weak topic
    if (!activeTopic) {
      try {
        const savedAssessment = localStorage.getItem('neurolearn_assessment_results') || localStorage.getItem('neurolearn_assessment_result');
        if (savedAssessment) {
          const parsed = JSON.parse(savedAssessment);
          if (parsed.weakTopics && parsed.weakTopics.length > 0) {
            const wt0 = parsed.weakTopics[0];
            activeTopic = (typeof wt0 === 'object' && wt0 !== null) ? wt0.topic : wt0;
            activeReason = 'Identified weak concept from your diagnostic assessment.';
          } else if (parsed.weakSubjects && parsed.weakSubjects.length > 0) {
            activeTopic = parsed.weakSubjects[0];
            activeReason = 'Identified weak subject from your diagnostic assessment.';
          }
        }
      } catch (e) {
        console.error("Error reading assessment result", e);
      }
    }

    // 3. Try reading goal data
    if (!activeTopic) {
      try {
        const savedGoal = localStorage.getItem('neurolearn_user_profile') || localStorage.getItem('neurolearn_goal_data');
        if (savedGoal) {
          const parsed = JSON.parse(savedGoal);
          if (parsed.subjects && parsed.subjects.length > 0) {
            activeTopic = parsed.subjects[0];
            activeReason = 'Selected study subject goal.';
          }
        }
      } catch (e) {
        console.error("Error reading goal data", e);
      }
    }

    return {
      topic: activeTopic,
      reason: activeReason,
      hasNoData: !activeTopic,
      task: savedTaskObj
    };
  });

  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [questionPool, setQuestionPool] = useState([]);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  // Timestamp-based actual time tracking for Quiz
  const quizStartRef = useRef(Date.now());

  const flushQuizTime = () => {
    if (topicInfo.hasNoData) return;
    const now = Date.now();
    const elapsedMs = now - quizStartRef.current;
    if (elapsedMs < 1000) return;

    const secondsAdded = Math.floor(elapsedMs / 1000);
    quizStartRef.current += secondsAdded * 1000;

    const task = topicInfo.task;
    const subj = task?.subject || topicInfo.subject || "General Learning";
    const chap = task?.chapter || "General Foundations";
    const topicName = topicInfo.topic;
    const topicIdx = task?.currentTopicIndex || 0;
    const sessionKey = resolveSessionKey(subj, chap, topicName, topicIdx);

    const sessionsRaw = localStorage.getItem('neurolearn_learning_sessions');
    let sessions = {};
    if (sessionsRaw) {
      try {
        sessions = JSON.parse(sessionsRaw) || {};
      } catch (e) {
        sessions = {};
      }
    }

    const session = sessions[sessionKey];
    if (session) {
      const oldSession = JSON.parse(JSON.stringify(session));
      session.quizSeconds = (session.quizSeconds || 0) + secondsAdded;
      session.totalSecondsSpent = (session.videoSeconds || 0) + (session.notesSeconds || 0) + (session.quizSeconds || 0);
      session.remainingSeconds = Math.max(0, (session.allocatedMinutes * 60) - session.totalSecondsSpent);
      session.lastUpdated = new Date().toISOString();

      const { topicProgressPercent: calcProg, topicCompleted: calcComp } = calcTopicProgress(session);
      session.topicProgressPercent = calcProg;
      session.topicCompleted = calcComp;

      sessions[sessionKey] = session;
      localStorage.setItem('neurolearn_learning_sessions', JSON.stringify(sessions));

      console.log("Session key:", sessionKey);
      console.log("Session before update:", oldSession);
      console.log("Time added:", secondsAdded);
      console.log("Session after update:", session);
    }
  };

  useEffect(() => {
    if (topicInfo.hasNoData) return;
    quizStartRef.current = Date.now();

    const handleBeforeUnload = () => {
      flushQuizTime();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const interval = setInterval(() => {
      flushQuizTime();
    }, 1000);

    return () => {
      flushQuizTime();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
    };
  }, [topicInfo]);

  // Dedicated Time Tracking module for Quiz
  const lastPersistRef = useRef(Date.now());
  const pendingQuizSecondsRef = useRef(0);
  const isSubmittedRef = useRef(false);

  useEffect(() => {
    if (topicInfo.hasNoData || isLoading || activeQuestions.length === 0) return;

    // Resolve roadmapKey
    let goal = null;
    let cos = localStorage.getItem('neurolearn_student_class_or_semester') || '';
    let studentType = localStorage.getItem('neurolearn_student_type') || '';
    const savedGoal = localStorage.getItem('neurolearn_goal_data');
    if (savedGoal) goal = JSON.parse(savedGoal);
    const savedSetup = localStorage.getItem('neurolearn_setup_data');
    if (savedSetup) {
      const setup = JSON.parse(savedSetup);
      if (!cos) cos = setup.classOrSemester || '';
      if (!studentType) studentType = setup.studentType || '';
    }
    const gVal = goal?.goal || goal?.examGoal || 'General Study';
    const resolved = resolveClassAndSemester(studentType, cos);
    const roadmapKey = createRoadmapKey({
      studentType,
      classLevel: resolved.classLevel,
      semester: resolved.semester,
      subject: topicInfo.task?.subject || topicInfo.subject || "General Learning",
      chapter: topicInfo.task?.chapter || "General Foundations",
      examGoal: gVal
    });

    const topicIndex = topicInfo.task?.currentTopicIndex || 0;

    const persistTime = () => {
      const qSec = pendingQuizSecondsRef.current;
      if (qSec > 0) {
        incrementStudyTime(roadmapKey, topicIndex, 'quiz', qSec);
        pendingQuizSecondsRef.current = 0;
      }
      lastPersistRef.current = Date.now();
    };

    const interval = setInterval(() => {
      const isVisible = document.visibilityState === 'visible' && document.hasFocus();

      // Quiz Timer Condition: question is visible, not submitted, and tab is visible/focused
      if (!isSubmittedRef.current && isVisible) {
        pendingQuizSecondsRef.current += 1;
      }

      // Persist every 5 seconds
      if (Date.now() - lastPersistRef.current >= 5000) {
        persistTime();
      }
    }, 1000);

    const handleUnloadAndVisibility = () => {
      persistTime();
    };

    window.addEventListener('beforeunload', handleUnloadAndVisibility);
    document.addEventListener('visibilitychange', handleUnloadAndVisibility);

    return () => {
      persistTime();
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnloadAndVisibility);
      document.addEventListener('visibilitychange', handleUnloadAndVisibility);
    };
  }, [topicInfo, isLoading, activeQuestions]);

  // Fetch quiz questions from backend
  useEffect(() => {
    let active = true;
    const loadQuiz = async () => {
      setIsLoading(true);
      try {
        // Find subject
        let subject = '';
        try {
          const savedAssessment = localStorage.getItem('neurolearn_assessment_results') || localStorage.getItem('neurolearn_assessment_result');
          if (savedAssessment) {
            const parsed = JSON.parse(savedAssessment);
            subject = parsed.subject;
          }
        } catch (e) {}
        if (!subject) {
          try {
            const savedProfile = localStorage.getItem('neurolearn_user_profile') || localStorage.getItem('neurolearn_goal_data');
            if (savedProfile) {
              const parsed = JSON.parse(savedProfile);
              subject = parsed.subjects?.[0] || parsed.subject;
            }
          } catch (e) {}
        }
        if (!subject) {
          subject = 'General Learning';
        }

        // Determine if topic is weak
        let isWeakTopic = false;
        let assessmentScore = 0;
        try {
          const savedAssessment = localStorage.getItem('neurolearn_assessment_results') || localStorage.getItem('neurolearn_assessment_result');
          if (savedAssessment) {
            const parsed = JSON.parse(savedAssessment);
            assessmentScore = parsed.score || parsed.totalScore || 0;
            const wtList = (parsed.weakTopics || []).map(wt => (typeof wt === 'object' && wt !== null) ? wt.topic : wt);
            if (wtList.includes(topicInfo.topic)) {
              isWeakTopic = true;
            }
          }
        } catch (e) {}

        const response = await fetch(getApiUrl('/api/generate-quiz'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topicInfo.topic,
            subject: subject,
            weakTopic: isWeakTopic,
            score: assessmentScore
          })
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          if (active) {
            setQuestionPool(data);
            setActiveQuestions(data);
            setIsFallback(false);
            setIsLoading(false);
          }
          return;
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.warn("[QuizPage] Failed to fetch AI quiz, using local fallback:", err);
        if (active) {
          // Fallback logic
          const curated = CURATED_POOLS[topicInfo.topic];
          const pool = curated ? curated : generateDynamicQuestions(topicInfo.topic);
          setQuestionPool(pool);
          setIsFallback(true);
          
          if (pool.length > 0) {
            const q0 = pool.find(q => q.difficulty === 'Medium') || pool[0];
            setActiveQuestions([q0]);
          }
          setIsLoading(false);
        }
      }
    };

    if (!topicInfo.hasNoData) {
      loadQuiz();
    } else {
      setIsLoading(false);
    }

    return () => {
      active = false;
    };
  }, [topicInfo]);

  // Adaptive selector logic (only used in fallback mode)
  const selectNextQuestion = (nextIndex, lastDifficulty, answeredCorrectly) => {
    let targetDifficulty = 'Medium';
    if (answeredCorrectly) {
      if (lastDifficulty === 'Easy') targetDifficulty = 'Medium';
      else if (lastDifficulty === 'Medium') targetDifficulty = 'Hard';
      else if (lastDifficulty === 'Hard') targetDifficulty = 'Hard';
    } else {
      if (lastDifficulty === 'Hard') targetDifficulty = 'Medium';
      else if (lastDifficulty === 'Medium') targetDifficulty = 'Easy';
      else if (lastDifficulty === 'Easy') targetDifficulty = 'Easy';
    }

    const usedIds = activeQuestions.slice(0, nextIndex).map(q => q.id);

    // Find unused question of target difficulty
    let nextQ = questionPool.find(
      q => q.difficulty === targetDifficulty && !usedIds.includes(q.id)
    );

    // Fallback: any unused question in the pool
    if (!nextQ) {
      nextQ = questionPool.find(q => !usedIds.includes(q.id));
    }

    // Ultimate fallback
    if (!nextQ) {
      nextQ = questionPool[0];
    }

    return { nextQ, targetDifficulty };
  };

  const handleOptionSelect = (option) => {
    const currentQ = activeQuestions[currentIndex];
    if (!currentQ) return;
    setUserAnswers(prev => ({ ...prev, [currentQ.id]: option }));
    setErrorMessage('');
  };

  const handleNext = () => {
    const currentQ = activeQuestions[currentIndex];
    if (!currentQ) return;

    // Validate that an answer is selected
    const selectedAns = userAnswers[currentQ.id];
    if (!selectedAns) {
      setErrorMessage('Please select an answer before continuing.');
      return;
    }

    const nextIdx = currentIndex + 1;

    if (isFallback) {
      // Select next adaptive question
      const isCorrect = selectedAns === currentQ.correctAnswer;
      const lastDifficulty = currentQ.difficulty;
      const { nextQ, targetDifficulty } = selectNextQuestion(nextIdx, lastDifficulty, isCorrect);

      setActiveQuestions(prev => {
        const updated = [...prev];
        if (!updated[nextIdx] || updated[nextIdx].difficulty !== targetDifficulty) {
          updated[nextIdx] = nextQ;
          return updated.slice(0, nextIdx + 1);
        }
        return updated;
      });
    }

    setCurrentIndex(nextIdx);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setErrorMessage('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const currentQ = activeQuestions[currentIndex];
    if (!currentQ) return;

    isSubmittedRef.current = true;
    // Flush pending quiz study time
    if (pendingQuizSecondsRef.current > 0) {
      try {
        let goal = null;
        let cos = localStorage.getItem('neurolearn_student_class_or_semester') || '';
        let studentType = localStorage.getItem('neurolearn_student_type') || '';
        const savedGoal = localStorage.getItem('neurolearn_goal_data');
        if (savedGoal) goal = JSON.parse(savedGoal);
        const savedSetup = localStorage.getItem('neurolearn_setup_data');
        if (savedSetup) {
          const setup = JSON.parse(savedSetup);
          if (!cos) cos = setup.classOrSemester || '';
          if (!studentType) studentType = setup.studentType || '';
        }
        const gVal = goal?.goal || goal?.examGoal || 'General Study';
        const resolved = resolveClassAndSemester(studentType, cos);
        const roadmapKey = createRoadmapKey({
          studentType,
          classLevel: resolved.classLevel,
          semester: resolved.semester,
          subject: topicInfo.task?.subject || topicInfo.subject || "General Learning",
          chapter: topicInfo.task?.chapter || "General Foundations",
          examGoal: gVal
        });
        const topicIndex = topicInfo.task?.currentTopicIndex || 0;
        incrementStudyTime(roadmapKey, topicIndex, 'quiz', pendingQuizSecondsRef.current);
        pendingQuizSecondsRef.current = 0;
      } catch (err) {}
    }

    // Validate final selection
    const selectedAns = userAnswers[currentQ.id];
    if (!selectedAns) {
      setErrorMessage('Please select an answer before continuing.');
      return;
    }

    // Evaluate quiz scoring
    let finalScore = 0;
    const mistakes = [];
    const weakConcepts = [];
    const difficultyPerformance = {
      Easy: { correct: 0, total: 0 },
      Medium: { correct: 0, total: 0 },
      Hard: { correct: 0, total: 0 }
    };

    activeQuestions.forEach(q => {
      const ans = userAnswers[q.id];
      const isCorrect = ans === q.correctAnswer;

      difficultyPerformance[q.difficulty].total += 1;

      if (isCorrect) {
        finalScore += 1;
        difficultyPerformance[q.difficulty].correct += 1;
      } else {
        mistakes.push({
          question: q.question,
          selectedAnswer: ans || 'None',
          correctAnswer: q.correctAnswer,
          topic: q.topic,
          difficulty: q.difficulty,
          explanation: q.explanation,
          reason: topicInfo.reason
        });

        if (!weakConcepts.includes(q.topic)) {
          weakConcepts.push(q.topic);
        }
      }
    });

    const totalQuestions = activeQuestions.length;
    const percentage = Math.round((finalScore / totalQuestions) * 100);
    const finalDifficulty = currentQ.difficulty;

    const quizResult = {
      topic: topicInfo.topic,
      score: finalScore,
      totalQuestions,
      percentage,
      mistakes,
      weakConcepts,
      difficultyReached: finalDifficulty,
      completedAt: new Date().toISOString()
    };

    // Persist result
    try {
      localStorage.setItem('neurolearn_quiz_result', JSON.stringify(quizResult));
    } catch (err) {
      console.error("Error saving quiz result to localStorage", err);
    }

    // Update learning session time tracking data
    try {
      // First, flush any unsaved quiz time spent
      flushQuizTime();

      let activeSub = '';
      try {
        const savedAssessment = localStorage.getItem('neurolearn_assessment_results') || localStorage.getItem('neurolearn_assessment_result');
        if (savedAssessment) {
          const parsed = JSON.parse(savedAssessment);
          activeSub = parsed.subject;
        }
      } catch (e) {}

      const task = topicInfo.task;
      const subj = task?.subject || activeSub || "General Learning";
      const chap = task?.chapter || "General Foundations";
      const allocMins = safeParseAllocatedMinutes(task?.time || task?.recommendedStudyTime);
      
      const sessionsRaw = localStorage.getItem('neurolearn_learning_sessions');
      let sessions = {};
      if (sessionsRaw) {
        try {
          sessions = JSON.parse(sessionsRaw) || {};
        } catch (e) {
          sessions = {};
        }
      }

      const sessionKey = resolveSessionKey(subj, chap, topicInfo.topic, task?.currentTopicIndex);
      const session = sessions[sessionKey] || {};

      const isGoodScore = percentage >= 70;

      updateSessionCompletion(subj, chap, topicInfo.topic, task?.currentTopicIndex, allocMins, {
        quizAttempted: true,
        quizCompleted: true,
        quizCompletedAt: new Date().toISOString(),
        quizScore: percentage,
        correctAnswers: finalScore,
        wrongAnswers: totalQuestions - finalScore,
        accuracy: percentage,
        needsRevision: !isGoodScore,
        revisionScheduled: !isGoodScore
      });

      // Re-read session that updateSessionCompletion already saved correctly
      const updatedSessions = JSON.parse(localStorage.getItem('neurolearn_learning_sessions')) || {};
      const updatedSession = updatedSessions[sessionKey] || {};
      // Ensure time totals are current
      updatedSession.totalSecondsSpent = (updatedSession.videoSeconds || 0) + (updatedSession.notesSeconds || 0) + (updatedSession.quizSeconds || 0);
      updatedSession.remainingSeconds = Math.max(0, ((updatedSession.allocatedMinutes || 60) * 60) - updatedSession.totalSecondsSpent);
      updatedSession.lastUpdated = new Date().toISOString();
      updatedSessions[sessionKey] = updatedSession;
      localStorage.setItem('neurolearn_learning_sessions', JSON.stringify(updatedSessions));

      // 1. Build stable roadmapKey
      const savedGoal = localStorage.getItem('neurolearn_goal_data');
      let goal = null;
      if (savedGoal) goal = JSON.parse(savedGoal);
      let cos = localStorage.getItem('neurolearn_student_class_or_semester') || '';
      let studentType = localStorage.getItem('neurolearn_student_type') || '';
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
        subject: subj,
        chapter: chap,
        examGoal: gVal
      });

      // 2. Resolve roadmap topics list
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
        } catch (e) {}
      }

      let matchingRoadmap = allRoadmaps.find(
        r => r.subject?.toLowerCase() === subj.toLowerCase() &&
             r.chapter?.toLowerCase() === chap.toLowerCase()
      );
      if (!matchingRoadmap) {
        matchingRoadmap = allRoadmaps.find(
          r => r.subject?.toLowerCase() === subj.toLowerCase()
        );
      }

      if (!matchingRoadmap || !Array.isArray(matchingRoadmap.topics)) {
        throw new Error("Roadmap topics not found");
      }

      const topics = matchingRoadmap.topics;
      const totalTopics = topics.length;

      // 3. Load or initialize neurolearn_subject_progress[roadmapKey]
      let progressMap = {};
      try {
        progressMap = JSON.parse(localStorage.getItem('neurolearn_subject_progress')) || {};
      } catch (e) {
        progressMap = {};
      }
      if (!progressMap || typeof progressMap !== 'object') progressMap = {};

      const progressBefore = progressMap[roadmapKey] ? JSON.parse(JSON.stringify(progressMap[roadmapKey])) : null;

      if (!progressMap[roadmapKey]) {
        progressMap[roadmapKey] = {
          roadmapKey,
          currentTopicIndex: 0,
          completedTopicIndexes: [],
          revisionScheduled: false,
          revisionTopicIndex: null,
          activeAttemptId: 'main',
          lastQuizScore: null,
          roadmapProgressPercent: 0,
          lastUpdated: new Date().toISOString()
        };
      }
      const pObj = progressMap[roadmapKey];

      const currIdx = typeof task?.currentTopicIndex === 'number' ? task.currentTopicIndex : pObj.currentTopicIndex;

      // 4. Update index and history based on score (Step 5)
      if (percentage >= 70) {
        // add currentTopicIndex to completedTopicIndexes if not already present
        if (!pObj.completedTopicIndexes.includes(currIdx)) {
          pObj.completedTopicIndexes.push(currIdx);
        }
        // currentTopicIndex = first roadmap topic index not in completedTopicIndexes
        const nextIncompleteIdx = topics.findIndex((_, idx) => !pObj.completedTopicIndexes.includes(idx));
        pObj.currentTopicIndex = nextIncompleteIdx !== -1 ? nextIncompleteIdx : topics.length;
        pObj.revisionScheduled = false;
        pObj.revisionTopicIndex = null;
        pObj.activeAttemptId = "main";
        
        // Clear current learning task for old topic
        localStorage.removeItem('neurolearn_current_learning_task');
      } else {
        // currentTopicIndex remains same
        pObj.revisionScheduled = true;
        pObj.revisionTopicIndex = currIdx;
        pObj.activeAttemptId = "revision_" + Date.now();
      }
      pObj.lastQuizScore = percentage;
      pObj.roadmapProgressPercent = Math.round((pObj.completedTopicIndexes.length / totalTopics) * 100);
      pObj.lastUpdated = new Date().toISOString();

      // Save updated progress immediately
      progressMap[roadmapKey] = pObj;
      progressMap[subj] = pObj; // Fallback sync
      localStorage.setItem('neurolearn_subject_progress', JSON.stringify(progressMap));

      // Create a fresh session for the scheduled topic/revision
      const nextTopicIdx = pObj.currentTopicIndex < totalTopics ? pObj.currentTopicIndex : (totalTopics - 1);
      const nextTopicObj = topics[nextTopicIdx];
      if (nextTopicObj) {
        // Generate key using the new state
        const nextSessionKey = resolveSessionKey(subj, chap, nextTopicObj.title, nextTopicIdx);
        
        let sessions = {};
        try {
          sessions = JSON.parse(localStorage.getItem('neurolearn_learning_sessions')) || {};
        } catch (e) {
          sessions = {};
        }
        
        sessions[nextSessionKey] = {
          roadmapKey,
          topicIndex: nextTopicIdx,
          attemptId: pObj.activeAttemptId || "main",
          subject: subj,
          chapter: chap,
          allocatedMinutes: allocMins || 60,
          currentTopic: nextTopicObj.title,
          currentTopicIndex: nextTopicIdx,
          videoSeconds: 0,
          notesSeconds: 0,
          quizSeconds: 0,
          totalSecondsSpent: 0,
          remainingSeconds: (allocMins || 60) * 60,
          videoCompleted: false,
          videoCompletedAt: null,
          notesCompleted: false,
          notesCompletedAt: null,
          quizCompleted: false,
          quizCompletedAt: null,
          quizScore: null,
          topicProgressPercent: 0,
          topicCompleted: false,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('neurolearn_learning_sessions', JSON.stringify(sessions));
        console.log(`[QuizPage] Generated fresh session for scheduled topic/revision: ${nextSessionKey}`);
      }

      // Console logs as requested (Step 1)
      console.log("QUIZ SUBMITTED:", {
        subject: subj,
        chapter: chap,
        roadmapKey,
        currentTopicIndex: currIdx,
        quizScore: percentage
      });
      console.log("PROGRESS BEFORE QUIZ:", progressBefore);
      console.log("PROGRESS AFTER QUIZ:", pObj);

      // 5. Generate study plan timetable ONLY
      const nextTopicTitle = isGoodScore ? (topics[nextTopicIdx]?.title || topicInfo.topic) : topicInfo.topic;
      const isRevision = !isGoodScore;

      const studyPlanTasks = isRevision ? [
        {
          time: "09:00 AM",
          icon: "📝",
          taskType: "AI Notes",
          topic: `Revise ${nextTopicTitle}`,
          reason: `Low quiz score detected. Review notes to clarify core concepts.`,
          subject: subj,
          chapter: chap,
          recommendedStudyTime: updatedSession.allocatedMinutes || 60,
          currentTopicIndex: nextTopicIdx
        },
        {
          time: "09:30 AM",
          icon: "📹",
          taskType: "Personalized Video",
          topic: `Revise ${nextTopicTitle}`,
          reason: `Low quiz score detected. Rewatch the video to reinforce your memory.`,
          subject: subj,
          chapter: chap,
          recommendedStudyTime: updatedSession.allocatedMinutes || 60,
          currentTopicIndex: nextTopicIdx
        },
        {
          time: "10:00 AM",
          icon: "🧠",
          taskType: "Adaptive Quiz",
          topic: `Revise ${nextTopicTitle}`,
          reason: `Low quiz score detected. Retake the quiz to test your updated knowledge.`,
          subject: subj,
          chapter: chap,
          recommendedStudyTime: updatedSession.allocatedMinutes || 60,
          currentTopicIndex: nextTopicIdx
        }
      ] : [
        {
          time: "09:00 AM",
          icon: "📹",
          taskType: "Personalized Video",
          topic: nextTopicTitle,
          reason: `Watch a personalized visual explanation of ${nextTopicTitle}.`,
          subject: subj,
          chapter: chap,
          recommendedStudyTime: updatedSession.allocatedMinutes || 60,
          currentTopicIndex: nextTopicIdx
        },
        {
          time: "09:30 AM",
          icon: "📝",
          taskType: "AI Notes",
          topic: nextTopicTitle,
          reason: `Review detailed conceptual study notes on ${nextTopicTitle}.`,
          subject: subj,
          chapter: chap,
          recommendedStudyTime: updatedSession.allocatedMinutes || 60,
          currentTopicIndex: nextTopicIdx
        },
        {
          time: "10:00 AM",
          icon: "🧠",
          taskType: "Adaptive Quiz",
          topic: nextTopicTitle,
          reason: `Test your understanding of ${nextTopicTitle} with an adaptive quiz.`,
          subject: subj,
          chapter: chap,
          recommendedStudyTime: updatedSession.allocatedMinutes || 60,
          currentTopicIndex: nextTopicIdx
        }
      ];

      const freshPlan = {
        generatedFromSubject: subj,
        generatedFromWeakTopics: [nextTopicTitle],
        tasks: studyPlanTasks,
        estimatedTime: `${(updatedSession.allocatedMinutes || 60) * 3} Minutes focused session`,
        reasons: isRevision ? [
          `Revision priority: Low quiz score detected for ${nextTopicTitle}.`,
          `Aligned to chapter: ${chap}.`
        ] : [
          `Prioritized active roadmap topic: ${nextTopicTitle}.`,
          `Aligned to chapter: ${chap}.`
        ],
        completion: 0,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('neurolearn_study_plan', JSON.stringify(freshPlan));

      // Timetable key compatibility
      const timetablesRaw = localStorage.getItem('neurolearn_subject_timetables');
      let timetables = {};
      if (timetablesRaw) {
        try { timetables = JSON.parse(timetablesRaw); } catch (e) {}
      }
      const timetableKey = `${subj}__${chap}`;
      timetables[timetableKey] = {
        activeTaskType: isGoodScore ? "nextTopic" : "revision",
        currentTopic: isGoodScore ? nextTopicTitle : topicInfo.topic,
        currentTopicIndex: nextTopicIdx,
        revisionTopic: isGoodScore ? "" : topicInfo.topic,
        nextTopic: isGoodScore ? nextTopicTitle : "",
        allocatedSeconds: (updatedSession.allocatedMinutes || 60) * 60,
        totalSecondsSpent: updatedSession.totalSecondsSpent,
        remainingSeconds: updatedSession.remainingSeconds,
        quizScore: percentage,
        needsRevision: !isGoodScore,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('neurolearn_subject_timetables', JSON.stringify(timetables));

      // Sync active subject journey stored keys (Rule 5 & Rules compatibility)
      const journeyKeys = ['neurolearn_active_subject_journey', 'activeSubjectJourney', 'neurolearn_active_journey'];
      for (const key of journeyKeys) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.subject?.toLowerCase() === subj.toLowerCase()) {
              parsed.currentTopicIndex = pObj.currentTopicIndex;
              parsed.progress = pObj.roadmapProgressPercent;
              const nextObj = topics[pObj.currentTopicIndex] || topics[topics.length - 1];
              parsed.currentTopic = nextObj || null;
              parsed.currentRoadmapTopic = nextObj?.title || 'Introductory Concepts';
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
        } catch(e) {}
      }

      // If good score and next topic found, initialize a fresh session for it
      if (isGoodScore && nextTopicTitle && pObj.currentTopicIndex < totalTopics) {
        initFreshTopicSession(subj, chap, nextTopicTitle, pObj.currentTopicIndex, updatedSession.allocatedMinutes || 60);
      }

      console.log("Updated quiz session and timetables data:", updatedSession, timetables[timetableKey]);
    } catch (e) {
      console.error("Error updating quiz session:", e);
    }

    // Update progress tracking key
    try {
      const progressJSON = localStorage.getItem('neurolearn_learning_progress');
      let progress = { completedVideos: [], completedNotes: [], completedQuizzes: [] };
      if (progressJSON) {
        progress = JSON.parse(progressJSON);
      }
      if (!Array.isArray(progress.completedQuizzes)) {
        progress.completedQuizzes = [];
      }
      if (!progress.completedQuizzes.includes(topicInfo.topic)) {
        progress.completedQuizzes.push(topicInfo.topic);
      }
      localStorage.setItem('neurolearn_learning_progress', JSON.stringify(progress));
    } catch (err) {
      console.error("Error saving progress to localStorage", err);
    }

    // Navigate to MistakeAnalysisPage route
    navigate('/mistakes');
  };

  // 1. Render Loading State
  if (isLoading) {
    return (
      <div className="quiz-wrapper">
        <div className="quiz-card empty-state-card">
          <div className="loading-spinner" style={{
            width: '50px',
            height: '50px',
            border: '3px solid rgba(139, 92, 246, 0.1)',
            borderTop: '3px solid #8b5cf6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1.5rem auto'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <h2 className="empty-state-title">Generating Adaptive Quiz...</h2>
          <p className="empty-state-desc">Gemini is tailoring questions based on your study history and progress.</p>
        </div>
      </div>
    );
  }

  // 2. Render Missing Data page
  if (topicInfo.hasNoData) {
    return (
      <div className="quiz-wrapper">
        <div className="quiz-card empty-state-card">
          <div className="empty-state-icon">⚠️</div>
          <h2 className="empty-state-title">No quiz topic found.</h2>
          <p className="empty-state-desc">Please set up your goals and study plan before starting a practice quiz.</p>
          <button 
            type="button" 
            onClick={() => navigate('/study-plan')} 
            className="btn-primary"
          >
            Return to Study Plan
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = activeQuestions[currentIndex];

  // 3. Render Quiz Interface
  return (
    <div className="quiz-wrapper">
      {/* Top-left Back button */}
      <button className="back-button" onClick={() => navigate('/learning')} type="button">
        ← Back
      </button>

      {/* Main card */}
      <div className="quiz-card">
        {/* Header */}
        <header className="quiz-card-header">
          <span className="quiz-label">Adaptive Quick Quiz</span>
          <h1 className="quiz-card-title">Adaptive Quick Quiz</h1>
          <p className="quiz-card-subtitle">
            This quiz checks your understanding of the current learning topic.
          </p>
        </header>

        {/* Current Topic card */}
        <section className="topic-details-card">
          <div className="topic-details-row">
            <span className="topic-details-label">Topic:</span>
            <strong>{topicInfo.topic}</strong>
          </div>
          <div className="topic-details-row">
            <span className="topic-details-label">Based on:</span>
            <strong>{topicInfo.reason}</strong>
          </div>
        </section>

        {/* Progress bar */}
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill"
            style={{ width: `${((currentIndex + 1) / 5) * 100}%` }}
          ></div>
        </div>

        {/* Question Area */}
        {currentQuestion && (
          <>
            <div className="meta-info">
              <span className="question-count">Question {currentIndex + 1} of 5</span>
              <div className="badge-group">
                <span className="badge badge-topic">{currentQuestion.topic}</span>
                <span className={`badge badge-${currentQuestion.difficulty.toLowerCase()}`}>
                  Difficulty: {currentQuestion.difficulty}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <h2 className="question-text">{currentQuestion.question}</h2>

            {/* Error Banner */}
            {errorMessage && (
              <div className="error-banner">
                <span className="error-icon">!</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Multiple Choice Options */}
            <div className="options-container">
              {currentQuestion.options.map((opt, index) => {
                const letter = String.fromCharCode(65 + index); // A, B, C, D
                const isSelected = userAnswers[currentQuestion.id] === opt;
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
        )}

        {/* Navigation Controls */}
        <footer className="controls-container">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="btn-secondary"
          >
            ← Previous
          </button>

          {currentIndex === 4 ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary"
            >
              Submit Quiz
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

export default QuizPage;
