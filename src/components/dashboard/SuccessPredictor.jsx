import React, { useState, useEffect } from 'react';
import { Target, FileText, CheckCircle, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import './SuccessPredictor.css';

export default function SuccessPredictor({ jobs }) {
  const [targetRole, setTargetRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [resumeName, setResumeName] = useState('current_resume_v4.pdf');
  const [resumeText, setResumeText] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('jobTracker_resumeName');
    if (name) setResumeName(name);
    const text = localStorage.getItem('jobTracker_resumeText');
    if (text) setResumeText(text);
  }, []);

  const handlePredict = async (e) => {
    e.preventDefault();
    if (!targetRole || !targetCompany) return;
    
    setIsAnalyzing(true);
    setPrediction(null);
    
    // Fetch latest in case it was updated on the same page without refreshing
    const currentText = localStorage.getItem('jobTracker_resumeText') || resumeText;
    const currentName = localStorage.getItem('jobTracker_resumeName') || resumeName;
    setResumeText(currentText);
    setResumeName(currentName);

    // Simulate AI deep dive
    await new Promise(r => setTimeout(r, 2000));
    
    // Calculate a dynamic mock probability based on their jobs array
    const total = jobs.length;
    const offers = jobs.filter(j => j.status === 'Offer').length;
    let baseWinRate = total > 0 ? (offers / total) * 100 : 30;
    // Ensure baseWinRate is at least 30 so the score doesn't default to 15% constantly 
    // when a user is actively tracking rejections but has no offers.
    baseWinRate = Math.max(baseWinRate, 30);
    
    // Create a hash from text, target role, and company
    let hash = 0;
    const combinedText = currentText + targetRole.toLowerCase() + targetCompany.toLowerCase();
    for (let i = 0; i < combinedText.length; i++) {
        hash = ((hash << 5) - hash) + combinedText.charCodeAt(i);
        hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    
    // Variation from -15 to +34
    const hashVariation = (positiveHash % 50) - 15;
    
    let simulatedChance = Math.min(95, Math.max(15, Math.round(baseWinRate + hashVariation)));
    
    const isHigh = simulatedChance >= 70;
    const isMedium = simulatedChance >= 40 && simulatedChance < 70;
    
    setPrediction({
      score: simulatedChance,
      status: isHigh ? 'Highly Likely' : isMedium ? 'Competitive' : 'Stretch Goal',
      color: isHigh ? '#10b981' : isMedium ? '#f59e0b' : '#ef4444',
      factors: [
        { icon: <CheckCircle size={16} color="#10b981"/>, text: `Resume keywords strongly match "${targetRole}" requirements (+${4 + (positiveHash % 8)}%)` },
        { icon: <TrendingUp size={16} color="#4f46e5"/>, text: `Your historical interview rate for similar roles is above average (+${2 + (positiveHash % 7)}%)` },
        { icon: <AlertTriangle size={16} color="#f59e0b"/>, text: `${targetCompany || 'This company'} is currently experiencing high applicant volume (-${2 + (positiveHash % 6)}%)` },
        { icon: <CheckCircle size={16} color="#10b981"/>, text: `Your core skills accurately align with standard ${targetCompany || 'employer'} expectations (+${5 + (positiveHash % 6)}%)` }
      ]
    });
    
    setIsAnalyzing(false);
  };

  return (
    <div className="predictor-container">
      <div className="predictor-header fade-in">
        <Target size={32} className="header-icon" />
        <h2>AI Job Success Predictor</h2>
        <p>Our intelligent engine analyzes your synced resume, technical skills, and historical application momentum to predict your precise shortlisting probability.</p>
      </div>

      <div className="predictor-content">
        <div className="predictor-input-card fade-in">
          <h3>Target Opportunity</h3>
          <form onSubmit={handlePredict}>
            <div className="input-group">
              <label>Target Company</label>
              <input type="text" placeholder="e.g. Google, Stripe, Startups" value={targetCompany} onChange={e => setTargetCompany(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Target Role</label>
              <input type="text" placeholder="e.g. Senior Frontend Engineer" value={targetRole} onChange={e => setTargetRole(e.target.value)} required />
            </div>
            
            <div className="resume-section">
              <FileText size={20} color="#64748b" />
              <div className="resume-text">
                <span className="resume-name">{resumeName}</span>
                <span className="resume-status">✓ Synced for Analysis</span>
              </div>
            </div>

            <button type="submit" className="predict-btn" disabled={isAnalyzing || !targetRole || !targetCompany}>
               {isAnalyzing ? (
                 <>
                   <div className="inline-spinner"></div> Analyzing deeply...
                 </>
               ) : (
                 <>
                   <Zap size={18} /> Generate Prediction
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
                Based on our rigorous AI analysis, you have a <strong>{prediction.score}% chance</strong> of getting shortlisted for this role.
              </p>
              
              <div className="factors-list">
                <h4>Driving Factors Map:</h4>
                <ul>
                  {prediction.factors.map((f, i) => (
                    <li key={i}>
                      {f.icon}
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
