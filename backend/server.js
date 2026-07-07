import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from workspace root or backend folder
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    message: "Backend running",
    geminiKeyLoaded: !!process.env.GEMINI_API_KEY,
    model: GEMINI_MODEL
  });
});

async function callGeminiWithRetry(prompt, apiKey, requestType = "AI") {
  if (!apiKey) {
    console.log("Gemini API Key Missing");
    throw new Error("Gemini API Key Missing");
  }

  const delays = [2000, 4000, 6000];
  let attempt = 0;

  console.log(`--------------------------------
${requestType} Request Started
Model :
${GEMINI_MODEL}`);

  while (true) {
    try {
      attempt++;
      console.log(`Attempt ${attempt}`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      );

      if (response.status === 429 || response.status === 500 || response.status === 502 || response.status === 503) {
        throw { status: response.status, message: `HTTP ${response.status} Error` };
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        let parsedErr;
        try {
          parsedErr = JSON.parse(errText);
        } catch (e) {}

        const isModelUnsupported = response.status === 404 || 
          response.status === 400 || 
          (parsedErr && parsedErr.error && (
            parsedErr.error.message.includes('not found') || 
            parsedErr.error.message.includes('not supported') || 
            parsedErr.error.message.includes('unsupported')
          ));

        if (isModelUnsupported) {
          console.log("Invalid Gemini model");
          throw new Error("Invalid Gemini model");
        }

        throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
      }

      console.log(`Success\n--------------------------------`);
      return response;
    } catch (error) {
      const status = error.status;
      const isRetryable = status === 429 || status === 500 || status === 502 || status === 503;

      if (isRetryable) {
        if (status === 429) {
          console.log("Quota Exceeded");
        } else if (status === 503) {
          console.log("Gemini Server Busy\nRetrying...");
        }

        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt - 1]));
          continue;
        } else {
          console.log(`--------------------------------
Gemini unavailable
Retry failed
Switching to fallback
--------------------------------`);
        }
      }
      throw error;
    }
  }
}


function cleanGeminiJson(text) {
  if (!text) return "";

  return text
    .replace(/`json/g, "")
    .replace(/`/g, "")
    .replace(/[\u0000-\u001F]+/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .trim();
}

function extractJsonObject(text) {
  const cleaned = cleanGeminiJson(text);
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found");
  }

  return cleaned.substring(firstBrace, lastBrace + 1);
}

function extractJsonArrayOrObject(text) {
  const cleaned = cleanGeminiJson(text);
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  const hasObject = firstBrace !== -1 && lastBrace !== -1;
  const hasArray = firstBracket !== -1 && lastBracket !== -1;

  if (hasObject && hasArray) {
    if (firstBrace < firstBracket) {
      return cleaned.substring(firstBrace, lastBrace + 1);
    } else {
      return cleaned.substring(firstBracket, lastBracket + 1);
    }
  } else if (hasObject) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  } else if (hasArray) {
    return cleaned.substring(firstBracket, lastBracket + 1);
  }

  throw new Error("No JSON object or array found");
}

function parseAndNormalizeQuestions(textResponse, targetSubject, targetChapter) {
  const safeJsonText = extractJsonObject(textResponse);
  const parsedData = JSON.parse(safeJsonText);

  let questionsArray = [];
  if (Array.isArray(parsedData)) {
    questionsArray = parsedData;
  } else if (parsedData && Array.isArray(parsedData.questions)) {
    questionsArray = parsedData.questions;
  } else if (parsedData && parsedData.questions && typeof parsedData.questions === 'object') {
    questionsArray = Object.values(parsedData.questions);
  } else {
    const arrays = Object.values(parsedData).filter(val => Array.isArray(val));
    if (arrays.length > 0) {
      questionsArray = arrays[0];
    } else {
      throw new Error("No array of questions could be extracted from JSON structure");
    }
  }

  return questionsArray.map((q, index) => {
    const id = (q.id !== undefined && q.id !== null) ? q.id : (index + 1);
    const subject = q.subject || targetSubject;
    const topic = q.topic || q.roadmapTopic || `${targetSubject} Basics`;
    const difficulty = q.difficulty || "Medium";
    const questionText = q.question || "Question text missing";

    let options = Array.isArray(q.options) ? q.options.filter(Boolean) : [];
    if (options.length < 4) {
      options = [...options];
      const defaultOptions = ["Option A", "Option B", "Option C", "Option D"];
      while (options.length < 4) {
        options.push(defaultOptions[options.length]);
      }
    }

    let correctAnswer = q.correctAnswer || options[0];
    if (!options.includes(correctAnswer)) {
      correctAnswer = options[0];
    }

    const explanation = q.explanation || "No explanation provided.";

    return {
      id,
      subject,
      chapter: targetChapter || '',
      topic,
      difficulty,
      question: questionText,
      options,
      correctAnswer,
      explanation
    };
  });
}

function validateQuestions(questions, selectedSubject) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return false;
  }
  for (const q of questions) {
    if (!q.subject || !q.chapter || !q.question || !Array.isArray(q.options) || q.options.length !== 4 || !q.correctAnswer) {
      return false;
    }
    if (!q.options.includes(q.correctAnswer)) {
      return false;
    }
    if (q.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
      return false;
    }
    const genericPhrases = ["key principle", "primary concept", "core foundations", "advanced topic", "general learning"];
    const textToCheck = (q.question + " " + (q.explanation || "")).toLowerCase();
    if (genericPhrases.some(phrase => textToCheck.includes(phrase))) {
      return false;
    }
  }
  return true;
}

function generateDynamicFallbackQuestions(subject, chapter, questionCount) {
  const fallbacks = [
    {
      question: `Which of the following best describes a core concept of ${chapter} in ${subject}?`,
      options: [
        `An optimized approach to solve problems related to ${chapter}.`,
        `A theoretical model representing ${chapter} elements.`,
        `The default standard specification of ${subject}.`,
        `A storage mechanism used within ${subject} ecosystems.`
      ],
      correctAnswer: `An optimized approach to solve problems related to ${chapter}.`,
      explanation: `In ${subject}, ${chapter} is primarily focused on optimization and structured methodologies.`
    },
    {
      question: `What is the primary advantage of utilizing standard practices in ${chapter}?`,
      options: [
        `Significant reduction in computational overhead and complexity.`,
        `Elimination of all logical constraints in the system.`,
        `Automatic synchronization across all other modules of ${subject}.`,
        `Hardware level acceleration for the underlying processes.`
      ],
      correctAnswer: `Significant reduction in computational overhead and complexity.`,
      explanation: `Standard practices within ${chapter} ensure better scalability and computational efficiency.`
    },
    {
      question: `Which of the following is a common challenge encountered when implementing ${chapter}?`,
      options: [
        `Handling boundary conditions and scaling requirements.`,
        `Ensuring compatibility with unrelated subject modules.`,
        `Converting all data objects to binary format.`,
        `Reducing the user interface response delay.`
      ],
      correctAnswer: `Handling boundary conditions and scaling requirements.`,
      explanation: `Scaling and boundary condition management are typical issues addressed in ${chapter} workflows.`
    },
    {
      question: `In the context of ${subject}, how does ${chapter} interact with external entities?`,
      options: [
        `Through defined interfaces, protocols, or structured abstractions.`,
        `By completely halting execution of the main thread.`,
        `Using raw unstructured sockets without serialization.`,
        `By bypassing the security layer of the environment.`
      ],
      correctAnswer: `Through defined interfaces, protocols, or structured abstractions.`,
      explanation: `Abstractions and interfaces allow elements of ${chapter} to integrate safely and consistently.`
    },
    {
      question: `Which metric is most commonly analyzed to evaluate the effectiveness of a solution in ${chapter}?`,
      options: [
        `Performance efficiency and structural correctness.`,
        `The visual appearance of the output dashboard.`,
        `The size of the source code repository.`,
        `The compiler software version utilized.`
      ],
      correctAnswer: `Performance efficiency and structural correctness.`,
      explanation: `Solutions in ${chapter} are evaluated based on how efficiently they run and how correct they are.`
    },
    {
      question: `What is a fundamental prerequisite for understanding advanced aspects of ${chapter}?`,
      options: [
        `Familiarity with the foundational terms and relations of ${subject}.`,
        `Completing assessments in unrelated academic subjects.`,
        `Installing specialized third party database drivers.`,
        `Acquiring commercial enterprise cloud licenses.`
      ],
      correctAnswer: `Familiarity with the foundational terms and relations of ${subject}.`,
      explanation: `A strong grasp of the fundamentals of ${subject} is essential for learning ${chapter}.`
    },
    {
      question: `Which of the following statements is true regarding ${chapter} principles?`,
      options: [
        `They adapt dynamically to different contexts within ${subject}.`,
        `They are deprecated and no longer used in modern industries.`,
        `They apply only to small scale local setups.`,
        `They require manual override at every step of execution.`
      ],
      correctAnswer: `They adapt dynamically to different contexts within ${subject}.`,
      explanation: `Principles of ${chapter} are generic and adapt to diverse settings across ${subject}.`
    },
    {
      question: `How does optimization in ${chapter} affect overall system lifecycle?`,
      options: [
        `It improves maintenance costs and resource usage efficiency.`,
        `It guarantees that no updates will ever be needed in the future.`,
        `It limits the usage to single user local environments.`,
        `It requires translating the codebase to machine level assembly.`
      ],
      correctAnswer: `It improves maintenance costs and resource usage efficiency.`,
      explanation: `Optimizing ${chapter} workflows results in sustainable design and lower operational overhead.`
    },
    {
      question: `What role do constraints play during the analysis of ${chapter}?`,
      options: [
        `They define the boundary limits within which solutions remain valid.`,
        `They are completely ignored during standard design.`,
        `They restrict the implementation to a single operating system.`,
        `They automatically resolve logical conflicts during runtime.`
      ],
      correctAnswer: `They define the boundary limits within which solutions remain valid.`,
      explanation: `Identifying and adhering to constraints is key to producing a working solution in ${chapter}.`
    },
    {
      question: `Which approach is highly recommended when debugging issues in ${chapter}?`,
      options: [
        `Breaking the problem down into smaller, verifiable components.`,
        `Deleting the local database and starting from scratch.`,
        `Disabling all compiler warnings and error outputs.`,
        `Changing variable names to random alphanumeric characters.`
      ],
      correctAnswer: `Breaking the problem down into smaller, verifiable components.`,
      explanation: `Decomposition is the standard approach to isolate and resolve bugs in ${chapter}.`
    }
  ];

  return fallbacks.slice(0, questionCount).map((q, idx) => ({
    id: idx + 1,
    subject,
    chapter,
    topic: `${chapter} Core`,
    difficulty: idx < Math.round(questionCount * 0.3) ? "Easy" : (idx < Math.round(questionCount * 0.7) ? "Medium" : "Hard"),
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation
  }));
}

// Generate assessment questions from roadmap topics using Gemini
async function generateAssessmentForSubject(apiKey, subjectData, studentType, classOrSemester, examGoal, learningMode, generationSeed, questionCount = 10) {
  const { subject, chapter, roadmapTopics } = subjectData;

  const hasRoadmap = Array.isArray(roadmapTopics) && roadmapTopics.length > 0;
  const topicListStr = hasRoadmap ? roadmapTopics.map((t, i) => `${i + 1}. ${t}`).join('\n') : '';

  console.log(`[Assessment] Generating for: ${subject} → ${chapter}`);
  console.log(`[Assessment] Roadmap topics (${roadmapTopics ? roadmapTopics.length : 0}): ${hasRoadmap ? roadmapTopics.join(', ') : 'none'}`);

  // Map Academic Level to Class (School Student) or Semester (College Student)
  let academicLevelStr;
  if (studentType === 'School Student') {
    academicLevelStr = `Class ${classOrSemester || ''}`;
  } else if (studentType === 'College Student') {
    academicLevelStr = `Semester ${classOrSemester || ''}`;
  } else {
    academicLevelStr = classOrSemester || 'Not specified';
  }

  // Calculate difficulty progression counts
  const easyCount = Math.max(1, Math.round(questionCount * 0.3));
  const hardCount = Math.max(1, Math.round(questionCount * 0.3));
  const mediumCount = Math.max(1, questionCount - easyCount - hardCount);

  const roadmapSection = hasRoadmap
    ? `The following are the EXACT roadmap topics for this chapter (in teaching order):
${topicListStr}

Generate exactly ${questionCount} diagnostic MCQ questions ONLY from the above roadmap topics.
Each question must map to one of these topics.`
    : `Generate exactly ${questionCount} diagnostic MCQ questions ONLY for the selected subject and chapter.
Since roadmap topics are not provided, you MUST infer real subtopics from the selected chapter ("${chapter}").
Do not generate questions from other chapters of ${subject}.`;

  const prompt = `You are an expert teacher creating a diagnostic assessment.

Student Profile:
- Student Type: ${studentType || 'General'}
- Academic Level: ${academicLevelStr}
- Exam Goal: ${examGoal || 'General Study'}
- Learning Mode: ${learningMode || 'Focus Mode'}

Subject: ${subject}
Chapter: ${chapter}

${roadmapSection}

CRITICAL RULES:
- Generate questions ONLY for the selected subject and selected chapter.
- If roadmap topics are provided, use only those topics.
- If roadmap topics are not provided, infer real subtopics from the selected chapter.
- Do NOT generate questions from outside the selected chapter/topics.
- Do NOT generate generic questions.
- Do NOT generate filler questions.
- Do NOT generate questions from the complete syllabus or unrelated chapters of ${subject}.
- Do NOT use phrases like "key principle", "primary concept", "core foundations", "advanced topic", or "general learning".
- Questions should test real understanding of the selected chapter/topic.
- Every question must clearly map to the selected chapter.
- Difficulty progression: first ${easyCount} questions Easy, next ${mediumCount} questions Medium, last ${hardCount} questions Hard.
- Generate a diverse mix of question types: Conceptual, Logical, Application, Real Life, and Reasoning questions.
- Each question must have exactly 4 options with one correct answer.
- Personalize the depth and difficulty of every question strictly based on the student's profile:
  - For example, a "School Student" in "Class 9" studying "Biology" must NOT receive advanced "NEET level" or college-level questions.
  - A "College Student" in "Semester 2" studying "Data Structures & Algorithms" must NOT receive ultra-advanced "Google Interview" or senior-level system design questions.
  - Tailor the questions to be age-appropriate and curriculum-aligned for a ${studentType || 'General'} student at the ${academicLevelStr} level.
- Every generation must be unique. Never reuse wording. Never repeat questions or wording from previous assessments. Use the following random generation seed to ensure the questions, wording, and options are completely unique and fresh: ${generationSeed}.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": 1,
      "subject": "${subject}",
      "chapter": "${chapter}",
      "topic": "real topic name (if roadmap is provided, must be the exact roadmap topic name; if not, a real subtopic you inferred)",
      "difficulty": "Easy",
      "question": "Clear, specific question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The correct option text exactly matching one of the options",
      "explanation": "Concise explanation of why this is the correct answer"
    }
  ]
}`;

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`[Assessment] Gemini call attempt ${attempts} of ${maxAttempts} for ${subject}`);

      const response = await callGeminiWithRetry(prompt, apiKey);

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new Error('Gemini returned empty content');
      }

      return parseAndNormalizeQuestions(textResponse, subject, chapter);

    } catch (error) {
      console.error(`[Assessment] Gemini call attempt ${attempts} failed:`, error.message);
      if (attempts >= maxAttempts) {
        throw error;
      }
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

app.post('/api/generate-assessment', async (req, res) => {
  const {
    studentType,
    classOrSemester,
    examGoal,
    learningMode,
    subjectAssessments,
    generationSeed,
    questionCount,
    // Legacy fields for backward compatibility
    subject,
    // eslint-disable-next-line no-unused-vars
    goal,
    // eslint-disable-next-line no-unused-vars
    examDate,
    // eslint-disable-next-line no-unused-vars
    studyTime
  } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;

  // New roadmap-based assessment flow
  if (subjectAssessments && Array.isArray(subjectAssessments) && subjectAssessments.length > 0) {
    console.log(`[Assessment] Roadmap-based assessment request for ${subjectAssessments.length} subject(s)`);
    console.log(`[Assessment] Mode: ${learningMode || 'Focus Mode'}`);

    const seed = generationSeed || Date.now();
    const assessments = [];

    let targets = subjectAssessments;
    if (learningMode === 'Focus Mode' && targets.length > 1) {
      targets = [targets[0]];
    } else if (learningMode === 'Balanced Mode' && targets.length > 2) {
      targets = targets.slice(0, 2);
    }

    for (let i = 0; i < targets.length; i++) {
      const sa = targets[i];
      const subjectName = sa.subject || 'General Learning';
      const chapterName = sa.chapter || 'Topic';
      const topics = Array.isArray(sa.roadmapTopics) ? sa.roadmapTopics : [];

      try {
        if (!apiKey) {
          throw new Error("Gemini API key missing");
        }

        console.log(`[Assessment] Generating questions for Subject ${i + 1}: ${subjectName} → ${chapterName}`);
        let questions = await generateAssessmentForSubject(
          apiKey,
          { subject: subjectName, chapter: chapterName, roadmapTopics: topics },
          studentType,
          classOrSemester,
          examGoal,
          learningMode,
          `${seed}_${i}`,
          parseInt(questionCount, 10) || 10
        );

        // Validate questions
        let isValid = validateQuestions(questions, subjectName);
        if (!isValid) {
          console.warn(`[Assessment] Validation failed for Subject ${subjectName}. Retrying Gemini once...`);
          try {
            questions = await generateAssessmentForSubject(
              apiKey,
              { subject: subjectName, chapter: chapterName, roadmapTopics: topics },
              studentType,
              classOrSemester,
              examGoal,
              learningMode,
              `${seed}_${i}_retry`,
              parseInt(questionCount, 10) || 10
            );
            isValid = validateQuestions(questions, subjectName);
          } catch (retryErr) {
            console.error(`[Assessment] Retry Gemini failed:`, retryErr.message);
            isValid = false;
          }
        }

        if (!isValid) {
          console.error(`[Assessment] Questions invalid after retry. Using fallback.`);
          throw new Error("Validation failed");
        }

        console.log(`[Assessment] ✅ Generated ${questions.length} questions for ${subjectName}`);
        assessments.push({
          subject: subjectName,
          chapter: chapterName,
          roadmapTopics: topics,
          questions: questions,
          fallback: false
        });
      } catch (error) {
        const reason = error.message || String(error);
        console.error(`[Assessment] ❌ Failed for ${subjectName}:`, reason);
        console.log("ASSESSMENT FALLBACK REASON:", reason);
        console.log(`[Assessment] ⚠️ Activating dynamic fallback for ${subjectName} → ${chapterName}`);
        const fallbackQuestions = generateDynamicFallbackQuestions(subjectName, chapterName, parseInt(questionCount, 10) || 10);
        assessments.push({
          subject: subjectName,
          chapter: chapterName,
          roadmapTopics: topics,
          questions: fallbackQuestions,
          fallback: true
        });
      }
    }

    const hasAnyFallback = assessments.some(a => a.fallback);
    return res.json({
      source: hasAnyFallback ? "fallback" : "gemini",
      fallback: hasAnyFallback,
      message: hasAnyFallback ? "Fallback-based assessment generated" : "Roadmap-based assessment generated",
      learningMode: learningMode || 'Focus Mode',
      assessments
    });
  }

  // Legacy fallback: old-style assessment request (just subject/goal)
  console.log(`[Assessment] Legacy assessment request for subject: ${subject || 'unknown'}`);
  return res.status(400).json({ error: "Missing subjectAssessments data. Please provide roadmap-based assessment request." });
});

app.post('/api/generate-notes', async (req, res) => {
  const { topic, subject } = req.body;
  console.log(`[Backend] Generating study notes for topic: ${topic} under subject: ${subject}`);
  console.log(`[Backend] Using Gemini model: ${GEMINI_MODEL}`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Backend] Error: GEMINI_API_KEY environment variable is not defined.");
    return res.status(500).json({ error: "Gemini API key missing." });
  }

  const prompt = `You are an AI tutor creating personalized study notes.
Create comprehensive study notes for the topic: "${topic}" under the subject: "${subject}".

Generate notes in this JSON format only:
{
  "definition": "A clear, beginner-friendly definition of the topic",
  "keyConcepts": [
    "Core concept explanation 1",
    "Core concept explanation 2",
    "Core concept explanation 3"
  ],
  "examples": [
    "Practical example 1",
    "Practical example 2"
  ],
  "applications": [
    "Real-world application 1",
    "Real-world application 2"
  ],
  "summary": "Short summary wrapping up the key ideas of the topic"
}

Rules:
- Return only valid JSON.
- No markdown.
- No extra explanation outside JSON.`;

  try {
    const response = await callGeminiWithRetry(prompt, apiKey);

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return res.status(500).json({ error: "Gemini API returned empty content." });
    }

    const notes = JSON.parse(textResponse);
    res.json(notes);
  } catch (error) {
    console.error("[Backend] Exception occurred during notes generation:", error);
    res.status(500).json({ error: error.message || "Failed to generate notes" });
  }
});

app.post('/api/generate-video-script', async (req, res) => {
  const { topic, subject } = req.body;
  console.log(`[Backend] Generating video script for topic: ${topic} under subject: ${subject}`);
  console.log(`[Backend] Using Gemini model: ${GEMINI_MODEL}`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Backend] Error: GEMINI_API_KEY environment variable is not defined.");
    return res.status(500).json({ error: "Gemini API key missing." });
  }

  const prompt = `You are creating a personalized voiceover lesson video script explaining the topic: "${topic}" under the subject: "${subject}".
Generate exactly 5 scenes in sequence. The 5 scenes MUST be:
1. Introduction
2. Concept Explanation
3. Example
4. Real World Application
5. Recap

Generate the script in this JSON format only:
[
  {
    "title": "Scene Title",
    "keyPoint": "Main concept takeaway for this scene",
    "example": "Illustrative example for this scene",
    "voiceover": "Voiceover narration script explaining the concept in a friendly, conversational way directly to the student.",
    "visual": "One of these exact strings representing the scene visual: intro, concept, example, application, recap"
  }
]

Rules:
- Return exactly 5 scenes in an array.
- Return only valid JSON.
- Keep the voiceover clear and engaging.`;

  try {
    const response = await callGeminiWithRetry(prompt, apiKey);

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return res.status(500).json({ error: "Gemini API returned empty content." });
    }

    const script = JSON.parse(textResponse);
    res.json(script);
  } catch (error) {
    console.error("[Backend] Exception occurred during script generation:", error);
    res.status(500).json({ error: error.message || "Failed to generate video script" });
  }
});

app.post('/api/chat', async (req, res) => {
  const { topic, message, chatHistory } = req.body;
  console.log(`[Backend] AI Tutor chat request for topic: ${topic}`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API key missing." });
  }

  const chatHistoryStr = Array.isArray(chatHistory)
    ? chatHistory.map(m => `${m.sender === 'user' ? 'Student' : 'Tutor'}: ${m.text}`).join('\n')
    : '';

  const prompt = `You are a supportive, knowledgeable personal AI Tutor.
The student is learning the topic: "${topic}".
Answer the student's question in a clear, friendly, and pedagogical way.

${chatHistoryStr ? `Conversation history:\n${chatHistoryStr}\n` : ''}
Student question: ${message}

Return JSON only in the following format:
{
  "answer": "Main conversational tutor answer explaining the concept",
  "example": "A simple example to illustrate the concept",
  "followUpQuestion": "A short question to check the student's understanding and prompt response"
}`;

  try {
    const response = await callGeminiWithRetry(prompt, apiKey);

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return res.status(500).json({ error: "Empty content from Gemini" });
    }

    const chatResponse = JSON.parse(textResponse);
    res.json(chatResponse);
  } catch (error) {
    console.error("[Backend] Chat generation error:", error);
    res.status(500).json({ error: "Failed to generate tutor response" });
  }
});

app.post('/api/generate-quiz', async (req, res) => {
  const { topic, subject, weakTopic, score } = req.body;
  console.log(`[Backend] Generating adaptive quiz for topic: ${topic} under subject: ${subject}`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API key missing." });
  }

  const prompt = `Generate exactly 5 MCQ questions strictly on the topic: "${topic}" under the subject: "${subject}".
Adjust difficulty based on previous performance. (Weak Topic context: ${weakTopic ? 'Yes' : 'No'}, previous score: ${score || 'unknown'}).
Ensure questions are beginner-friendly but test key concepts.
Return JSON only in the following format:
[
  {
    "id": "quiz_q_1",
    "subject": "${subject}",
    "topic": "${topic}",
    "difficulty": "Medium",
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Correct option text",
    "explanation": "Short explanation of why this answer is correct"
  }
]`;

  try {
    const response = await callGeminiWithRetry(prompt, apiKey);

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return res.status(500).json({ error: "Empty content" });
    }

    const quizQuestions = JSON.parse(textResponse);
    res.json(quizQuestions);
  } catch (error) {
    console.error("[Backend] Quiz generation error:", error);
    res.status(500).json({ error: "Failed to generate quiz questions" });
  }
});

// Maintain old route for compatibility
app.post('/api/ai-tutor', async (req, res) => {
  res.redirect(307, '/api/chat');
});

app.post('/api/generate-study-plan', async (req, res) => {
  const { subject, weakTopics, goal } = req.body;
  console.log(`[Backend] Generating Gemini study plan for subject: ${subject}`);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API key missing." });
  }

  const prompt = `Generate a personalized study schedule of tasks for the subject "${subject}".
The student has weak areas in: ${Array.isArray(weakTopics) ? weakTopics.join(', ') : weakTopics}.
Generate a list of tasks. Rotate through task types: "Personalized Video", "AI Notes", "Adaptive Quiz".
For each weak topic, generate a task. For example:
Topic 1 -> "Personalized Video"
Topic 2 -> "AI Notes"
Topic 3 -> "Adaptive Quiz"

Return JSON only in the following format:
[
  {
    "time": "9:00 AM",
    "taskType": "Personalized Video",
    "topic": "Topic Name",
    "reason": "Clear explanation of why this task was generated based on the student's weak areas"
  }
]`;

  try {
    const response = await callGeminiWithRetry(prompt, apiKey);

    const data = await response.json();
    console.log("GEMINI RAW RESPONSE:", JSON.stringify(data, null, 2));
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return res.status(500).json({ error: "Empty content" });
    }

    const tasks = JSON.parse(textResponse);
    res.json(tasks);
  } catch (error) {
      console.error("[Backend] Study plan generation error:", error);
    res.status(500).json({ error: "Failed to generate study plan" });
  }
});

// =====================================================
// ROADMAP GENERATION SYSTEM
// =====================================================

const GENERIC_BLACKLIST = [
  'introduction to', 'introduction', 'basics of', 'basics',
  'fundamentals of', 'fundamentals', 'core concepts', 'core foundations',
  'core', 'foundations', 'practical application', 'practical applications',
  'advanced concepts', 'advanced topics', 'overview of', 'overview',
  'general concepts', 'general', 'key concepts', 'key topics',
  'topic overview', 'topic basics', 'getting started',
  'deep dive', 'exploring', 'understanding', 'mastering'
];

function isRoadmapGeneric(topics, chapter) {
  if (!Array.isArray(topics) || topics.length < 8) {
    console.warn(`[Roadmap Validation] REJECTED: Only ${topics ? topics.length : 0} topics (need 8+)`);
    return true;
  }

  let genericCount = 0;
  let repeatChapterCount = 0;
  const lowerChapter = (chapter || '').toLowerCase().trim();

  for (const t of topics) {
    const title = (t.title || '').toLowerCase().trim();
    if (!title) {
      console.warn('[Roadmap Validation] REJECTED: Empty topic title found');
      return true;
    }

    // Check against blacklist
    if (GENERIC_BLACKLIST.some(phrase => title.includes(phrase))) {
      genericCount++;
    }

    // Check chapter name repetition
    if (lowerChapter.length > 3 && title.includes(lowerChapter)) {
      repeatChapterCount++;
    }
  }

  if (repeatChapterCount > 2) {
    console.warn(`[Roadmap Validation] REJECTED: ${repeatChapterCount} topics repeat chapter name "${chapter}"`);
    return true;
  }

  const genericRatio = genericCount / topics.length;
  if (genericRatio > 0.2) {
    console.warn(`[Roadmap Validation] REJECTED: ${(genericRatio * 100).toFixed(0)}% generic (${genericCount}/${topics.length})`);
    return true;
  }

  console.log(`[Roadmap Validation] PASSED: ${topics.length} topics, ${genericCount} generic, ${repeatChapterCount} chapter repeats`);
  return false;
}

function buildRoadmapPrompt(subject, chapter, studentType, classOrSemester, examGoal, studyTime) {
  return `You are an experienced curriculum designer and textbook author.

Your task: Reconstruct the actual syllabus structure for the chapter "${chapter}" in the subject "${subject}".

Think like a professor preparing a lecture sequence or a textbook author writing the Table of Contents for this specific chapter.

Student Profile:
- Student Type: ${studentType || 'General'}
- Academic Level: ${classOrSemester || 'Not specified'}
- Exam Goal: ${examGoal || 'General Study'}
- Daily Study Time: ${studyTime || 'Not specified'}

CRITICAL INSTRUCTIONS:
1. The chapter "${chapter}" is the ROOT. Every topic must be a real subtopic INSIDE this chapter.
2. Generate 8 to 12 topics that represent actual teachable concepts, theorems, processes, methods, formulas, or mechanisms.
3. Follow the natural teaching order: prerequisites → core concepts → detailed subtopics → applications → practice.
4. The last 1-2 nodes can be "Practice Problems" or "Revision" but everything before must be a real concept.
5. Personalize depth based on academic level (${classOrSemester || 'General'}).

FORBIDDEN - Do NOT use these patterns:
- "Introduction to [anything]"
- "Basics of [anything]"
- "Core Foundations"
- "Practical Application"
- "Advanced Concepts"
- "Overview"
- "General Concepts"
- "Fundamentals"
- "Key Concepts"
- "Getting Started"
- Any generic educational phase name

EXAMPLE of CORRECT output for "Time Complexity" in DSA:
- Asymptotic Analysis, Big O Notation, Big Omega Notation, Big Theta Notation, Best/Average/Worst Case, Loop Complexity, Nested Loop Complexity, Recursive Complexity, Amortized Analysis, Practice Problems

EXAMPLE of CORRECT output for "Reproduction in Animals" in Science:
- Modes of Reproduction, Asexual Reproduction, Sexual Reproduction, Male Reproductive System, Female Reproductive System, Fertilization, Embryonic Development, Viviparous and Oviparous Animals, Metamorphosis, Revision

Return ONLY valid JSON:
{
  "subject": "${subject}",
  "chapter": "${chapter}",
  "studentLevel": "${classOrSemester || 'Not specified'}",
  "estimatedHours": 6,
  "topics": [
    {
      "id": 1,
      "title": "Actual concept name",
      "difficulty": "Easy|Medium|Hard",
      "estimatedMinutes": 25,
      "learningObjective": "What student will learn",
      "prerequisite": null,
      "expectedOutcome": "What student can do after"
    }
  ]
}`;
}

function buildRetryPrompt(subject, chapter, classOrSemester) {
  return `The previous response was REJECTED because it contained generic educational phases instead of real curriculum subtopics.

You MUST generate the actual textbook Table of Contents for chapter "${chapter}" in subject "${subject}" for ${classOrSemester || 'General Level'}.

Think like a professor writing lecture titles. Think like a textbook author listing section headings.

EVERY topic title must be a real, concrete concept that a teacher would write on the board.

Do NOT use: Introduction, Basics, Foundations, Core, Overview, Practical Application, Advanced Concepts, General, Key Concepts.

Return 8-12 topics as valid JSON with the same format as before.`;
}

async function generateDynamicAIFallback(subject, chapter, classOrSemester, apiKey) {
  console.log(`[Roadmap Fallback] Generating dynamic AI fallback for: ${subject} → ${chapter}`);

  const fallbackPrompt = `You are a textbook author. List the actual subtopics taught inside the chapter "${chapter}" in subject "${subject}" for ${classOrSemester || 'General Level'}.

Return ONLY the subtopic names as a JSON array of strings. No generic phases. Only real concepts.

Example for "Quadratic Equations" in Mathematics:
["Standard Form", "Roots of Quadratic Equation", "Factorization Method", "Completing the Square", "Quadratic Formula", "Discriminant", "Nature of Roots", "Sum and Product of Roots", "Word Problems", "Practice Problems"]

Now generate for "${chapter}" in "${subject}":`;

  try {
    const response = await callGeminiWithRetry(fallbackPrompt, apiKey);

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error('Empty fallback response');

    const safeJson = extractJsonArrayOrObject(textResponse);
    const parsed = JSON.parse(safeJson);
    const subtopicNames = Array.isArray(parsed) ? parsed : (parsed.topics || parsed.subtopics || []);

    if (subtopicNames.length < 4) throw new Error(`Only ${subtopicNames.length} subtopics returned`);

    const topics = subtopicNames.map((item, idx) => {
      const name = typeof item === 'string' ? item : (item.title || item.name || `Topic ${idx + 1}`);
      const total = subtopicNames.length;
      const difficulty = idx < total * 0.3 ? 'Easy' : (idx < total * 0.7 ? 'Medium' : (idx >= total - 2 ? 'Easy' : 'Hard'));
      const prevName = idx > 0 ? (typeof subtopicNames[idx - 1] === 'string' ? subtopicNames[idx - 1] : subtopicNames[idx - 1].title) : null;
      return {
        id: idx + 1,
        title: name,
        difficulty,
        estimatedMinutes: difficulty === 'Hard' ? 40 : (difficulty === 'Medium' ? 30 : 20),
        learningObjective: `Understand and apply ${name}.`,
        prerequisite: prevName,
        expectedOutcome: `Can explain and solve problems on ${name}.`
      };
    });

    console.log(`[Roadmap Fallback] Dynamic fallback generated ${topics.length} topics successfully.`);
    return { subject, chapter, estimatedHours: Math.ceil(topics.reduce((a, t) => a + t.estimatedMinutes, 0) / 60), topics };
  } catch (error) {
    console.error('[Roadmap Fallback] Dynamic AI fallback failed:', error.message);
    // Last resort: minimal static placeholder (not generic)
    return {
      subject, chapter, estimatedHours: 3,
      topics: [
        { id: 1, title: `${chapter} – Definitions and Terminology`, difficulty: 'Easy', estimatedMinutes: 25, learningObjective: `Learn key terms of ${chapter}.`, prerequisite: null, expectedOutcome: 'Can define key terms.' },
        { id: 2, title: `${chapter} – Mechanisms and Processes`, difficulty: 'Medium', estimatedMinutes: 35, learningObjective: `Understand how ${chapter} works.`, prerequisite: `${chapter} – Definitions and Terminology`, expectedOutcome: 'Can trace processes step by step.' },
        { id: 3, title: `${chapter} – Types and Classification`, difficulty: 'Medium', estimatedMinutes: 30, learningObjective: `Classify components of ${chapter}.`, prerequisite: `${chapter} – Mechanisms and Processes`, expectedOutcome: 'Can categorize and compare.' },
        { id: 4, title: `${chapter} – Formulas and Methods`, difficulty: 'Hard', estimatedMinutes: 40, learningObjective: `Apply formulas related to ${chapter}.`, prerequisite: `${chapter} – Types and Classification`, expectedOutcome: 'Can solve numerical problems.' },
        { id: 5, title: `${chapter} – Real-World Examples`, difficulty: 'Medium', estimatedMinutes: 25, learningObjective: `Connect ${chapter} to real scenarios.`, prerequisite: `${chapter} – Formulas and Methods`, expectedOutcome: 'Can give real examples.' },
        { id: 6, title: `${chapter} – Diagrams and Illustrations`, difficulty: 'Easy', estimatedMinutes: 20, learningObjective: `Draw and label diagrams for ${chapter}.`, prerequisite: `${chapter} – Real-World Examples`, expectedOutcome: 'Can reproduce diagrams.' },
        { id: 7, title: `${chapter} – Common Mistakes`, difficulty: 'Medium', estimatedMinutes: 20, learningObjective: `Identify pitfalls in ${chapter}.`, prerequisite: `${chapter} – Diagrams and Illustrations`, expectedOutcome: 'Can avoid common errors.' },
        { id: 8, title: `Practice Problems and Revision`, difficulty: 'Easy', estimatedMinutes: 30, learningObjective: `Solve practice questions on ${chapter}.`, prerequisite: `${chapter} – Common Mistakes`, expectedOutcome: 'Ready for assessment.' }
      ]
    };
  }
}

app.post('/api/generate-roadmap', async (req, res) => {
  const { subject, chapter, studentType, classOrSemester, examGoal, studyTime, learningMode } = req.body;
  const targetSubject = subject || 'General Learning';
  const targetChapter = chapter || 'Topic';

  console.log(`\n[Roadmap] ========== NEW REQUEST ==========`);
  console.log(`[Roadmap] Subject: ${targetSubject} | Chapter: ${targetChapter} | Level: ${classOrSemester || 'N/A'}`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Roadmap] No API key — returning static fallback');
    return res.json(await generateDynamicAIFallback(targetSubject, targetChapter, classOrSemester, null));
  }

  const callGemini = async (prompt) => {
    const response = await callGeminiWithRetry(prompt, apiKey);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');
    return JSON.parse(extractJsonObject(text));
  };

  // ATTEMPT 1: Primary prompt
  try {
    console.log('[Roadmap] Attempt 1: Primary curriculum prompt...');
    const prompt1 = buildRoadmapPrompt(targetSubject, targetChapter, studentType, classOrSemester, examGoal, studyTime);
    const result1 = await callGemini(prompt1);
    const topics1 = Array.isArray(result1.topics) ? result1.topics : [];

    if (!isRoadmapGeneric(topics1, targetChapter)) {
      console.log(`[Roadmap] ✅ Attempt 1 PASSED with ${topics1.length} topics`);
      return res.json(normalizeRoadmapResponse(result1, targetSubject, targetChapter));
    }
    console.warn('[Roadmap] ❌ Attempt 1 failed validation');
  } catch (e) {
    console.error('[Roadmap] Attempt 1 error:', e.message);
  }

  // ATTEMPT 2: Retry with stronger correction
  try {
    console.log('[Roadmap] Attempt 2: Retry with correction prompt...');
    const prompt2 = buildRoadmapPrompt(targetSubject, targetChapter, studentType, classOrSemester, examGoal, studyTime)
      + '\n\n' + buildRetryPrompt(targetSubject, targetChapter, classOrSemester);
    const result2 = await callGemini(prompt2);
    const topics2 = Array.isArray(result2.topics) ? result2.topics : [];

    if (!isRoadmapGeneric(topics2, targetChapter)) {
      console.log(`[Roadmap] ✅ Attempt 2 PASSED with ${topics2.length} topics`);
      return res.json(normalizeRoadmapResponse(result2, targetSubject, targetChapter));
    }
    console.warn('[Roadmap] ❌ Attempt 2 failed validation');
  } catch (e) {
    console.error('[Roadmap] Attempt 2 error:', e.message);
  }

  // ATTEMPT 3: Dynamic AI fallback (simpler prompt asking only for subtopic names)
  console.warn('[Roadmap] Using dynamic AI fallback (attempt 3)...');
  const fallback = await generateDynamicAIFallback(targetSubject, targetChapter, classOrSemester, apiKey);
  console.log(`[Roadmap] Fallback returned ${fallback.topics.length} topics`);
  return res.json(fallback);
});

function normalizeRoadmapResponse(parsed, defaultSubject, defaultChapter) {
  const topics = Array.isArray(parsed.topics) ? parsed.topics : [];
  return {
    subject: parsed.subject || defaultSubject,
    chapter: parsed.chapter || defaultChapter,
    estimatedHours: parsed.estimatedHours || Math.ceil(topics.reduce((a, t) => a + (parseInt(t.estimatedMinutes, 10) || 30), 0) / 60) || 4,
    topics: topics.map((t, idx) => ({
      id: t.id || (idx + 1),
      title: t.title || `Topic ${idx + 1}`,
      difficulty: t.difficulty || 'Medium',
      estimatedMinutes: parseInt(t.estimatedMinutes, 10) || 30,
      learningObjective: t.learningObjective || '',
      prerequisite: t.prerequisite || null,
      expectedOutcome: t.expectedOutcome || ''
    }))
  };
}

app.listen(PORT, () => {
  console.log(`[Backend] Server is running on port ${PORT}`);
  const apiKeyLoaded = process.env.GEMINI_API_KEY ? "YES" : "NO";
  console.log(`========================================
Gemini API Loaded Successfully
API Key Loaded : ${apiKeyLoaded}
Using Model :
${GEMINI_MODEL}
========================================`);
});
