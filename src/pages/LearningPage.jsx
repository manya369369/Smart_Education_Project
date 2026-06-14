import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LearningPage.css';

// --- Dynamic Mock & Fallback Data Generators ---


const generateFallbackNotes = (topicName) => {
  const t = topicName.toLowerCase();
  if (t.includes("optics")) {
    return {
      title: "Optics & Light Behavior",
      level: "Intermediate",
      simpleDefinition: "Optics is the branch of physics that studies the behavior and properties of light, including its interactions with matter and the construction of instruments that use or detect it.",
      whyItMatters: "Understanding optics is crucial for designing lenses, microscopes, telescopes, cameras, fiber optic communications, and corrective eyewear.",
      keyPoints: [
        "Light travels in straight lines (rectilinear propagation) until it hits a boundary.",
        "Reflection involves light bouncing off a surface; the angle of incidence equals the angle of reflection.",
        "Refraction is the bending of light as it passes from one medium to another due to changes in light speed.",
        "Lenses use refraction to focus or disperse light, forming real or virtual images."
      ],
      stepByStepExplanation: [
        "Step 1: Identify the light source and path (incident ray).",
        "Step 2: Draw the normal line perpendicular to the surface at the point of incidence.",
        "Step 3: Apply Snell's Law (n1 * sin(theta1) = n2 * sin(theta2)) to calculate the angle of refraction.",
        "Step 4: Trace the rays to locate where they intersect, indicating where the image forms."
      ],
      realLifeExample: "Looking through a magnifying glass or seeing a straw look bent in a glass of water due to refraction.",
      commonMistakes: [
        "Measuring the angles from the surface of the medium instead of the normal line.",
        "Assuming that light always bends towards the normal; it bends away when moving from a denser to a rarer medium."
      ],
      quickRevision: [
        "Law of Reflection: Angle of Incidence = Angle of Reflection.",
        "Refractive Index (n) = Speed of light in vacuum (c) / Speed of light in medium (v).",
        "Snell's Law: n1 * sin(theta1) = n2 * sin(theta2)."
      ],
      practiceQuestions: [
        "Calculate the angle of refraction when light enters glass (n=1.5) from air at an incident angle of 30 degrees.",
        "Differentiate between real and virtual images produced by convex and concave lenses.",
        "What is total internal reflection and under what conditions does it occur?"
      ],
      summary: "Optics details how light behaves, reflects, and refracts. Mastery of Snell's Law and ray tracing rules is essential for exam problem-solving."
    };
  }

  if (t.includes("genetics")) {
    return {
      title: "Genetics & Heredity Principles",
      level: "Beginner",
      simpleDefinition: "Genetics is the study of how traits, features, and characteristics are inherited and passed down from parents to offspring through genetic instructions.",
      whyItMatters: "It explains inheritance patterns, genetic disorders, evolutionary biology, and helps advance medical biotechnology and crop breeding.",
      keyPoints: [
        "DNA is a double-helix molecule storing instructions for biological traits.",
        "Genes are specific functional sequences of DNA containing instructions for individual proteins.",
        "Alleles are different versions of a gene; individuals inherit one allele from each parent.",
        "Dominant alleles mask the expression of recessive alleles."
      ],
      stepByStepExplanation: [
        "Step 1: Identify parental genotypes for a given trait (e.g., Bb and Bb).",
        "Step 2: Set up a 2x2 Punnett square grid.",
        "Step 3: Distribute parental alleles along the top and left margins of the grid.",
        "Step 4: Combine corresponding alleles in each cell to find potential offspring genotypes and phenotypic ratios."
      ],
      realLifeExample: "Having the same brown eye color as your mother because the brown-eye allele is dominant over blue eyes.",
      commonMistakes: [
        "Confusing phenotype (physical appearance) with genotype (genetic makeup).",
        "Assuming dominant traits are always the most common in a population."
      ],
      quickRevision: [
        "Phenotype = Physical trait (e.g. Brown eyes). Genotype = Genetic code (e.g. Bb).",
        "Homozygous = Same alleles (BB or bb). Heterozygous = Different alleles (Bb).",
        "Punnett Square represents probabilities of inheriting traits."
      ],
      practiceQuestions: [
        "Explain the phenotypic difference between homozygous dominant (BB) and heterozygous (Bb) individuals.",
        "A heterozygous tall plant (Tt) crosses with a short plant (tt). What percentage of offspring will be short?",
        "Define Mendel's Law of Segregation and Law of Independent Assortment."
      ],
      summary: "Genetics centers on DNA, genes, alleles, and inheritance. Punnett Squares help calculate offspring genotype/phenotype probability ratios."
    };
  }

  if (t.includes("array")) {
    return {
      title: "Array Data Structures",
      level: "Beginner",
      simpleDefinition: "An array is a data structure consisting of a collection of elements, each identified by at least one array index, stored at contiguous memory locations.",
      whyItMatters: "Arrays are the most fundamental structures for list management, offering extremely fast direct access and forming the baseline for stacks, queues, and matrix math.",
      keyPoints: [
        "Elements are stored sequentially in computer memory.",
        "Uses zero-based indexing: the first element is at index 0.",
        "Offers constant-time O(1) random access to any element via its index.",
        "Has a fixed size upon allocation, making dynamic insertion/deletion slow."
      ],
      stepByStepExplanation: [
        "Step 1: Declare the array and allocate its size (e.g., int arr[5]).",
        "Step 2: Access any index directly to read or write value (e.g., arr[0] = 42).",
        "Step 3: To traverse, initialize a loop index at 0, incrementing up to array size - 1.",
        "Step 4: Use shifts when inserting/deleting elements at indices other than the end."
      ],
      realLifeExample: "A row of numbered lockers where you can immediately open locker #3 to retrieve its contents.",
      commonMistakes: [
        "Off-by-one errors: accessing index equal to array size (which causes out-of-bounds crash since indices end at size-1).",
        "Attempting to dynamically expand an array's size without allocating a new larger array block."
      ],
      quickRevision: [
        "Index starts at 0. Last element is at size - 1.",
        "Access Time Complexity: O(1). Search Time Complexity: O(N) linear scan.",
        "Contiguous memory allocation means slots are side-by-side."
      ],
      practiceQuestions: [
        "Write a loop to find the maximum element in an array of integers.",
        "What happens in memory when you insert an element at index 0 of a size-N array? What is its time complexity?",
        "Explain the main differences between an Array and a Linked List."
      ],
      summary: "Arrays store fixed lists of elements sequentially in memory, enabling O(1) access but requiring O(N) time for shifts on insertion/deletion."
    };
  }

  if (t.includes("sql") || t.includes("database")) {
    return {
      title: "SQL & Relational Databases",
      level: "Intermediate",
      simpleDefinition: "Structured Query Language (SQL) is the standard query language used to interact with and manage relational database management systems.",
      whyItMatters: "Almost all web applications, transactional engines, and data analytics tools rely on SQL to store and retrieve tabular business records securely.",
      keyPoints: [
        "Data is stored in tables containing structured columns (fields) and rows (records).",
        "Uses SELECT to retrieve rows, FROM to choose tables, and WHERE to filter conditions.",
        "Enforces relationships using Primary Keys (unique ID per table) and Foreign Keys (referencing other tables).",
        "Joins combine records from different tables based on matching columns."
      ],
      stepByStepExplanation: [
        "Step 1: Write a basic SELECT * FROM table query to retrieve all data.",
        "Step 2: Add a WHERE clause to filter results based on logical criteria (e.g., age >= 18).",
        "Step 3: Use JOIN keywords to link tables matching Primary Keys and Foreign Keys.",
        "Step 4: Apply GROUP BY and aggregate functions like SUM, AVG, or COUNT to summarize groups."
      ],
      realLifeExample: "Searching a store database for orders placed by User #1024 to count their total transaction values.",
      commonMistakes: [
        "Forgetting to specify join condition fields, leading to huge Cartesian product datasets.",
        "Using WHERE instead of HAVING to filter rows after applying GROUP BY aggregations."
      ],
      quickRevision: [
        "SELECT columns FROM table WHERE condition GROUP BY columns HAVING aggregation;",
        "Primary Key uniquely identifies row. Foreign Key links to another table's PK.",
        "JOIN types: INNER (intersection), LEFT (all left + matches), RIGHT, FULL."
      ],
      practiceQuestions: [
        "Write a query to retrieve the top 3 highest-paid employees from an 'Employees' table.",
        "Explain the difference between a LEFT JOIN and an INNER JOIN.",
        "What is database normalization and why do we perform it?"
      ],
      summary: "SQL operates on relational tables using SELECT queries, filters (WHERE/HAVING), keys, and JOIN operations to manage databases."
    };
  }

  if (t.includes("music")) {
    return {
      title: "Music Theory Fundamentals",
      level: "Beginner",
      simpleDefinition: "Music theory is the study of the practices and possibilities of music, analyzing the mechanics, notation, rhythm, and structural components of musical compositions.",
      whyItMatters: "It provides a universal language for composers, performers, and producers to read notes, compose chords, analyze structures, and perform together.",
      keyPoints: [
        "Pitch is the perceived frequency of a sound (notes A through G).",
        "Interval is the distance between two pitches (e.g., half steps and whole steps).",
        "Chords are groups of three or more notes played together to build harmony.",
        "Rhythm governs the timing, tempo, time signatures, and durations of musical notes."
      ],
      stepByStepExplanation: [
        "Step 1: Identify the clef (Treble or Bass) on the musical staff line system.",
        "Step 2: Read the pitch from its line or space placement using mnemonic helpers.",
        "Step 3: Determine the key signature to identify which notes are sharp or flat.",
        "Step 4: Group notes into measures based on the time signature (e.g., 4/4 time)."
      ],
      realLifeExample: "Playing C, E, and G together on a piano keyboard to build a major triad chord.",
      commonMistakes: [
        "Confusing the treble clef note positions with the bass clef note positions.",
        "Misinterpreting time signature beats, like counting triplets as straight eighth notes."
      ],
      quickRevision: [
        "Treble clef lines: E-G-B-D-F. Bass clef lines: G-B-D-F-A.",
        "Major scale pattern: Whole - Whole - Half - Whole - Whole - Whole - Half.",
        "Chords are built from stacking alternate scale degrees (1st, 3rd, 5th)."
      ],
      practiceQuestions: [
        "List the notes present in a G Major scale.",
        "What is the difference between a Major 3rd interval and a Minor 3rd interval?",
        "Explain what a 3/4 time signature means regarding beats per measure."
      ],
      summary: "Music theory maps pitch, chords, staff notation, rhythm, and scales, forming the structural grammar for reading and composing musical works."
    };
  }

  // Smart Generic Fallback
  return {
    title: `${topicName} Study Guide`,
    level: "Intermediate",
    simpleDefinition: `${topicName} is a critical subject component focused on optimizing performance, evaluating logic structures, or reasoning through key principles of this field.`,
    whyItMatters: `Mastery of this topic helps you answer tricky exam questions, solve practical problems, and understand the logic used by experts in the field.`,
    keyPoints: [
      `It defines the core parameters and rules governing this subject area.`,
      `Enforces consistency and prevents typical reasoning errors under exam constraints.`,
      `Serves as a prerequisite conceptual block for advanced studies.`,
      `Streamlines problem solving, making calculations or evaluations highly efficient.`
    ],
    stepByStepExplanation: [
      `Step 1: Identify the primary variables or conditions of the problem.`,
      `Step 2: Apply the governing rules of ${topicName} step by step.`,
      `Step 3: Check for boundary cases or common exceptions to avoid traps.`,
      `Step 4: Formulate the final conclusion or solution based on the applied rules.`
    ],
    realLifeExample: `When analyzing systems or problems under similar conditions, you break the variables down, apply standard steps, and verify results.`,
    commonMistakes: [
      `Skipping the boundary verification step, leading to basic calculation errors.`,
      `Confusing general applications with specific exceptions outlined in the guide.`
    ],
    quickRevision: [
      `Always check inputs first against ${topicName} rules.`,
      `Focus on multi-step reasoning to isolate variable changes.`,
      `Practice past questions to recognize exam question patterns.`
    ],
    practiceQuestions: [
      `What are the core parameters that define the behavior of ${topicName}?`,
      `Describe a common scenario where applying ${topicName} results in a performance increase.`,
      `Identify the typical exceptions to the rule under dynamic conditions.`
    ],
    summary: `This guide outlines the definition, step-by-step logic, and revision checklist for ${topicName}. Focus on practical examples to prepare for the quiz.`
  };
};

const getMockTutorAnswer = (topicName, question) => {
  const q = question.toLowerCase();
  if (q.includes('what') || q.includes('define') || q.includes('meaning')) {
    return `That's a fundamental question! ${topicName} is structured to organize and optimize logic. Think of it as a blueprint for reducing complexity in this subject area. Let me know if you want a visual example!`;
  }
  if (q.includes('example') || q.includes('how') || q.includes('use')) {
    return `Certainly! For example, when applying ${topicName}, you typically: 1. Identify input constraints. 2. Process equations or relations. 3. Resolve repeating cycles. What specific step of this process would you like to drill down into?`;
  }
  return `That's a very insightful question about ${topicName}! Remember, this concept operates under strict rules. In practice quizzes, you will be tested on applying these rules to unexpected scenarios. What else can I explain simply?`;
};

const getFallbackScenes = (topicName) => {
  const t = topicName.toLowerCase();
  
  if (t.includes("genetics")) {
    return [
      {
        title: "Introduction to Genetics",
        visual: "genetics-intro",
        voiceover: "Welcome to this personalized lesson on Genetics! Genetics is the branch of biology that studies how traits are passed down from parents to offspring. At the heart of genetics is a macromolecule you've likely heard of: DNA.",
        keyPoint: "Genetics is the study of heredity and inherited variation.",
        example: "Your height, eye color, and hair texture are all influenced by genetics."
      },
      {
        title: "The DNA Blueprint",
        visual: "genetics-dna",
        voiceover: "Think of DNA as a massive recipe book. A gene is a specific recipe in that book, containing instructions to build a single trait, like eye color. DNA is wound up tightly into structures called chromosomes.",
        keyPoint: "Genes are functional segments of DNA stored in chromosomes.",
        example: "Humans have 23 pairs of chromosomes, containing about 20,000 genes!"
      },
      {
        title: "Inheritance Patterns",
        visual: "genetics-inheritance",
        voiceover: "How do traits get inherited? We get two versions of each gene, called alleles, one from each parent. Some alleles are dominant and will always show up, while others are recessive and only show up if you inherit two of them.",
        keyPoint: "Dominant alleles mask recessive alleles in offspring traits.",
        example: "A brown eye allele (B) is dominant over a blue eye allele (b)."
      },
      {
        title: "Key Takeaways",
        visual: "genetics-recap",
        voiceover: "To recap, genes are the fundamental units of heredity. Understanding dominant and recessive alleles is crucial for predicting traits in offspring. Now you are ready to apply this on your practice quiz!",
        keyPoint: "Heredity determines the passing of genetic traits from parents.",
        example: "Using a Punnett square to calculate offspring trait percentages."
      }
    ];
  }

  if (t.includes("array")) {
    return [
      {
        title: "Understanding Arrays",
        visual: "array-intro",
        voiceover: "Welcome! Today we are discussing Arrays. An array is a collection of similar data items stored at contiguous memory locations. It is the simplest and most widely used data structure.",
        keyPoint: "An array stores multiple items of the same type sequentially.",
        example: "A list of five test scores stored under a single variable name."
      },
      {
        title: "Indices & Accessing Elements",
        visual: "array-indices",
        voiceover: "Each item in an array is called an element, and its position is marked by an index. Crucially, array indexing starts at zero, not one. This means the first item is at index 0, and the second is at index 1.",
        keyPoint: "Elements are accessed directly using 0-based indices.",
        example: "Accessing the first item in array 'scores' using scores[0]."
      },
      {
        title: "Memory Contiguity",
        visual: "array-memory",
        voiceover: "Because arrays store data side-by-side in computer memory, accessing any element is incredibly fast. We call this constant time access. However, inserting or deleting items can be slow because other items must shift over.",
        keyPoint: "Access is constant time O(1), but insertion/deletion can be O(N).",
        example: "Shifting elements to make room when inserting an item at the beginning."
      },
      {
        title: "Summary & Quiz Ready",
        visual: "array-recap",
        voiceover: "To summarize: arrays are powerful for storing lists of fixed size with direct index-based access. Keep the zero-based index rule in mind as you prepare for your adaptive quiz. Good luck!",
        keyPoint: "Use arrays when you need fast lookups and have a fixed list size.",
        example: "Traversing an array using a simple loop."
      }
    ];
  }

  if (t.includes("sql") || t.includes("database")) {
    return [
      {
        title: "Introduction to SQL Basics",
        visual: "sql-intro",
        voiceover: "Welcome! Let's master SQL, which stands for Structured Query Language. SQL is the standard language used to communicate with databases, allowing us to store, retrieve, and update information.",
        keyPoint: "SQL is used to manage and query relational databases.",
        example: "Querying an e-commerce database to display a user's recent orders."
      },
      {
        title: "Tables, Rows, & Columns",
        visual: "sql-structure",
        voiceover: "In relational databases, data is organized into tables. A table contains columns representing specific categories of data, and rows representing individual records of information.",
        keyPoint: "Tables consist of vertical columns (fields) and horizontal rows (records).",
        example: "A 'Users' table with columns like UserID, Email, and JoinDate."
      },
      {
        title: "Writing a Simple Query",
        visual: "sql-query",
        voiceover: "To fetch data, we write queries. The most common is the SELECT statement. We specify SELECT the columns we want, FROM the table, and WHERE to filter the results based on specific conditions.",
        keyPoint: "SELECT columns FROM table WHERE condition is the core syntax.",
        example: "SELECT Email FROM Users WHERE Country = 'USA';"
      },
      {
        title: "Key Recap",
        visual: "sql-recap",
        voiceover: "To summarize: databases use relational tables, and we query them using SQL statements. Pay close attention to how rows are filtered in queries. Let's practice this in the quiz!",
        keyPoint: "Mastering query syntax is the key to database operations.",
        example: "Using the WHERE clause to filter transactions above one hundred dollars."
      }
    ];
  }

  // Generic fallback
  return [
    {
      title: `Introduction to ${topicName}`,
      visual: "generic-intro",
      voiceover: `Welcome! Today, we will explore the core concepts of ${topicName}. This is a critical subject designed to help you organize logic, evaluate problems, and improve system performance.`,
      keyPoint: `Mastery of ${topicName} begins with understanding its goals.`,
      example: `Understanding ${topicName} is a prerequisite for advanced problem-solving.`
    },
    {
      title: "Core Concepts Explained",
      visual: "generic-mechanics",
      voiceover: `Let's break down the inner workings of ${topicName}. We divide the concept into its key inputs, relations, and operations. This structure ensures consistency and prevents classic errors.`,
      keyPoint: `Inputs must adhere to the core principles of ${topicName}.`,
      example: `Applying specific design constraints to prevent operational bottlenecks.`
    },
    {
      title: "Real-Life Application",
      visual: "generic-application",
      voiceover: `How is this applied? In practical scenarios, we use these rules to organize complex systems. The result is a clean design, fast lookups, and massive reduction in runtime failures.`,
      keyPoint: `Drastically reduces complexity and enhances lookup performance.`,
      example: `Deploying a ${topicName} framework to handle dynamic user configurations.`
    },
    {
      title: "Recap & Quiz Preparation",
      visual: "generic-recap",
      voiceover: `To summarize: establish clear rules, divide complex components incrementally, and always check boundary conditions. Keep this fresh in mind for your quick practice quiz!`,
      keyPoint: `Focus on establishing boundaries and analyzing constraint rules.`,
      example: `Successfully answering multi-step questions on the upcoming quiz.`
    }
  ];
};

const getSentences = (text) => {
  return text.split(/(?<=[.!?])\s+/);
};

// --- Main Learning Page Component ---

const LearningPage = () => {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  // 1. Load active learning task from localStorage with fallback hierarchy
  const [currentTask] = useState(() => {
    console.log("[LearningPage] Reading active task from localStorage...");
    try {
      const saved = localStorage.getItem('neurolearn_current_learning_task');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.topic) return parsed;
      }
    } catch (e) {
      console.error("[LearningPage] Error parsing neurolearn_current_learning_task:", e);
    }

    try {
      const savedPlan = localStorage.getItem('neurolearn_study_plan');
      if (savedPlan) {
        const plan = JSON.parse(savedPlan);
        if (plan && plan.tasks && plan.tasks.length > 0) {
          const firstTask = plan.tasks[0];
          return {
            taskType: firstTask.taskType || firstTask.type || "Personalized Video",
            topic: firstTask.topic || "General Learning",
            reason: firstTask.reason || ""
          };
        }
      }
    } catch (e) {
      console.error("[LearningPage] Error parsing neurolearn_study_plan:", e);
    }

    try {
      const savedGoal = localStorage.getItem('neurolearn_goal_data');
      if (savedGoal) {
        const goal = JSON.parse(savedGoal);
        const subjects = goal?.subjects || [];
        const firstSubject = subjects[0] || "General Learning";
        return {
          taskType: "Personalized Video",
          topic: firstSubject,
          reason: "Guided learning for subject"
        };
      }
    } catch (e) {
      console.error("[LearningPage] Error parsing neurolearn_goal_data:", e);
    }

    return {
      taskType: "Personalized Video",
      topic: "General Learning",
      reason: "Guided daily learning roadmap"
    };
  });

  const { taskType, topic, reason } = currentTask;

  // 2. Select initial active tab based on taskType
  const [activeTab, setActiveTab] = useState(() => {
    if (taskType === 'AI Notes') return 'notes';
    if (taskType === 'AI Tutor') return 'tutor';
    return 'video';
  });

  // Local storage persisted states for learning materials
  const [aiNotes, setAiNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('neurolearn_ai_notes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.topic === topic && parsed.notes) {
          return parsed.notes;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const [notesMode, setNotesMode] = useState(() => {
    try {
      const saved = localStorage.getItem('neurolearn_ai_notes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.topic === topic && parsed.source) {
          return parsed.source;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return 'gemini';
  });

  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  const [tutorChat, setTutorChat] = useState(() => {
    try {
      const saved = localStorage.getItem('neurolearn_tutor_chat');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { sender: 'tutor', text: `Ask me anything about ${topic}. I will explain it simply.` }
    ];
  });

  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // --- AI Tutor Video Player State Variables ---
  const [scenes, setScenes] = useState([]);
  const [isLoadingScenes, setIsLoadingScenes] = useState(true);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [liveCaption, setLiveCaption] = useState("");
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);
  const [videoCompleted, setVideoCompleted] = useState(false);

  const spokenCharIndexRef = useRef(0);
  const timerRef = useRef(null);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorChat]);

  // Load video scenes on mount
  useEffect(() => {
    const fetchScenes = async () => {
      setIsLoadingScenes(true);
      let subject = 'General Learning';
      try {
        const savedGoal = localStorage.getItem('neurolearn_user_profile') || localStorage.getItem('neurolearn_goal_data');
        if (savedGoal) {
          const goal = JSON.parse(savedGoal);
          subject = goal.subjects?.[0] || 'General Learning';
        }
      } catch (e) {}

      try {
        const response = await fetch('/api/generate-video-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, subject })
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setScenes(data);
            setIsLoadingScenes(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch scenes from backend, using fallback:", err);
      }
      setScenes(getFallbackScenes(topic));
      setIsLoadingScenes(false);
    };
    fetchScenes();
  }, [topic]);

  // Calculate Speech offsets and total duration
  const totalDuration = useMemo(() => {
    if (!scenes || scenes.length === 0) return 0;
    const totalWords = scenes.reduce((acc, s) => acc + s.voiceover.split(/\s+/).length, 0);
    return Math.round(totalWords / 2.5); // Average 150 words per minute
  }, [scenes]);

  const sceneOffsets = useMemo(() => {
    if (!scenes || scenes.length === 0) return [];
    let cumulative = 0;
    return scenes.map(s => {
      const words = s.voiceover.split(/\s+/).length;
      const duration = Math.round(words / 2.5);
      const start = cumulative;
      cumulative += duration;
      return { start, duration };
    });
  }, [scenes]);

  const currentProgressSeconds = useMemo(() => {
    if (!sceneOffsets || sceneOffsets.length === 0 || currentSceneIndex >= sceneOffsets.length) return 0;
    const offset = sceneOffsets[currentSceneIndex]?.start || 0;
    const sceneDur = sceneOffsets[currentSceneIndex]?.duration || 0;
    const currentElapsed = Math.min(elapsedSeconds, sceneDur);
    return offset + currentElapsed;
  }, [sceneOffsets, currentSceneIndex, elapsedSeconds]);

  // Clean up synthesis and timers on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      clearInterval(timerRef.current);
    };
  }, []);

  // Format seconds to M:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const updateProgress = (type, currentTopic) => {
    try {
      const saved = localStorage.getItem('neurolearn_learning_progress');
      const progress = saved ? JSON.parse(saved) : { completedVideos: [], completedNotes: [], completedQuizzes: [] };
      if (!progress[type]) progress[type] = [];
      if (!progress[type].includes(currentTopic)) {
        progress[type].push(currentTopic);
        localStorage.setItem('neurolearn_learning_progress', JSON.stringify(progress));
      }
    } catch (e) {
      console.error("Error updating progress:", e);
    }
  };

  // Controller function for Speech Synthesis (TTS)
  const speakScene = (index, startCharIndex = 0, overrideRate = null, overrideMuted = null) => {
    window.speechSynthesis.cancel();
    clearInterval(timerRef.current);

    if (index < 0 || index >= scenes.length) return;

    const scene = scenes[index];
    const textToSpeak = startCharIndex > 0 ? scene.voiceover.substring(startCharIndex) : scene.voiceover;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    const rateToUse = overrideRate !== null ? overrideRate : playbackRate;
    const muteToUse = overrideMuted !== null ? overrideMuted : isMuted;

    utterance.rate = rateToUse;
    utterance.volume = muteToUse ? 0 : 1;

    const sentences = getSentences(scene.voiceover);
    let cumulative = 0;
    const sentenceRanges = sentences.map(s => {
      const start = cumulative;
      cumulative += s.length + 1;
      return { text: s, start, end: cumulative };
    });

    utterance.onboundary = (event) => {
      if (event.name === 'sentence' || event.name === 'word') {
        const actualIndex = event.charIndex + startCharIndex;
        spokenCharIndexRef.current = actualIndex;

        const sIndex = sentenceRanges.findIndex(r => actualIndex >= r.start && actualIndex < r.end);
        if (sIndex !== -1) {
          setActiveSentenceIndex(sIndex);
          setLiveCaption(sentenceRanges[sIndex].text);
        }
      }
    };

    utterance.onend = () => {
      spokenCharIndexRef.current = 0;
      setActiveSentenceIndex(0);
      setLiveCaption("");

      if (index < scenes.length - 1) {
        setCurrentSceneIndex(index + 1);
        setElapsedSeconds(0);
        speakScene(index + 1, 0);
      } else {
        setIsPlaying(false);
        setVideoCompleted(true);
        updateProgress('completedVideos', topic);
      }
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis error:", e);
    };

    window.speechSynthesis.speak(utterance);

    // Keep progress bar in sync
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 0.1 * rateToUse);
    }, 100);
  };

  const handlePause = () => {
    window.speechSynthesis.cancel();
    clearInterval(timerRef.current);
    setIsPlaying(false);
  };

  // Dynamic AI Notes Generator (queries backend Gemini API with local fallback support)
  const handleGenerateNotes = async () => {
    setIsGeneratingNotes(true);
    setNotesMode('gemini'); // Default to gemini attempt
    
    let goalData = null;
    try {
      const g = localStorage.getItem('neurolearn_user_profile') || localStorage.getItem('neurolearn_goal_data');
      if (g) goalData = JSON.parse(g);
    } catch (e) {
      console.warn("[LearningPage] Error reading localStorage context for notes:", e);
    }

    try {
      const response = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subject: goalData?.subjects?.[0] || 'General Learning'
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.definition) {
        const mappedNotes = {
          title: topic,
          level: "Standard",
          simpleDefinition: data.definition,
          whyItMatters: Array.isArray(data.applications) ? data.applications.join(', ') : data.applications,
          keyPoints: data.keyConcepts || [],
          stepByStepExplanation: data.keyConcepts || [],
          realLifeExample: Array.isArray(data.examples) ? data.examples.join(', ') : data.examples,
          commonMistakes: ["Applying concepts out of context", "Confusing key definitions"],
          quickRevision: data.keyConcepts || [],
          practiceQuestions: ["Explain this topic in your own words", "Discuss a real-world application"],
          summary: data.summary
        };
        const cacheData = {
          source: 'gemini',
          topic,
          notes: mappedNotes,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('neurolearn_ai_notes', JSON.stringify(cacheData));
        setAiNotes(mappedNotes);
        setNotesMode('gemini');
        updateProgress('completedNotes', topic);
        setIsGeneratingNotes(false);
        return;
      }
      throw new Error("Invalid format in response notes");
    } catch (err) {
      console.warn("[LearningPage] Gemini notes generation failed, using local fallback:", err);
      const fallbackData = generateFallbackNotes(topic);
      const cacheData = {
        source: 'fallback',
        topic,
        notes: fallbackData,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('neurolearn_ai_notes', JSON.stringify(cacheData));
      setAiNotes(fallbackData);
      setNotesMode('fallback');
      updateProgress('completedNotes', topic);
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // AI Tutor Send Message Handler
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    const trimmedInput = chatInput.trim();
    if (!trimmedInput) return;

    const updatedChat = [...tutorChat, { sender: 'user', text: trimmedInput }];
    setTutorChat(updatedChat);
    localStorage.setItem('neurolearn_tutor_chat', JSON.stringify(updatedChat));
    setChatInput("");
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic,
          message: trimmedInput,
          chatHistory: updatedChat
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.answer) {
        const tutorReply = `${data.answer}\n\nExample:\n${data.example || ''}\n\nFollow-up Question:\n${data.followUpQuestion || ''}`;
        const finalChat = [...updatedChat, { sender: 'tutor', text: tutorReply }];
        setTutorChat(finalChat);
        localStorage.setItem('neurolearn_tutor_chat', JSON.stringify(finalChat));
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.warn("[LearningPage] Gemini Tutor chatbot failed, using fallback:", err);
      const mockReply = getMockTutorAnswer(topic, trimmedInput);
      const finalChat = [...updatedChat, { sender: 'tutor', text: mockReply }];
      setTutorChat(finalChat);
      localStorage.setItem('neurolearn_tutor_chat', JSON.stringify(finalChat));
    } finally {
      setIsTyping(false);
    }
  };

  // Interactive Graphic Scene Renderer
  const renderSceneVisual = () => {
    if (scenes.length === 0 || currentSceneIndex >= scenes.length) return null;
    const scene = scenes[currentSceneIndex];
    const visualType = scene.visual;

    if (topic.toLowerCase().includes("genetics")) {
      return (
        <div className="scene-visual-canvas genetics-canvas">
          {visualType === 'genetics-intro' && (
            <div className="visual-genetics-intro animate-pulse">
              <div className="cell-nucleus">
                <span className="visual-label">Cell Nucleus</span>
                <div className="chromosome-icon">🧬</div>
              </div>
            </div>
          )}
          {visualType === 'genetics-dna' && (
            <div className="visual-dna-doublehelix">
              <div className="dna-strand left-strand">
                {[...Array(6)].map((_, i) => (
                  <span key={i} className="nucleotide-node" style={{ animationDelay: `${i * 0.2}s` }}></span>
                ))}
              </div>
              <div className="dna-bridge-lines">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bridge-line" style={{ animationDelay: `${i * 0.15}s` }}></div>
                ))}
              </div>
              <div className="dna-strand right-strand">
                {[...Array(6)].map((_, i) => (
                  <span key={i} className="nucleotide-node" style={{ animationDelay: `${i * 0.2 + 0.1}s` }}></span>
                ))}
              </div>
            </div>
          )}
          {visualType === 'genetics-inheritance' && (
            <div className="punnett-square-grid">
              <div className="punnett-header-top">B (Dominant)</div>
              <div className="punnett-header-right">b (Recessive)</div>
              <div className="punnett-cell bb-cell active-cell">BB <span className="cell-desc">Brown</span></div>
              <div className="punnett-cell bb-cell-mixed">Bb <span className="cell-desc">Brown</span></div>
              <div className="punnett-cell bb-cell-mixed">bB <span className="cell-desc">Brown</span></div>
              <div className="punnett-cell bb-cell-recessive">bb <span className="cell-desc">Blue</span></div>
            </div>
          )}
          {visualType === 'genetics-recap' && (
            <div className="genetics-recap-cards">
              <div className="recap-card-item">
                <span className="card-check">✓</span> DNA acts as blueprint
              </div>
              <div className="recap-card-item">
                <span className="card-check">✓</span> Genes store trait recipes
              </div>
              <div className="recap-card-item">
                <span className="card-check">✓</span> Alleles dictate expression
              </div>
            </div>
          )}
        </div>
      );
    }

    if (topic.toLowerCase().includes("array")) {
      return (
        <div className="scene-visual-canvas array-canvas">
          {visualType === 'array-intro' && (
            <div className="array-boxes-row">
              {[74, 82, 91, 68, 85].map((val, idx) => (
                <div key={idx} className="array-memory-box animate-fadeIn" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="box-val">{val}</div>
                  <div className="box-addr">0x7ffd0{idx}</div>
                </div>
              ))}
            </div>
          )}
          {visualType === 'array-indices' && (
            <div className="array-indices-row">
              {[15, 30, 45, 60].map((val, idx) => (
                <div key={idx} className={`array-index-box ${idx === activeSentenceIndex ? 'highlight-box' : ''}`}>
                  <div className="idx-tag">Index {idx}</div>
                  <div className="idx-val">{val}</div>
                  <div className="idx-lookup">scores[{idx}]</div>
                </div>
              ))}
            </div>
          )}
          {visualType === 'array-memory' && (
            <div className="array-memory-layout">
              <div className="memory-slot occupied">Element 0 <span className="time-badge">O(1) Access</span></div>
              <div className="memory-slot occupied">Element 1</div>
              <div className="memory-slot occupied">Element 2</div>
              <div className="memory-slot empty">Free Slot</div>
            </div>
          )}
          {visualType === 'array-recap' && (
            <div className="array-summary-bullets">
              <div className="bullet-row"><span className="bullet-icon">📦</span> Contiguous memory</div>
              <div className="bullet-row"><span className="bullet-icon">🔢</span> 0-based indices</div>
              <div className="bullet-row"><span className="bullet-icon">⚡</span> O(1) direct reads</div>
            </div>
          )}
        </div>
      );
    }

    if (topic.toLowerCase().includes("sql") || topic.toLowerCase().includes("database")) {
      return (
        <div className="scene-visual-canvas sql-canvas">
          {visualType === 'sql-intro' && (
            <div className="sql-tables-relation">
              <div className="sql-table-mini">
                <div className="table-header">Users</div>
                <div className="table-row">id</div>
                <div className="table-row">email</div>
              </div>
              <div className="relation-line-glow"></div>
              <div className="sql-table-mini">
                <div className="table-header">Orders</div>
                <div className="table-row">order_id</div>
                <div className="table-row">user_id</div>
              </div>
            </div>
          )}
          {visualType === 'sql-structure' && (
            <div className="database-schema-grid">
              <div className="grid-header-cell">UserID (PK)</div>
              <div className="grid-header-cell">Email</div>
              <div className="grid-header-cell">Country</div>
              <div className="grid-cell">101</div>
              <div className="grid-cell">alex@test.com</div>
              <div className="grid-cell">USA</div>
              <div className="grid-cell">102</div>
              <div className="grid-cell">jane@test.com</div>
              <div className="grid-cell">CAN</div>
            </div>
          )}
          {visualType === 'sql-query' && (
            <div className="query-builder-flow">
              <div className="query-code-glow">
                <span className="keyword">SELECT</span> Email <span className="keyword">FROM</span> Users <span className="keyword">WHERE</span> Country = <span className="str">'USA'</span>;
              </div>
              <div className="query-result-reveal animate-pulse">
                Result: [ alex@test.com ]
              </div>
            </div>
          )}
          {visualType === 'sql-recap' && (
            <div className="sql-recap-notes">
              <div className="recap-note"><span className="note-icon">📂</span> Columns define structure</div>
              <div className="recap-note"><span className="note-icon">📄</span> Rows represent records</div>
              <div className="recap-note"><span className="note-icon">🔍</span> Querying fetches filtered rows</div>
            </div>
          )}
        </div>
      );
    }

    // Generic fallback visual
    return (
      <div className="scene-visual-canvas generic-canvas">
        <div className="generic-flowchart">
          <div className={`flowchart-node ${activeSentenceIndex === 0 ? 'active' : ''}`}>
            <span className="node-title">Step 1: Input</span>
            <p className="node-text">Establish core constraints</p>
          </div>
          <div className="flowchart-arrow">➔</div>
          <div className={`flowchart-node ${activeSentenceIndex === 1 ? 'active' : ''}`}>
            <span className="node-title">Step 2: Process</span>
            <p className="node-text">Apply {topic} rules</p>
          </div>
          <div className="flowchart-arrow">➔</div>
          <div className={`flowchart-node ${activeSentenceIndex >= 2 ? 'active' : ''}`}>
            <span className="node-title">Step 3: Output</span>
            <p className="node-text">Optimized results</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="learning-page-wrapper animate-fadeIn">
      {/* Background Orbs */}
      <div className="background-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      <div className="learning-container">
        
        {/* BACK TO STUDY PLAN BUTTON */}
        <button 
          className="study-plan-back-btn"
          onClick={() => {
            window.speechSynthesis.cancel();
            clearInterval(timerRef.current);
            navigate('/study-plan');
          }}
          type="button"
        >
          ← Back to Study Plan
        </button>

        {/* CURRENT TASK AT TOP */}
        <header className="current-task-banner glass-card">
          <div className="task-meta-header">
            <span className="task-type-badge">{taskType}</span>
            <span className="task-time-stamp">Scheduled Time: {currentTask.time || "Immediate"}</span>
          </div>
          <h1 className="active-topic-title">Active Topic: {topic}</h1>
          <p className="active-task-reason">💡 Reason: {reason}</p>
        </header>

        {/* IF ADAPTIVE QUIZ TASK TYPE */}
        {taskType === 'Adaptive Quiz' ? (
          <section className="quiz-prep-section glass-card animate-slideUp">
            <div className="quiz-prep-icon">🧠</div>
            <h2 className="quiz-prep-title">Adaptive Quiz Ready</h2>
            <p className="quiz-prep-desc">
              AI has structured a practice quiz focusing on <strong>{topic}</strong>. 
              The questions will dynamically adjust to test your strengths and pinpoint weak areas.
            </p>
            <div className="quiz-action-wrapper">
              <button 
                className="action-button-primary quiz-start-cta"
                onClick={() => navigate('/quiz')}
              >
                Take Quiz
              </button>
            </div>
          </section>
        ) : (
          /* OTHERWISE RENDER TAB INTERFACE */
          <div className="learning-tabs-layout">
            
            {/* TABS SELECTOR */}
            <div className="learning-tabs-header glass-card">
              <button 
                className={`tab-selector-btn ${activeTab === 'video' ? 'active' : ''}`}
                onClick={() => {
                  handlePause();
                  setActiveTab('video');
                }}
              >
                📹 Personalized Video
              </button>
              <button 
                className={`tab-selector-btn ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => {
                  handlePause();
                  setActiveTab('notes');
                }}
              >
                📝 AI Notes
              </button>
              <button 
                className={`tab-selector-btn ${activeTab === 'tutor' ? 'active' : ''}`}
                onClick={() => {
                  handlePause();
                  setActiveTab('tutor');
                }}
              >
                🤖 AI Tutor
              </button>
            </div>

            {/* TAB CONTENTS CONTAINER */}
            <div className="learning-tab-content glass-card">
              
              {/* VIDEO TAB */}
              {activeTab === 'video' && (
                <div className="tab-pane video-pane animate-fadeIn">
                  
                  <div className="ai-video-player-container">
                    {/* Header bar / Title */}
                    <div className="video-player-header" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="video-glow-dot"></div>
                        <span className="video-lesson-tag">Interactive AI Lesson</span>
                      </div>
                      <h3 className="video-player-title" style={{ margin: '4px 0 0 0', fontSize: '1.1rem', color: '#fff' }}>
                        {topic} explained in simple language
                      </h3>
                    </div>

                    {/* Main Stage Grid (Avatar + Visual Display) */}
                    <div className="video-stage">
                      
                      {/* Left: Tutor Avatar Area */}
                      <div className="tutor-column">
                        <div className={`tutor-avatar-circle ${isPlaying ? 'speaking' : 'idle'}`}>
                          <div className="avatar-speaking-halo"></div>
                          <div className="avatar-face-circle">
                            <span className="avatar-icon-emoji">🤖</span>
                          </div>
                        </div>
                        <div className="tutor-label-box">
                          <span className="tutor-name">AI Tutor</span>
                          <span className={`tutor-status-badge ${isPlaying ? 'status-speaking' : 'status-paused'}`}>
                            {isPlaying ? 'Speaking' : 'Paused'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Scene Display Card */}
                      <div className="scene-display-card">
                        {isLoadingScenes ? (
                          <div className="visual-loader-container">
                            <div className="visual-spinner"></div>
                            <p>Synthesizing visual explanation...</p>
                          </div>
                        ) : (
                          <>
                            {/* Scene Header */}
                            <div className="scene-card-header">
                              <span className="scene-number-tag">Scene {currentSceneIndex + 1} of {scenes.length}</span>
                              <h3 className="scene-card-title">{scenes[currentSceneIndex]?.title}</h3>
                            </div>

                            {/* Visual Display Canvas */}
                            <div className="scene-visual-display">
                              {renderSceneVisual()}
                            </div>

                            {/* Scene Concept & Example */}
                            <div className="scene-metadata-details">
                              <div className="metadata-row">
                                <span className="meta-label">Key Concept:</span>
                                <span className="meta-value">{scenes[currentSceneIndex]?.keyPoint}</span>
                              </div>
                              <div className="metadata-row">
                                <span className="meta-label">Example:</span>
                                <span className="meta-value example-value">{scenes[currentSceneIndex]?.example}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                    </div>

                    {/* Live Captions Box */}
                    <div className="video-captions-overlay">
                      <span className="captions-label">Live Captions</span>
                      <p className="caption-text-content">
                        {liveCaption || (scenes[currentSceneIndex]?.voiceover ? `Click Play to start listening: "${scenes[currentSceneIndex].voiceover}"` : "")}
                      </p>
                    </div>

                    {/* Progress Slider Bar */}
                    <div className="video-progress-timeline">
                      <input 
                        type="range" 
                        min="0" 
                        max={totalDuration} 
                        value={currentProgressSeconds}
                        onChange={(e) => {
                          const seekSecs = parseInt(e.target.value, 10);
                          const seekSceneIdx = sceneOffsets.findIndex(off => seekSecs >= off.start && seekSecs < off.start + off.duration);
                          if (seekSceneIdx !== -1) {
                            setCurrentSceneIndex(seekSceneIdx);
                            const relativeElapsed = seekSecs - sceneOffsets[seekSceneIdx].start;
                            setElapsedSeconds(relativeElapsed);
                            
                            const fullText = scenes[seekSceneIdx].voiceover;
                            const dur = sceneOffsets[seekSceneIdx].duration;
                            const ratio = relativeElapsed / dur;
                            const charOffset = Math.round(fullText.length * ratio);
                            
                            spokenCharIndexRef.current = charOffset;

                            if (isPlaying) {
                              speakScene(seekSceneIdx, charOffset);
                            }
                          }
                        }}
                        className="player-progress-slider"
                      />
                      <div className="time-stamps-row">
                        <span>{formatTime(currentProgressSeconds)}</span>
                        <span>{formatTime(totalDuration)}</span>
                      </div>
                    </div>

                    {/* Video Player Controls Panel */}
                    <div className="video-controls-panel">
                      
                      {/* Left side actions */}
                      <div className="control-group-left">
                        {isPlaying ? (
                          <button 
                            className="control-icon-btn pause-btn"
                            onClick={handlePause}
                            title="Pause"
                          >
                            ⏸ Pause
                          </button>
                        ) : (
                          <button 
                            className="control-icon-btn play-btn"
                            onClick={() => {
                              setIsPlaying(true);
                              if (videoCompleted) {
                                setVideoCompleted(false);
                                setCurrentSceneIndex(0);
                                setElapsedSeconds(0);
                                spokenCharIndexRef.current = 0;
                                speakScene(0, 0);
                              } else {
                                speakScene(currentSceneIndex, spokenCharIndexRef.current);
                              }
                            }}
                            title="Play"
                          >
                            ▶ Play
                          </button>
                        )}
                        <button 
                          className="control-icon-btn restart-btn"
                          onClick={() => {
                            setIsPlaying(true);
                            setVideoCompleted(false);
                            setCurrentSceneIndex(0);
                            setElapsedSeconds(0);
                            spokenCharIndexRef.current = 0;
                            speakScene(0, 0);
                          }}
                          title="Restart"
                        >
                          🔄 Restart
                        </button>
                      </div>

                      {/* Right side actions */}
                      <div className="control-group-right">
                        
                        {/* Speed Selector */}
                        <div className="control-dropdown-wrapper">
                          <label className="dropdown-label">Speed:</label>
                          <select 
                            value={playbackRate} 
                            onChange={(e) => {
                              const newRate = parseFloat(e.target.value);
                              setPlaybackRate(newRate);
                              if (isPlaying) {
                                speakScene(currentSceneIndex, spokenCharIndexRef.current, newRate, null);
                              }
                            }}
                            className="control-select-menu"
                          >
                            <option value="0.75">0.75x</option>
                            <option value="1">1x</option>
                            <option value="1.25">1.25x</option>
                          </select>
                        </div>

                        {/* Mute Toggle */}
                        <button 
                          className={`control-icon-btn mute-btn ${isMuted ? 'muted-active' : ''}`}
                          onClick={() => {
                            const newMute = !isMuted;
                            setIsMuted(newMute);
                            if (isPlaying) {
                              speakScene(currentSceneIndex, spokenCharIndexRef.current, null, newMute);
                            }
                          }}
                        >
                          {isMuted ? '🔇 Unmute' : '🔊 Mute'}
                        </button>

                      </div>

                    </div>

                    {/* Completion Banner */}
                    {videoCompleted && (
                      <div className="video-completion-overlay animate-fadeIn">
                        <div className="completion-card glass-card">
                          <span className="check-badge">🎉</span>
                          <h3>Video Lesson Completed!</h3>
                          <p>You have mastered the foundational concepts for this topic. Let's test your understanding!</p>
                          <button 
                            className="action-button-primary quiz-routing-cta"
                            onClick={() => {
                              window.speechSynthesis.cancel();
                              clearInterval(timerRef.current);
                              navigate('/quiz');
                            }}
                          >
                            Navigate to quiz for {topic}
                          </button>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* NOTES TAB */}
              {activeTab === 'notes' && (
                <div className="tab-pane notes-pane animate-fadeIn">
                  {isGeneratingNotes ? (
                    <div className="notes-loading-card glass-card">
                      <div className="spinner-container">
                        <div className="notes-spinner"></div>
                      </div>
                      <p className="loading-text">AI is preparing personalized notes...</p>
                      <p className="sub-loading-text">Synthesizing topic structure, key concepts, common mistakes, and practice exercises...</p>
                    </div>
                  ) : !aiNotes ? (
                    <div className="notes-welcome-card glass-card">
                      <div className="notes-welcome-icon">📝</div>
                      <h3>{topic} notes</h3>
                      <p>
                        Generate a customized study guide with structured definitions, steps, common pitfalls, and practice questions for <strong>{topic}</strong>.
                      </p>
                      <button 
                        className="action-button-primary generate-notes-btn"
                        onClick={handleGenerateNotes}
                      >
                        ✨ Generate AI Notes
                      </button>
                    </div>
                  ) : (
                    <div className="notes-reader-container">
                      <div className="notes-source-badge-row">
                        {notesMode === 'gemini' ? (
                          <span className="notes-badge notes-badge-gemini">✨ Gemini AI Notes</span>
                        ) : (
                          <span className="notes-badge notes-badge-fallback">⚠️ Fallback AI Notes Mode</span>
                        )}
                      </div>

                      <div className="notes-grid">
                        {/* Card 1: Title & Level */}
                        <div className="notes-card card-title-level glass-card">
                          <div className="card-header-icon">🏷️</div>
                          <div className="card-main-content">
                            <span className="notes-card-label">{topic} notes</span>
                            <h2 className="notes-card-title">{aiNotes.title}</h2>
                            <div className="notes-meta-row">
                              <span className="meta-pill difficulty-pill">{aiNotes.level}</span>
                              <span className="meta-pill topic-pill">{topic}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card 2: Simple Definition */}
                        <div className="notes-card card-definition glass-card">
                          <div className="card-header-icon">📖</div>
                          <div className="card-main-content">
                            <span className="notes-card-label">Simple Definition</span>
                            <p className="notes-card-text definition-text">{aiNotes.simpleDefinition}</p>
                          </div>
                        </div>

                        {/* Card 3: Why It Matters */}
                        <div className="notes-card card-why-matters glass-card">
                          <div className="card-header-icon">🎯</div>
                          <div className="card-main-content">
                            <span className="notes-card-label">Why It Matters</span>
                            <p className="notes-card-text why-matters-text">{aiNotes.whyItMatters}</p>
                          </div>
                        </div>

                        {/* Card 4: Key Points */}
                        <div className="notes-card card-key-points glass-card">
                          <div className="card-header-icon">🔑</div>
                          <div className="card-main-content">
                            <span className="notes-card-label">Key Points</span>
                            <ul className="notes-bullet-list">
                              {aiNotes.keyPoints?.map((pt, idx) => (
                                <li key={idx} className="notes-bullet-item">{pt}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Card 5: Step-by-Step Explanation */}
                        <div className="notes-card card-steps glass-card">
                          <div className="card-header-icon">🪜</div>
                          <div className="card-main-content">
                            <span className="notes-card-label">Step-by-Step Explanation</span>
                            <ol className="notes-ordered-list">
                              {aiNotes.stepByStepExplanation?.map((step, idx) => (
                                <li key={idx} className="notes-ordered-item">
                                  <span className="step-num">{idx + 1}</span>
                                  <p className="step-desc">{step}</p>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>

                        {/* Card 6: Real-Life Example */}
                        <div className="notes-card card-example glass-card">
                          <div className="card-header-icon">💡</div>
                          <div className="card-main-content">
                            <span className="notes-card-label">Real-Life Example</span>
                            <p className="notes-card-text example-text">{aiNotes.realLifeExample}</p>
                          </div>
                        </div>

                        {/* Card 7: Common Mistakes */}
                        <div className="notes-card card-mistakes glass-card warning-highlight">
                          <div className="card-header-icon">⚠️</div>
                          <div className="card-main-content">
                            <span className="notes-card-label">Common Mistakes to Avoid</span>
                            <ul className="notes-mistakes-list">
                              {aiNotes.commonMistakes?.map((mistake, idx) => (
                                <li key={idx} className="notes-mistake-item">{mistake}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Card 8: Quick Revision */}
                        <div className="notes-card card-revision glass-card">
                          <div className="card-header-icon">⚡</div>
                          <div className="card-main-content">
                            <span className="notes-card-label">Quick Revision Points</span>
                            <div className="revision-points-grid">
                              {aiNotes.quickRevision?.map((rev, idx) => (
                                <div key={idx} className="revision-point-box">
                                  <span className="revision-icon">✦</span>
                                  <p className="revision-text">{rev}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Card 9: Practice Questions */}
                        <div className="notes-card card-practice glass-card">
                          <div className="card-header-icon">✏️</div>
                          <div className="card-main-content">
                            <span className="notes-card-label">Practice & Self-Reflection</span>
                            <div className="practice-questions-list">
                              {aiNotes.practiceQuestions?.map((q, idx) => (
                                <div key={idx} className="practice-question-item">
                                  <input type="checkbox" id={`practice-q-${idx}`} className="practice-checkbox" />
                                  <label htmlFor={`practice-q-${idx}`} className="practice-question-label">{q}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Card 10: Summary */}
                        <div className="notes-card card-summary glass-card">
                          <div className="card-header-icon">📝</div>
                          <div className="card-main-content">
                            <span className="notes-card-label">Summary</span>
                            <p className="notes-card-text summary-text">{aiNotes.summary}</p>
                          </div>
                        </div>
                      </div>

                      <div className="notes-footer-actions">
                        <button 
                          className="regenerate-notes-btn"
                          onClick={handleGenerateNotes}
                        >
                          🔄 Regenerate Notes
                        </button>
                        <button 
                          className="action-button-primary notes-quiz-cta"
                          onClick={() => {
                            window.speechSynthesis.cancel();
                            clearInterval(timerRef.current);
                            navigate('/quiz');
                          }}
                        >
                          Navigate to quiz for {topic}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI TUTOR TAB */}
              {activeTab === 'tutor' && (
                <div className="tab-pane tutor-pane animate-fadeIn">
                  <div className="chat-interface-wrapper">
                    
                    {/* Chat Log Message Screen */}
                    <div className="chat-messages-log">
                      {tutorChat.map((msg, idx) => (
                        <div key={idx} className={`chat-bubble-container ${msg.sender === 'user' ? 'user-bubble-align' : 'tutor-bubble-align'}`}>
                          <div className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-tutor'}`}>
                            <span className="bubble-sender-name">{msg.sender === 'user' ? 'You' : 'AI Tutor'}</span>
                            <p className="bubble-text" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                          </div>
                        </div>
                      ))}
                      
                      {isTyping && (
                        <div className="chat-bubble-container tutor-bubble-align">
                          <div className="chat-bubble bubble-tutor bubble-typing">
                            <span className="typing-dots">NeuroLearn AI is thinking...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input form */}
                    <form onSubmit={handleSendChatMessage} className="chat-input-form">
                      <input 
                        type="text" 
                        placeholder={`Ask me anything about ${topic}`}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="chat-input-field"
                      />
                      <button type="submit" className="chat-send-btn">Send</button>
                    </form>

                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* PERSISTENT BOTTOM ACTIONS */}
        <footer className="learning-footer-cta animate-slideUp">
          <button 
            className="action-button-primary take-quiz-bottom-cta"
            onClick={() => {
              window.speechSynthesis.cancel();
              clearInterval(timerRef.current);
              navigate('/quiz');
            }}
          >
            Navigate to quiz for {topic}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LearningPage;
