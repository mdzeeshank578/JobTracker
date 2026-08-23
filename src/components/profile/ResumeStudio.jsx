import React, { useState, useEffect } from 'react';
import { FileText, Download, Briefcase, PlusCircle, Brain, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, addJob } from '../../services/db';
import { generateJobRecommendations, optimizeResumeContent } from '../../services/openai';
import './ResumeStudio.css';

export default function ResumeStudio() {
  const { currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [displayData, setDisplayData] = useState(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 5 Top-Tier ATS Templates: 'jakes' | 'teal' | 'reactive' | 'enhancv' | 'jobscan'
  const [currentTemplate, setCurrentTemplate] = useState('jakes'); 
  const [isOptimizing, setIsOptimizing] = useState(false);

  const [aiJobs, setAiJobs] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [addedJobsMap, setAddedJobsMap] = useState({});

  // Lifecycle Hook: Load authenticated user profile WITHOUT auto-generating resume preview
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        if (currentUser?.uid) {
          const data = await getUserProfile(currentUser.uid);
          if (data) {
            setProfileData(data);
            if (data.cvCustomization?.template) {
              setCurrentTemplate(data.cvCustomization.template);
            }
          } else {
            setProfileData({
              fullName: currentUser.displayName || '',
              email: currentUser.email || ''
            });
          }
        }
      } catch (err) {
        console.warn("Failed to load profile for resume:", err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  // Explicit User Action: Compile & Generate Resume Document from verified profile data
  const handleGenerateResume = async () => {
    setIsGenerating(true);
    try {
      let activeProfile = profileData;
      if (currentUser?.uid) {
        const freshData = await getUserProfile(currentUser.uid);
        if (freshData) activeProfile = freshData;
      }

      const compiledData = activeProfile || {
        fullName: currentUser?.displayName || 'Candidate Profile',
        email: currentUser?.email || '',
        professionalTitle: 'Software Engineering Professional',
        bio: '',
        technicalSkills: ''
      };

      setProfileData(compiledData);
      setDisplayData(compiledData);
      setIsGenerated(true);
    } catch (err) {
      console.error("Error compiling resume from profile:", err);
      alert("Failed to compile resume document.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptimizeContent = async () => {
     if (!displayData) return;
     setIsOptimizing(true);
     try {
       const optimized = await optimizeResumeContent(displayData);
       setDisplayData(optimized);
     } catch(err) {
       console.error("AI Error:", err);
       alert("Failed to polish resume with AI.");
     } finally {
       setIsOptimizing(false);
     }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAIAnalyze = async () => {
    const activeData = displayData || profileData || {
      fullName: currentUser?.displayName || 'Candidate Profile',
      email: currentUser?.email || '',
      professionalTitle: 'Software Engineering Professional',
      bio: '',
      technicalSkills: ''
    };

    setIsAnalyzing(true);
    try {
      const results = await generateJobRecommendations(activeData);
      setAiJobs(results || []);
      setAddedJobsMap({});
    } catch (err) {
      console.error("Failed to analyze resume for jobs:", err);
      alert("Failed to analyze resume for jobs. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveJob = async (job, index) => {
    setAddedJobsMap(prev => ({ ...prev, [index]: true }));
    setAiJobs(prev => prev.map((j, i) => (i === index ? { ...j, added: true } : j)));

    try {
      await addJob(currentUser?.uid || 'guest', {
        company: job.company,
        role: job.role,
        type: job.type || 'Full-time',
        status: 'Applied',
        dateApplied: new Date().toISOString().split('T')[0],
        notes: `AI Recommended Match! Score: ${job.matchScore}. Reasoning: ${job.reasoning}`,
        resumeUrl: null,
        coverLetterUrl: null
      });
    } catch (error) {
       console.error("Failed to save AI job:", error);
       alert("Failed to save AI job.");
       setAddedJobsMap(prev => ({ ...prev, [index]: false }));
       setAiJobs(prev => prev.map((j, i) => (i === index ? { ...j, added: false } : j)));
    }
  };

  if (isLoading) return <div style={{padding: '40px', textAlign: 'center'}}>Loading Executive Resume Studio...</div>;

  // Dynamic Profile Fields Resolvers
  const fullName = displayData?.fullName || currentUser?.displayName || 'Candidate Name';
  const profTitle = displayData?.professionalTitle || displayData?.tagline || 'Software Engineering Professional';
  
  const summaryText = displayData?.bio || displayData?.careerObjective || displayData?.tagline || '';
  
  const workExp = displayData?.workExperience || [];
  const projects = displayData?.projects || [];
  const certs = displayData?.certifications || [];
  const schoolingList = displayData?.schoolingList || [];
  const educationList = displayData?.educationList || [];
  const languagesList = displayData?.languagesList || [];
  const hackathons = displayData?.hackathons || [];

  const parseSkillList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return val.split(',').map(s => s.trim()).filter(Boolean);
  };

  const techSkills = parseSkillList(displayData?.technicalSkills);
  const frameworks = parseSkillList(displayData?.frameworks);
  const tools = parseSkillList(displayData?.tools);
  const softSkills = parseSkillList(displayData?.softSkills);

  const educationText = displayData?.education || (educationList.length > 0 ? `${educationList[0].degree || ''} ${educationList[0].school ? '- ' + educationList[0].school : ''}` : '');
  const customFont = displayData?.cvCustomization?.fontStyle || 'Inter';

  // =========================================================================
  // TEMPLATE 1: Jake's Resume (Overleaf / LaTeX Standard) - 100% ATS Benchmark
  // =========================================================================
  const renderJakesTemplate = () => (
    <div className="jakes-template">
      {/* Header */}
      <div className="jakes-header">
        <h1 className="jakes-name">{fullName}</h1>
        <div className="jakes-contact-line">
          {displayData?.location && <span>{displayData.location}</span>}
          {displayData?.phone && <><span> | </span><span>{displayData.phone}</span></>}
          {(displayData?.email || currentUser?.email) && <><span> | </span><span>{displayData?.email || currentUser?.email}</span></>}
          {displayData?.linkedIn && <><span> | </span><span>{displayData.linkedIn.replace('https://', '').replace('www.', '')}</span></>}
          {displayData?.github && <><span> | </span><span>{displayData.github.replace('https://', '').replace('www.', '')}</span></>}
          {displayData?.portfolio && <><span> | </span><span>{displayData.portfolio.replace('https://', '').replace('www.', '')}</span></>}
        </div>
      </div>

      {/* Summary */}
      {summaryText && (
        <div className="jakes-section">
          <h2 className="jakes-heading">PROFESSIONAL SUMMARY</h2>
          <p className="jakes-summary">{summaryText}</p>
        </div>
      )}

      {/* Education & Schooling */}
      {(educationList.length > 0 || educationText || schoolingList.length > 0) && (
        <div className="jakes-section">
          <h2 className="jakes-heading">EDUCATION</h2>
          {educationList.length > 0 ? (
            educationList.map((edu, i) => (
              <div key={i} className="jakes-item">
                <div className="jakes-item-header">
                  <div>
                    <span className="jakes-bold">{edu.degree || 'Degree Program'}</span>
                    {edu.school && <span className="jakes-italic"> — {edu.school}</span>}
                  </div>
                  <div className="jakes-right-meta">
                    {edu.years && <span>{edu.years}</span>}
                    {edu.score && <span> | {edu.score}</span>}
                  </div>
                </div>
              </div>
            ))
          ) : educationText ? (
            <div className="jakes-item-header">
              <div>
                <span className="jakes-bold">{educationText}</span>
              </div>
            </div>
          ) : null}

          {schoolingList.length > 0 && (
            <div style={{ marginTop: '6px' }}>
              {schoolingList.map((sch, i) => (
                <div key={i} className="jakes-item" style={{ marginBottom: '3px' }}>
                  <div className="jakes-item-header">
                    <div>
                      <span className="jakes-bold">{sch.classGrade || 'School Record'}</span>
                      {sch.schoolName && <span className="jakes-italic"> — {sch.schoolName}</span>}
                      {sch.board && <span style={{ fontSize: '0.84rem', color: '#333' }}> ({sch.board})</span>}
                    </div>
                    <div className="jakes-right-meta">
                      {sch.year && <span>{sch.year}</span>}
                      {sch.percentage && <span> | {sch.percentage}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Experience */}
      <div className="jakes-section">
        <h2 className="jakes-heading">PROFESSIONAL EXPERIENCE</h2>
        {workExp.length > 0 ? (
          workExp.map((exp, idx) => (
            <div key={idx} className="jakes-item">
              <div className="jakes-item-header">
                <div>
                  <span className="jakes-bold">{exp.title || 'Role'}</span>
                  {exp.company && <span className="jakes-italic"> — {exp.company}</span>}
                  {exp.location && <span style={{ fontSize: '0.84rem', color: '#475569' }}> ({exp.location})</span>}
                </div>
                <div className="jakes-right-meta">
                  <span>{exp.dates || ''}</span>
                </div>
              </div>
              {exp.description && (
                <ul className="jakes-bullets">
                  {exp.description.split('\n').filter(l => l.trim()).map((line, i) => (
                    <li key={i}>{line.replace(/^[-•]\s*/, '')}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        ) : (
          <p className="jakes-empty">No work experience entries listed in profile.</p>
        )}
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <div className="jakes-section">
          <h2 className="jakes-heading">FEATURED PROJECTS</h2>
          {projects.map((proj, idx) => (
            <div key={idx} className="jakes-item">
              <div className="jakes-item-header">
                <div>
                  <span className="jakes-bold">{proj.name}</span>
                  {proj.tech && <span className="jakes-italic"> ({proj.tech})</span>}
                </div>
                <div className="jakes-right-meta">
                  {proj.githubUrl && <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="jakes-link">GitHub</a>}
                  {proj.githubUrl && proj.liveUrl && <span> | </span>}
                  {proj.liveUrl && <a href={proj.liveUrl} target="_blank" rel="noreferrer" className="jakes-link">Live Demo</a>}
                </div>
              </div>
              {proj.description && (
                <ul className="jakes-bullets">
                  {proj.description.split('\n').filter(l => l.trim()).map((line, i) => (
                    <li key={i}>{line.replace(/^[-•]\s*/, '')}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hackathons & Competitions */}
      {hackathons.length > 0 && (
        <div className="jakes-section">
          <h2 className="jakes-heading">HACKATHONS & COMPETITIONS</h2>
          {hackathons.map((h, i) => (
            <div key={i} className="jakes-item">
              <div className="jakes-item-header">
                <div>
                  <span className="jakes-bold">{h.name}</span>
                  {h.role && <span className="jakes-italic"> — {h.role}</span>}
                </div>
                <div className="jakes-right-meta">
                  {h.position && <span className="jakes-bold">{h.position}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Categorized Technical Skills */}
      {(techSkills.length > 0 || frameworks.length > 0 || tools.length > 0 || softSkills.length > 0) && (
        <div className="jakes-section">
          <h2 className="jakes-heading">TECHNICAL SKILLS & COMPETENCIES</h2>
          <ul className="jakes-bullets" style={{ marginTop: '4px' }}>
            {techSkills.length > 0 && <li><span className="jakes-bold">Languages & Core:</span> {techSkills.join(', ')}</li>}
            {frameworks.length > 0 && <li><span className="jakes-bold">Frameworks & Libraries:</span> {frameworks.join(', ')}</li>}
            {tools.length > 0 && <li><span className="jakes-bold">Cloud & Tools:</span> {tools.join(', ')}</li>}
            {softSkills.length > 0 && <li><span className="jakes-bold">Engineering Methodologies:</span> {softSkills.join(', ')}</li>}
            {languagesList.length > 0 && (
              <li><span className="jakes-bold">Languages Spoken:</span> {languagesList.map(l => `${l.language} (${l.proficiency})`).join(', ')}</li>
            )}
          </ul>
        </div>
      )}

      {/* Certifications & Awards */}
      {certs.length > 0 && (
        <div className="jakes-section">
          <h2 className="jakes-heading">CERTIFICATIONS & AWARDS</h2>
          <ul className="jakes-bullets" style={{ marginTop: '4px' }}>
            {certs.map((c, i) => (
              <li key={i}><span className="jakes-bold">{c.name}</span> {c.link && <a href={c.link} target="_blank" rel="noreferrer" className="jakes-link">(View)</a>}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderTealTemplate = () => (
    <div className="teal-template">
      <div className="teal-header">
        <h1 className="teal-name">{fullName}</h1>
        <div className="teal-title">{profTitle}</div>
        <div className="teal-contact-bar">
          {displayData?.email && <span>📧 {displayData.email}</span>}
          {displayData?.phone && <span>📱 {displayData.phone}</span>}
          {displayData?.location && <span>📍 {displayData.location}</span>}
        </div>
      </div>

      {summaryText && (
        <div className="teal-section">
          <h2 className="teal-heading">PROFESSIONAL SUMMARY</h2>
          <p className="teal-text">{summaryText}</p>
        </div>
      )}

      {educationText && (
        <div className="teal-section">
          <h2 className="teal-heading">EDUCATION</h2>
          <p className="teal-text"><strong>{educationText}</strong></p>
        </div>
      )}

      {workExp.length > 0 && (
        <div className="teal-section">
          <h2 className="teal-heading">PROFESSIONAL EXPERIENCE</h2>
          {workExp.map((exp, idx) => (
            <div key={idx} className="teal-item">
              <div className="teal-item-head">
                <strong>{exp.title || 'Role'}</strong> — <span className="teal-company">{exp.company || ''}</span> ({exp.location || 'Remote'})
                <span className="teal-date">{exp.dates || ''}</span>
              </div>
              {exp.description && (
                <ul className="teal-bullets">
                  {exp.description.split('\n').filter(l => l.trim()).map((line, i) => (
                    <li key={i}>{line.replace(/^[-•]\s*/, '')}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div className="teal-section">
          <h2 className="teal-heading">FEATURED PROJECTS</h2>
          {projects.map((proj, idx) => (
            <div key={idx} className="teal-item">
              <div className="teal-item-head">
                <strong>{proj.name}</strong> ({proj.tech})
              </div>
              {proj.description && (
                <ul className="teal-bullets">
                  {proj.description.split('\n').filter(l => l.trim()).map((line, i) => (
                    <li key={i}>{line.replace(/^[-•]\s*/, '')}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {(techSkills.length > 0 || frameworks.length > 0 || tools.length > 0) && (
        <div className="teal-section">
          <h2 className="teal-heading">TECHNICAL COMPETENCIES</h2>
          <div className="teal-pills">
            {techSkills.concat(frameworks).concat(tools).map((s, i) => <span key={i} className="teal-pill">{s}</span>)}
          </div>
        </div>
      )}
    </div>
  );

  const renderReactiveTemplate = () => (
    <div className="reactive-template">
      <div className="reactive-sidebar">
        <h1 className="reactive-sidebar-name">{fullName}</h1>
        <div className="reactive-sidebar-title">{profTitle}</div>

        <div className="reactive-side-section">
          <h3>CONTACT</h3>
          {displayData?.email && <div>{displayData.email}</div>}
          {displayData?.phone && <div>{displayData.phone}</div>}
          {displayData?.location && <div>{displayData.location}</div>}
        </div>

        {techSkills.length > 0 && (
          <div className="reactive-side-section">
            <h3>TECHNICAL SKILLS</h3>
            {techSkills.concat(frameworks).map((s, i) => <div key={i} className="reactive-skill-tag">• {s}</div>)}
          </div>
        )}

        {educationText && (
          <div className="reactive-side-section">
            <h3>EDUCATION</h3>
            <div>{educationText}</div>
          </div>
        )}
      </div>

      <div className="reactive-main">
        {summaryText && (
          <div className="reactive-main-section">
            <h2>SUMMARY</h2>
            <p>{summaryText}</p>
          </div>
        )}

        {workExp.length > 0 && (
          <div className="reactive-main-section">
            <h2>PROFESSIONAL EXPERIENCE</h2>
            {workExp.map((exp, idx) => (
              <div key={idx} className="reactive-exp-item">
                <div className="reactive-exp-header">
                  <strong>{exp.title || 'Role'}</strong> — {exp.company || ''}
                  <span className="reactive-date">{exp.dates || ''}</span>
                </div>
                {exp.description && (
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '0.84rem' }}>
                    {exp.description.split('\n').filter(l => l.trim()).map((line, i) => (
                      <li key={i}>{line.replace(/^[-•]\s*/, '')}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {projects.length > 0 && (
          <div className="reactive-main-section">
            <h2>FEATURED PROJECTS</h2>
            {projects.map((proj, idx) => (
              <div key={idx} className="reactive-exp-item">
                <strong>{proj.name}</strong> ({proj.tech})
                {proj.description && (
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '0.84rem' }}>
                    {proj.description.split('\n').filter(l => l.trim()).map((line, i) => (
                      <li key={i}>{line.replace(/^[-•]\s*/, '')}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderEnhancvTemplate = () => (
    <div className="enhancv-template">
      <div className="enhancv-header">
        <h1>{fullName}</h1>
        <h2>{profTitle}</h2>
        <p className="enhancv-contact">{displayData?.email} {displayData?.phone ? '| ' + displayData.phone : ''} {displayData?.location ? '| ' + displayData.location : ''}</p>
      </div>

      {summaryText && (
        <div className="enhancv-section">
          <h3>CAREER SUMMARY</h3>
          <p>{summaryText}</p>
        </div>
      )}

      {educationText && (
        <div className="enhancv-section">
          <h3>EDUCATION</h3>
          <p><strong>{educationText}</strong></p>
        </div>
      )}

      {workExp.length > 0 && (
        <div className="enhancv-section">
          <h3>EXPERIENCE</h3>
          {workExp.map((exp, idx) => (
            <div key={idx} className="enhancv-item">
              <div className="enhancv-row">
                <strong>{exp.title || 'Role'} — {exp.company || ''}</strong>
                <span>{exp.dates || ''}</span>
              </div>
              <div className="enhancv-sub">{exp.location || ''}</div>
              {exp.description && (
                <ul style={{ paddingLeft: '18px', margin: '4px 0 0 0', fontSize: '0.86rem' }}>
                  {exp.description.split('\n').filter(l => l.trim()).map((line, i) => (
                    <li key={i}>{line.replace(/^[-•]\s*/, '')}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div className="enhancv-section">
          <h3>FEATURED PROJECTS</h3>
          {projects.map((proj, idx) => (
            <div key={idx} className="enhancv-item">
              <strong>{proj.name}</strong> ({proj.tech})
              {proj.description && (
                <ul style={{ paddingLeft: '18px', margin: '4px 0 0 0', fontSize: '0.86rem' }}>
                  {proj.description.split('\n').filter(l => l.trim()).map((line, i) => (
                    <li key={i}>{line.replace(/^[-•]\s*/, '')}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderJobscanTemplate = () => (
    <div className="jobscan-template">
      <div className="jobscan-header">
        <h1>{fullName}</h1>
        <p>{displayData?.email} {displayData?.phone ? '| ' + displayData.phone : ''} {displayData?.location ? '| ' + displayData.location : ''}</p>
      </div>

      {summaryText && (
        <div className="jobscan-section">
          <h2>SUMMARY OF QUALIFICATIONS</h2>
          <p>{summaryText}</p>
        </div>
      )}

      {educationText && (
        <div className="jobscan-section">
          <h2>EDUCATION</h2>
          <p><strong>{educationText}</strong></p>
        </div>
      )}

      {workExp.length > 0 && (
        <div className="jobscan-section">
          <h2>PROFESSIONAL EXPERIENCE</h2>
          {workExp.map((exp, idx) => (
            <div key={idx} className="jobscan-item">
              <h3>{exp.title || 'Role'} | {exp.company || ''} — {exp.location || ''} ({exp.dates || ''})</h3>
              {exp.description && (
                <ul style={{ paddingLeft: '18px', margin: '4px 0 0 0', fontSize: '0.86rem' }}>
                  {exp.description.split('\n').filter(l => l.trim()).map((line, i) => (
                    <li key={i}>{line.replace(/^[-•]\s*/, '')}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div className="jobscan-section">
          <h2>FEATURED PROJECTS</h2>
          {projects.map((proj, idx) => (
            <div key={idx} className="jobscan-item">
              <h3>{proj.name} ({proj.tech})</h3>
              {proj.description && (
                <ul style={{ paddingLeft: '18px', margin: '4px 0 0 0', fontSize: '0.86rem' }}>
                  {proj.description.split('\n').filter(l => l.trim()).map((line, i) => (
                    <li key={i}>{line.replace(/^[-•]\s*/, '')}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {(techSkills.length > 0 || frameworks.length > 0 || tools.length > 0) && (
        <div className="jobscan-section">
          <h2>TECHNICAL SKILLS & COMPETENCIES</h2>
          {techSkills.length > 0 && <p><strong>Languages:</strong> {techSkills.join(', ')}</p>}
          {frameworks.length > 0 && <p><strong>Frameworks:</strong> {frameworks.join(', ')}</p>}
          {tools.length > 0 && <p><strong>Tools:</strong> {tools.join(', ')}</p>}
        </div>
      )}
    </div>
  );

  return (
    <div className="resume-studio-container">
      {/* Left: Resume Document Preview Panel */}
      <div className="resume-preview-panel">
        <div className="preview-header">
          <div className="header-controls-left">
             <div className="engine-title-badge">
               <FileText size={18} style={{ color: '#2563eb' }} /> 
               <span>Resume Engine</span>
             </div>
             <select 
               className="template-select" 
               value={currentTemplate} 
               onChange={(e) => setCurrentTemplate(e.target.value)}
             >
                <option value="jakes">Overleaf (Jake's Resume #1 FAANG)</option>
                <option value="teal">Teal Executive ATS</option>
                <option value="reactive">Reactive Resume / FlowCV</option>
                <option value="enhancv">Enhancv / Novoresume</option>
                <option value="jobscan">Jobscan ATS Standard</option>
             </select>
          </div>
          
          <div className="header-controls-right">
             {isGenerated ? (
               <>
                 <button className="optimize-btn" onClick={handleOptimizeContent} disabled={isOptimizing}>
                   {isOptimizing ? <RefreshCw size={15} className="spin-animation" /> : <Sparkles size={15} />} 
                   <span>{isOptimizing ? 'Polishing...' : 'AI Polish'}</span>
                 </button>
                 <button className="download-btn" onClick={handlePrint}>
                   <Download size={15} /> <span>Export PDF</span>
                 </button>
               </>
             ) : (
               <button 
                 className="generate-resume-main-btn" 
                 onClick={handleGenerateResume}
                 disabled={isGenerating}
                 style={{ padding: '7px 16px', fontSize: '0.86rem' }}
               >
                 {isGenerating ? <RefreshCw size={15} className="spin-animation" /> : <Sparkles size={15} />}
                 <span>{isGenerating ? 'Compiling...' : 'Generate Resume'}</span>
               </button>
             )}
          </div>
        </div>
        
        <div className="resume-canvas-wrapper">
          {!isGenerated ? (
            /* Clean UI State: Idle/Draft Preview State before explicit user generation */
            <div className="resume-draft-container">
              <div className="draft-icon-wrapper">
                <Sparkles size={40} />
              </div>
              <h2 className="draft-title">Executive ATS Resume Builder</h2>
              <p className="draft-subtitle">
                Your authenticated profile data ({profileData?.fullName || currentUser?.displayName || 'Active Candidate'}) is loaded and ready. Click <strong>Generate Resume</strong> to dynamically compile your ATS-compliant resume document.
              </p>

              <div className="draft-profile-summary-box">
                <div className="draft-summary-item">
                  <span>Candidate Name:</span>
                  <strong>{profileData?.fullName || currentUser?.displayName || 'Not Set'}</strong>
                </div>
                <div className="draft-summary-item">
                  <span>Title / Headline:</span>
                  <strong>{profileData?.professionalTitle || profileData?.tagline || 'Software Engineering Professional'}</strong>
                </div>
                <div className="draft-summary-item">
                  <span>Contact Email:</span>
                  <strong>{profileData?.email || currentUser?.email || 'Not Set'}</strong>
                </div>
                <div className="draft-summary-item">
                  <span>Work Experience Entries:</span>
                  <strong>{profileData?.workExperience?.length || 0} Roles</strong>
                </div>
                <div className="draft-summary-item">
                  <span>Featured Projects:</span>
                  <strong>{profileData?.projects?.length || 0} Projects</strong>
                </div>
              </div>

              <button 
                className="generate-resume-main-btn" 
                onClick={handleGenerateResume}
                disabled={isGenerating}
              >
                {isGenerating ? <RefreshCw size={18} className="spin-animation" /> : <Sparkles size={18} />}
                <span>{isGenerating ? 'Compiling Profile Data...' : 'Generate Resume'}</span>
              </button>
            </div>
          ) : (
            /* Generated Resume Canvas bound dynamically to real verified profile data */
            <div 
               className={`resume-document template-${currentTemplate}`}
               id="resume-document-canvas"
               style={{ 
                 fontFamily: customFont,
                 transition: 'all 0.3s ease'
               }}
            >
               {currentTemplate === 'jakes' && renderJakesTemplate()}
               {currentTemplate === 'teal' && renderTealTemplate()}
               {currentTemplate === 'reactive' && renderReactiveTemplate()}
               {currentTemplate === 'enhancv' && renderEnhancvTemplate()}
               {currentTemplate === 'jobscan' && renderJobscanTemplate()}
            </div>
          )}
        </div>
      </div>

      {/* Right: AI Match Engine */}
      <div className="ai-match-panel">
         {aiJobs.length === 0 && !isAnalyzing ? (
           <div className="match-engine-intro">
              <Brain size={48} style={{ color: '#2563eb', marginBottom: '16px' }} />
              <h2>AI Job Matchmaker</h2>
              <p>Let our intelligence engine read your executive ATS resume and recommend exclusively tailored, high-probability job targets matching your precise skillset.</p>
              <button className="hero-btn" onClick={handleAIAnalyze}>
                <Briefcase size={20} /> Discover My Matches
              </button>
           </div>
         ) : isAnalyzing ? (
           <div className="match-engine-intro">
              <RefreshCw size={48} className="spin-animation" style={{ color: '#2563eb', marginBottom: '16px' }} />
              <h2>Analyzing Trajectory...</h2>
              <p>Scanning your core competencies, aligning with industry requirements, and synthesizing active global roles.</p>
           </div>
         ) : (
           <>
              <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a'}}>
                <Brain size={20} style={{ color: '#2563eb' }} /> Found {aiJobs.length} Elite Matches
              </h3>
              <p style={{fontSize: '0.9rem', color: '#64748b'}}>Based on your technical experience and parsed trajectory.</p>
              
              <div className="job-recommendations-list">
                 {aiJobs.map((job, idx) => (
                    <div key={idx} className="job-recommendation-card">
                       <div className="rec-header">
                          <div>
                             <h4 className="rec-role">{job.role}</h4>
                             <div className="rec-company">{job.company}</div>
                          </div>
                          <span className="rec-score-badge">{job.matchScore} Match</span>
                       </div>
                       
                       <p className="rec-reasoning">{job.reasoning}</p>
                       
                       <div className="rec-actions">
                           {(job.added || addedJobsMap[idx]) ? (
                             <button className="btn-add-tracker" disabled style={{ background: '#10b981', color: 'white', border: 'none', fontWeight: 600, cursor: 'default', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle2 size={16} color="white" /> Added to Tracker
                             </button>
                           ) : (
                             <button className="btn-add-tracker" onClick={() => handleSaveJob(job, idx)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <PlusCircle size={16} style={{ color: '#2563eb' }}/> Add to Tracker
                             </button>
                           )}
                        </div>
                    </div>
                 ))}
              </div>
              <button 
                onClick={handleAIAnalyze} 
                className="refresh-btn"
              >
                Refresh Search Parameters
              </button>
           </>
         )}
      </div>
    </div>
  );
}
