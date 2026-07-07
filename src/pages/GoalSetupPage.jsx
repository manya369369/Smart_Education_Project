import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/GoalSetupPage.css';

const GoalSetupPage = () => {
  const navigate = useNavigate();

  // Try to load any existing progress from localStorage
  const [formData, setFormData] = useState(() => {
    let initialName = '';
    try {
      const userRaw = localStorage.getItem('neurolearn_user');
      if (userRaw) {
        const userObj = JSON.parse(userRaw);
        initialName = userObj.name || '';
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem('neurolearn_goal_data');
      const savedStudentType = localStorage.getItem('neurolearn_student_type') || '';
      const savedClassOrSemester = localStorage.getItem('neurolearn_student_class_or_semester') || '';
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || initialName || '',
          examGoal: 'General Learning',
          examDate: parsed.examDate || '',
          studyTime: parsed.studyTime || '',
          studentType: savedStudentType || parsed.studentType || '',
          classOrSemester: savedClassOrSemester || parsed.classOrSemester || ''
        };
      }
    } catch (e) {
      console.error("Error reading from localStorage", e);
    }
    return {
      name: initialName || '',
      examGoal: 'General Learning',
      examDate: '',
      studyTime: '',
      studentType: '',
      classOrSemester: ''
    };
  });

  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'studentType') {
        updated.classOrSemester = ''; // Reset when type changes
      }
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const { name, examGoal, examDate, studyTime, studentType, classOrSemester } = formData;

    // Check if any required field is empty
    if (!name.trim() || !examGoal || !examDate || !studyTime || !studentType || !classOrSemester) {
      setErrorMessage('Please complete all required fields before continuing.');
      return;
    }

    // Reset stale data
    try {
      const keysToClear = [
        'neurolearn_setup_data',
        'neurolearn_generated_questions',
        'neurolearn_assessment_result',
        'neurolearn_learner_profile',
        'neurolearn_study_plan',
        'neurolearn_current_learning_task',
        'neurolearn_quiz_result',
        'neurolearn_tomorrow_plan',
        'neurolearn_learning_sessions',
        'neurolearn_active_subject_journey',
        'activeSubjectJourney',
        'neurolearn_active_journey',
        'neurolearn_subject_timetables',
        'neurolearn_topic_attempts'
      ];
      keysToClear.forEach(key => localStorage.removeItem(key));
    } catch (err) {
      console.error("Error clearing stale data", err);
    }

    // Save valid data in localStorage
    try {
      localStorage.setItem('neurolearn_student_type', studentType);
      localStorage.setItem('neurolearn_student_class_or_semester', classOrSemester);
      localStorage.setItem('neurolearn_goal_data', JSON.stringify({
        name: name.trim(),
        examGoal,
        examDate,
        studyTime,
        studentType,
        classOrSemester
      }));
      console.log("Goal data saved");
    } catch (e) {
      console.error("Error writing to localStorage", e);
    }

    // Navigate to /learning-mode-setup
    navigate('/learning-mode-setup');
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

          {/* 3. Student Type (School vs College) */}
          <div className="form-group">
            <span className="form-label">I am a</span>
            <div className="student-type-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
              <label className={`subject-card ${formData.studentType === 'School Student' ? 'selected' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="radio"
                  name="studentType"
                  value="School Student"
                  checked={formData.studentType === 'School Student'}
                  onChange={handleInputChange}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
                <span className="custom-radio-indicator" style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  background: formData.studentType === 'School Student' ? '#6366f1' : 'transparent',
                  borderColor: formData.studentType === 'School Student' ? '#6366f1' : 'rgba(255, 255, 255, 0.3)'
                }}>
                  {formData.studentType === 'School Student' && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}></span>
                  )}
                </span>
                <span className="subject-card-label">School Student</span>
              </label>

              <label className={`subject-card ${formData.studentType === 'College Student' ? 'selected' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="radio"
                  name="studentType"
                  value="College Student"
                  checked={formData.studentType === 'College Student'}
                  onChange={handleInputChange}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
                <span className="custom-radio-indicator" style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  background: formData.studentType === 'College Student' ? '#6366f1' : 'transparent',
                  borderColor: formData.studentType === 'College Student' ? '#6366f1' : 'rgba(255, 255, 255, 0.3)'
                }}>
                  {formData.studentType === 'College Student' && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}></span>
                  )}
                </span>
                <span className="subject-card-label">College Student</span>
              </label>
            </div>
          </div>

          {/* Conditional Dropdown for Class or Semester */}
          {formData.studentType && (
            <div className="form-group" style={{ animation: 'slideDown 0.3s ease' }}>
              <label htmlFor="class-semester-select" className="form-label">
                {formData.studentType === 'School Student' ? 'Choose Class' : 'Choose Semester'}
              </label>
              <select
                id="class-semester-select"
                name="classOrSemester"
                value={formData.classOrSemester}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="" disabled>
                  {formData.studentType === 'School Student' ? 'Select your class' : 'Select your semester'}
                </option>
                {formData.studentType === 'School Student' ? (
                  <>
                    <option value="Class 6">Class 6</option>
                    <option value="Class 7">Class 7</option>
                    <option value="Class 8">Class 8</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                  </>
                ) : (
                  <>
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                    <option value="Semester 3">Semester 3</option>
                    <option value="Semester 4">Semester 4</option>
                    <option value="Semester 5">Semester 5</option>
                    <option value="Semester 6">Semester 6</option>
                    <option value="Semester 7">Semester 7</option>
                    <option value="Semester 8">Semester 8</option>
                  </>
                )}
              </select>
            </div>
          )}

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
              CONTINUE TO LEARNING MODE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalSetupPage;
