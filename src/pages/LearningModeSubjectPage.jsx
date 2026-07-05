import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LearningModeSubjectPage.css';

const PLACEHOLDERS = {
  'Science': 'Example: Reproduction in Plants',
  'Mathematics': 'Example: Quadratic Equations',
  'English': 'Example: Reading Comprehension',
  'Hindi': 'Example: Grammar Basics',
  'Social Science (SST)': 'Example: French Revolution',
  'Data Structures & Algorithms (DSA)': 'Example: Binary Trees',
  'Database Management System (DBMS)': 'Example: Normalization',
  'Generative AI': 'Example: Prompt Engineering',
  'Web Development': 'Example: React Routing',
  'Aptitude': 'Example: Time and Work'
};

const LearningModeSubjectPage = () => {
  const navigate = useNavigate();

  // Load studentType and goalData from localStorage
  const [studentType] = useState(() => {
    return localStorage.getItem('neurolearn_student_type') || 'College Student';
  });

  const [goalData] = useState(() => {
    try {
      const saved = localStorage.getItem('neurolearn_goal_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // State initialization
  const [learningMode, setLearningMode] = useState('Focus Mode'); // Focus Mode or Balanced Mode
  const [selectedSubjects, setSelectedSubjects] = useState([]); // Array of { subject, chapter }
  const [customSubjectText, setCustomSubjectText] = useState('');
  const [customSubjects, setCustomSubjects] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Default subject options based on student type
  const defaultSchoolSubjects = [
    'Science',
    'Mathematics',
    'English',
    'Hindi',
    'Social Science (SST)'
  ];

  const defaultCollegeSubjects = [
    'Data Structures & Algorithms (DSA)',
    'Database Management System (DBMS)',
    'Generative AI',
    'Web Development',
    'Aptitude',
    'English'
  ];

  const subjectsPool = studentType === 'School Student' ? defaultSchoolSubjects : defaultCollegeSubjects;
  const allSubjectsList = [...subjectsPool, ...customSubjects];

  // Try to load any existing setup data from localStorage
  useEffect(() => {
    try {
      const savedSetup = localStorage.getItem('neurolearn_setup_data');
      if (savedSetup) {
        const parsed = JSON.parse(savedSetup);
        if (parsed.learningMode) setLearningMode(parsed.learningMode);
        if (parsed.subjects) {
          setSelectedSubjects(parsed.subjects);
          // Re-populate custom subjects if they are not in the predefined list
          const custom = parsed.subjects
            .map(s => s.subject)
            .filter(subName => !subjectsPool.includes(subName));
          setCustomSubjects(custom);
        }
      }
    } catch (e) {
      console.error('Error loading setup data', e);
    }
  }, []);

  const handleModeChange = (mode) => {
    setLearningMode(mode);
    setErrorMessage('');
    // If switching to Focus Mode and we have 2 subjects, truncate to first one
    if (mode === 'Focus Mode' && selectedSubjects.length > 1) {
      setSelectedSubjects(selectedSubjects.slice(0, 1));
    }
  };

  const handleSubjectToggle = (subjectName) => {
    setErrorMessage('');
    const index = selectedSubjects.findIndex(s => s.subject === subjectName);

    if (index > -1) {
      // Deselect subject
      setSelectedSubjects(prev => prev.filter(s => s.subject !== subjectName));
    } else {
      // Select subject
      if (learningMode === 'Focus Mode') {
        // Focus Mode allows only 1 subject
        setSelectedSubjects([{ subject: subjectName, chapter: '' }]);
      } else {
        // Balanced Mode allows max 2 subjects
        if (selectedSubjects.length >= 2) {
          setErrorMessage('Balanced Mode only allows selecting up to 2 subjects.');
          return;
        }
        setSelectedSubjects(prev => [...prev, { subject: subjectName, chapter: '' }]);
      }
    }
  };

  const handleChapterChange = (subjectName, chapterText) => {
    setSelectedSubjects(prev => prev.map(s => {
      if (s.subject === subjectName) {
        return { ...s, chapter: chapterText };
      }
      return s;
    }));
  };

  const handleAddCustomSubject = (e) => {
    e.preventDefault();
    const trimmed = customSubjectText.trim();
    if (!trimmed) return;

    if (allSubjectsList.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage('Subject already exists.');
      return;
    }

    setCustomSubjects(prev => [...prev, trimmed]);
    setCustomSubjectText('');
    setErrorMessage('');

    // Automatically select the newly added subject if limits allow
    if (learningMode === 'Focus Mode') {
      setSelectedSubjects([{ subject: trimmed, chapter: '' }]);
    } else {
      if (selectedSubjects.length < 2) {
        setSelectedSubjects(prev => [...prev, { subject: trimmed, chapter: '' }]);
      } else {
        setErrorMessage('Subject added! Deselect a subject to choose the custom one.');
      }
    }
  };

  const handleRemoveCustomSubject = (subjectName, e) => {
    e.stopPropagation(); // Avoid triggering card selection
    setCustomSubjects(prev => prev.filter(s => s !== subjectName));
    setSelectedSubjects(prev => prev.filter(s => s.subject !== subjectName));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validate selections
    if (selectedSubjects.length === 0) {
      setErrorMessage('Please select at least one subject to study.');
      return;
    }

    if (learningMode === 'Balanced Mode' && selectedSubjects.length < 2) {
      setErrorMessage('Please select exactly 2 subjects for Balanced Mode, or switch to Focus Mode.');
      return;
    }

    // Validate that all selected subjects have a chapter configured
    const missingChapter = selectedSubjects.some(s => !s.chapter.trim());
    if (missingChapter) {
      setErrorMessage('Please specify the Chapter / Topic to Study for all selected subjects.');
      return;
    }

    // Prepare onboarding details payload
    const setupDataPayload = {
      studentType,
      learningMode,
      subjects: selectedSubjects
    };

    // Save to localStorage under standard setup key
    localStorage.setItem('neurolearn_setup_data', JSON.stringify(setupDataPayload));

    // Update existing neurolearn_goal_data subjects list to keep rest of app compatible
    if (goalData) {
      const updatedGoalData = {
        ...goalData,
        subjects: selectedSubjects.map(s => s.subject)
      };
      localStorage.setItem('neurolearn_goal_data', JSON.stringify(updatedGoalData));
    }

    // Redirect to roadmap
    navigate('/roadmap');
  };

  const handleBack = () => {
    navigate('/goal-setup');
  };

  return (
    <div className="learning-mode-wrapper">
      <button className="back-button" onClick={handleBack} type="button">
        ← Back
      </button>

      <div className="learning-mode-card">
        <header className="learning-mode-header">
          <h1 className="learning-mode-title">Learning Mode & Subject Setup</h1>
          <p className="learning-mode-subtitle">
            Configure your daily study format and select focus areas.
          </p>
        </header>

        {errorMessage && (
          <div className="error-banner">
            <span className="error-icon">!</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="learning-mode-form">
          
          {/* STEP 3 - Choose Your Learning Mode */}
          <div className="form-group">
            <span className="form-label">Choose Your Learning Mode</span>
            
            <div className="mode-selection-grid">
              <div 
                className={`mode-card ${learningMode === 'Focus Mode' ? 'selected' : ''}`}
                onClick={() => handleModeChange('Focus Mode')}
              >
                <div className="mode-card-header">
                  <span className="mode-radio-indicator">
                    {learningMode === 'Focus Mode' && <span className="radio-dot"></span>}
                  </span>
                  <span className="mode-card-title">Focus Mode</span>
                </div>
                <p className="mode-card-desc">Study one subject today.</p>
              </div>

              <div 
                className={`mode-card ${learningMode === 'Balanced Mode' ? 'selected' : ''}`}
                onClick={() => handleModeChange('Balanced Mode')}
              >
                <div className="mode-card-header">
                  <span className="mode-radio-indicator">
                    {learningMode === 'Balanced Mode' && <span className="radio-dot"></span>}
                  </span>
                  <span className="mode-card-title">Balanced Mode</span>
                </div>
                <p className="mode-card-desc">Study two subjects today.</p>
              </div>
            </div>
          </div>

          {/* STEP 4 & 5 - Subject Selection & Chapter Configuration */}
          <div className="form-group">
            <span className="form-label">
              Select {learningMode === 'Focus Mode' ? 'Subject' : 'Subjects (Max 2)'}
            </span>
            
            <div className="subjects-configuration-list">
              {allSubjectsList.map(subject => {
                const selectedObj = selectedSubjects.find(s => s.subject === subject);
                const isSelected = !!selectedObj;
                const isCustom = customSubjects.includes(subject);

                return (
                  <div 
                    key={subject}
                    className={`subject-config-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSubjectToggle(subject)}
                  >
                    <div className="subject-card-top-row">
                      <div className="subject-card-left">
                        <span className="custom-checkbox-indicator"></span>
                        <span className="subject-title">{subject}</span>
                      </div>
                      {isCustom && (
                        <button
                          type="button"
                          className="remove-subject-btn"
                          onClick={(e) => handleRemoveCustomSubject(subject, e)}
                          title="Remove custom subject"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Expand card if selected for Chapter Entry */}
                    {isSelected && (
                      <div 
                        className="subject-card-expanded"
                        onClick={(e) => e.stopPropagation()} // Prevent card deselection when clicking inside input
                      >
                        <div className="chapter-input-group">
                          <label className="chapter-input-label">Chapter / Topic to Study</label>
                          <input
                            type="text"
                            className="chapter-form-input"
                            value={selectedObj.chapter}
                            onChange={(e) => handleChapterChange(subject, e.target.value)}
                            placeholder={PLACEHOLDERS[subject] || 'Example: Core Concepts'}
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Custom Subject Field */}
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
                placeholder="Example: Biology, History, Machine Learning"
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

          {/* Continue button */}
          <div className="button-container">
            <button type="submit" className="submit-button">
              CONTINUE TO ROADMAP
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default LearningModeSubjectPage;
