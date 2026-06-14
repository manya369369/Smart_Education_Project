import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/GoalSetupPage.css';

const GoalSetupPage = () => {
  const navigate = useNavigate();

  // Try to load any existing progress from localStorage
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('neurolearn_goal_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || '',
          examGoal: parsed.examGoal || '',
          subjects: parsed.subjects || [],
          examDate: parsed.examDate || '',
          studyTime: parsed.studyTime || ''
        };
      }
    } catch (e) {
      console.error("Error reading from localStorage", e);
    }
    return {
      name: '',
      examGoal: '',
      subjects: [],
      examDate: '',
      studyTime: ''
    };
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [customSubjectText, setCustomSubjectText] = useState('');
  
  // Track custom subjects loaded or added
  const [customSubjects, setCustomSubjects] = useState(() => {
    try {
      const saved = localStorage.getItem('neurolearn_goal_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedSubjects = parsed.subjects || [];
        const predefined = ['Data Structures', 'DBMS', 'Operating System', 'Mathematics', 'Physics', 'Chemistry'];
        return savedSubjects.filter(sub => !predefined.includes(sub));
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const subjectOptions = [
    'Data Structures',
    'DBMS',
    'Operating System',
    'Mathematics',
    'Physics',
    'Chemistry'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubjectToggle = (subject) => {
    setFormData(prev => {
      const isSelected = prev.subjects.includes(subject);
      const updatedSubjects = isSelected
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject];
      return { ...prev, subjects: updatedSubjects };
    });
  };

  const handleAddCustomSubject = () => {
    const trimmed = customSubjectText.trim();
    if (!trimmed) return;

    const allSelected = formData.subjects;
    if (allSelected.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage('Subject is already selected.');
      return;
    }

    setCustomSubjects(prev => [...prev, trimmed]);
    setFormData(prev => ({
      ...prev,
      subjects: [...prev.subjects, trimmed]
    }));
    setCustomSubjectText('');
    setErrorMessage('');
  };

  const handleRemoveCustomSubject = (subject) => {
    setCustomSubjects(prev => prev.filter(s => s !== subject));
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter(s => s !== subject)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const { name, examGoal, subjects, examDate, studyTime } = formData;

    // Check if any required field is empty
    if (!name.trim() || !examGoal || !examDate || !studyTime) {
      setErrorMessage('Please complete all required fields before continuing.');
      return;
    }

    // Check if at least one subject is chosen
    if (subjects.length === 0) {
      setErrorMessage('Please select at least one subject.');
      return;
    }

    // Reset stale data if subjects changed
    try {
      const saved = localStorage.getItem('neurolearn_goal_data');
      let subjectsChanged = false;
      if (saved) {
        const parsed = JSON.parse(saved);
        const prevSubjects = parsed.subjects || [];
        // Compare lists
        if (prevSubjects.length !== subjects.length || !prevSubjects.every(s => subjects.includes(s))) {
          subjectsChanged = true;
        }
      } else {
        subjectsChanged = true;
      }

      if (subjectsChanged) {
        console.log("[GoalSetupPage] Subjects changed. Clearing stale learning data...");
        const keysToClear = [
          'neurolearn_generated_questions',
          'neurolearn_assessment_result',
          'neurolearn_learner_profile',
          'neurolearn_study_plan',
          'neurolearn_current_learning_task',
          'neurolearn_quiz_result',
          'neurolearn_tomorrow_plan'
        ];
        keysToClear.forEach(key => localStorage.removeItem(key));
      }
    } catch (err) {
      console.error("Error clearing stale data", err);
    }

    // Save valid data in localStorage
    try {
      localStorage.setItem('neurolearn_goal_data', JSON.stringify({
        name: name.trim(),
        examGoal,
        subjects,
        examDate,
        studyTime
      }));
      console.log("Goal data saved");
    } catch (e) {
      console.error("Error writing to localStorage", e);
    }

    // Navigate to /assessment
    navigate('/assessment');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="goal-setup-wrapper">
      {/* Small Back button with arrow at top-left corner */}
      <button className="back-button" onClick={handleBack} type="button">
        ← Back
      </button>

      {/* Main card centered on page */}
      <div className="goal-card">
        <header className="goal-card-header">
          <h1 className="goal-card-title">Set Your Learning Goal</h1>
          <p className="goal-card-subtitle">
            Tell NeuroLearn AI about your exam, subjects, and study routine.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="goal-form">
          {/* Error Message inside the card */}
          {errorMessage && (
            <div className="error-banner">
              <span className="error-icon">!</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Student Name */}
          <div className="form-group">
            <label htmlFor="name-input" className="form-label">
              Your Name
            </label>
            <input
              id="name-input"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your name"
              className="form-input"
            />
          </div>

          {/* 2. Exam Goal */}
          <div className="form-group">
            <label htmlFor="exam-goal-select" className="form-label">
              What are you preparing for?
            </label>
            <select
              id="exam-goal-select"
              name="examGoal"
              value={formData.examGoal}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value="" disabled>Select your exam goal</option>
              <option value="Semester Exam">Semester Exam</option>
              <option value="JEE">JEE</option>
              <option value="NEET">NEET</option>
              <option value="GATE">GATE</option>
              <option value="School Exam">School Exam</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* 3. Subjects (Checkbox cards) */}
          <div className="form-group">
            <span className="form-label">Choose your subjects</span>
            <div className="subjects-grid">
              {subjectOptions.map((subject) => {
                const isSelected = formData.subjects.includes(subject);
                return (
                  <label
                    key={subject}
                    className={`subject-card ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSubjectToggle(subject)}
                      className="subject-checkbox"
                    />
                    <span className="custom-checkbox-indicator"></span>
                    <span className="subject-card-label">{subject}</span>
                  </label>
                );
              })}

              {/* Custom subjects displayed as active card with delete action */}
              {customSubjects.map((subject) => (
                <div
                  key={subject}
                  className="subject-card selected custom-subject-card"
                >
                  <span className="subject-card-label">{subject}</span>
                  <button
                    type="button"
                    className="remove-subject-btn"
                    onClick={() => handleRemoveCustomSubject(subject)}
                    title="Remove custom subject"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add custom subjects input */}
          <div className="form-group">
            <label htmlFor="custom-subject-input" className="form-label">
              Add Your Own Subject
            </label>
            <div className="custom-subject-input-group">
              <input
                id="custom-subject-input"
                type="text"
                value={customSubjectText}
                onChange={(e) => setCustomSubjectText(e.target.value)}
                placeholder="Example: Biology, English, History, Machine Learning"
                className="form-input"
              />
              <button
                type="button"
                onClick={handleAddCustomSubject}
                className="add-subject-button"
              >
                Add Subject
              </button>
            </div>
          </div>

          {/* 4. Exam Date */}
          <div className="form-group">
            <label htmlFor="exam-date-input" className="form-label">
              Exam Date
            </label>
            <input
              id="exam-date-input"
              type="date"
              name="examDate"
              value={formData.examDate}
              onChange={handleInputChange}
              className="form-input"
            />
          </div>

          {/* 5. Daily Study Time */}
          <div className="form-group">
            <label htmlFor="study-time-select" className="form-label">
              Daily Study Time
            </label>
            <select
              id="study-time-select"
              name="studyTime"
              value={formData.studyTime}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value="" disabled>Select daily study time</option>
              <option value="1 hour">1 hour</option>
              <option value="2 hours">2 hours</option>
              <option value="3 hours">3 hours</option>
              <option value="4+ hours">4+ hours</option>
            </select>
          </div>

          {/* Continue button */}
          <div className="button-container">
            <button type="submit" className="submit-button">
              CONTINUE TO ASSESSMENT
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalSetupPage;
