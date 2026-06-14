import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AssessmentPage.css';

// 42-Question static pool (7 subjects * 6 questions each: 2 Easy, 2 Medium, 2 Hard)
const QUESTION_POOL = [
  // 1. Data Structures
  {
    id: 'ds_e1',
    subject: 'Data Structures',
    topic: 'Arrays',
    difficulty: 'Easy',
    question: 'What is the time complexity of accessing an element in an array by its index?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
    correctAnswer: 'O(1)',
    explanation: 'Arrays store elements in contiguous memory locations, allowing direct calculation of the memory address using the base address and index, which takes constant time O(1).'
  },
  {
    id: 'ds_e2',
    subject: 'Data Structures',
    topic: 'Stacks',
    difficulty: 'Easy',
    question: 'Which data structure operates on a Last In First Out (LIFO) basis?',
    options: ['Queue', 'Stack', 'Tree', 'Linked List'],
    correctAnswer: 'Stack',
    explanation: 'A Stack is a linear data structure that follows the LIFO principle, where elements are inserted (pushed) and removed (popped) from the same end.'
  },
  {
    id: 'ds_m1',
    subject: 'Data Structures',
    topic: 'Binary Search Trees',
    difficulty: 'Medium',
    question: 'What is the worst-case time complexity of searching for an element in an unbalanced Binary Search Tree (BST)?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctAnswer: 'O(n)',
    explanation: 'In the worst case (a highly unbalanced or skewed tree), a BST degrades into a linked list, requiring a linear search of O(n) time complexity.'
  },
  {
    id: 'ds_m2',
    subject: 'Data Structures',
    topic: 'Sorting Algorithms',
    difficulty: 'Medium',
    question: 'Which sorting algorithm has a stable sorting behavior and a worst-case time complexity of O(n log n)?',
    options: ['Quick Sort', 'Merge Sort', 'Bubble Sort', 'Selection Sort'],
    correctAnswer: 'Merge Sort',
    explanation: 'Merge Sort uses a divide-and-conquer strategy, guaranteeing O(n log n) time complexity in all cases while preserving the relative order of equal elements (stable sorting).'
  },
  {
    id: 'ds_h1',
    subject: 'Data Structures',
    topic: 'Red-Black Trees',
    difficulty: 'Hard',
    question: 'What is the primary purpose of self-balancing rotations in a Red-Black Tree?',
    options: [
      'To keep the tree perfectly balanced like an AVL tree',
      'To ensure no path from root to leaf is more than twice as long as any other',
      'To reduce search time complexity to O(1) in the average case',
      'To sort elements automatically during insertion'
    ],
    correctAnswer: 'To ensure no path from root to leaf is more than twice as long as any other',
    explanation: 'Red-Black Trees relax the strict balancing conditions of AVL trees to speed up insertion/deletion. The red-black coloring rules guarantee that the longest path from root to leaf is at most twice the shortest path.'
  },
  {
    id: 'ds_h2',
    subject: 'Data Structures',
    topic: 'Binary Heaps',
    difficulty: 'Hard',
    question: 'In a binary heap of size n, what is the time complexity of the decrease-key operation followed by heapify?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctAnswer: 'O(log n)',
    explanation: 'Decreasing a key takes O(1) direct access (if index is known), but bubbling the element up to restore the heap property takes time proportional to the height of the heap, which is O(log n).'
  },

  // 2. DBMS
  {
    id: 'dbms_e1',
    subject: 'DBMS',
    topic: 'SQL Basics',
    difficulty: 'Easy',
    question: 'What does the acronym SQL stand for?',
    options: ['Simple Query Language', 'Structured Query Language', 'Standard Query Language', 'Sequential Query Language'],
    correctAnswer: 'Structured Query Language',
    explanation: 'SQL is Structured Query Language, the standard programming language used to manage relational databases and perform data operations.'
  },
  {
    id: 'dbms_e2',
    subject: 'DBMS',
    topic: 'SQL Commands',
    difficulty: 'Easy',
    question: 'Which DDL command is used to remove all records from a table without deleting the table structure?',
    options: ['DROP', 'DELETE', 'TRUNCATE', 'REMOVE'],
    correctAnswer: 'TRUNCATE',
    explanation: 'TRUNCATE is a Data Definition Language (DDL) command that removes all rows from a table quickly and releases storage space, preserving the database schema.'
  },
  {
    id: 'dbms_m1',
    subject: 'DBMS',
    topic: 'Normalization',
    difficulty: 'Medium',
    question: 'Which normal form requires that all non-key attributes are fully functionally dependent on the primary key, eliminating partial dependencies?',
    options: ['1NF', '2NF', '3NF', 'BCNF'],
    correctAnswer: '2NF',
    explanation: 'Second Normal Form (2NF) requires the table to be in 1NF and guarantees that there are no partial dependencies (every non-prime attribute must depend on the whole candidate key).'
  },
  {
    id: 'dbms_m2',
    subject: 'DBMS',
    topic: 'Constraints',
    difficulty: 'Medium',
    question: 'What is the primary purpose of a foreign key constraint in a relational database?',
    options: [
      'To uniquely identify each row in a table',
      'To enforce referential integrity between tables',
      'To speed up select queries through lookup indices',
      'To store data fetched from external APIs'
    ],
    correctAnswer: 'To enforce referential integrity between tables',
    explanation: 'A foreign key constraint maintains database consistency (referential integrity) by ensuring that the value in the column matches a value in the referenced table\'s primary key.'
  },
  {
    id: 'dbms_h1',
    subject: 'DBMS',
    topic: 'Transaction Properties',
    difficulty: 'Hard',
    question: 'Under the ACID properties, which property ensures that concurrent executions of transactions leave the database in the same state as serial executions?',
    options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
    correctAnswer: 'Isolation',
    explanation: 'Isolation ensures that concurrent execution of transactions leaves the database in the same state as if they were executed sequentially. This is typically managed using concurrency controls.'
  },
  {
    id: 'dbms_h2',
    subject: 'DBMS',
    topic: 'Database Indexing',
    difficulty: 'Hard',
    question: 'In database indexing, how does a B+ Tree differ from a standard B Tree?',
    options: [
      'B+ Trees only store data pointers in internal nodes',
      'B+ Trees store all actual data records or pointers in leaf nodes only, with leaves linked sequentially',
      'B+ Trees have a binary branching factor rather than multi-way',
      'B+ Trees do not support range queries or index lookups'
    ],
    correctAnswer: 'B+ Trees store all actual data records or pointers in leaf nodes only, with leaves linked sequentially',
    explanation: 'B+ Trees store data pointers only at the leaf level, and the leaf nodes are linked in a singly/doubly linked list, which makes sequential scans and range queries much faster than in a regular B-tree.'
  },

  // 3. Operating System
  {
    id: 'os_e1',
    subject: 'Operating System',
    topic: 'Kernel Functions',
    difficulty: 'Easy',
    question: 'What is the primary function of an operating system\'s kernel?',
    options: ['To render graphical user interfaces', 'To compile source code', 'To manage system resources and hardware communications', 'To detect computer viruses'],
    correctAnswer: 'To manage system resources and hardware communications',
    explanation: 'The kernel is the core component of an OS, responsible for managing system memory, CPU cycles, device drivers, and system calls.'
  },
  {
    id: 'os_e2',
    subject: 'Operating System',
    topic: 'Process States',
    difficulty: 'Easy',
    question: 'What state is a process in when it is loaded in memory and waiting to be assigned to a CPU processor?',
    options: ['Running', 'Ready', 'Blocked', 'Terminated'],
    correctAnswer: 'Ready',
    explanation: 'A process in the \'Ready\' state is loaded into main memory and is prepared to execute as soon as the CPU scheduler selects it.'
  },
  {
    id: 'os_m1',
    subject: 'Operating System',
    topic: 'CPU Scheduling',
    difficulty: 'Medium',
    question: 'Which CPU scheduling algorithm is non-preemptive and can lead to the \'convoy effect\'?',
    options: ['Round Robin', 'Shortest Job First', 'First-Come, First-Served (FCFS)', 'Priority Scheduling'],
    correctAnswer: 'First-Come, First-Served (FCFS)',
    explanation: 'FCFS scheduling runs processes in the order they arrive. If a long, CPU-bound process arrives first, it blocks all subsequent shorter processes (the convoy effect).'
  },
  {
    id: 'os_m2',
    subject: 'Operating System',
    topic: 'Virtual Memory',
    difficulty: 'Medium',
    question: 'What condition is occurring when a system spends more time page faulting and swapping pages in and out of virtual memory than executing actual instructions?',
    options: ['Deadlock', 'Thrashing', 'Fragmentation', 'Segmentation'],
    correctAnswer: 'Thrashing',
    explanation: 'Thrashing occurs when the active working set of processes exceeds physical memory, causing continuous page swapping and dropping CPU utilization to near zero.'
  },
  {
    id: 'os_h1',
    subject: 'Operating System',
    topic: 'Deadlocks',
    difficulty: 'Hard',
    question: 'In concurrent programming, which of the following is a necessary condition for a deadlock to occur?',
    options: ['Preemption of resources', 'Circular wait', 'Resource sharing', 'Single thread execution'],
    correctAnswer: 'Circular wait',
    explanation: 'The four Coffman conditions for deadlock are: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. All four must hold simultaneously for a deadlock to occur.'
  },
  {
    id: 'os_h2',
    subject: 'Operating System',
    topic: 'Kernel Architectures',
    difficulty: 'Hard',
    question: 'What is the main difference between a monolithic kernel and a microkernel architecture?',
    options: [
      'Microkernels run all system services in kernel mode',
      'Monolithic kernels move services like device drivers and filesystems to user space',
      'Microkernels implement minimal services in kernel space, running filesystems and drivers in user space',
      'Monolithic kernels do not support virtual memory'
    ],
    correctAnswer: 'Microkernels implement minimal services in kernel space, running filesystems and drivers in user space',
    explanation: 'Microkernels implement only essential services (IPC, basic memory, scheduling) in kernel mode, keeping other services in user space to improve stability and modularity.'
  },

  // 4. Mathematics
  {
    id: 'math_e1',
    subject: 'Mathematics',
    topic: 'Calculus',
    difficulty: 'Easy',
    question: 'What is the derivative of f(x) = 3x^2 + 5x with respect to x?',
    options: ['3x + 5', '6x + 5', '6x^2 + 5', '6x'],
    correctAnswer: '6x + 5',
    explanation: 'Applying the power rule: d/dx(x^n) = n*x^(n-1). Thus, d/dx(3x^2) = 6x, and d/dx(5x) = 5.'
  },
  {
    id: 'math_e2',
    subject: 'Mathematics',
    topic: 'Linear Algebra',
    difficulty: 'Easy',
    question: 'If a matrix has a determinant of 0, what does this indicate about the matrix?',
    options: ['It is an identity matrix', 'It is symmetric', 'It is singular (non-invertible)', 'It has only positive eigenvalues'],
    correctAnswer: 'It is singular (non-invertible)',
    explanation: 'A square matrix is invertible if and only if its determinant is non-zero. A determinant of 0 means the matrix is singular and does not have an inverse.'
  },
  {
    id: 'math_m1',
    subject: 'Mathematics',
    topic: 'Limits',
    difficulty: 'Medium',
    question: 'What is the limit of (sin x) / x as x approaches 0?',
    options: ['0', '1', 'Infinity', 'Undefined'],
    correctAnswer: '1',
    explanation: 'The fundamental trigonometric limit lim_{x->0} (sin x)/x equals 1, which can be proved geometrically or by applying L\'Hopital\'s rule.'
  },
  {
    id: 'math_m2',
    subject: 'Mathematics',
    topic: 'Probability',
    difficulty: 'Medium',
    question: 'In probability theory, if two events A and B are independent, what is the joint probability P(A and B) equal to?',
    options: ['P(A) + P(B)', 'P(A) * P(B)', 'P(A) - P(B)', 'P(A) / P(B)'],
    correctAnswer: 'P(A) * P(B)',
    explanation: 'By definition, two events A and B are independent if the occurrence of one does not affect the probability of the other, meaning their joint probability is the product of their individual probabilities.'
  },
  {
    id: 'math_h1',
    subject: 'Mathematics',
    topic: 'Linear Algebra',
    difficulty: 'Hard',
    question: 'What does the Rank-Nullity Theorem state for a linear transformation T represented by a matrix of size m x n?',
    options: [
      'Rank(T) + Nullity(T) = m',
      'Rank(T) - Nullity(T) = n',
      'Rank(T) + Nullity(T) = n',
      'Rank(T) * Nullity(T) = n'
    ],
    correctAnswer: 'Rank(T) + Nullity(T) = n',
    explanation: 'The Rank-Nullity Theorem states that the dimension of the image (Rank) plus the dimension of the kernel (Nullity) of a linear transformation is equal to the number of columns (n) of the matrix (dimension of the domain).'
  },
  {
    id: 'math_h2',
    subject: 'Mathematics',
    topic: 'Differential Equations',
    difficulty: 'Hard',
    question: 'What is the general solution to the first-order differential equation dy/dx = 3y?',
    options: ['y = C * e^(3x)', 'y = 3x + C', 'y = C * x^3', 'y = e^x + 3'],
    correctAnswer: 'y = C * e^(3x)',
    explanation: 'This is a separable differential equation: dy/y = 3 dx. Integrating both sides yields ln|y| = 3x + C\', which simplifies to y = C * e^(3x).'
  },

  // 5. Physics
  {
    id: 'phys_e1',
    subject: 'Physics',
    topic: 'Electricity',
    difficulty: 'Easy',
    question: 'What is the SI unit of electrical resistance?',
    options: ['Ampere', 'Volt', 'Ohm', 'Watt'],
    correctAnswer: 'Ohm',
    explanation: 'The Ohm (Ω) is the SI unit of electrical resistance, representing the resistance that allows 1 Ampere of current to flow under a potential difference of 1 Volt.'
  },
  {
    id: 'phys_e2',
    subject: 'Physics',
    topic: 'Mechanics',
    difficulty: 'Easy',
    question: 'According to Newton\'s Second Law of Motion, force is equal to mass multiplied by what quantity?',
    options: ['Velocity', 'Acceleration', 'Displacement', 'Momentum'],
    correctAnswer: 'Acceleration',
    explanation: 'Newton\'s second law is commonly written as F = m * a, where F is force, m is mass, and a is acceleration.'
  },
  {
    id: 'phys_m1',
    subject: 'Physics',
    topic: 'Optics',
    difficulty: 'Medium',
    question: 'What is the primary physical principle behind the operation of an optical fiber?',
    options: ['Total Internal Reflection', 'Polarization of Light', 'Double Refraction', 'Photoelectric Effect'],
    correctAnswer: 'Total Internal Reflection',
    explanation: 'Optical fibers guide light down their core by using the phenomenon of Total Internal Reflection, which occurs when light travels from a denser medium to a rarer medium at an angle greater than the critical angle.'
  },
  {
    id: 'phys_m2',
    subject: 'Physics',
    topic: 'Acoustics',
    difficulty: 'Medium',
    question: 'How does the speed of sound change when it travels from air into liquid water?',
    options: ['It decreases', 'It increases', 'It remains exactly the same', 'It drops to zero'],
    correctAnswer: 'It increases',
    explanation: 'Sound travels faster in liquids than in gases because liquids are much less compressible and have higher bulk modulus elasticity, allowing faster vibration propagation.'
  },
  {
    id: 'phys_h1',
    subject: 'Physics',
    topic: 'Thermodynamics',
    difficulty: 'Hard',
    question: 'In thermodynamics, what does the second law state regarding the entropy of an isolated system?',
    options: [
      'Entropy must always decrease over time',
      'Entropy remains constant in all real physical processes',
      'The total entropy of an isolated system can never decrease over time',
      'Entropy is equal to zero at absolute zero temperature'
    ],
    correctAnswer: 'The total entropy of an isolated system can never decrease over time',
    explanation: 'The Second Law of Thermodynamics states that the total entropy of an isolated system always increases in spontaneous processes, or remains constant in ideal reversible processes.'
  },
  {
    id: 'phys_h2',
    subject: 'Physics',
    topic: 'Quantum Mechanics',
    difficulty: 'Hard',
    question: 'What is the significance of the Heisenberg Uncertainty Principle in quantum mechanics?',
    options: [
      'It is impossible to measure the spin of an electron',
      'It is impossible to simultaneously measure the exact position and momentum of a particle with absolute precision',
      'Particles can act as waves but not both simultaneously',
      'Energy is always conserved in quantum states'
    ],
    correctAnswer: 'It is impossible to simultaneously measure the exact position and momentum of a particle with absolute precision',
    explanation: 'The Heisenberg Uncertainty Principle states that Δx * Δp >= ħ/2, meaning the product of the uncertainties of position (x) and momentum (p) has a fundamental physical limit.'
  },

  // 6. Chemistry
  {
    id: 'chem_e1',
    subject: 'Chemistry',
    topic: 'Basic Compounds',
    difficulty: 'Easy',
    question: 'What is the chemical formula for water?',
    options: ['CO2', 'H2O', 'NaCl', 'H2SO4'],
    correctAnswer: 'H2O',
    explanation: 'Water consists of two hydrogen atoms bonded to one oxygen atom, giving the formula H2O.'
  },
  {
    id: 'chem_e2',
    subject: 'Chemistry',
    topic: 'Acids and Bases',
    difficulty: 'Easy',
    question: 'What is the pH value of pure water at room temperature (25 degrees Celsius)?',
    options: ['1', '7', '14', '0'],
    correctAnswer: '7',
    explanation: 'A pH of 7 represents a neutral solution, which is the pH of pure water because the concentrations of H+ and OH- ions are equal.'
  },
  {
    id: 'chem_m1',
    subject: 'Chemistry',
    topic: 'Chemical Bonding',
    difficulty: 'Medium',
    question: 'Which type of chemical bond is formed when two atoms share a pair of electrons?',
    options: ['Ionic Bond', 'Covalent Bond', 'Metallic Bond', 'Hydrogen Bond'],
    correctAnswer: 'Covalent Bond',
    explanation: 'A covalent bond involves the sharing of electron pairs between atoms, typically non-metals, to achieve stable electron configurations.'
  },
  {
    id: 'chem_m2',
    subject: 'Chemistry',
    topic: 'Neutralization',
    difficulty: 'Medium',
    question: 'What are the main products of the reaction between an acid and a base (neutralization reaction)?',
    options: ['Oxygen and hydrogen gas', 'A salt and water', 'An alcohol', 'An ester'],
    correctAnswer: 'A salt and water',
    explanation: 'In a neutralization reaction, the H+ from the acid and the OH- from the base combine to form H2O, while the remaining ions form a salt.'
  },
  {
    id: 'chem_h1',
    subject: 'Chemistry',
    topic: 'Molecular Geometry',
    difficulty: 'Hard',
    question: 'What is the molecular geometry of a molecule with sp3d hybridization, such as Phosphorus Pentachloride (PCl5)?',
    options: ['Octahedral', 'Trigonal Bipyramidal', 'Tetrahedral', 'Square Planar'],
    correctAnswer: 'Trigonal Bipyramidal',
    explanation: 'sp3d hybridization involves 5 bonding domains, which arrange themselves in a trigonal bipyramidal geometry (three equatorial bonds at 120-degree angles and two axial bonds at 90-degree angles to the equator).'
  },
  {
    id: 'chem_h2',
    subject: 'Chemistry',
    topic: 'Chemical Equilibrium',
    difficulty: 'Hard',
    question: 'According to Le Chatelier\'s Principle, how will an increase in pressure affect the equilibrium of the gas-phase reaction: N2(g) + 3H2(g) <=> 2NH3(g)?',
    options: [
      'The equilibrium will shift to the left (reactants side)',
      'The equilibrium will shift to the right (products side) to decrease the total number of moles of gas',
      'The reaction will stop completely',
      'The equilibrium constant Kc will increase'
    ],
    correctAnswer: 'The equilibrium will shift to the right (products side) to decrease the total number of moles of gas',
    explanation: 'An increase in pressure causes the equilibrium to shift in the direction that decreases the total number of gas moles (from 4 moles of reactants to 2 moles of products), which is to the right.'
  },

  // 7. General Learning
  {
    id: 'gen_e1',
    subject: 'General Learning',
    topic: 'Study Skills',
    difficulty: 'Easy',
    question: 'Which of the following is the most effective study technique for long-term memory retention according to cognitive science?',
    options: ['Re-reading notes multiple times', 'Highlighting key textbook paragraphs', 'Active recall and spaced repetition', 'Cramming all material the night before the exam'],
    correctAnswer: 'Active recall and spaced repetition',
    explanation: 'Testing yourself (active recall) combined with reviewing concepts at increasing intervals (spaced repetition) strengthens neural pathways and enhances retrieval strength.'
  },
  {
    id: 'gen_e2',
    subject: 'General Learning',
    topic: 'Growth Mindset',
    difficulty: 'Easy',
    question: 'What does it mean to have a "growth mindset" as defined by psychologists?',
    options: [
      'Believing that your basic intelligence and talents are fixed traits',
      'Believing that abilities can be developed through dedication and hard work',
      'Believing that you are born with all the skills you will ever need',
      'Focusing only on high test scores rather than learning'
    ],
    correctAnswer: 'Believing that abilities can be developed through dedication and hard work',
    explanation: 'Coined by Carol Dweck, a growth mindset views challenges as opportunities to learn and recognizes that effort and strategies can improve intelligence and skills.'
  },
  {
    id: 'gen_m1',
    subject: 'General Learning',
    topic: 'Note-Taking',
    difficulty: 'Medium',
    question: 'In the Cornell Note-Taking System, what is the primary purpose of the wide left margin column?',
    options: [
      'To write verbatim transcripts of the lecture',
      'To draw diagrams and sketches',
      'To write keywords, cues, and questions for self-testing',
      'To write down the references and bibliography'
    ],
    correctAnswer: 'To write keywords, cues, and questions for self-testing',
    explanation: 'The left column in Cornell notes is for "cues" or questions that align with the notes on the right, which is used later to cover the notes and test yourself.'
  },
  {
    id: 'gen_m2',
    subject: 'General Learning',
    topic: 'Feynman Technique',
    difficulty: 'Medium',
    question: 'What is the primary benefit of explaining a concept to someone else in simple terms (the Feynman Technique)?',
    options: [
      'To save the teacher\'s time',
      'To identify gaps in your own understanding and simplify the explanation',
      'To memorize facts without understanding them',
      'To show off your knowledge to peers'
    ],
    correctAnswer: 'To identify gaps in your own understanding and simplify the explanation',
    explanation: 'The Feynman Technique involves explaining a topic in simple terms (as if to a child). Attempting to do this quickly reveals parts of the concept you don\'t fully understand.'
  },
  {
    id: 'gen_h1',
    subject: 'General Learning',
    topic: 'Spacing Effect',
    difficulty: 'Hard',
    question: 'When scheduling study sessions, which strategy is best supported by the cognitive "spacing effect"?',
    options: [
      'Continuous 6-hour blocks of studying a single subject',
      'Breaking study into short sessions spread over several days with breaks',
      'Switching topics every 5 minutes during a session',
      'Reviewing material only once immediately after the class'
    ],
    correctAnswer: 'Breaking study into short sessions spread over several days with breaks',
    explanation: 'The spacing effect shows that learning is more effective when study sessions are spaced out in time, allowing memory consolidation and reducing cognitive fatigue.'
  },
  {
    id: 'gen_h2',
    subject: 'General Learning',
    topic: 'Zeigarnik Effect',
    difficulty: 'Hard',
    question: 'How does the "Zeigarnik Effect" impact study productivity and memory?',
    options: [
      'It causes people to forget tasks once they are completed',
      'It states that interrupted or uncompleted tasks are remembered better than completed ones, creating mental tension to finish',
      'It shows that multitasking improves study speed by 40%',
      'It explains why students sleep better before exams'
    ],
    correctAnswer: 'It states that interrupted or uncompleted tasks are remembered better than completed ones, creating mental tension to finish',
    explanation: 'The Zeigarnik Effect is the tendency to experience intrusive thoughts about an objective that was left incomplete, which can be leveraged to start tasks early and reduce procrastination.'
  }
];

// Helper to dynamically generate fallback questions strictly for the selected subject
const generateDynamicFallbackQuestions = (sub) => {
  const formattedSub = sub.charAt(0).toUpperCase() + sub.slice(1);
  const predefinedPool = QUESTION_POOL.filter(q => q.subject.toLowerCase() === sub.toLowerCase());
  
  let pool = [];
  if (predefinedPool.length > 0) {
    pool = predefinedPool;
  } else {
    // Custom subject dynamic fallback generator
    const topics = [`Fundamentals of ${formattedSub}`, `${formattedSub} Core Concepts`, `${formattedSub} Applications`, `Advanced ${formattedSub}`];
    const questions = [];
    for (let i = 1; i <= 10; i++) {
      const difficulty = i <= 3 ? 'Easy' : (i <= 7 ? 'Medium' : 'Hard');
      const topic = topics[(i - 1) % topics.length];
      questions.push({
        id: `fallback_q_${sub}_${i}`,
        subject: sub,
        topic: topic,
        difficulty: difficulty,
        question: `Which of the following best describes the key principle of ${topic}?`,
        options: [
          `Primary concept description for ${topic}`,
          `Secondary concept description for ${topic}`,
          `Alternative concept description for ${topic}`,
          `Irrelevant description`
        ],
        correctAnswer: `Primary concept description for ${topic}`,
        explanation: `The primary concept description represents the core principle of ${topic} in the study of ${formattedSub}.`
      });
    }
    pool = questions;
  }

  return pool.map(q => {
    const hasSameSubject = q.subject && q.subject.toLowerCase() === sub.toLowerCase();
    return {
      ...q,
      subject: sub,
      topic: hasSameSubject ? (q.topic || `${sub} Basics`) : `${sub} Basics`
    };
  });
};

const normalizeQuestionIds = (questions) => {
  if (!Array.isArray(questions)) return [];
  const seenIds = new Set();
  return questions.map((q, index) => {
    let id = q.id;
    if (id === undefined || id === null || id === '' || seenIds.has(id)) {
      id = index + 1;
    }
    seenIds.add(id);
    return {
      ...q,
      id: id
    };
  });
};

const getValidTopicForSubject = (subject, currentTopic) => {
  const sub = subject.toLowerCase();

  if (sub.includes("biology")) {
    const topics = ["Cell Structure", "Genetics", "Photosynthesis", "Human Physiology", "Ecology"];
    const found = topics.find(t => currentTopic && currentTopic.toLowerCase().includes(t.toLowerCase()));
    return found || topics[Math.floor(Math.random() * topics.length)];
  }

  if (sub.includes("physics")) {
    const topics = ["Motion", "Optics", "Electricity", "Waves", "Thermodynamics"];
    const found = topics.find(t => currentTopic && currentTopic.toLowerCase().includes(t.toLowerCase()));
    return found || topics[Math.floor(Math.random() * topics.length)];
  }

  if (sub.includes("english")) {
    const topics = ["Grammar", "Vocabulary", "Reading Comprehension", "Writing Skills", "Tenses"];
    const found = topics.find(t => currentTopic && currentTopic.toLowerCase().includes(t.toLowerCase()));
    return found || topics[Math.floor(Math.random() * topics.length)];
  }

  if (sub.includes("music")) {
    const topics = ["Rhythm", "Melody", "Harmony", "Tempo", "Instruments"];
    const found = topics.find(t => currentTopic && currentTopic.toLowerCase().includes(t.toLowerCase()));
    return found || topics[Math.floor(Math.random() * topics.length)];
  }

  return currentTopic || `${subject} Basics`;
};

const isQuestionRelated = (q, subject) => {
  const sub = subject.toLowerCase();
  const text = ((q.question || "") + " " + (q.topic || "") + " " + (q.options || []).join(" ")).toLowerCase();

  if (sub.includes("biology")) {
    const bioKeywords = ["cell", "dna", "rna", "gene", "organelle", "photosynthesis", "atp", "ecology", "mitosis", "meiosis", "protein", "ribosome", "nucleus", "chloroplast", "membrane", "chromosome", "evolution", "species", "organism", "respiration", "enzyme", "genetics", "physiology", "bacteria", "virus", "digestive", "circulatory", "nervous", "respiratory", "immune", "ecosystem", "biology", "photosynthetic", "chlorophyll", "metabolism", "mitochondria", "organelle", "cytoplasm", "vacuole", "wall", "nucleus"];
    const bioUnrelated = ["sql", "pronoun", "verb", "grammar", "chord", "database", "snell", "table row", "table schema", "refraction", "reflection", "limit", "matrix", "derivative", "integral"];
    const hasUnrelated = bioUnrelated.some(w => text.includes(w));
    if (hasUnrelated) return false;
    return bioKeywords.some(w => text.includes(w)) || text.includes("biology");
  }

  if (sub.includes("physics")) {
    const physKeywords = ["motion", "optics", "electricity", "wave", "thermodynamics", "refraction", "reflection", "snell", "lens", "newton", "force", "gravity", "energy", "velocity", "acceleration", "entropy", "sound", "light", "photon", "quantum", "uncertainty", "momentum", "mass", "joule", "speed of light", "resistor", "ohm", "voltage", "current", "circuit", "physics"];
    const physUnrelated = ["sql", "pronoun", "verb", "grammar", "cell structure", "photosynthesis", "dna", "gene", "rna", "mitosis", "chord", "music", "melody", "database", "biology"];
    const hasUnrelated = physUnrelated.some(w => text.includes(w));
    if (hasUnrelated) return false;
    return physKeywords.some(w => text.includes(w)) || text.includes("physics");
  }

  if (sub.includes("english")) {
    const engKeywords = ["grammar", "vocabulary", "reading", "comprehension", "writing", "tense", "pronoun", "verb", "noun", "adjective", "adverb", "sentence", "preposition", "conjunction", "spelling", "word", "english", "synonym", "antonym", "adjective", "clause", "punctuation", "paragraph", "speech", "passage"];
    const engUnrelated = ["sql", "cell structure", "photosynthesis", "dna", "gene", "refraction", "snell", "force", "chord", "melody", "database", "matrix", "derivative", "integral", "resistor", "thermodynamics"];
    const hasUnrelated = engUnrelated.some(w => text.includes(w));
    if (hasUnrelated) return false;
    return engKeywords.some(w => text.includes(w)) || text.includes("english");
  }

  if (sub.includes("music")) {
    const musicKeywords = ["rhythm", "melody", "harmony", "tempo", "instrument", "chord", "pitch", "scale", "clef", "treble", "bass", "notes", "music", "triad", "composer", "beat", "piano", "guitar", "violin", "singer", "octave", "measure", "staff"];
    const musicUnrelated = ["sql", "cell structure", "photosynthesis", "dna", "gene", "refraction", "snell", "force", "pronoun", "verb", "noun", "database", "matrix", "derivative", "integral", "resistor"];
    const hasUnrelated = musicUnrelated.some(w => text.includes(w));
    if (hasUnrelated) return false;
    return musicKeywords.some(w => text.includes(w)) || text.includes("music");
  }

  if (sub.includes("data structures") || sub.includes("dbms") || sub.includes("operating system") || sub.includes("machine learning")) {
    return true;
  }

  const unrelatedWords = ["snell's law", "photosynthesis", "treble clef", "pronoun", "sql query"];
  return !unrelatedWords.some(w => text.includes(w));
};

const AssessmentPage = () => {
  const navigate = useNavigate();

  // 1. AI Simulation Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Questions are being generated based on your selected subjects and exam goal.");

  // 2. Load Student Goal Data
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

  // Selected subject for this assessment
  const selectedSubject = goalData.subjects[0] || 'General Learning';

  // 3. Question Sequence and Answers States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [difficultyHistory, setDifficultyHistory] = useState(['Medium']); // Records difficulty at each index
  const [errorMessage, setErrorMessage] = useState('');

  // Gemini API States
  const [usingFallback, setUsingFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState('');
  const [geminiPool, setGeminiPool] = useState([]);
  const [fallbackPool, setFallbackPool] = useState([]);

  const hasCalledApiRef = useRef(false);

  const loadAssessment = async (forceRegenerate = false) => {
    setIsLoading(true);
    setCurrentIndex(0);
    setUserAnswers({});
    setDifficultyHistory(['Medium']);
    setErrorMessage('');

    if (forceRegenerate) {
      localStorage.removeItem('neurolearn_generated_questions');
      localStorage.removeItem('neurolearn_assessment_result');
    }

    let cached = null;
    if (!forceRegenerate) {
      try {
        const saved = localStorage.getItem('neurolearn_generated_questions');
        if (saved) cached = JSON.parse(saved);
      } catch (e) {
        console.warn("[AssessmentPage] Error parsing cached questions", e);
      }
    }

    const currentSubjects = goalData.subjects || [];
    const isSameSubjects = cached && cached.subject === selectedSubject && cached.questions && cached.questions.length > 0;

    if (isSameSubjects) {
      console.log("[AssessmentPage] Loading questions from local cache for subject:", selectedSubject);
      setTimeout(() => {
        setUsingFallback(!!cached.usingFallback);
        setFallbackReason(cached.fallbackReason || '');
        if (cached.usingFallback) {
          const pool = generateDynamicFallbackQuestions(selectedSubject);
          const idNormalized = normalizeQuestionIds(pool);
          setFallbackPool(idNormalized);
          const q0 = idNormalized.find(q => q.difficulty === 'Medium') || idNormalized[0];
          setActiveQuestions([q0]);
        } else {
          const normalized = cached.questions.map(q => {
            const currentTopic = q.topic || "";
            const normalizedTopic = getValidTopicForSubject(selectedSubject, currentTopic);
            return {
              ...q,
              subject: selectedSubject,
              topic: normalizedTopic
            };
          });
          const idNormalized = normalizeQuestionIds(normalized);
          setGeminiPool(idNormalized);
          const q0 = idNormalized.find(q => q.difficulty === 'Medium') || idNormalized[0];
          setActiveQuestions([q0]);
        }
        setIsLoading(false);
      }, 2000);
      return;
    }

    let timerFinished = false;
    let apiFinished = false;
    let fetchedQuestions = null;
    let fetchError = null;

    setTimeout(() => {
      timerFinished = true;
      checkFinished();
    }, 2000);

    const checkFinished = () => {
      if (timerFinished && apiFinished) {
        if (fetchError || !fetchedQuestions) {
          setUsingFallback(true);
          setFallbackReason(fetchError ? fetchError.message : "Invalid questions format received");

          const pool = generateDynamicFallbackQuestions(selectedSubject);
          const idNormalized = normalizeQuestionIds(pool);
          setFallbackPool(idNormalized);
          const q0 = idNormalized.find(q => q.difficulty === 'Medium') || idNormalized[0];
          setActiveQuestions([q0]);

          const cacheData = {
            subject: selectedSubject,
            subjects: currentSubjects,
            questions: idNormalized,
            usingFallback: true,
            fallbackReason: fetchError ? fetchError.message : "Invalid questions format received"
          };
          localStorage.setItem('neurolearn_generated_questions', JSON.stringify(cacheData));
        } else {
          setUsingFallback(false);
          setFallbackReason('');

          // 1. Filter out unrelated questions
          let filtered = fetchedQuestions.filter(q => isQuestionRelated(q, selectedSubject));

          // 2. If we have fewer than 10 questions, fill with dynamic fallback questions
          if (filtered.length < 10) {
            console.log(`[AssessmentPage] Discarded ${10 - filtered.length} unrelated questions. Filling with fallback questions.`);
            const fallbackPoolForSub = generateDynamicFallbackQuestions(selectedSubject);
            let i = 0;
            while (filtered.length < 10 && i < fallbackPoolForSub.length) {
              const fbQ = fallbackPoolForSub[i];
              if (!filtered.some(vq => vq.question === fbQ.question)) {
                filtered.push(fbQ);
              }
              i++;
            }
          }

          // 3. Normalize subject and topic
          const normalized = filtered.map(q => {
            const currentTopic = q.topic || "";
            const normalizedTopic = getValidTopicForSubject(selectedSubject, currentTopic);
            return {
              ...q,
              subject: selectedSubject,
              topic: normalizedTopic
            };
          });

          const idNormalized = normalizeQuestionIds(normalized);

          setGeminiPool(idNormalized);
          const q0 = idNormalized.find(q => q.difficulty === 'Medium') || idNormalized[0];
          setActiveQuestions([q0]);

          const cacheData = {
            subject: selectedSubject,
            subjects: currentSubjects,
            questions: idNormalized,
            usingFallback: false,
            fallbackReason: ''
          };
          localStorage.setItem('neurolearn_generated_questions', JSON.stringify(cacheData));
        }
        setIsLoading(false);
      }
    };

    try {
      console.log("ASSESSMENT SUBJECT:", selectedSubject);
      console.log("[AssessmentPage] Initiating POST request to backend /api/generate-assessment...");
      const response = await fetch('/api/generate-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: selectedSubject,
          goal: goalData.examGoal,
          examDate: goalData.examDate,
          studyTime: goalData.studyTime
        })
      });

      if (!response.ok) {
        let errorMsg = `Server returned ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch (e) {
          // ignore
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      let questionsList = null;
      if (Array.isArray(data)) {
        questionsList = data;
      } else if (data && Array.isArray(data.questions)) {
        questionsList = data.questions;
      } else if (data && typeof data === 'object') {
        const arrays = Object.values(data).filter(val => Array.isArray(val));
        if (arrays.length > 0) {
          questionsList = arrays[0];
        }
      }

      if (!questionsList || !Array.isArray(questionsList) || questionsList.length === 0) {
        throw new Error("Invalid questions format received");
      }

      fetchedQuestions = questionsList.map((q, idx) => ({
        ...q,
        id: q.id || `gemini_q_${idx}`
      }));
    } catch (err) {
      console.error("[AssessmentPage] Gemini fetch failed, triggering fallback:", err);
      fetchError = err;
    } finally {
      apiFinished = true;
      checkFinished();
    }
  };

  useEffect(() => {
    if (hasCalledApiRef.current) return;
    hasCalledApiRef.current = true;
    loadAssessment(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegenerateAssessment = () => {
    loadAssessment(true);
  };

  const currentQuestion = activeQuestions[currentIndex];

  // Helper to pick the next question using dynamic adaptive selection
  const selectNextQuestion = (nextIndex, lastDifficulty, answeredCorrectly) => {
    // 1. Calculate target difficulty for the next question
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

    if (!usingFallback) {
      // Option A: Select from geminiPool
      let nextQ = geminiPool.find(
        q => q.difficulty === targetDifficulty && !usedIds.includes(q.id)
      );

      // Fallback: any unused question in geminiPool
      if (!nextQ) {
        nextQ = geminiPool.find(q => !usedIds.includes(q.id));
      }

      // Exhaustive fallback
      if (!nextQ) {
        nextQ = geminiPool[0];
      }

      return { nextQ, targetDifficulty };
    } else {
      // Option B: Fallback path (from subject-specific fallback pool)
      let nextQ = fallbackPool.find(
        q => q.difficulty === targetDifficulty && !usedIds.includes(q.id)
      );

      if (!nextQ) {
        nextQ = fallbackPool.find(q => !usedIds.includes(q.id));
      }

      if (!nextQ) {
        nextQ = fallbackPool[0];
      }

      return { nextQ, targetDifficulty };
    }
  };

  const handleOptionSelect = (option) => {
    if (!currentQuestion) return;
    setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: option }));
    setErrorMessage('');
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    
    // Check validation: must have selected an answer
    const selectedAns = userAnswers[currentQuestion.id];
    if (!selectedAns) {
      setErrorMessage('Please select an answer before continuing.');
      return;
    }

    const isCorrect = selectedAns === currentQuestion.correctAnswer;
    const nextIdx = currentIndex + 1;

    // Run adaptive picker to retrieve/validate the next question
    const lastDifficulty = currentQuestion.difficulty;
    const { nextQ, targetDifficulty } = selectNextQuestion(nextIdx, lastDifficulty, isCorrect);

    setActiveQuestions(prev => {
      const updated = [...prev];
      if (!updated[nextIdx] || updated[nextIdx].difficulty !== targetDifficulty) {
        updated[nextIdx] = nextQ;
        return updated.slice(0, nextIdx + 1);
      }
      return updated;
    });

    setDifficultyHistory(prev => {
      const updated = prev.slice(0, nextIdx);
      updated[nextIdx] = targetDifficulty;
      return updated;
    });

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
    if (!currentQuestion) return;

    // Validate final question
    const selectedAns = userAnswers[currentQuestion.id];
    if (!selectedAns) {
      setErrorMessage('Please select an answer before continuing.');
      return;
    }

    // Load selectedSubjects from goal data
    const goalDataSaved = JSON.parse(localStorage.getItem('neurolearn_goal_data') || '{}');
    const selectedSubjects = goalDataSaved.subjects || ['General Learning'];
    const primarySubject = selectedSubjects[0] || 'General Learning';

    // Map subjects for activeQuestions
    const generatedQuestions = activeQuestions.map(q => {
      return {
        ...q,
        subject: primarySubject
      };
    });

    // Calculate final scoring results
    let totalScore = 0;
    const totalQuestions = generatedQuestions.length;
    const mistakes = [];
    const correctQuestions = [];

    generatedQuestions.forEach(q => {
      const ans = userAnswers[q.id];
      const isCorrect = ans === q.correctAnswer;

      if (isCorrect) {
        totalScore += 1;
        correctQuestions.push(q);
      } else {
        mistakes.push({
          questionId: q.id,
          subject: q.subject,
          topic: q.topic,
          difficulty: q.difficulty,
          questionText: q.question,
          selectedAnswer: ans,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        });
      }
    });

    const percentage = Math.round((totalScore / totalQuestions) * 100);

    // Filter strong/weak lists
    const strongTopics = [...new Set(correctQuestions.map(q => q.topic))].filter(Boolean);
    let weakTopics = [...new Set(mistakes.map(m => m.topic))].filter(Boolean);

    if (weakTopics.length === 0) {
      const topicStats = {};
      generatedQuestions.forEach(q => {
        if (!topicStats[q.topic]) {
          topicStats[q.topic] = { correct: 0, total: 0 };
        }
        topicStats[q.topic].total += 1;
        const ans = userAnswers[q.id];
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
      if (lowestTopic) {
        weakTopics = [lowestTopic];
      }
    }
    if (weakTopics.length === 0) {
      weakTopics = [primarySubject + " Fundamentals"];
    }

    // Determine user knowledge level
    let currentLevel = 'Beginner';
    if (percentage >= 75) {
      currentLevel = 'Advanced';
    } else if (percentage >= 50) {
      currentLevel = 'Intermediate';
    }

    const completedAt = new Date().toISOString();

    // Assemble final payload matching STEP 2 spec
    const finalResult = {
      primarySubject,
      selectedSubjects,
      generatedQuestions,
      score: totalScore,
      percentage,
      strongTopics,
      weakTopics,
      mistakes,
      currentLevel,
      completedAt
    };

    // Save payload to localStorage under standard key
    try {
      localStorage.setItem('neurolearn_assessment_result', JSON.stringify(finalResult));
      console.log("Assessment result saved");
    } catch (e) {
      console.error("Error saving assessment result", e);
    }

    // Navigate to LearnerProfilePage
    navigate('/learner-profile');
  };

  const handleBack = () => {
    navigate('/goal-setup');
  };

  // Render Loading state
  if (isLoading) {
    return (
      <div className="assessment-wrapper">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner-outer"></div>
            <div className="spinner-inner"></div>
            <div className="spinner-glow"></div>
          </div>
          <h2 className="loading-title">AI is creating your personalized assessment...</h2>
          <p className="loading-phrase" key={loadingText}>{loadingText}</p>
        </div>
      </div>
    );
  }

  // Render question interface
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

        {/* Student Onboarding details branding */}
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
            {(goalData.subjects || []).map(sub => (
              <span className="subject-chip" key={sub}>{sub}</span>
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

        {/* Fallback warning message when API fails */}
        {usingFallback && (
          <div className="fallback-warning-banner" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>⚠️ AI generation failed. Using demo questions for now.</span>
            {fallbackReason && (
              <small style={{ display: 'block', opacity: 0.9, fontSize: '0.85em', marginTop: '4px' }}>
                Reason: {fallbackReason}
              </small>
            )}
          </div>
        )}

        {/* Progress bar (current number out of 10) */}
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${((currentIndex + 1) / 10) * 100}%` }}
          ></div>
        </div>

        {/* Question metadata row */}
        {currentQuestion && (
          <>
            <div className="meta-info">
              <span className="question-count">Question {currentIndex + 1} of 10</span>
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

        {/* Footer controls container */}
        <footer className="controls-container">
          {/* Previous button */}
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="btn-secondary"
          >
            ← Previous
          </button>

          {/* Next / Submit Assessment button */}
          {currentIndex === 9 ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary"
            >
              SUBMIT ASSESSMENT
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
