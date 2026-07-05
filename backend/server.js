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

app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    message: "Backend running",
    geminiKeyLoaded: !!process.env.GEMINI_API_KEY,
    model: "gemini-2.5-flash"
  });
});

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

function generateFallbackQuestions(sub) {
  const formattedSub = sub.charAt(0).toUpperCase() + sub.slice(1);
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
  return questions;
}

function parseAndNormalizeQuestions(textResponse, targetSubject) {
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
    const topic = q.topic || `${targetSubject} Basics`;
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
      topic,
      difficulty,
      question: questionText,
      options,
      correctAnswer,
      explanation
    };
  });
}

app.post('/api/generate-assessment', async (req, res) => {
  const { subject, goal, examDate, studyTime, subjects, examGoal } = req.body;
  const targetSubject = subject || (Array.isArray(subjects) ? subjects[0] : subjects) || 'General Learning';
  const targetGoal = goal || examGoal || 'General Study';

  console.log(`[Backend] Generating assessment for subject: ${targetSubject}, Goal: ${targetGoal}`);
  console.log("[Backend] Using Gemini model: gemini-2.5-flash");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Backend] Error: GEMINI_API_KEY environment variable is not defined.");
    const fallbackQuestions = generateFallbackQuestions(targetSubject);
    return res.json({
      source: "fallback",
      message: "Gemini API key missing. Subject-specific fallback used.",
      questions: fallbackQuestions
    });
  }

  const prompt = `Generate 10 personalized diagnostic MCQ questions for a student.
Subject: ${targetSubject}
Goal: ${targetGoal}
Exam Date: ${examDate || 'Not specified'}
Daily Study Time: ${studyTime || 'Not specified'}

Rules:
- Generate questions strictly for the subject: ${targetSubject}.
- Include a mix of Easy, Medium, and Hard questions.
- Each question must have exactly 4 options.
- Return ONLY valid JSON in the specified format. No markdown, no wrapper code, no extra text.

JSON format:
{
 "questions":[
   {
     "subject": "${targetSubject}",
     "topic": "Specific Topic Name",
     "difficulty": "Easy",
     "question": "Question text",
     "options": ["Option A", "Option B", "Option C", "Option D"],
     "correctAnswer": "Correct option text",
     "explanation": "Short explanation"
   }
 ]
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Backend] Gemini API responded with error status ${response.status}:`, errText);
      const fallbackQuestions = generateFallbackQuestions(targetSubject);
      return res.json({
        source: "fallback",
        message: "AI temporarily returned unreadable format. Subject-specific fallback used.",
        questions: fallbackQuestions
      });
    }

    const data = await response.json();
    console.log("ASSESSMENT GEMINI RAW RESPONSE:", JSON.stringify(data, null, 2));
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      console.error("[Backend] Gemini returned no content candidate parts:", JSON.stringify(data));
      const fallbackQuestions = generateFallbackQuestions(targetSubject);
      return res.json({
        source: "fallback",
        message: "AI temporarily returned unreadable format. Subject-specific fallback used.",
        questions: fallbackQuestions
      });
    }

    const normalizedQuestions = parseAndNormalizeQuestions(textResponse, targetSubject);
    console.log(`[Backend] Assessment generated successfully with ${normalizedQuestions.length} questions.`);
    res.json({
      source: "gemini",
      message: "Generated successfully",
      questions: normalizedQuestions
    });
  } catch (error) {
    console.error("[Backend] Exception occurred during generation:", error);
    const fallbackQuestions = generateFallbackQuestions(targetSubject);
    res.json({
      source: "fallback",
      message: "AI temporarily returned unreadable format. Subject-specific fallback used.",
      questions: fallbackQuestions
    });
  }
});

app.post('/api/generate-notes', async (req, res) => {
  const { topic, subject } = req.body;
  console.log(`[Backend] Generating study notes for topic: ${topic} under subject: ${subject}`);
  console.log("[Backend] Using Gemini model: gemini-2.5-flash");

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Backend] Gemini API responded with error status ${response.status}:`, errText);
      return res.status(response.status).json({ error: `Gemini API returned error: ${response.statusText}` });
    }

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
  console.log("[Backend] Using Gemini model: gemini-2.5-flash");

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Backend] Gemini API responded with error status ${response.status}:`, errText);
      return res.status(response.status).json({ error: `Gemini API returned error` });
    }

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: "Gemini API error" });
    }

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: "Gemini API error" });
    }

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: "Gemini API error" });
    }

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fallbackPrompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) throw new Error(`Fallback API HTTP ${response.status}`);

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
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
});
