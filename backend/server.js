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

function parseAndNormalizeQuestions(textResponse, targetSubject) {
  let cleanText = textResponse.trim();

  // 1. Try to extract from markdown blocks
  const jsonRegex = /```(?:json)?([\s\S]*?)```/i;
  const match = cleanText.match(jsonRegex);
  if (match) {
    cleanText = match[1].trim();
  }

  // 2. Extra text before or after JSON: locate the bounds of the JSON structure
  const firstCurly = cleanText.indexOf('{');
  const firstSquare = cleanText.indexOf('[');
  const lastCurly = cleanText.lastIndexOf('}');
  const lastSquare = cleanText.lastIndexOf(']');

  let parsedData = null;
  let parseErrors = [];

  if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
    const candidate = cleanText.substring(firstCurly, lastCurly + 1);
    try {
      parsedData = JSON.parse(candidate);
    } catch (e) {
      parseErrors.push(e.message);
    }
  }

  if (!parsedData && firstSquare !== -1) {
    const candidate = cleanText.substring(firstSquare, lastSquare + 1);
    try {
      parsedData = JSON.parse(candidate);
    } catch (e) {
      parseErrors.push(e.message);
    }
  }

  if (!parsedData) {
    try {
      parsedData = JSON.parse(cleanText);
    } catch (e) {
      parseErrors.push(e.message);
      throw new Error(`JSON parsing failed: ${parseErrors.join(' | ')}`);
    }
  }

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
    return res.status(500).json({ error: "Gemini API key missing. Please add GEMINI_API_KEY in root .env file." });
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
      return res.status(response.status).json({ error: `Gemini API returned error: ${response.statusText}` });
    }

    const data = await response.json();
    console.log("ASSESSMENT GEMINI RAW RESPONSE:", JSON.stringify(data, null, 2));
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      console.error("[Backend] Gemini returned no content candidate parts:", JSON.stringify(data));
      return res.status(500).json({ error: "Gemini API returned empty response candidate text." });
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
    res.status(500).json({ error: error.message || "Failed to generate assessment questions" });
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

app.listen(PORT, () => {
  console.log(`[Backend] Server is running on port ${PORT}`);
});
