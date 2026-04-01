import React, { useMemo, useState } from 'react';
import { Briefcase, Users, Trophy, XCircle, BarChart2, List as ListIcon, Brain, AlertCircle, TrendingUp, Target, RefreshCw, CheckCircle, Mail } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { processManualEmailText } from '../../services/emailProcessor';
import { updateJob } from '../../services/db';
import './Dashboard.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']; // Applied, Interviewing, Offer, Rejected

export default function Dashboard({ jobs, currentTab, setCurrentTab }) {
  const { currentUser } = useAuth();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailText, setEmailText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncNotifications, setSyncNotifications] = useState([]);

  const handleProcessEmail = async () => {
    if (!emailText.trim()) return;
    
    setIsProcessing(true);
    setSyncNotifications([]);
    
    try {
      const result = processManualEmailText(emailText, jobs);
      
      if (result.success) {
         await updateJob(currentUser.uid, result.jobId, { 
           status: result.newStatus,
           notes: `Updated to ${result.newStatus} via Manual Email Analysis.` 
         });
         
         setSyncNotifications([{ type: 'success', message: result.message }]);
         setIsEmailModalOpen(false);
         setEmailText('');
      } else {
         setSyncNotifications([{ type: 'info', message: result.message }]);
      }
      
      setTimeout(() => setSyncNotifications([]), 6000);
    } catch (error) {
       console.error(error);
       setSyncNotifications([{ type: 'error', message: 'Error processing email text.' }]);
       setTimeout(() => setSyncNotifications([]), 5000);
    }
    
    setIsProcessing(false);
  };

  // Stats
  const total = jobs.length;
  const applied = jobs.filter(j => j.status === 'Applied').length;
  const interviewing = jobs.filter(j => j.status === 'Interviewing' || j.status === 'Interview').length;
  const offers = jobs.filter(j => j.status === 'Offer').length;
  const rejected = jobs.filter(j => j.status === 'Rejected').length;

  const successRate = total > 0 ? Math.round((offers / total) * 100) : 0;

  // Weekly Applications Chart (Last 12 weeks)
  const weeklyData = useMemo(() => {
    const weeks = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - (i * 7));
      weeks.push({
        name: `W${getWeekNumber(d)}`,
        date: d,
        count: 0
      });
    }

    jobs.forEach(job => {
      const jobDate = new Date(job.dateApplied || job.appliedDate);
      if (isNaN(jobDate)) return;
      const jobWeek = getWeekNumber(jobDate);
      const weekEntry = weeks.find(w => w.name === `W${jobWeek}` && Math.abs(w.date - jobDate) < 1000 * 60 * 60 * 24 * 60);
      if (weekEntry) weekEntry.count++;
      else {
        // Fallback to closest if within 12 weeks
        const diffTime = Math.abs(new Date() - jobDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const weekIndex = 11 - Math.floor(diffDays / 7);
        if (weekIndex >= 0 && weekIndex < 12) {
          weeks[weekIndex].count++;
        }
      }
    });
    return weeks;
  }, [jobs]);

  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
  }

  // Distribution Data for Pie Chart
  const distributionData = [
    { name: 'Applied', value: applied },
    { name: 'Interviewing', value: interviewing },
    { name: 'Offers', value: offers },
    { name: 'Rejected', value: rejected },
  ].filter(d => d.value > 0);

  // AI Insights Logic
  const generateInsights = () => {
    if (jobs.length === 0) return ["Start adding applications to generate AI insights!"];
    
    const insights = [];
    
    // Most active day
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);
    jobs.forEach(j => {
      const d = new Date(j.dateApplied || j.appliedDate);
      if (!isNaN(d)) dayCounts[d.getDay()]++;
    });
    const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    if (dayCounts[maxDayIdx] > 0) {
      insights.push(`Your most productive day is **${days[maxDayIdx]}** (${dayCounts[maxDayIdx]} apps). Keep utilizing this time!`);
    }

    // High success roles
    const interviewJobs = jobs.filter(j => j.status === 'Interview' || j.status === 'Interviewing' || j.status === 'Offer');
    if (interviewJobs.length > 0) {
      const roleWords = {};
      interviewJobs.forEach(j => {
        const words = (j.role || j.position || '').toLowerCase().split(' ');
        words.forEach(w => {
          if (w.length > 3) {
            roleWords[w] = (roleWords[w] || 0) + 1;
          }
        });
      });
      const topWord = Object.keys(roleWords).sort((a,b) => roleWords[b] - roleWords[a])[0];
      if (topWord && roleWords[topWord] > 1) {
        insights.push(`You have a notably high interview rate for roles involving "**${topWord}**".`);
      } else {
        insights.push(`Your interview rate is currently **${Math.round((interviewJobs.length/total)*100)}%**. Solid performance!`);
      }
    } else {
        insights.push(`Keep applying! Converting your first few applications to interviews takes time and consistency.`);
    }

    // Velocity
    if (weeklyData[11].count > weeklyData[10].count) {
      insights.push(`Great momentum! You submitted ${weeklyData[11].count - weeklyData[10].count} more applications this week than last week.`);
    } else if (weeklyData[11].count === 0 && total > 0) {
      insights.push(`You haven't applied to any jobs this week. Consistency is key!`);
    }

    return insights;
  };

  const insights = generateInsights();

  // Smart Nudges Logic
  const generateNudges = () => {
    const nudges = [];
    if (jobs.length === 0) return nudges;

    const today = new Date();
    
    const dates = jobs.map(j => new Date(j.dateApplied || j.appliedDate)).filter(d => !isNaN(d));
    if (dates.length > 0) {
      const mostRecent = new Date(Math.max(...dates));
      const diffDays = Math.floor((today - mostRecent) / (1000 * 60 * 60 * 24));
      if (diffDays >= 5) {
        nudges.push({ type: 'warning', message: `You haven't applied to any jobs in ${diffDays} days! Keep the momentum going! ⚠️` });
      }
    }

    const followUps = jobs.filter(j => {
      if (j.status !== 'Applied' && j.status !== 'Interview' && j.status !== 'Interviewing') return false;
      const d = new Date(j.dateApplied || j.appliedDate);
      if (isNaN(d)) return false;
      return Math.floor((today - d) / (1000 * 60 * 60 * 24)) >= 7;
    });

    followUps.slice(0, 2).forEach(job => {
      nudges.push({ type: 'info', message: `Time to follow up on your ${job.company} application! 📬` });
    });

    return nudges;
  };
  const nudges = generateNudges();

  return (
    <div className="dashboard">
      <div className="tabs">
        <button className={`tab ${currentTab === 'overview' ? 'active' : ''}`} onClick={() => setCurrentTab('overview')}>
          <BarChart2 size={18} /> Overview
        </button>
        <button className={`tab ${currentTab === 'applications' ? 'active' : ''}`} onClick={() => setCurrentTab('applications')}>
          <ListIcon size={18} /> Applications
        </button>
        <button className={`tab ${currentTab === 'ai-analyzer' ? 'active' : ''}`} onClick={() => setCurrentTab('ai-analyzer')}>
          <Brain size={18} /> AI Analyzer
        </button>
        <button className={`tab ${currentTab === 'ai-predictor' ? 'active' : ''}`} onClick={() => setCurrentTab('ai-predictor')}>
          <Target size={18} /> Success Predictor
        </button>
      </div>

      {currentTab === 'overview' && (
        <div className="overview-content">
          {/* Sync Header */}
          <div className="sync-header" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button 
              onClick={() => setIsEmailModalOpen(true)} 
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: '500', boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)' }}
            >
              <Mail size={18} />
              Paste Email Update
            </button>
          </div>

          {/* Email Modal Overlay */}
          {isEmailModalOpen && (
            <div className="email-modal-overlay">
              <div className="email-modal-content">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                  <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px'}}><Mail size={20} className="icon-purple"/> Analyze Email</h3>
                  <button onClick={() => setIsEmailModalOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#64748b'}}>
                    <XCircle size={20} />
                  </button>
                </div>
                <p style={{marginBottom: '16px', fontSize: '0.9rem', color: '#475569'}}>
                  Paste the contents of an email from a company you are tracking. Our AI logic will detect interviews, offers, or rejections and update your job board automatically!
                </p>
                <textarea 
                  className="email-textarea"
                  placeholder="Paste email text here..."
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  rows={8}
                ></textarea>
                
                {/* Immediate Feedback inside Modal */}
                {syncNotifications.filter(n => n.type !== 'success').length > 0 && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    {syncNotifications[0].message}
                  </div>
                )}
                
                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px'}}>
                  <button onClick={() => setIsEmailModalOpen(false)} style={{padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 500}}>Cancel</button>
                  <button 
                    onClick={handleProcessEmail}
                    disabled={isProcessing || !emailText.trim()}
                    style={{padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#4f46e5', color: '#fff', cursor: (isProcessing || !emailText.trim()) ? 'not-allowed' : 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px'}}
                  >
                     {isProcessing ? 'Analyzing...' : 'Analyze Update'}
                     {isProcessing && <RefreshCw size={14} className="spin-animation" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sync Notifications */}
          {syncNotifications.length > 0 && (
            <div className="sync-notifications" style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {syncNotifications.map((note, i) => (
                <div key={i} style={{ 
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '8px', fontSize: '0.95rem',
                  background: note.type === 'error' ? '#fef2f2' : (note.type === 'success' ? '#f0fdf4' : '#eff6ff'),
                  color: note.type === 'error' ? '#b91c1c' : (note.type === 'success' ? '#15803d' : '#1d4ed8'),
                  border: `1px solid ${note.type === 'error' ? '#fca5a5' : (note.type === 'success' ? '#bbf7d0' : '#bfdbfe')}`
                }}>
                  {note.type === 'error' ? <XCircle size={18} /> : (note.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />)}
                  {note.message}
                </div>
              ))}
            </div>
          )}

          {/* Smart Nudges Banner */}
          {nudges.length > 0 && (
            <div className="smart-nudges" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {nudges.map((nudge, i) => (
                <div key={i} style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', 
                  borderRadius: '10px', fontSize: '0.95rem', fontWeight: 500,
                  background: nudge.type === 'warning' ? '#fffbeb' : '#eff6ff',
                  color: nudge.type === 'warning' ? '#b45309' : '#1d4ed8',
                  border: `1px solid ${nudge.type === 'warning' ? '#fde68a' : '#bfdbfe'}`,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  {nudge.type === 'warning' ? <AlertCircle size={20} /> : <Brain size={20} />}
                  {nudge.message}
                </div>
              ))}
            </div>
          )}

          {/* AI Insights Panel */}
          <div className="ai-insights-panel">
            <div className="insights-header">
              <Brain size={24} className="icon-purple" />
              <h3>AI Insights</h3>
            </div>
            <ul className="insights-list">
              {insights.map((insight, i) => (
                <li key={i}>
                  <TrendingUp size={18} className="insight-icon" />
                  <span dangerouslySetInnerHTML={{__html: insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}}></span>
                </li>
              ))}
            </ul>
          </div>

          <div className="stats-grid premium">
            <div className="stat-card">
              <div className="stat-icon-wrapper bg-blue">
                <Briefcase size={24} className="icon-blue" />
              </div>
              <div className="stat-info">
                <h2>{total}</h2>
                <p>Total Apps</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper bg-green">
                <Users size={24} className="icon-green" />
              </div>
              <div className="stat-info">
                <h2>{interviewing}</h2>
                <p>Interviews</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper bg-light-green">
                <Trophy size={24} className="icon-light-green" />
              </div>
              <div className="stat-info">
                <h2>{offers}</h2>
                <p>Offers</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper bg-red">
                <XCircle size={24} className="icon-red" />
              </div>
              <div className="stat-info">
                <h2>{rejected}</h2>
                <p>Rejected</p>
              </div>
            </div>

            <div className="stat-card highlight-card">
              <div className="stat-icon-wrapper bg-purple">
                <TrendingUp size={24} className="icon-purple" />
              </div>
              <div className="stat-info">
                <h2 style={{color: '#4f46e5'}}>{successRate}%</h2>
                <p>Offer Rate</p>
              </div>
            </div>
          </div>

          <div className="charts-grid premium-charts">
            <div className="chart-card">
              <h3>Applications Per Week</h3>
              <div className="chart-wrapper">
                {total === 0 ? (
                  <div className="empty-state">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            
            <div className="chart-card">
              <h3>Status Distribution</h3>
              <div className="chart-wrapper donut-wrapper">
                {total === 0 ? (
                  <div className="empty-state">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {total > 0 && (
                  <div className="donut-center-text">
                    <span className="large">{interviewing + offers}</span>
                    <span className="small">Interviews</span>
                  </div>
                )}
              </div>
              {total > 0 && (
                <div className="custom-legend" style={{ marginTop: '20px' }}>
                  {distributionData.map((entry, index) => (
                    <div className="legend-item" key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#475569' }}>
                      <span className="dot" style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span className="name">{entry.name}</span>
                      <span className="value" style={{ fontWeight: '600', color: '#0f172a' }}>({entry.value})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
