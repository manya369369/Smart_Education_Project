import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/RoadmapPage.css';
import { createRoadmapKey, resolveClassAndSemester } from '../utils/sessionHelpers';

const RoadmapPage = () => {
  const navigate = useNavigate();

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Analyzing subject details...");

  // Data States
  const [roadmaps, setRoadmaps] = useState([]);
  const [activeRoadmapIdx, setActiveRoadmapIdx] = useState(0);
  const [goalData, setGoalData] = useState(null);
  const [setupData, setSetupData] = useState(null);
  const [classOrSemester, setClassOrSemester] = useState("");

  // Loading phrase rotation timer
  useEffect(() => {
    if (!isLoading) return;
    const phrases = [
      "Analyzing subject details...",
      "Personalizing concept timeline...",
      "Aligning prerequisite knowledge...",
      "Generating AI roadmap...",
      "Assembling modern timeline view..."
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % phrases.length;
      setLoadingText(phrases[index]);
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Load and fetch roadmaps on mount
  useEffect(() => {
    const initRoadmap = async () => {
      // 1. Read setup details from localStorage
      let goal = null;
      let setup = null;
      let cos = localStorage.getItem('neurolearn_student_class_or_semester') || '';

      try {
        const savedGoal = localStorage.getItem('neurolearn_goal_data');
        if (savedGoal) goal = JSON.parse(savedGoal);
      } catch (e) {
        console.error("Error reading goal data", e);
      }

      try {
        const savedSetup = localStorage.getItem('neurolearn_setup_data');
        if (savedSetup) setup = JSON.parse(savedSetup);
      } catch (e) {
        console.error("Error reading setup data", e);
      }

      setGoalData(goal);
      setSetupData(setup);
      setClassOrSemester(cos);

      if (!setup || !setup.subjects || setup.subjects.length === 0) {
        console.error("[RoadmapPage] Missing subjects config for roadmap generation.");
        navigate('/learning-mode-setup');
        return;
      }

      // Check if roadmaps are already cached in neurolearn_roadmaps_by_key
      try {
        const roadmapsRaw = localStorage.getItem('neurolearn_roadmaps_by_key');
        if (roadmapsRaw) {
          const roadmapsMap = JSON.parse(roadmapsRaw);
          const allExist = setup.subjects.every(item => {
            const resolved = resolveClassAndSemester(setup.studentType || 'College Student', cos);
            const studentType = setup.studentType || 'College Student';
            const classLevel = resolved.classLevel;
            const semester = resolved.semester;
            const subject = item.subject;
            const chapter = item.chapter;
            const examGoal = goal?.examGoal || 'General Study';

            const rKey = createRoadmapKey({
              studentType,
              classLevel,
              semester,
              subject,
              chapter,
              examGoal
            });
            const existingRoadmap = roadmapsMap[rKey];

            console.log("ROADMAP INPUT:", {
              studentType,
              classLevel,
              semester,
              subject,
              chapter,
              examGoal
            });
            console.log("ROADMAP KEY:", rKey);
            console.log("ROADMAP EXISTS:", Boolean(existingRoadmap));
            console.log("REUSING SAVED ROADMAP:", Boolean(existingRoadmap));
            console.log("CALLING GEMINI ROADMAP:", !existingRoadmap);
            return !!existingRoadmap;
          });
          if (allExist) {
            const mapped = setup.subjects.map(item => {
              const resolved = resolveClassAndSemester(setup.studentType || 'College Student', cos);
              const rKey = createRoadmapKey({
                studentType: setup.studentType || 'College Student',
                classLevel: resolved.classLevel,
                semester: resolved.semester,
                subject: item.subject,
                chapter: item.chapter,
                examGoal: goal?.examGoal || 'General Study'
              });
              return roadmapsMap[rKey];
            });
            localStorage.setItem('roadmaps', JSON.stringify(mapped));
            setRoadmaps(mapped);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn("Cached roadmaps parse failure in neurolearn_roadmaps_by_key, checking standard cache...", e);
      }

      // Fallback check standard roadmaps array cache
      try {
        const cachedRoadmaps = localStorage.getItem('roadmaps');
        if (cachedRoadmaps) {
          const parsed = JSON.parse(cachedRoadmaps);
          if (parsed && parsed.length > 0) {
            const matchesSetup = setup && setup.subjects && 
              setup.subjects.every(s => parsed.some(r => r.subject === s.subject && r.chapter === s.chapter));
            if (matchesSetup) {
              console.log("[RoadmapPage] Loading cached roadmaps from localStorage.");
              setRoadmaps(parsed);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (e) {}

      // 2. Fetch roadmaps from backend API or load from cache
      try {
        const roadmapsRaw = localStorage.getItem('neurolearn_roadmaps_by_key') || '{}';
        let roadmapsMap = {};
        try { roadmapsMap = JSON.parse(roadmapsRaw); } catch(e) {}

        const results = [];
        for (let i = 0; i < setup.subjects.length; i++) {
          const item = setup.subjects[i];
          const resolved = resolveClassAndSemester(setup.studentType || 'College Student', cos);
          const studentType = setup.studentType || 'College Student';
          const classLevel = resolved.classLevel;
          const semester = resolved.semester;
          const subject = item.subject;
          const chapter = item.chapter;
          const examGoal = goal?.examGoal || 'General Study';

          const roadmapKey = createRoadmapKey({
            studentType,
            classLevel,
            semester,
            subject,
            chapter,
            examGoal
          });
          
          const existingRoadmap = roadmapsMap[roadmapKey];
          console.log("ROADMAP INPUT:", {
            studentType,
            classLevel,
            semester,
            subject,
            chapter,
            examGoal
          });
          console.log("ROADMAP KEY:", roadmapKey);
          console.log("ROADMAP EXISTS:", Boolean(existingRoadmap));
          console.log("REUSING SAVED ROADMAP:", Boolean(existingRoadmap));
          console.log("CALLING GEMINI ROADMAP:", !existingRoadmap);

          if (existingRoadmap) {
            results.push(existingRoadmap);
          } else {
            console.log("CALLING GEMINI ROADMAP GENERATION");
            // Fetch from backend
            const res = await fetch('/api/generate-roadmap', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                subject: item.subject,
                chapter: item.chapter,
                studentType: setup.studentType || 'College Student',
                classOrSemester: cos,
                examGoal: goal?.examGoal || 'General Study',
                studyTime: goal?.studyTime || '2 hours',
                learningMode: setup.learningMode || 'Focus Mode'
              })
            }).then(r => {
              if (!r.ok) throw new Error("Roadmap request failed");
              return r.json();
            });

            const roadmapObj = {
              roadmapKey,
              subject: res.subject || item.subject,
              chapter: res.chapter || item.chapter,
              studentType: setup.studentType || 'College Student',
              classLevel: resolved.classLevel,
              semester: resolved.semester,
              examGoal: goal?.examGoal || 'General Study',
              estimatedHours: res.estimatedHours || 4,
              topics: res.topics || [],
              createdAt: new Date().toISOString()
            };

            roadmapsMap[roadmapKey] = roadmapObj;
            localStorage.setItem('neurolearn_roadmaps_by_key', JSON.stringify(roadmapsMap));
            results.push(roadmapObj);
          }
        }

        localStorage.setItem('roadmaps', JSON.stringify(results));
        setRoadmaps(results);
      } catch (err) {
        console.error("[RoadmapPage] API failure, using fallback system", err);
        // Fallback roadmap mapping locally
        const roadmapsRaw = localStorage.getItem('neurolearn_roadmaps_by_key') || '{}';
        let roadmapsMap = {};
        try { roadmapsMap = JSON.parse(roadmapsRaw); } catch(e) {}

        const fallbackResults = setup.subjects.map(item => {
          const resolved = resolveClassAndSemester(setup.studentType || 'College Student', cos);
          const studentType = setup.studentType || 'College Student';
          const classLevel = resolved.classLevel;
          const semester = resolved.semester;
          const subject = item.subject;
          const chapter = item.chapter;
          const examGoal = goal?.examGoal || 'General Study';

          const roadmapKey = createRoadmapKey({
            studentType,
            classLevel,
            semester,
            subject,
            chapter,
            examGoal
          });
          
          const existingRoadmap = roadmapsMap[roadmapKey];
          console.log("ROADMAP INPUT:", {
            studentType,
            classLevel,
            semester,
            subject,
            chapter,
            examGoal
          });
          console.log("ROADMAP KEY:", roadmapKey);
          console.log("ROADMAP EXISTS:", Boolean(existingRoadmap));
          console.log("REUSING SAVED ROADMAP:", Boolean(existingRoadmap));
          console.log("CALLING GEMINI ROADMAP:", !existingRoadmap);

          if (existingRoadmap) {
            return existingRoadmap;
          }

          console.log("CALLING GEMINI ROADMAP GENERATION");

          const fallbackRoadmap = {
            roadmapKey,
            subject: item.subject,
            chapter: item.chapter,
            studentType: setup.studentType || 'College Student',
            classLevel: resolved.classLevel,
            semester: resolved.semester,
            examGoal: goal?.examGoal || 'General Study',
            estimatedHours: 3,
            topics: [
              {
                id: 1,
                title: `${item.chapter} – Definitions and Terminology`,
                difficulty: "Easy",
                estimatedMinutes: 25,
                learningObjective: `Learn key terms of ${item.chapter}.`,
                prerequisite: null,
                expectedOutcome: "Can define key terms."
              },
              {
                id: 2,
                title: `${item.chapter} – Core Principles and Frameworks`,
                difficulty: "Medium",
                estimatedMinutes: 30,
                learningObjective: `Understand active models of ${item.chapter}.`,
                prerequisite: `${item.chapter} – Definitions and Terminology`,
                expectedOutcome: "Applies core framework logic."
              },
              {
                id: 3,
                title: `${item.chapter} – Types and Classification`,
                difficulty: "Medium",
                estimatedMinutes: 25,
                learningObjective: `Study components of ${item.chapter}.`,
                prerequisite: `${item.chapter} – Core Principles and Frameworks`,
                expectedOutcome: "Can categorize and compare."
              },
              {
                id: 4,
                title: `${item.chapter} – Formulas and Methods`,
                difficulty: "Hard",
                estimatedMinutes: 40,
                learningObjective: `Apply formulas related to ${item.chapter}.`,
                prerequisite: `${item.chapter} – Types and Classification`,
                expectedOutcome: "Can solve numerical problems."
              },
              {
                id: 5,
                title: `${item.chapter} – Real-World Examples`,
                difficulty: "Medium",
                estimatedMinutes: 25,
                learningObjective: `Connect ${item.chapter} to real scenarios.`,
                prerequisite: `${item.chapter} – Formulas and Methods`,
                expectedOutcome: "Can give real examples."
              },
              {
                id: 6,
                title: `${item.chapter} – Diagrams and Illustrations`,
                difficulty: "Easy",
                estimatedMinutes: 20,
                learningObjective: `Draw and label diagrams for ${item.chapter}.`,
                prerequisite: `${item.chapter} – Real-World Examples`,
                expectedOutcome: "Can reproduce diagrams."
              },
              {
                id: 7,
                title: `${item.chapter} – Common Mistakes`,
                difficulty: "Medium",
                estimatedMinutes: 20,
                learningObjective: `Identify pitfalls in ${item.chapter}.`,
                prerequisite: `${item.chapter} – Diagrams and Illustrations`,
                expectedOutcome: "Can avoid common errors."
              },
              {
                id: 8,
                title: `Practice Problems and Revision`,
                difficulty: "Easy",
                estimatedMinutes: 30,
                learningObjective: `Solve practice questions on ${item.chapter}.`,
                prerequisite: `${item.chapter} – Common Mistakes`,
                expectedOutcome: "Ready for assessment."
              }
            ],
            createdAt: new Date().toISOString()
          };

          roadmapsMap[roadmapKey] = fallbackRoadmap;
          localStorage.setItem('neurolearn_roadmaps_by_key', JSON.stringify(roadmapsMap));
          return fallbackRoadmap;
        });
        localStorage.setItem('roadmaps', JSON.stringify(fallbackResults));
        setRoadmaps(fallbackResults);
      } finally {
        setIsLoading(false);
      }
    };

    initRoadmap();
  }, [navigate]);

  const handleProceed = () => {
    navigate('/assessment');
  };

  if (isLoading) {
    return (
      <div className="roadmap-wrapper">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner-outer"></div>
            <div className="spinner-inner"></div>
            <div className="spinner-glow"></div>
          </div>
          <h2 className="loading-title">AI is generating your personalized roadmaps...</h2>
          <p className="loading-phrase" key={loadingText}>{loadingText}</p>
        </div>
      </div>
    );
  }

  const activeRoadmap = roadmaps[activeRoadmapIdx];

  return (
    <div className="roadmap-wrapper">
      <div className="roadmap-card">
        <header className="roadmap-header-section">
          <span className="roadmap-ai-badge">✦ AI Personalized Roadmap</span>
          <h1 className="roadmap-title">Your Learning Roadmaps</h1>
          <p className="roadmap-subtitle">
            A logical, step-by-step concepts roadmap curated by NeuroLearn AI.
          </p>

          {/* Active profile tags */}
          <div className="profile-tags-row">
            <span className="profile-tag-badge tag-student">{setupData?.studentType}</span>
            <span className="profile-tag-badge tag-level">{classOrSemester}</span>
            <span className="profile-tag-badge tag-goal">{goalData?.examGoal}</span>
            <span className="profile-tag-badge tag-time">{goalData?.studyTime} / day</span>
          </div>

          {/* Balanced Mode Roadmaps Tab Switcher */}
          {roadmaps.length > 1 && (
            <div className="roadmap-tabs-container">
              {roadmaps.map((rm, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveRoadmapIdx(idx)}
                  className={`roadmap-tab-btn ${activeRoadmapIdx === idx ? 'active' : ''}`}
                >
                  <span className="tab-subject">{rm.subject}</span>
                  <span className="tab-chapter">({rm.chapter})</span>
                </button>
              ))}
            </div>
          )}
        </header>

        {activeRoadmap && (
          <section className="roadmap-display-section animate-fadeIn">
            {/* Header tags for this roadmap */}
            <div className="active-roadmap-meta">
              <div className="meta-left">
                <span className="subject-chip-badge">{activeRoadmap.subject}</span>
                <span className="chapter-chip-badge">{activeRoadmap.chapter}</span>
              </div>
              <div className="meta-right">
                <span className="duration-label">Estimated Duration:</span>
                <strong className="duration-value">{activeRoadmap.estimatedHours} Hours</strong>
              </div>
            </div>

            {/* Vertical timeline path */}
            <div className="vertical-timeline-container">
              <div className="timeline-gradient-line"></div>

              <div className="timeline-nodes-list">
                {activeRoadmap.topics.map((topic, index) => {
                  const isFirst = index === 0;
                  const isLast = index === activeRoadmap.topics.length - 1;
                  const diffClass = `diff-${topic.difficulty.toLowerCase()}`;

                  return (
                    <div key={topic.id} className="timeline-node-item">
                      {/* Timeline dot circle node */}
                      <div className={`timeline-node-circle ${diffClass}`}>
                        <span className="node-number">{topic.id}</span>
                      </div>

                      {/* Topic Content Card */}
                      <div className="timeline-topic-card">
                        <div className="topic-card-header">
                          <h3 className="topic-title">{topic.title}</h3>
                          <div className="topic-header-badges">
                            <span className={`difficulty-badge-pill ${diffClass}`}>
                              {topic.difficulty}
                            </span>
                            <span className="time-badge-pill">
                              ⏱ {topic.estimatedMinutes} min
                            </span>
                          </div>
                        </div>

                        <div className="topic-card-body">
                          {topic.prerequisite && (
                            <div className="topic-body-detail">
                              <span className="detail-label">Prerequisite:</span>
                              <span className="detail-text prereq-text">
                                {topic.prerequisite}
                              </span>
                            </div>
                          )}
                          {topic.learningObjective && (
                            <div className="topic-body-detail">
                              <span className="detail-label">Learning Objective:</span>
                              <p className="detail-text">{topic.learningObjective}</p>
                            </div>
                          )}
                          {topic.expectedOutcome && (
                            <div className="topic-body-detail">
                              <span className="detail-label">Expected Outcome:</span>
                              <p className="detail-text outcome-text">{topic.expectedOutcome}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Proceed controls footer */}
        <footer className="roadmap-proceed-footer">
          <button 
            type="button" 
            onClick={handleProceed} 
            className="roadmap-action-btn"
          >
            PROCEED TO DIAGNOSTIC ASSESSMENT →
          </button>
        </footer>
      </div>
    </div>
  );
};

export default RoadmapPage;
