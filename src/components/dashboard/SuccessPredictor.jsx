import React, { useState, useEffect } from 'react';
import { Target, FileText, CheckCircle, TrendingUp, AlertTriangle, Zap, Briefcase, Award, Sparkles, Lightbulb } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile } from '../../services/db';
import { predictJobSuccess } from '../../services/openai';
import { AutocompleteInput, SUGGESTION_DICTIONARY } from '../common/AutocompleteInput';
import './SuccessPredictor.css';

export default function SuccessPredictor({ jobs = [] }) {
  const { currentUser } = useAuth();
  const [targetRole, setTargetRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [resumeName, setResumeName] = useState('current_resume.pdf');
  const [resumeText, setResumeText] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const name = localStorage.getItem('jobTracker_resumeName');
    if (name) setResumeName(name);
    const text = localStorage.getItem('jobTracker_resumeText');
    if (text) setResumeText(text);

    const fetchProfile = async () => {
      if (currentUser?.uid) {
        try {
          const data = await getUserProfile(currentUser.uid);
          if (data) setUserProfile(data);
        } catch (err) {
          console.error("Error loading user profile for predictor:", err);
        }
      }
    };
    fetchProfile();
  }, [currentUser]);

  const handlePredict = async (e) => {
    e.preventDefault();
    if (!targetRole || !targetCompany) return;

    setIsAnalyzing(true);
    setPrediction(null);

    const currentText = localStorage.getItem('jobTracker_resumeText') || resumeText;
    const currentName = localStorage.getItem('jobTracker_resumeName') || resumeName;
    setResumeText(currentText);
    setResumeName(currentName);

    try {
      const result = await predictJobSuccess({
        targetRole: targetRole.trim(),
        targetCompany: targetCompany.trim(),
        jobDescription: jobDescription.trim(),
        userProfile: userProfile || {},
        resumeText: currentText,
        jobs
      });
      setPrediction(result);
    } catch (err) {
      console.error("Error generating AI job prediction:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getFactorIcon = (iconType) => {
    if (iconType === 'warning') return <AlertTriangle size={16} color="#ef4444" />;
    if (iconType === 'trending') return <TrendingUp size={16} color="#3b82f6" />;
    return <CheckCircle size={16} color="#10b981" />;
  };

  const expCount = userProfile?.workExperience?.length || 0;
  const projCount = userProfile?.projects?.length || 0;
  const totalTracked = jobs.length;

  return (
    <div className="predictor-container">
      <div className="predictor-header fade-in">
        <Target size={32} className="header-icon" />
        <h2>AI Job Success Predictor</h2>
        <p>Our AI engine evaluates your real Master CV profile, technical competencies, verified projects, and historical application analytics to predict your exact shortlisting probability.</p>
      </div>

      {/* Real Data Evidence Chips */}
      <div className="predictor-data-chips fade-in" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(37, 99, 235, 0.08)', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, color: '#2563eb' }}>
          <Briefcase size={14} />
          <span>{expCount} Work Experience Role(s)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, color: '#10b981' }}>
          <Sparkles size={14} />
          <span>{projCount} Featured Project(s)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, color: '#8b5cf6' }}>
          <Award size={14} />
          <span>{totalTracked} Tracked Application(s)</span>
        </div>
      </div>

      <div className="predictor-content">
        <div className="predictor-input-card fade-in">
          <h3>Target Opportunity</h3>
          <form onSubmit={handlePredict}>
            <div className="input-group">
              <label>Target Company</label>
              <AutocompleteInput
                value={targetCompany}
                onChange={setTargetCompany}
                placeholder="e.g. Google, Microsoft, Stripe, Startups"
                suggestions={SUGGESTION_DICTIONARY.companies}
              />
            </div>
            <div className="input-group">
              <label>Target Role</label>
              <AutocompleteInput
                value={targetRole}
                onChange={setTargetRole}
                placeholder="e.g. Senior Full Stack Developer, DevOps Engineer"
                suggestions={SUGGESTION_DICTIONARY.jobTitles}
              />
            </div>

            <div className="input-group">
              <label>Job Description (Optional - For Pinpoint AI Match)</label>
              <textarea
                rows={3}
                placeholder="Paste job posting text or key responsibilities here..."
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.88rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical' }}
              />
            </div>
            
            <div className="resume-section">
              <FileText size={20} color="#64748b" />
              <div className="resume-text">
                <span className="synced-resume-name">{resumeName}</span>
                <span className="resume-status">✓ Synced Real Profile Data</span>
              </div>
            </div>

            <button type="submit" className="predict-btn" disabled={isAnalyzing || !targetRole || !targetCompany}>
               {isAnalyzing ? (
                 <>
                   <div className="inline-spinner"></div> Evaluating Real Profile Data...
                 </>
               ) : (
                 <>
                   <Zap size={18} /> Run AI Prediction Engine
                 </>
               )}
            </button>
          </form>
        </div>

        {prediction && (
          <div className="prediction-result-card fade-in">
            <div className="score-ring-container">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path className="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path className="circle-value"
                  strokeDasharray={`${prediction.score}, 100`}
                  stroke={prediction.color}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className="percentage" style={{ fill: prediction.color }}>{prediction.score}%</text>
              </svg>
            </div>
            
            <div className="prediction-details">
              <h3 style={{ color: prediction.color }}>{prediction.status}</h3>
              <p className="prediction-summary">
                Based on your real profile data and application analytics, you have a <strong>{prediction.score}% shortlisting probability</strong> for {targetRole} at {targetCompany}.
              </p>
              
              <div className="factors-list">
                <h4>Driving Factors Breakdown:</h4>
                <ul>
                  {prediction.factors.map((f, i) => (
                    <li key={i}>
                      {getFactorIcon(f.iconType)}
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {prediction.actionableSteps && prediction.actionableSteps.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    <Lightbulb size={16} color="#f59e0b" />
                    Actionable Recommendations to Boost Odds:
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {prediction.actionableSteps.map((step, idx) => (
                      <li key={idx} style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '6px', paddingLeft: '16px', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, color: 'var(--primary-color)' }}>•</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

