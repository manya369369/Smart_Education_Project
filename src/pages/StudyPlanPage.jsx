import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/StudyPlanPage.css';
import { buildTopicSessionKey, calcTopicProgress, getCompletedTopicCount, getCompletedTopics, initFreshTopicSession } from '../utils/sessionHelpers';

const StudyPlanPage = () => {
  const navigate = useNavigate();

  // Loading and optimization simulation states
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Read data from localStorage
  const [storedData, setStoredData] = useState(() => {
    console.log("[StudyPlanPage] Reading local storage details...");
    let assessment = null;
    let goal = null;
    let profile = null;
    let hasError = false;

    try {
      const savedAssessment = localStorage.getItem('neurolearn_assessment_result');
      if (savedAssessment) {
        assessment = JSON.parse(savedAssessment);
      }
    } catch (e) {
      console.error("[StudyPlanPage] Failed to parse neurolearn_assessment_result:", e);
      hasError = true;
    }

    try {
      const savedGoal = localStorage.getItem('neurolearn_goal_data');
      if (savedGoal) {
        goal = JSON.parse(savedGoal);
      }
    } catch (e) {
      console.error("[StudyPlanPage] Failed to parse neurolearn_goal_data:", e);
      hasError = true;
    }

    try {
      const savedProfile = localStorage.getItem('neurolearn_learner_profile');
      if (savedProfile) {
        profile = JSON.parse(savedProfile);
      }
    } catch (e) {
      console.error("[StudyPlanPage] Failed to parse neurolearn_learner_profile:", e);
      hasError = true;
    }

    const isDataMissing = !assessment;

    return {
      assessment,
      goal,
      profile,
      isInvalid: isDataMissing || hasError
    };
  });

  const { assessment, goal, profile, isInvalid } = storedData;

  const activeJourneyStudy = useMemo(() => {
    try {
      const journeyRaw = localStorage.getItem('neurolearn_active_subject_journey') || 
                         localStorage.getItem('activeSubjectJourney') || 
                         localStorage.getItem('neurolearn_active_journey');
      if (!journeyRaw) return null;
      const journey = JSON.parse(journeyRaw);
      if (!journey || !journey.subject) return null;

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
        } catch (e) { /* skip */ }
      }

      let matchingRoadmap = allRoadmaps.find(
        r => r.subject?.toLowerCase() === journey.subject?.toLowerCase() &&
             r.chapter?.toLowerCase() === journey.chapter?.toLowerCase()
      );
      if (!matchingRoadmap) {
        matchingRoadmap = allRoadmaps.find(
          r => r.subject?.toLowerCase() === journey.subject?.toLowerCase()
        );
      }

      if (!matchingRoadmap || !Array.isArray(matchingRoadmap.topics) || matchingRoadmap.topics.length === 0) {
        return null;
      }

      const topics = matchingRoadmap.topics;

      // Check both roadmap completion and subject progress completed topics
      const completedList = getCompletedTopics(journey.subject, matchingRoadmap.chapter || journey.chapter || 'General');
      const completedIndices = completedList.map(t => t.topicIndex);

      const incompleteIdx = topics.findIndex((t, idx) => {
        const isSavedCompleted = completedIndices.includes(idx);
        const isRoadmapCompleted = t.completed || t.isCompleted || t.status === 'completed';
        return !isSavedCompleted && !isRoadmapCompleted;
      });
      const currentIdx = incompleteIdx !== -1 ? incompleteIdx : 0;
      const currentTopic = topics[currentIdx];

      console.log("Selected next incomplete topic:", currentTopic.title);

      // Ensure the session is initialized fresh if it doesn't exist yet
      initFreshTopicSession(journey.subject, matchingRoadmap.chapter || journey.chapter || 'General', currentTopic.title, currentIdx, journey.recommendedStudyTime || 60);

      let topicProgressPercent = 0;
      let revisionScheduled = false;
      const sessionKey = buildTopicSessionKey(journey.subject, matchingRoadmap.chapter || journey.chapter || 'General', currentTopic.title, currentIdx);
      try {
        const sessionsRaw = localStorage.getItem('neurolearn_learning_sessions');
        if (sessionsRaw) {
          const sessions = JSON.parse(sessionsRaw);
          const session = sessions[sessionKey];
          if (session) {
            const { topicProgressPercent: calcProg } = calcTopicProgress(session);
            topicProgressPercent = calcProg;
            revisionScheduled = !!(session.revisionScheduled || session.needsRevision);
          }
        }
      } catch (e) {}

      const roadmapCompletedCount = topics.filter(t => t.completed || t.isCompleted || t.status === 'completed').length;
      const completedCount = Math.max(completedList.length, roadmapCompletedCount);
      const progressPercent = Math.round(((completedCount + (topicProgressPercent / 100)) / topics.length) * 100);

      return {
        subject: journey.subject,
        chapter: matchingRoadmap.chapter || journey.chapter || 'General',
        topicTitle: currentTopic.title || `Topic ${currentIdx + 1}`,
        topicIndex: currentIdx,
        totalTopics: topics.length,
        completedTopics: completedCount,
        progressPercent,
        estimatedMinutes: currentTopic.estimatedMinutes || currentTopic.estimatedTime || journey.recommendedStudyTime || 60,
        learningObjective: currentTopic.learningObjective || '',
        difficulty: currentTopic.difficulty || 'Medium',
        allocatedTime: journey.recommendedStudyTime || 60,
        currentTopic: currentTopic,
        revisionScheduled,
        topicProgressPercent
      };
    } catch (e) {
      console.error('[StudyPlanPage] Error reading active journey study:', e);
      return null;
    }
  }, []);

  const studyTime = useMemo(() => {
    if (activeJourneyStudy) {
      return `${activeJourneyStudy.estimatedMinutes} Minutes`;
    }
    return goal?.studyTime || '2 hours';
  }, [goal, activeJourneyStudy]);

  const priorityTopics = useMemo(() => {
    if (activeJourneyStudy) {
      return [activeJourneyStudy.topicTitle];
    }
    if (assessment && Array.isArray(assessment.weakTopics) && assessment.weakTopics.length > 0) {
      return assessment.weakTopics;
    }
    if (profile && Array.isArray(profile.weakTopics) && profile.weakTopics.length > 0) {
      return profile.weakTopics;
    }
    if (profile && Array.isArray(profile.recommendedFocusAreas) && profile.recommendedFocusAreas.length > 0) {
      return profile.recommendedFocusAreas;
    }
    if (assessment && assessment.primarySubject) {
      return [assessment.primarySubject];
    }
    if (goal && Array.isArray(goal.subjects) && goal.subjects.length > 0) {
      return [goal.subjects[0]];
    }
    return ["General Learning"];
  }, [assessment, profile, goal, activeJourneyStudy]);

  const weakTopics = priorityTopics;

  // Topic list focus banner sentence
  const priorityFocusBanner = useMemo(() => {
    if (activeJourneyStudy) {
      if (activeJourneyStudy.revisionScheduled) {
        return `Revise ${activeJourneyStudy.topicTitle} in ${activeJourneyStudy.subject}. Low quiz score detected.`;
      }
      return `Focus on ${activeJourneyStudy.topicTitle} in ${activeJourneyStudy.subject} before moving to advanced concepts.`;
    }
    if (priorityTopics.length === 1) {
      return `Focus on ${priorityTopics[0]} before moving to advanced concepts.`;
    }
    if (priorityTopics.length === 2) {
      return `Focus on ${priorityTopics[0]} and ${priorityTopics[1]} before moving to advanced concepts.`;
    }
    return `Focus on ${priorityTopics[0]}, ${priorityTopics[1]}, and ${priorityTopics[2] || 'related topics'} before moving to advanced concepts.`;
  }, [priorityTopics, activeJourneyStudy]);

  // Local synchronous backup study plan payload generator
  const generateStudyPlanPayload = (assessmentResult, profileData, goalData) => {
    const subject = assessmentResult?.primarySubject || goalData?.subjects?.[0] || 'General Learning';
    const studyTimeVal = goalData?.studyTime || '2 hours';

    // Build the resolved list of topics to generate tasks for (guaranteeing at least 3)
    let topics = [];
    if (assessmentResult && Array.isArray(assessmentResult.weakTopics) && assessmentResult.weakTopics.length > 0) {
      topics = assessmentResult.weakTopics;
    } else if (profileData && Array.isArray(profileData.weakTopics) && profileData.weakTopics.length > 0) {
      topics = profileData.weakTopics;
    } else if (profileData && Array.isArray(profileData.recommendedFocusAreas) && profileData.recommendedFocusAreas.length > 0) {
      topics = profileData.recommendedFocusAreas;
    } else if (assessmentResult && assessmentResult.primarySubject) {
      topics = [assessmentResult.primarySubject];
    } else if (goalData && Array.isArray(goalData.subjects) && goalData.subjects.length > 0) {
      topics = [goalData.subjects[0]];
    } else {
      topics = ["General Learning"];
    }

    if (topics.length === 1) {
      const main = topics[0];
      topics = [
        `${main} Fundamentals`,
        `${main} Core Concepts`,
        `${main} Practical Applications`
      ];
    }

    const taskTypes = ["Personalized Video", "AI Notes", "Adaptive Quiz"];
    const icons = {
      "Personalized Video": "📹",
      "AI Notes": "📝",
      "Adaptive Quiz": "🧠"
    };

    const tasks = topics.map((topic, index) => {
      const taskType = taskTypes[index % taskTypes.length];
      const icon = icons[taskType];
      const timeHour = 9 + Math.floor(index * 0.5);
      const timeMin = (index % 2) === 0 ? "00" : "30";
      const timeAmpm = timeHour >= 12 ? "PM" : "AM";
      const displayHour = timeHour > 12 ? timeHour - 12 : timeHour;
      const timeStr = `${displayHour}:${timeMin} ${timeAmpm}`;

      return {
        time: timeStr,
        icon: icon,
        taskType: taskType,
        topic: topic,
        reason: `Focus on mastering the concept of ${topic} through ${taskType}.`
      };
    });

    const reasonsList = [
      `Prioritized topics related to ${subject}.`,
      "Structured to rotate between video explanation, text reading, and quiz evaluation.",
      "Doubts session ready with personalized tutor."
    ];

    return {
      generatedFromSubject: subject,
      generatedFromWeakTopics: assessmentResult?.weakTopics || profileData?.weakTopics || [subject],
      tasks: tasks,
      estimatedTime: `${studyTimeVal} focused session`,
      reasons: reasonsList,
      completion: 0,
      createdAt: new Date().toISOString()
    };
  };

  // State to hold generated plan
  const [currentPlan, setCurrentPlan] = useState(() => {
    if (activeJourneyStudy) {
      const expectedTopic = activeJourneyStudy.revisionScheduled ? `Revise ${activeJourneyStudy.topicTitle}` : activeJourneyStudy.topicTitle;
      
      const savedPlan = localStorage.getItem('neurolearn_study_plan');
      if (savedPlan) {
        try {
          const parsed = JSON.parse(savedPlan);
          // Verify it matches active journey subject and topic
          if (parsed && parsed.generatedFromSubject === activeJourneyStudy.subject && 
              parsed.tasks && parsed.tasks.length > 0 && 
              (parsed.tasks[0].topic === expectedTopic || parsed.tasks[0].topic === activeJourneyStudy.topicTitle)) {
            return parsed;
          }
        } catch (e) { /* skip */ }
      }

      // Generate a fresh subject-specific plan for the active topic
      const tasks = activeJourneyStudy.revisionScheduled ? [
        {
          time: "09:00 AM",
          icon: "📝",
          taskType: "AI Notes",
          topic: `Revise ${activeJourneyStudy.topicTitle}`,
          reason: `Low quiz score detected. Review notes to clarify core concepts.`,
          subject: activeJourneyStudy.subject,
          chapter: activeJourneyStudy.chapter,
          recommendedStudyTime: activeJourneyStudy.estimatedMinutes,
          currentTopicIndex: activeJourneyStudy.topicIndex
        },
        {
          time: "09:30 AM",
          icon: "📹",
          taskType: "Personalized Video",
          topic: `Revise ${activeJourneyStudy.topicTitle}`,
          reason: `Low quiz score detected. Rewatch the video to reinforce your memory.`,
          subject: activeJourneyStudy.subject,
          chapter: activeJourneyStudy.chapter,
          recommendedStudyTime: activeJourneyStudy.estimatedMinutes,
          currentTopicIndex: activeJourneyStudy.topicIndex
        },
        {
          time: "10:00 AM",
          icon: "🧠",
          taskType: "Adaptive Quiz",
          topic: `Revise ${activeJourneyStudy.topicTitle}`,
          reason: `Low quiz score detected. Retake the quiz to test your updated knowledge.`,
          subject: activeJourneyStudy.subject,
          chapter: activeJourneyStudy.chapter,
          recommendedStudyTime: activeJourneyStudy.estimatedMinutes,
          currentTopicIndex: activeJourneyStudy.topicIndex
        }
      ] : [
        {
          time: "09:00 AM",
          icon: "📹",
          taskType: "Personalized Video",
          topic: activeJourneyStudy.topicTitle,
          reason: `Watch a personalized visual explanation of ${activeJourneyStudy.topicTitle}.`,
          subject: activeJourneyStudy.subject,
          chapter: activeJourneyStudy.chapter,
          recommendedStudyTime: activeJourneyStudy.estimatedMinutes,
          currentTopicIndex: activeJourneyStudy.topicIndex
        },
        {
          time: "09:30 AM",
          icon: "📝",
          taskType: "AI Notes",
          topic: activeJourneyStudy.topicTitle,
          reason: `Review detailed conceptual study notes on ${activeJourneyStudy.topicTitle}.`,
          subject: activeJourneyStudy.subject,
          chapter: activeJourneyStudy.chapter,
          recommendedStudyTime: activeJourneyStudy.estimatedMinutes,
          currentTopicIndex: activeJourneyStudy.topicIndex
        },
        {
          time: "10:00 AM",
          icon: "🧠",
          taskType: "Adaptive Quiz",
          topic: activeJourneyStudy.topicTitle,
          reason: `Test your understanding of ${activeJourneyStudy.topicTitle} with an adaptive quiz.`,
          subject: activeJourneyStudy.subject,
          chapter: activeJourneyStudy.chapter,
          recommendedStudyTime: activeJourneyStudy.estimatedMinutes,
          currentTopicIndex: activeJourneyStudy.topicIndex
        }
      ];

      const generated = {
        generatedFromSubject: activeJourneyStudy.subject,
        generatedFromWeakTopics: [activeJourneyStudy.topicTitle],
        tasks: tasks,
        estimatedTime: `${activeJourneyStudy.estimatedMinutes * 3} Minutes focused session`,
        reasons: activeJourneyStudy.revisionScheduled ? [
          `Revision priority: Low quiz score detected for ${activeJourneyStudy.topicTitle}.`,
          `Aligned to chapter: ${activeJourneyStudy.chapter}.`
        ] : [
          `Prioritized active roadmap topic: ${activeJourneyStudy.topicTitle}.`,
          `Aligned to chapter: ${activeJourneyStudy.chapter}.`
        ],
        completion: 0,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('neurolearn_study_plan', JSON.stringify(generated));
      console.log("Subject-specific study plan generated");
      return generated;
    }

    const savedPlan = localStorage.getItem('neurolearn_study_plan');
    if (savedPlan) {
      try {
        return JSON.parse(savedPlan);
      } catch (e) {
        console.error("[StudyPlanPage] Error parsing saved study plan, re-generating...", e);
      }
    }

    if (isInvalid) {
      return null;
    }

    const generated = generateStudyPlanPayload(assessment, profile, goal);
    localStorage.setItem('neurolearn_study_plan', JSON.stringify(generated));
    console.log("Study plan generated");
    return generated;
  });

  // Handle individual task start click
  const handleStartTask = (task) => {
    const subj = task.subject || activeJourneyStudy?.subject || assessment?.subject || goal?.subjects?.[0] || "General Learning";
    const chap = task.chapter || activeJourneyStudy?.chapter || goal?.chapter || "General Foundations";
    const topicVal = task.topic || activeJourneyStudy?.topicTitle || "General Learning";
    const topicIdx = typeof task.currentTopicIndex === 'number' ? task.currentTopicIndex : (activeJourneyStudy?.topicIndex || 0);
    const recTime = task.recommendedStudyTime || activeJourneyStudy?.estimatedMinutes || 60;
    const taskTypeVal = task.taskType || task.type || "Personalized Video";

    let cleanTopic = topicVal;
    if (topicVal.startsWith("Revise ")) {
      cleanTopic = topicVal.substring(7);
    }

    const taskPayload = {
      subject: subj,
      chapter: chap,
      topic: cleanTopic,
      currentTopicIndex: topicIdx,
      taskType: taskTypeVal,
      recommendedStudyTime: recTime,
      source: "dashboard"
    };

    console.log("Opening learning task:", taskPayload);
    localStorage.setItem('neurolearn_current_learning_task', JSON.stringify(taskPayload));

    if (taskPayload.taskType === 'Adaptive Quiz') {
      navigate('/quiz');
    } else {
      navigate('/learning');
    }
  };

  // Handle Regenerate action calling real Gemini AI Study Plan Generator
  const handleRegeneratePlan = async () => {
    if (activeJourneyStudy) {
      setLoadingText("AI is optimizing your subject-specific plan...");
      setIsRegenerating(true);
      setSuccessMessage("");
      
      setTimeout(() => {
        // Read if revision is scheduled
        const sessionsRaw = localStorage.getItem('neurolearn_learning_sessions');
        let revisionScheduled = false;
        let activeTopicTitle = activeJourneyStudy.topicTitle;
        let currentIdx = activeJourneyStudy.topicIndex;
        if (sessionsRaw) {
          try {
            const sessions = JSON.parse(sessionsRaw);
            const sessionKey = buildTopicSessionKey(activeJourneyStudy.subject, activeJourneyStudy.chapter, activeTopicTitle, currentIdx);
            const session = sessions[sessionKey];
            if (session) {
              revisionScheduled = !!(session.revisionScheduled || session.needsRevision);
              if (revisionScheduled) {
                activeTopicTitle = session.currentTopic || activeJourneyStudy.topicTitle;
                currentIdx = typeof session.currentTopicIndex === 'number' ? session.currentTopicIndex : activeJourneyStudy.topicIndex;
              }
            }
          } catch (e) {}
        }

        const tasks = revisionScheduled ? [
          {
            time: "09:00 AM",
            icon: "📝",
            taskType: "AI Notes",
            topic: `Revise ${activeTopicTitle}`,
            reason: `Low quiz score detected. Review notes to clarify core concepts.`,
            subject: activeJourneyStudy.subject,
            chapter: activeJourneyStudy.chapter,
            recommendedStudyTime: activeJourneyStudy.estimatedMinutes,
            currentTopicIndex: currentIdx
          },
          {
            time: "09:30 AM",
            icon: "📹",
            taskType: "Personalized Video",
            topic: `Revise ${activeTopicTitle}`,
            reason: `Low quiz score detected. Rewatch the video to reinforce your memory.`,
            subject: activeJourneyStudy.subject,
            chapter: activeJourneyStudy.chapter,
            recommendedStudyTime: activeJourneyStudy.estimatedMinutes,
            currentTopicIndex: currentIdx
          },
          {
            time: "10:00 AM",
            icon: "🧠",
            taskType: "Adaptive Quiz",
            topic: `Revise ${activeTopicTitle}`,
            reason: `Low quiz score detected. Retake the quiz to test your updated knowledge.`,
            subject: activeJourneyStudy.subject,
            chapter: activeJourneyStudy.chapter,
            recommendedStudyTime: activeJourneyStudy.estimatedMinutes,
            currentTopicIndex: currentIdx
          }
        ] : [
          {
            time: "09:00 AM",
            icon: "📹",
            taskType: "Personalized Video",
            topic: activeTopicTitle,
            reason: `Watch a personalized visual explanation of ${activeTopicTitle}.`,
            subject: activeJourneyStudy.subject,
            chapter: activeJourneyStudy.chapter,
            recommendedStudyTime: activeJourneyStudy.estimatedMinutes,
            currentTopicIndex: currentIdx
          },
          {
            time: "09:30 AM",
            icon: "📝",
            taskType: "AI Notes",
            topic: activeTopicTitle,
            reason: `Review detailed conceptual study notes on ${activeTopicTitle}.`,
            subject: activeJourneyStudy.subject,
            chapter: activeJourneyStudy.chapter,
            recommendedStudyTime: activeJourneyStudy.estimatedMinutes,
            currentTopicIndex: currentIdx
          },
          {
            time: "10:00 AM",
            icon: "🧠",
            taskType: "Adaptive Quiz",
            topic: activeTopicTitle,
            reason: `Test your understanding of ${activeTopicTitle} with an adaptive quiz.`,
            subject: activeJourneyStudy.subject,
            chapter: activeJourneyStudy.chapter,
            recommendedStudyTime: activeJourneyStudy.estimatedMinutes,
            currentTopicIndex: currentIdx
          }
        ];

        const freshPlan = {
          generatedFromSubject: activeJourneyStudy.subject,
          generatedFromWeakTopics: [activeTopicTitle],
          tasks: tasks,
          estimatedTime: `${activeJourneyStudy.estimatedMinutes * 3} Minutes focused session`,
          reasons: revisionScheduled ? [
            `Revision priority: Low quiz score detected for ${activeTopicTitle}.`,
            `Aligned to chapter: ${activeJourneyStudy.chapter}.`
          ] : [
            `Prioritized active roadmap topic: ${activeTopicTitle}.`,
            `Aligned to chapter: ${activeJourneyStudy.chapter}.`
          ],
          completion: 0,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('neurolearn_study_plan', JSON.stringify(freshPlan));
        setCurrentPlan(freshPlan);
        setIsRegenerating(false);
        setSuccessMessage("Your subject-specific plan has been optimized!");
      }, 1000);
      return;
    }

    setLoadingText("AI is optimizing your study schedule...");
    setIsRegenerating(true);
    setSuccessMessage("");

    try {
      const savedAssessment = localStorage.getItem('neurolearn_assessment_result');
      const savedGoal = localStorage.getItem('neurolearn_goal_data');
      const savedProfile = localStorage.getItem('neurolearn_learner_profile');
      if (!savedAssessment || !savedGoal) {
        throw new Error("Missing assessment results or user profile");
      }

      const assessmentResult = JSON.parse(savedAssessment);
      const goalData = JSON.parse(savedGoal);
      const profileData = savedProfile ? JSON.parse(savedProfile) : null;

      const subject = assessmentResult.primarySubject || goalData.subjects?.[0] || 'General Learning';
      const weakTopics = assessmentResult.weakTopics || [subject];

      const response = await fetch('/api/generate-study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject,
          weakTopics: weakTopics,
          goal: goalData.examGoal
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`);
      }

      const tasks = await response.json();
      if (Array.isArray(tasks) && tasks.length > 0) {
        const freshPlan = {
          generatedFromSubject: subject,
          generatedFromWeakTopics: weakTopics,
          tasks: tasks,
          estimatedTime: `${goalData.studyTime || '2 hours'} focused session`,
          reasons: [
            `Prioritized weak topics from assessment: ${weakTopics.join(', ')}.`,
            "Regenerated dynamically by Gemini AI."
          ],
          completion: 0,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('neurolearn_study_plan', JSON.stringify(freshPlan));
        setCurrentPlan(freshPlan);
        console.log("Study plan generated");
        setSuccessMessage("Your study plan has been regenerated using real Gemini AI!");
      } else {
        throw new Error("Invalid schedule format received from server");
      }
    } catch (err) {
      console.warn("[StudyPlanPage] Gemini regeneration failed, using local generation:", err);
      // Local fallback
      const savedAssessment = localStorage.getItem('neurolearn_assessment_result');
      const savedGoal = localStorage.getItem('neurolearn_goal_data');
      const savedProfile = localStorage.getItem('neurolearn_learner_profile');
      const assessmentResult = savedAssessment ? JSON.parse(savedAssessment) : null;
      const goalData = savedGoal ? JSON.parse(savedGoal) : null;
      const profileData = savedProfile ? JSON.parse(savedProfile) : null;
      const fallbackPlan = generateStudyPlanPayload(assessmentResult, profileData, goalData);
      localStorage.setItem('neurolearn_study_plan', JSON.stringify(fallbackPlan));
      setCurrentPlan(fallbackPlan);
      console.log("Study plan generated");
      setSuccessMessage("Study plan generated using local dynamic rules.");
    } finally {
      setIsRegenerating(false);
      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
    }
  };

  // Handle final large start learning click
  const handleStartLearning = () => {
    if (currentPlan && currentPlan.tasks && currentPlan.tasks.length > 0) {
      const firstTask = currentPlan.tasks[0];
      const subj = firstTask.subject || activeJourneyStudy?.subject || assessment?.subject || goal?.subjects?.[0] || "General Learning";
      const chap = firstTask.chapter || activeJourneyStudy?.chapter || goal?.chapter || "General Foundations";
      const topicVal = firstTask.topic || activeJourneyStudy?.topicTitle || "General Learning";
      const topicIdx = typeof firstTask.currentTopicIndex === 'number' ? firstTask.currentTopicIndex : (activeJourneyStudy?.topicIndex || 0);
      const recTime = firstTask.recommendedStudyTime || activeJourneyStudy?.estimatedMinutes || 60;
      const taskTypeVal = firstTask.taskType || firstTask.type || "Personalized Video";

      const taskPayload = {
        subject: subj,
        chapter: chap,
        topic: topicVal,
        currentTopicIndex: topicIdx,
        taskType: taskTypeVal,
        recommendedStudyTime: recTime,
        source: "dashboard"
      };

      console.log("Opening learning task:", taskPayload);
      localStorage.setItem('neurolearn_current_learning_task', JSON.stringify(taskPayload));

      if (taskPayload.taskType === 'Adaptive Quiz') {
        navigate('/quiz');
      } else {
        navigate('/learning');
      }
      return;
    }
    navigate('/learning');
  };

  // Render Missing Data state card
  if (isInvalid) {
    return (
      <div className="study-plan-wrapper">
        <div className="missing-data-card study-plan-error-card">
          <div className="alert-icon">⚠️</div>
          <h2 className="alert-title">Study plan data unavailable.</h2>
          <p className="alert-desc">Please complete assessment first.</p>
          <button 
            className="action-button-primary"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="study-plan-wrapper animate-fadeIn">
      {/* Background Glow Orbs */}
      <div className="background-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* REGENERATING OVERLAY */}
      {isRegenerating && (
        <div className="regenerating-overlay">
          <div className="loading-container">
            <div className="loading-spinner">
              <div className="spinner-outer"></div>
              <div className="spinner-inner"></div>
            </div>
            <p className="regenerating-text">{loadingText}</p>
          </div>
        </div>
      )}

      <div className="study-plan-container">
        
        {/* BACK NAVIGATION */}
        <button 
          className="study-plan-back-btn"
          onClick={() => navigate('/dashboard')}
          type="button"
        >
          ← Back
        </button>

        {/* PAGE HEADER */}
        <header className="study-plan-header">
          <h1 className="page-title">Today's AI Study Plan</h1>
          <p className="page-subtitle">A focused plan generated from your weak topics, mistakes, and learning performance.</p>
        </header>

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div className="success-banner" style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            fontSize: '0.95rem',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)',
            animation: 'cardFadeIn 0.3s ease-in-out'
          }}>
            🎉 {successMessage}
          </div>
        )}

        {/* AI PRIORITY BANNER */}
        <section className="priority-banner-card glass-card">
          <div className="priority-card-header">
            <span className="badge-ai-optimized">AI Optimized Plan</span>
            <span className="priority-time-label">Estimated Study Time</span>
          </div>
          <div className="priority-card-body">
            <div className="priority-details">
              <h3 className="priority-card-title">Today's Priority</h3>
              <p className="priority-focus-text">{priorityFocusBanner}</p>
            </div>
            <div className="priority-time-box">
              <span className="time-value">{currentPlan?.estimatedTime || `${studyTime} focused session`}</span>
            </div>
          </div>
        </section>

        {/* MAIN LAYOUT SPLIT */}
        <div className="study-plan-grid-layout">
          
          {/* LEFT COLUMN: TIMELINE */}
          <div className="study-plan-timeline-section">
            <h2 className="section-title">Schedule Timeline</h2>
            
            <div className="timeline-track-container">
              <div className="timeline-line"></div>
              
              <div className="timeline-tasks-list">
                {currentPlan?.tasks?.map((task, idx) => (
                  <div key={idx} className="timeline-card-wrapper">
                    
                    {/* Node Dot on line */}
                    <div className="timeline-node">
                      <span className="node-icon">{task.icon}</span>
                    </div>

                    {/* Task Content Card */}
                    <div className="timeline-task-card glass-card">
                      <div className="task-header-row">
                        <span className="task-time">{task.time}</span>
                        <span className="task-type-badge">{task.taskType || task.type}</span>
                      </div>
                      <div className="task-body">
                        <h4 className="task-topic">{task.topic}</h4>
                        <p className="task-reason">{task.reason}</p>
                      </div>
                      <div className="task-footer">
                        <button 
                          className="task-start-btn"
                          onClick={() => handleStartTask(task)}
                        >
                          Start
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: RATIONALE, PROGRESS & ACTIONS */}
          <div className="study-plan-right-sidebar">
            
            {/* WHY AI CHOSE THIS CARD */}
            <div className="glass-card sidebar-panel-card">
              <h3 className="panel-title text-indigo-title">Why this plan?</h3>
              <ul className="rationale-list">
                {currentPlan?.reasons?.map((reason, idx) => (
                  <li key={idx} className="rationale-item">
                    <span className="rationale-bullet">✦</span>
                    <span className="rationale-text">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* TODAY'S COMPLETION PREVIEW */}
            <div className="glass-card sidebar-panel-card">
              <h3 className="panel-title">Today's Completion</h3>
              <div className="completion-progress-wrapper">
                <div className="completion-percentage-row">
                  <span className="completion-value">{activeJourneyStudy?.topicProgressPercent || 0}%</span>
                  <span className="completion-status">
                    {activeJourneyStudy?.topicProgressPercent === 100 ? "Completed ✓" : (activeJourneyStudy?.topicProgressPercent > 0 ? "In Progress" : "Not Started")}
                  </span>
                </div>
                <div className="completion-progress-track" style={{ marginBottom: '1rem' }}>
                  <div className="completion-progress-fill" style={{ width: `${activeJourneyStudy?.topicProgressPercent || 0}%` }}></div>
                </div>

                {/* Roadmap Progress */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Roadmap Progress</span>
                  <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>
                    {activeJourneyStudy?.completedTopics || 0}/{activeJourneyStudy?.totalTopics || 0} topics
                  </span>
                </div>
                <div className="completion-progress-track">
                  <div className="completion-progress-fill" style={{ width: `${activeJourneyStudy?.progressPercent || 0}%`, backgroundColor: '#818cf8' }}></div>
                </div>
                <p className="completion-footer-text" style={{ marginTop: '0.5rem' }}>
                  Complete learning tasks to unlock tomorrow's adaptive plan.
                </p>
              </div>
            </div>

            {/* REGENERATE ACTION */}
            <div className="sidebar-action-container">
              <button 
                className="btn-secondary-action width-full"
                onClick={handleRegeneratePlan}
              >
                Regenerate AI Plan
              </button>
            </div>

          </div>

        </div>

        {/* FINAL CTA BOTTOM */}
        <footer className="study-plan-bottom-cta">
          <button 
            className="action-button-primary start-learning-cta"
            onClick={handleStartLearning}
          >
            START LEARNING
          </button>
        </footer>
      </div>
    </div>
  );
};

export default StudyPlanPage;
