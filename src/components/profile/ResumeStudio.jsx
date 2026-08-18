import React, { useState, useEffect } from 'react';
import { FileText, Download, Briefcase, PlusCircle, Brain, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, addJob } from '../../services/db';
import { generateJobRecommendations, optimizeResumeContent } from '../../services/openai';
import './ResumeStudio.css';

export default function ResumeStudio() {
  const { currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [displayData, setDisplayData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 5 Top-Tier ATS Templates: 'jakes' | 'teal' | 'reactive' | 'enhancv' | 'jobscan'
  const [currentTemplate, setCurrentTemplate] = useState('jakes'); 
  const [isOptimizing, setIsOptimizing] = useState(false);

  const [aiJobs, setAiJobs] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (currentUser) {
          const data = await getUserProfile(currentUser.uid);
          if (data) {
             setProfileData(data);
             setDisplayData(data);
             if (data.cvCustomization?.template) {
               setCurrentTemplate(data.cvCustomization.template);
             }
          }
        }
      } catch (err) {
         console.error("Failed to load profile for resume:", err);
      } finally {
         setIsLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const handleOptimizeContent = async () => {
     if (!profileData) return;
     setIsOptimizing(true);
     try {
       const optimized = await optimizeResumeContent(profileData);
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
    if (!profileData) return;
    setIsAnalyzing(true);
    try {
      const results = await generateJobRecommendations(profileData);
      setAiJobs(results);
    } catch (err) {
      console.error(err);
      alert("Failed to analyze resume for jobs.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveJob = async (job) => {
    try {
      await addJob(currentUser.uid, {
        company: job.company,
        role: job.role,
        type: job.type,
        status: 'Applied',
        dateApplied: new Date().toISOString().split('T')[0],
        deadline: job.deadline,
        notes: `AI Recommended Match! Score: ${job.matchScore}. Reasoning: ${job.reasoning}`,
        resumeUrl: null,
        coverLetterUrl: null
      });
      alert(`Successfully added ${job.role} at ${job.company} to your Tracker!`);
    } catch (error) {
       console.error(error);
       alert("Failed to save AI job.");
    }
  };

  if (isLoading) return <div style={{padding: '40px', textAlign: 'center'}}>Loading Executive Resume Studio...</div>;

  const fullName = displayData?.fullName || currentUser?.displayName || 'ZEESHAN';
  const profTitle = displayData?.professionalTitle || 'Full Stack Engineer';
  
  // Universal summary resolver
  const summaryText = displayData?.summary || displayData?.bio || displayData?.careerObjective || 
    'Results-driven Full Stack Engineer with experience in building scalable web applications and cloud solutions. Skilled in React, Node.js, JavaScript (ES6+), Python, SQL, Firebase, AWS, and OpenAI API with a focus on P99 latency optimization, clean architecture, and cross-functional Agile leadership.';
  
  const rawWorkExp = displayData?.workExperience || [];
  const projects = displayData?.projects || [];
  const certs = displayData?.certifications || [];
  const schoolingList = displayData?.schoolingList || [];
  const educationList = displayData?.educationList || [];
  const languagesList = displayData?.languagesList || [];
  const hackathons = displayData?.hackathons || [];
  
  // Google XYZ Formula ATS work experience fallback
  const workExp = rawWorkExp.length > 0 
    ? rawWorkExp 
    : [
        {
          title: 'Full Stack Engineer',
          company: 'JobTracker Engineering',
          dates: 'Jan 2022 – Present',
          location: 'Kolkata, India (Remote)',
          description: `Engineered responsive full-stack features using React and Node.js, reducing API response latency by 25%.
Integrated Firebase Authentication and Firestore rules, securing data access for 1,000+ active users.
Built and maintained CI/CD deployment pipelines on AWS, improving release cycle speeds by 30%.
Collaborated in an Agile/Scrum team of 6 engineers to ship high-performing SaaS application features.`
        }
      ];

  // High-impact ATS projects fallback with 2-3 detailed accomplishment bullets
  const defaultProjects = projects.length > 0
    ? projects
    : [
        {
          name: 'Enterprise Job Tracker SaaS',
          tech: 'React, Node.js, Firebase',
          description: `Architected full-stack job application tracker with real-time status updates and automated cloud sync.
Integrated Firebase Auth and Firestore for encrypted user data storage and sub-50ms data retrieval.
Designed intuitive dashboard UI with metrics charts, status filters, and one-click export.`
        },
        {
          name: 'AI Candidate Matching Engine',
          tech: 'Python, OpenAI API, AWS',
          description: `Developed machine learning service in Python using OpenAI GPT-4 API to evaluate candidate-job fit.
Engineered prompt pipelines extracting technical skills and producing 0-100 match confidence scores.
Deployed serverless API endpoints on AWS Lambda with automated error handling and logging.`
        }
      ];

  const techSkills = displayData?.technicalSkills 
      ? (Array.isArray(displayData.technicalSkills) ? displayData.technicalSkills : displayData.technicalSkills.split(',').map(s=>s.trim()))
      : ['JavaScript (ES6+)', 'Python', 'SQL', 'HTML5', 'CSS3'];

  const frameworks = displayData?.frameworks
      ? (Array.isArray(displayData.frameworks) ? displayData.frameworks : displayData.frameworks.split(',').map(s=>s.trim()))
      : ['React.js', 'Node.js', 'Express.js', 'TailwindCSS'];

  const tools = displayData?.tools
      ? (Array.isArray(displayData.tools) ? displayData.tools : displayData.tools.split(',').map(s=>s.trim()))
      : ['Firebase', 'AWS', 'Git', 'REST APIs', 'OpenAI API', 'Figma'];

  const softSkills = displayData?.softSkills 
      ? (Array.isArray(displayData.softSkills) ? displayData.softSkills : displayData.softSkills.split(',').map(s=>s.trim()))
      : ['Agile / Scrum', 'CI/CD Automation', 'System Design', 'Cross-Functional Collaboration'];

  const educationText = displayData?.education || 'Bachelor of Technology (B.Tech) in Electronics & Communication Engineering (ECE)';
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
          {displayData?.location || 'Kolkata, India'}
          <span> | </span>
          {displayData?.phone || '9051162278'}
          <span> | </span>
          {displayData?.email || currentUser?.email || 'mdzeeshank578@gmail.com'}
          {displayData?.linkedIn && <><span> | </span><span>{displayData.linkedIn.replace('https://', '').replace('www.', '')}</span></>}
          {displayData?.github && <><span> | </span><span>{displayData.github.replace('https://', '').replace('www.', '')}</span></>}
        </div>
      </div>

      {/* Summary */}
      <div className="jakes-section">
        <h2 className="jakes-heading">PROFESSIONAL SUMMARY</h2>
        <p className="jakes-summary">{summaryText}</p>
      </div>

      {/* Education & Schooling */}
      <div className="jakes-section">
        <h2 className="jakes-heading">EDUCATION</h2>
        {educationList.length > 0 ? (
          educationList.map((edu, i) => (
            <div key={i} className="jakes-item">
              <div className="jakes-item-header">
                <div>
                  <span className="jakes-bold">{edu.degree}</span>
                  {edu.school && <span className="jakes-italic"> — {edu.school}</span>}
                </div>
                <div className="jakes-right-meta">
                  {edu.years && <span>{edu.years}</span>}
                  {edu.score && <span> | {edu.score}</span>}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="jakes-item-header">
            <div>
              <span className="jakes-bold">{educationText}</span>
              <span className="jakes-italic"> — Maulana Abul Kalam Azad University of Technology</span>
            </div>
            <div className="jakes-right-meta">
              <span>2022 – 2026</span>
            </div>
          </div>
        )}

        {schoolingList.length > 0 && (
          <div style={{ marginTop: '6px' }}>
            {schoolingList.map((sch, i) => (
              <div key={i} className="jakes-item" style={{ marginBottom: '3px' }}>
                <div className="jakes-item-header">
                  <div>
                    <span className="jakes-bold">{sch.classGrade || 'Secondary Education'}</span>
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

      {/* Experience */}
      <div className="jakes-section">
        <h2 className="jakes-heading">PROFESSIONAL EXPERIENCE</h2>
        {workExp.map((exp, idx) => (
          <div key={idx} className="jakes-item">
            <div className="jakes-item-header">
              <div>
                <span className="jakes-bold">{exp.title || 'Full Stack Engineer'}</span>
                <span className="jakes-italic"> — {exp.company || 'JobTracker Engineering'}</span>
                {exp.location && <span style={{ fontSize: '0.84rem', color: '#475569' }}> ({exp.location})</span>}
              </div>
              <div className="jakes-right-meta">
                <span>{exp.dates || 'Jan 2022 – Present'}</span>
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
        ))}
      </div>

      {/* Projects */}
      <div className="jakes-section">
        <h2 className="jakes-heading">FEATURED PROJECTS</h2>
        {defaultProjects.map((proj, idx) => (
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
      <div className="jakes-section">
        <h2 className="jakes-heading">TECHNICAL SKILLS & COMPETENCIES</h2>
        <ul className="jakes-bullets" style={{ marginTop: '4px' }}>
          <li><span className="jakes-bold">Languages:</span> {techSkills.join(', ')}</li>
          <li><span className="jakes-bold">Frameworks & Libraries:</span> {frameworks.join(', ')}</li>
          <li><span className="jakes-bold">Cloud & Tools:</span> {tools.join(', ')}</li>
          <li><span className="jakes-bold">Engineering Methodologies:</span> {softSkills.join(', ')}</li>
          {languagesList.length > 0 && (
            <li><span className="jakes-bold">Languages Spoken:</span> {languagesList.map(l => `${l.language} (${l.proficiency})`).join(', ')}</li>
          )}
        </ul>
      </div>

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
          <span>📧 {displayData?.email || 'mdzeeshank578@gmail.com'}</span>
          <span>📱 {displayData?.phone || '9051162278'}</span>
          <span>📍 {displayData?.location || 'Kolkata, India'}</span>
        </div>
      </div>

      <div className="teal-section">
        <h2 className="teal-heading">PROFESSIONAL SUMMARY</h2>
        <p className="teal-text">{summaryText}</p>
      </div>

      <div className="teal-section">
        <h2 className="teal-heading">EDUCATION</h2>
        <p className="teal-text"><strong>{educationText}</strong> — Maulana Abul Kalam Azad University of Technology (2022 – 2026)</p>
      </div>

      <div className="teal-section">
        <h2 className="teal-heading">PROFESSIONAL EXPERIENCE</h2>
        {workExp.map((exp, idx) => (
          <div key={idx} className="teal-item">
            <div className="teal-item-head">
              <strong>{exp.title || 'Full Stack Engineer'}</strong> — <span className="teal-company">{exp.company || 'JobTracker Engineering'}</span> ({exp.location || 'Remote'})
              <span className="teal-date">{exp.dates || 'Jan 2022 – Present'}</span>
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

      <div className="teal-section">
        <h2 className="teal-heading">FEATURED PROJECTS</h2>
        {defaultProjects.map((proj, idx) => (
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

      <div className="teal-section">
        <h2 className="teal-heading">TECHNICAL COMPETENCIES</h2>
        <div className="teal-pills">
          {techSkills.concat(frameworks).concat(tools).map((s, i) => <span key={i} className="teal-pill">{s}</span>)}
        </div>
      </div>
    </div>
  );

  const renderReactiveTemplate = () => (
    <div className="reactive-template">
      <div className="reactive-sidebar">
        <h1 className="reactive-sidebar-name">{fullName}</h1>
        <div className="reactive-sidebar-title">{profTitle}</div>

        <div className="reactive-side-section">
          <h3>CONTACT</h3>
          <div>{displayData?.email || 'mdzeeshank578@gmail.com'}</div>
          <div>{displayData?.phone || '9051162278'}</div>
          <div>{displayData?.location || 'Kolkata, India'}</div>
        </div>

        <div className="reactive-side-section">
          <h3>TECHNICAL SKILLS</h3>
          {techSkills.concat(frameworks).map((s, i) => <div key={i} className="reactive-skill-tag">• {s}</div>)}
        </div>

        <div className="reactive-side-section">
          <h3>EDUCATION</h3>
          <div>{educationText}</div>
          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px' }}>2022 – 2026</div>
        </div>
      </div>

      <div className="reactive-main">
        <div className="reactive-main-section">
          <h2>SUMMARY</h2>
          <p>{summaryText}</p>
        </div>

        <div className="reactive-main-section">
          <h2>PROFESSIONAL EXPERIENCE</h2>
          {workExp.map((exp, idx) => (
            <div key={idx} className="reactive-exp-item">
              <div className="reactive-exp-header">
                <strong>{exp.title || 'Full Stack Engineer'}</strong> — {exp.company || 'JobTracker Engineering'}
                <span className="reactive-date">{exp.dates || 'Jan 2022 – Present'}</span>
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

        <div className="reactive-main-section">
          <h2>FEATURED PROJECTS</h2>
          {defaultProjects.map((proj, idx) => (
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
      </div>
    </div>
  );

  const renderEnhancvTemplate = () => (
    <div className="enhancv-template">
      <div className="enhancv-header">
        <h1>{fullName}</h1>
        <h2>{profTitle}</h2>
        <p className="enhancv-contact">{displayData?.email || 'mdzeeshank578@gmail.com'} | {displayData?.phone || '9051162278'} | {displayData?.location || 'Kolkata, India'}</p>
      </div>

      <div className="enhancv-section">
        <h3>CAREER SUMMARY</h3>
        <p>{summaryText}</p>
      </div>

      <div className="enhancv-section">
        <h3>EDUCATION</h3>
        <p><strong>{educationText}</strong> — Maulana Abul Kalam Azad University of Technology (2022 – 2026)</p>
      </div>

      <div className="enhancv-section">
        <h3>EXPERIENCE</h3>
        {workExp.map((exp, idx) => (
          <div key={idx} className="enhancv-item">
            <div className="enhancv-row">
              <strong>{exp.title || 'Full Stack Engineer'} — {exp.company || 'JobTracker Engineering'}</strong>
              <span>{exp.dates || 'Jan 2022 – Present'}</span>
            </div>
            <div className="enhancv-sub">{exp.location || 'Kolkata, India (Remote)'}</div>
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

      <div className="enhancv-section">
        <h3>FEATURED PROJECTS</h3>
        {defaultProjects.map((proj, idx) => (
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
    </div>
  );

  const renderJobscanTemplate = () => (
    <div className="jobscan-template">
      <div className="jobscan-header">
        <h1>{fullName}</h1>
        <p>{displayData?.email || 'mdzeeshank578@gmail.com'} | {displayData?.phone || '9051162278'} | {displayData?.location || 'Kolkata, India'}</p>
      </div>

      <div className="jobscan-section">
        <h2>SUMMARY OF QUALIFICATIONS</h2>
        <p>{summaryText}</p>
      </div>

      <div className="jobscan-section">
        <h2>EDUCATION</h2>
        <p><strong>{educationText}</strong> — Maulana Abul Kalam Azad University of Technology (2022 – 2026)</p>
      </div>

      <div className="jobscan-section">
        <h2>PROFESSIONAL EXPERIENCE</h2>
        {workExp.map((exp, idx) => (
          <div key={idx} className="jobscan-item">
            <h3>{exp.title || 'Full Stack Engineer'} | {exp.company || 'JobTracker Engineering'} — {exp.location || 'Remote'} ({exp.dates || 'Jan 2022 – Present'})</h3>
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

      <div className="jobscan-section">
        <h2>FEATURED PROJECTS</h2>
        {defaultProjects.map((proj, idx) => (
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

      <div className="jobscan-section">
        <h2>TECHNICAL SKILLS & COMPETENCIES</h2>
        <p><strong>Languages:</strong> {techSkills.join(', ')}</p>
        <p><strong>Frameworks:</strong> {frameworks.join(', ')}</p>
        <p><strong>Tools:</strong> {tools.join(', ')}</p>
      </div>
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
             <button className="optimize-btn" onClick={handleOptimizeContent} disabled={isOptimizing}>
               {isOptimizing ? <RefreshCw size={15} className="spin-animation" /> : <Sparkles size={15} />} 
               <span>{isOptimizing ? 'Polishing...' : 'AI Polish'}</span>
             </button>
             <button className="download-btn" onClick={handlePrint}>
               <Download size={15} /> <span>Export PDF</span>
             </button>
          </div>
        </div>
        
        <div className="resume-canvas-wrapper">
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
                          <button className="btn-add-tracker" onClick={() => handleSaveJob(job)}>
                             <PlusCircle size={16} style={{ color: '#2563eb' }}/> Tracker
                          </button>
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
