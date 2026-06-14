import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/QuizPage.css';

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

const QuizPage = () => {
  const navigate = useNavigate();

  // Load state and determine active topic
  const [topicInfo] = useState(() => {
    let activeTopic = '';
    let activeReason = '';

    // 1. Try reading active task
    try {
      const savedTask = localStorage.getItem('neurolearn_current_learning_task');
      if (savedTask) {
        const parsed = JSON.parse(savedTask);
        if (parsed.topic) {
          activeTopic = parsed.topic;
          activeReason = parsed.reason || 'Guided learning roadmap';
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
            activeTopic = parsed.weakTopics[0];
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
      hasNoData: !activeTopic
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
            if (parsed.weakTopics && parsed.weakTopics.includes(topicInfo.topic)) {
              isWeakTopic = true;
            }
          }
        } catch (e) {}

        const response = await fetch('/api/generate-quiz', {
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
