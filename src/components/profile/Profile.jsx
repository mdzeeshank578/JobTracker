import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, User, Briefcase, Mail, Phone, MapPin, 
  Link as LinkIcon, Info, Globe, Camera, Plus, Trash2, Check, Key, Award, BookOpen, Sparkles, GraduationCap, CheckCircle2, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../../services/db';
import { updateProfile } from 'firebase/auth';
import { AutocompleteInput, AutocompleteTextarea, SUGGESTION_DICTIONARY } from '../common/AutocompleteInput';
import './Profile.css';

export function calculateProfileCompletion(p) {
  if (!p) return { percentage: 0, level: 'Getting Started', color: '#ef4444', items: [] };

  let score = 0;
  const items = [];

  // Personal Info (20%)
  if (p.fullName && p.fullName.trim()) score += 5; else items.push('Full Name');
  if (p.professionalTitle && p.professionalTitle.trim()) score += 5; else items.push('Professional Title');
  if (p.location && p.location.trim()) score += 5; else items.push('Location');
  if (p.availability && p.availability.trim()) score += 5; else items.push('Availability Status');

  // Contact (15%)
  if (p.email && p.email.trim()) score += 5; else items.push('Email');
  if (p.phone && p.phone.trim()) score += 5; else items.push('Phone Number');
  if ((p.linkedIn && p.linkedIn.trim()) || (p.github && p.github.trim()) || (p.portfolio && p.portfolio.trim())) score += 5; else items.push('LinkedIn / Portfolio Link');

  // Bio / Executive Summary (15%)
  if (p.bio && p.bio.trim().length > 20) score += 15;
  else if (p.bio && p.bio.trim()) score += 8;
  else items.push('Executive Summary');

  // Work Experience (15%)
  if (Array.isArray(p.workExperience) && p.workExperience.some(w => w.title && w.company)) score += 15;
  else items.push('Work Experience Role');

  // Featured Projects (15%)
  if (Array.isArray(p.projects) && p.projects.some(pr => pr.name)) score += 15;
  else items.push('Featured Project');

  // Technical Skills (10%)
  if ((p.technicalSkills && p.technicalSkills.trim()) || (p.frameworks && p.frameworks.trim())) score += 10;
  else items.push('Technical Skills');

  // Education or Schooling (10%)
  if ((Array.isArray(p.educationList) && p.educationList.some(e => e.degree || e.school)) || (Array.isArray(p.schoolingList) && p.schoolingList.some(s => s.schoolName))) score += 10;
  else items.push('Higher Education / School Record');

  const finalScore = Math.min(100, Math.max(0, score));

  let level = 'Getting Started';
  let color = '#ef4444';
  if (finalScore >= 90) {
    level = 'All-Star Profile';
    color = '#10b981';
  } else if (finalScore >= 70) {
    level = 'Competitive CV';
    color = '#3b82f6';
  } else if (finalScore >= 45) {
    level = 'Intermediate';
    color = '#f59e0b';
  }

  return { percentage: finalScore, level, color, items };
}

export default function Profile({ onBack }) {
  const { currentUser, linkPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingObj, setIsUploadingObj] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [securityPassword, setSecurityPassword] = useState('');
  const [isLinkingPassword, setIsLinkingPassword] = useState(false);
  const [securityMessage, setSecurityMessage] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: currentUser?.displayName || '',
    professionalTitle: '',
    targetRoleLevel: 'Mid-Senior',
    tagline: '',
    bio: '',
    email: currentUser?.email || '',
    phone: '',
    location: '',
    linkedIn: '',
    github: '',
    portfolio: '',
    twitter: '',
    devBlog: '',
    availability: 'Immediately Available (0 Days Notice)',
    careerObjective: '',
    showObjective: false,
    
    workExperience: [],
    projects: [],
    educationList: [],
    schoolingList: [],
    languagesList: [],
    achievements: [],
    certifications: [],
    publications: [],
    volunteering: [],
    hackathons: [],

    technicalSkills: '',
    frameworks: '',
    databases: '',
    softSkills: '',
    tools: '',
    languages: '',
    interests: '',
    education: '',
    atsKeywords: '',

    skills: '',
    workHistory: '',

    cvCustomization: {
      template: 'jakes',
      colorTheme: 'blue',
      fontStyle: 'Inter',
      showSidebar: true
    }
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (currentUser) {
          const data = await getUserProfile(currentUser.uid);
          if (data) {
            setFormData(prev => ({
              ...prev,
              ...data,
              workExperience: data.workExperience || [],
              projects: data.projects || [],
              educationList: data.educationList || [],
              schoolingList: data.schoolingList || [],
              languagesList: data.languagesList || [],
              achievements: data.achievements || [],
              certifications: data.certifications || [],
              publications: data.publications || [],
              volunteering: data.volunteering || [],
              hackathons: data.hackathons || [],
              cvCustomization: data.cvCustomization || prev.cvCustomization
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFieldUpdate = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomizationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      cvCustomization: {
        ...prev.cvCustomization,
        [field]: value
      }
    }));
  };

  const addArrayItem = (arrayName, template) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: [...(prev[arrayName] || []), template]
    }));
  };

  const removeArrayItem = (arrayName, index) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: (prev[arrayName] || []).filter((_, i) => i !== index)
    }));
  };

  const handleArrayChange = (arrayName, index, field, value) => {
    setFormData(prev => {
      const newArray = [...(prev[arrayName] || [])];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [arrayName]: newArray };
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 2MB' });
      return;
    }

    setIsUploadingObj(true);
    setMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const max_size = 250;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          
          try {
             await updateUserProfile(currentUser.uid, { ...formData, photoURL: dataUrl });
             setFormData(prev => ({ ...prev, photoURL: dataUrl }));
             setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
          } catch(err) {
             console.error("Profile update error:", err);
             setMessage({ type: 'error', text: 'Failed to save picture to database.' });
          } finally {
             setIsUploadingObj(false);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setMessage({ type: 'error', text: `Upload failed: ${error.message}` });
      setIsUploadingObj(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await updateUserProfile(currentUser?.uid || 'guest', formData);
      if (formData.fullName && currentUser && currentUser.displayName !== formData.fullName) {
        updateProfile(currentUser, { displayName: formData.fullName }).catch(() => {});
      }
      setMessage({ type: 'success', text: 'Profile & complete CV settings saved successfully!' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage({ type: 'error', text: `Failed to save profile: ${error.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkPassword = async () => {
    setIsLinkingPassword(true);
    setSecurityMessage(null);
    try {
      await linkPassword(securityPassword);
      setSecurityMessage({ type: 'success', text: 'Password set successfully! You can now log in directly with your email and password.' });
      setSecurityPassword('');
    } catch (error) {
      console.error("Error setting password:", error);
      setSecurityMessage({ type: 'error', text: `Failed to set password: ${error.message}` });
    } finally {
      setIsLinkingPassword(false);
    }
  };

  if (isLoading) {
    return <div className="profile-loading">Loading CV configuration...</div>;
  }

  const completionInfo = calculateProfileCompletion(formData);

  return (
    <div className="profile-container">
      <div className="profile-top-bar-wrapper">
        <div className="profile-top-bar">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <h2>Profile & Master CV Builder Setup</h2>
          <div style={{ width: 36 }}></div>
        </div>
      </div>

      <div className="profile-hero-section">
        <div className="profile-avatar-section">
          <div className="avatar-wrapper" onClick={() => fileInputRef.current?.click()} title="Change Photo">
            {(formData.photoURL || currentUser?.photoURL) ? (
              <img src={formData.photoURL || currentUser.photoURL} alt="User" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <User size={40} color="#fff" />
              </div>
            )}
            <div className="avatar-edit-overlay">
              <Camera size={20} color="#fff" />
            </div>
          </div>
          {isUploadingObj && <div className="avatar-uploading-spinner"></div>}
          <input 
            type="file" ref={fileInputRef} style={{ display: 'none' }} 
            accept="image/*" onChange={handleImageUpload}
          />
          <h3 className="profile-name">{formData.fullName || 'New User'}</h3>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.9rem', margin: '2px 0 0 0', fontWeight: 500 }}>
            {formData.professionalTitle || 'Software Engineering Professional'}
          </p>

          <div className="profile-completion-card" style={{
            marginTop: '16px',
            background: 'rgba(255, 255, 255, 0.16)',
            backdropFilter: 'blur(8px)',
            padding: '12px 20px',
            borderRadius: '14px',
            maxWidth: '440px',
            width: '100%',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            color: 'white',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color={completionInfo.color} /> Profile Strength Score
              </span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>
                {completionInfo.percentage}% ({completionInfo.level})
              </span>
            </div>

            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.3)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${completionInfo.percentage}%`,
                background: completionInfo.color,
                borderRadius: '4px',
                transition: 'width 0.5s ease-in-out'
              }}></div>
            </div>

            {completionInfo.items.length > 0 ? (
              <div style={{ marginTop: '8px', fontSize: '0.78rem', opacity: 0.9, textAlign: 'center' }}>
                Add <strong>{completionInfo.items.slice(0, 2).join(', ')}</strong> to reach 100%
              </div>
            ) : (
              <div style={{ marginTop: '8px', fontSize: '0.78rem', opacity: 0.9, textAlign: 'center', color: '#10b981', fontWeight: 600 }}>
                ✓ Master CV Profile 100% Complete & Optimized!
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>Personal & Contact</button>
        <button className={`tab-btn ${activeTab === 'experience' ? 'active' : ''}`} onClick={() => setActiveTab('experience')}>Experience & Projects</button>
        <button className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>Skills & Education</button>
        <button className={`tab-btn ${activeTab === 'extra' ? 'active' : ''}`} onClick={() => setActiveTab('extra')}>Certifications & Extras</button>
        <button className={`tab-btn ${activeTab === 'customization' ? 'active' : ''}`} onClick={() => setActiveTab('customization')}>CV Customization</button>
      </div>

      <div className="profile-content">
        {message && (
          <div className={`profile-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* ----------------- TAB: PERSONAL & CONTACT ----------------- */}
        {activeTab === 'personal' && (
          <>
            <div className="profile-card">
              <div className="card-header"><h4>Core Profile & Headline</h4></div>
              <div className="card-body grid-2-cols">
                <div className="input-with-icon">
                  <label className="floating-label">Full Name</label>
                  <User size={18} className="input-icon" />
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} />
                </div>
                <div className="input-with-icon">
                  <label className="floating-label">Professional Title / Role</label>
                  <Briefcase size={18} className="input-icon" />
                  <AutocompleteInput
                    value={formData.professionalTitle}
                    onChange={(val) => handleFieldUpdate('professionalTitle', val)}
                    placeholder="e.g. Full Stack Engineer | Cloud Architect"
                    suggestions={SUGGESTION_DICTIONARY.jobTitles}
                  />
                </div>
                <div className="input-with-icon">
                  <label className="floating-label">Tagline / Headline</label>
                  <Info size={18} className="input-icon" />
                  <AutocompleteInput
                    value={formData.tagline}
                    onChange={(val) => handleFieldUpdate('tagline', val)}
                    placeholder="e.g. Full Stack Developer | AI & Cloud Enthusiast"
                    suggestions={SUGGESTION_DICTIONARY.jobTitles}
                  />
                </div>
                <div className="input-with-icon">
                  <label className="floating-label">Target Career Level</label>
                  <Briefcase size={18} className="input-icon" />
                  <select name="targetRoleLevel" value={formData.targetRoleLevel} onChange={handleChange} style={{paddingLeft: '44px'}}>
                    <option value="Entry-Level / Graduate">Entry-Level / Graduate</option>
                    <option value="Junior-Mid">Junior-Mid Level</option>
                    <option value="Mid-Senior">Mid-Senior Engineer</option>
                    <option value="Lead / Principal">Lead / Principal Architect</option>
                    <option value="Manager / Director">Executive / Director</option>
                  </select>
                </div>
                <div className="input-with-icon">
                  <label className="floating-label">Availability / Work Status</label>
                  <Clock size={18} className="input-icon" />
                  <AutocompleteInput
                    value={formData.availability}
                    onChange={(val) => handleFieldUpdate('availability', val)}
                    placeholder="e.g. Immediately Available (0 Days Notice)"
                    suggestions={SUGGESTION_DICTIONARY.availability}
                  />
                </div>
              </div>
            </div>

            <div className="profile-card">
              <div className="card-header"><h4>Professional Summary & Career Objective</h4></div>
              <div className="card-body">
                <div className="input-with-icon textarea-icon-wrapper">
                  <label className="floating-label">Executive Professional Summary (3-4 Sentences)</label>
                  <Info size={18} className="input-icon align-top" />
                  <AutocompleteTextarea
                    value={formData.bio}
                    onChange={(val) => handleFieldUpdate('bio', val)}
                    rows={3}
                    placeholder="Results-driven Full Stack Developer skilled in React, Node.js, Python, AWS, and AI integration..."
                    suggestions={SUGGESTION_DICTIONARY.softSkills}
                  />
                </div>
                
                <div className="toggle-switch-wrapper">
                  <span className="toggle-label">Include Targeted Career Objective in CV</span>
                  <input type="checkbox" name="showObjective" checked={formData.showObjective} onChange={handleChange} />
                </div>
                
                {formData.showObjective && (
                  <div className="input-with-icon textarea-icon-wrapper">
                    <label className="floating-label">Career Objective</label>
                    <Briefcase size={18} className="input-icon align-top" />
                    <AutocompleteTextarea
                      value={formData.careerObjective}
                      onChange={(val) => handleFieldUpdate('careerObjective', val)}
                      rows={2}
                      placeholder="To secure a high-impact software engineering role focused on building scalable cloud architecture..."
                      suggestions={SUGGESTION_DICTIONARY.softSkills}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="profile-card">
              <div className="card-header"><h4>Contact Information & Online Links</h4></div>
              <div className="card-body grid-2-cols">
                <div className="input-with-icon">
                  <label className="floating-label">Email Address</label>
                  <Mail size={18} className="input-icon" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange} readOnly />
                </div>
                <div className="input-with-icon">
                  <label className="floating-label">Phone Number (with Country Code)</label>
                  <Phone size={18} className="input-icon" />
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 9051162278" />
                </div>
                <div className="input-with-icon">
                  <label className="floating-label">Location (City, State/Country)</label>
                  <MapPin size={18} className="input-icon" />
                  <AutocompleteInput
                    value={formData.location}
                    onChange={(val) => handleFieldUpdate('location', val)}
                    placeholder="e.g. Kolkata, West Bengal, India"
                    suggestions={SUGGESTION_DICTIONARY.locations}
                  />
                </div>
                <div className="input-with-icon">
                  <label className="floating-label">LinkedIn Profile URL</label>
                  <LinkIcon size={18} className="input-icon" />
                  <input type="url" name="linkedIn" value={formData.linkedIn} onChange={handleChange} placeholder="https://linkedin.com/in/username" />
                </div>
                <div className="input-with-icon">
                  <label className="floating-label">GitHub Profile URL</label>
                  <LinkIcon size={18} className="input-icon" />
                  <input type="url" name="github" value={formData.github} onChange={handleChange} placeholder="https://github.com/username" />
                </div>
                <div className="input-with-icon">
                  <label className="floating-label">Portfolio / Website URL</label>
                  <Globe size={18} className="input-icon" />
                  <input type="url" name="portfolio" value={formData.portfolio} onChange={handleChange} placeholder="https://yourportfolio.com" />
                </div>
                <div className="input-with-icon">
                  <label className="floating-label">Twitter / X / Tech Profile</label>
                  <LinkIcon size={18} className="input-icon" />
                  <input type="url" name="twitter" value={formData.twitter} onChange={handleChange} placeholder="https://x.com/username" />
                </div>
                <div className="input-with-icon">
                  <label className="floating-label">Blog / Dev.to / Medium URL</label>
                  <Globe size={18} className="input-icon" />
                  <input type="url" name="devBlog" value={formData.devBlog} onChange={handleChange} placeholder="https://dev.to/username" />
                </div>
              </div>
            </div>

            <div className="profile-card" style={{ border: '1px solid var(--primary-color)' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="var(--primary-color)" />
                <h4 style={{ margin: 0 }}>Account Security & Direct Password Sign-In</h4>
              </div>
              <div className="card-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                  Set a password for your account to enable logging in directly with your email and password.
                </p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="input-with-icon" style={{ flex: '1 1 250px', marginBottom: 0 }}>
                    <label className="floating-label">Account Password</label>
                    <Key size={18} className="input-icon" />
                    <input 
                      type="password" 
                      value={securityPassword} 
                      onChange={(e) => setSecurityPassword(e.target.value)} 
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleLinkPassword}
                    disabled={isLinkingPassword || !securityPassword || securityPassword.length < 6}
                    style={{ 
                      padding: '0.75rem 1.5rem', 
                      height: '46px', 
                      borderRadius: 'var(--border-radius-sm)', 
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      backgroundColor: 'var(--primary-color)',
                      color: 'white',
                      cursor: (isLinkingPassword || !securityPassword || securityPassword.length < 6) ? 'not-allowed' : 'pointer',
                      opacity: (isLinkingPassword || !securityPassword || securityPassword.length < 6) ? 0.6 : 1,
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {isLinkingPassword ? 'Saving...' : 'Set Password'}
                  </button>
                </div>
                {securityMessage && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: securityMessage.type === 'success' ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                    {securityMessage.text}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ----------------- TAB: EXPERIENCE & PROJECTS ----------------- */}
        {activeTab === 'experience' && (
          <>
            <div className="profile-card">
              <div className="card-header"><h4>Professional Work Experience (Add Multiple Roles)</h4></div>
              <div className="card-body">
                {formData.workExperience.map((exp, idx) => (
                  <div key={idx} className="array-item-card">
                    <div className="array-item-header">
                      <span>Work Experience #{idx + 1}</span>
                      <button className="remove-item-btn" onClick={() => removeArrayItem('workExperience', idx)}><Trash2 size={14}/> Remove</button>
                    </div>
                    
                    <div className="grid-2-cols">
                      <div className="input-with-icon">
                        <label className="floating-label">Job Title</label>
                        <Briefcase size={18} className="input-icon" />
                        <AutocompleteInput
                          value={exp.title}
                          onChange={(val) => handleArrayChange('workExperience', idx, 'title', val)}
                          placeholder="e.g. Full Stack Engineer"
                          suggestions={SUGGESTION_DICTIONARY.jobTitles}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Company Name</label>
                        <User size={18} className="input-icon" />
                        <AutocompleteInput
                          value={exp.company}
                          onChange={(val) => handleArrayChange('workExperience', idx, 'company', val)}
                          placeholder="e.g. Google / Microsoft"
                          suggestions={SUGGESTION_DICTIONARY.companies}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Dates</label>
                        <Info size={18} className="input-icon" />
                        <AutocompleteInput
                          value={exp.dates}
                          onChange={(val) => handleArrayChange('workExperience', idx, 'dates', val)}
                          placeholder="e.g. Jan 2022 - Present"
                          suggestions={SUGGESTION_DICTIONARY.dates}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Location & Work Mode</label>
                        <MapPin size={18} className="input-icon" />
                        <AutocompleteInput
                          value={exp.location}
                          onChange={(val) => handleArrayChange('workExperience', idx, 'location', val)}
                          placeholder="e.g. Kolkata, India (Remote)"
                          suggestions={SUGGESTION_DICTIONARY.locations}
                        />
                      </div>
                    </div>
                    
                    <div className="input-with-icon textarea-icon-wrapper">
                      <label className="floating-label">Key Responsibilities & Action Bullet Points</label>
                      <Info size={18} className="input-icon align-top" />
                      <AutocompleteTextarea
                        rows={4}
                        value={exp.description}
                        onChange={(val) => handleArrayChange('workExperience', idx, 'description', val)}
                        placeholder="• Developed scalable software applications using React and Node.js..."
                        suggestions={SUGGESTION_DICTIONARY.technicalSkills}
                      />
                    </div>
                    <div className="input-with-icon textarea-icon-wrapper">
                      <label className="floating-label">Quantified Achievement / Impact (Optional)</label>
                      <Info size={18} className="input-icon align-top" />
                      <AutocompleteTextarea
                        rows={2}
                        value={exp.achievements}
                        onChange={(val) => handleArrayChange('workExperience', idx, 'achievements', val)}
                        placeholder="e.g. Optimized database query speeds by 40%, reducing API latency."
                        suggestions={SUGGESTION_DICTIONARY.softSkills}
                      />
                    </div>
                  </div>
                ))}
                <button className="add-item-btn" onClick={() => addArrayItem('workExperience', {title:'', company:'', dates:'', location:'', description:'', achievements:''})}>
                  <Plus size={18}/> Add Work Experience Role
                </button>
              </div>
            </div>

            <div className="profile-card">
              <div className="card-header"><h4>Featured Projects (Add Multiple Projects)</h4></div>
              <div className="card-body">
                {formData.projects.map((proj, idx) => (
                  <div key={idx} className="array-item-card">
                    <div className="array-item-header">
                      <span>Featured Project #{idx + 1}</span>
                      <button className="remove-item-btn" onClick={() => removeArrayItem('projects', idx)}><Trash2 size={14}/> Remove</button>
                    </div>
                    
                    <div className="grid-2-cols">
                      <div className="input-with-icon">
                        <label className="floating-label">Project Name</label>
                        <Briefcase size={18} className="input-icon" />
                        <AutocompleteInput
                          value={proj.name}
                          onChange={(val) => handleArrayChange('projects', idx, 'name', val)}
                          placeholder="e.g. Enterprise Job Tracker SaaS"
                          suggestions={SUGGESTION_DICTIONARY.projectNames}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Technologies Used</label>
                        <Info size={18} className="input-icon" />
                        <AutocompleteInput
                          value={proj.tech}
                          onChange={(val) => handleArrayChange('projects', idx, 'tech', val)}
                          placeholder="React, Node.js, Firebase, AWS"
                          suggestions={SUGGESTION_DICTIONARY.technicalSkills}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">GitHub Repository Link</label>
                        <LinkIcon size={18} className="input-icon" />
                        <input type="url" value={proj.githubUrl} onChange={e => handleArrayChange('projects', idx, 'githubUrl', e.target.value)} placeholder="https://github.com/..." />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Live App / Demo Link</label>
                        <Globe size={18} className="input-icon" />
                        <input type="url" value={proj.liveUrl} onChange={e => handleArrayChange('projects', idx, 'liveUrl', e.target.value)} placeholder="https://myapp.com" />
                      </div>
                    </div>
                    
                    <div className="input-with-icon textarea-icon-wrapper">
                      <label className="floating-label">Project Highlights & Impact Bullets</label>
                      <Info size={18} className="input-icon align-top" />
                      <AutocompleteTextarea
                        rows={3}
                        value={proj.description}
                        onChange={(val) => handleArrayChange('projects', idx, 'description', val)}
                        placeholder="• Built full-stack SaaS application with real-time database sync..."
                        suggestions={SUGGESTION_DICTIONARY.technicalSkills}
                      />
                    </div>
                  </div>
                ))}
                <button className="add-item-btn" onClick={() => addArrayItem('projects', {name:'', description:'', tech:'', githubUrl:'', liveUrl:''})}>
                  <Plus size={18}/> Add Featured Project
                </button>
              </div>
            </div>
          </>
        )}

        {/* ----------------- TAB: SKILLS & EDUCATION ----------------- */}
        {activeTab === 'skills' && (
          <>
            <div className="profile-card">
              <div className="card-header"><h4>Categorized Technical Competencies</h4></div>
              <div className="card-body">
                <div className="input-with-icon textarea-icon-wrapper">
                  <label className="floating-label">Programming Languages (Comma-separated)</label>
                  <Info size={18} className="input-icon align-top" />
                  <AutocompleteTextarea
                    value={formData.technicalSkills}
                    onChange={(val) => handleFieldUpdate('technicalSkills', val)}
                    rows={2}
                    placeholder="JavaScript, Python, SQL, TypeScript, Java, C++"
                    suggestions={SUGGESTION_DICTIONARY.technicalSkills}
                  />
                </div>
                <div className="input-with-icon textarea-icon-wrapper">
                  <label className="floating-label">Frameworks & Libraries</label>
                  <Info size={18} className="input-icon align-top" />
                  <AutocompleteTextarea
                    value={formData.frameworks}
                    onChange={(val) => handleFieldUpdate('frameworks', val)}
                    rows={2}
                    placeholder="React, Node.js, Express, Next.js, Flask, TailwindCSS"
                    suggestions={SUGGESTION_DICTIONARY.technicalSkills}
                  />
                </div>
                <div className="input-with-icon textarea-icon-wrapper">
                  <label className="floating-label">Cloud, DevOps & Developer Tools</label>
                  <Info size={18} className="input-icon align-top" />
                  <AutocompleteTextarea
                    value={formData.tools}
                    onChange={(val) => handleFieldUpdate('tools', val)}
                    rows={2}
                    placeholder="Firebase, AWS, Git, Figma, Docker, Kubernetes, Prometheus"
                    suggestions={SUGGESTION_DICTIONARY.tools}
                  />
                </div>
                <div className="input-with-icon textarea-icon-wrapper">
                  <label className="floating-label">Core Competencies & Soft Skills</label>
                  <Info size={18} className="input-icon align-top" />
                  <AutocompleteTextarea
                    value={formData.softSkills}
                    onChange={(val) => handleFieldUpdate('softSkills', val)}
                    rows={2}
                    placeholder="Problem Solving, Cross-Functional Collaboration, Agile/Scrum, Leadership"
                    suggestions={SUGGESTION_DICTIONARY.softSkills}
                  />
                </div>
              </div>
            </div>

            {/* HIGHER EDUCATION (COLLEGES & UNIVERSITIES) */}
            <div className="profile-card">
              <div className="card-header"><h4>Higher Education (Colleges & Universities)</h4></div>
              <div className="card-body">
                {formData.educationList.map((edu, idx) => (
                  <div key={idx} className="array-item-card">
                    <div className="array-item-header">
                      <span>College / University Degree #{idx + 1}</span>
                      <button className="remove-item-btn" onClick={() => removeArrayItem('educationList', idx)}><Trash2 size={14}/> Remove</button>
                    </div>
                    <div className="grid-2-cols">
                      <div className="input-with-icon">
                        <label className="floating-label">Degree / Course</label>
                        <BookOpen size={18} className="input-icon" />
                        <AutocompleteInput
                          value={edu.degree}
                          onChange={(val) => handleArrayChange('educationList', idx, 'degree', val)}
                          placeholder="B.Tech in Computer Science"
                          suggestions={SUGGESTION_DICTIONARY.education}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">College / University Name</label>
                        <Briefcase size={18} className="input-icon" />
                        <AutocompleteInput
                          value={edu.school}
                          onChange={(val) => handleArrayChange('educationList', idx, 'school', val)}
                          placeholder="University Name"
                          suggestions={SUGGESTION_DICTIONARY.universities}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Dates / Graduation Year</label>
                        <Info size={18} className="input-icon" />
                        <AutocompleteInput
                          value={edu.years}
                          onChange={(val) => handleArrayChange('educationList', idx, 'years', val)}
                          placeholder="2020 - 2024"
                          suggestions={SUGGESTION_DICTIONARY.dates}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">GPA / Marks / Honors</label>
                        <Award size={18} className="input-icon" />
                        <AutocompleteInput
                          value={edu.score}
                          onChange={(val) => handleArrayChange('educationList', idx, 'score', val)}
                          placeholder="First Class with Distinction"
                          suggestions={SUGGESTION_DICTIONARY.scores}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="add-item-btn" onClick={() => addArrayItem('educationList', {degree:'', school:'', years:'', score:''})}>
                  <Plus size={18}/> Add College / University Degree
                </button>
              </div>
            </div>

            {/* SCHOOLING DETAILS (CLASS 10 & CLASS 12 / HIGH SCHOOL) */}
            <div className="profile-card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap size={18} color="#2563eb" />
                <h4 style={{ margin: 0 }}>Schooling Details (Class 10 & Class 12 / High School)</h4>
              </div>
              <div className="card-body">
                {formData.schoolingList.map((sch, idx) => (
                  <div key={idx} className="array-item-card">
                    <div className="array-item-header">
                      <span>School Record #{idx + 1}</span>
                      <button className="remove-item-btn" onClick={() => removeArrayItem('schoolingList', idx)}><Trash2 size={14}/> Remove</button>
                    </div>
                    <div className="grid-2-cols">
                      <div className="input-with-icon">
                        <label className="floating-label">Class / Standard</label>
                        <GraduationCap size={18} className="input-icon" />
                        <AutocompleteInput
                          value={sch.classGrade}
                          onChange={(val) => handleArrayChange('schoolingList', idx, 'classGrade', val)}
                          placeholder="Class 12 (Senior Secondary)"
                          suggestions={SUGGESTION_DICTIONARY.classes}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">School Name</label>
                        <Briefcase size={18} className="input-icon" />
                        <AutocompleteInput
                          value={sch.schoolName}
                          onChange={(val) => handleArrayChange('schoolingList', idx, 'schoolName', val)}
                          placeholder="e.g. St. Xavier's High School"
                          suggestions={SUGGESTION_DICTIONARY.schools}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Passing Year</label>
                        <Info size={18} className="input-icon" />
                        <AutocompleteInput
                          value={sch.year}
                          onChange={(val) => handleArrayChange('schoolingList', idx, 'year', val)}
                          placeholder="2020"
                          suggestions={SUGGESTION_DICTIONARY.dates}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Percentage / CGPA Marks</label>
                        <Award size={18} className="input-icon" />
                        <AutocompleteInput
                          value={sch.percentage}
                          onChange={(val) => handleArrayChange('schoolingList', idx, 'percentage', val)}
                          placeholder="95% Marks / 9.6 CGPA"
                          suggestions={SUGGESTION_DICTIONARY.scores}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="add-item-btn" onClick={() => addArrayItem('schoolingList', {schoolName:'', board:'', classGrade:'', stream:'', year:'', percentage:''})}>
                  <Plus size={18}/> Add Schooling Record (Class 10 / Class 12)
                </button>
              </div>
            </div>

            {/* LANGUAGES KNOWN (STRUCTURED MULTI-ITEM ARRAY) */}
            <div className="profile-card">
              <div className="card-header"><h4>Languages Known (Add Multiple Languages)</h4></div>
              <div className="card-body">
                <div className="input-with-icon textarea-icon-wrapper" style={{ marginBottom: '16px' }}>
                  <label className="floating-label">Quick Language Summary</label>
                  <Globe size={18} className="input-icon align-top" />
                  <AutocompleteTextarea
                    value={formData.languages}
                    onChange={(val) => handleFieldUpdate('languages', val)}
                    rows={2}
                    placeholder="English (Native/Fluent), Hindi (Fluent), Bengali (Native), Spanish (Basic)..."
                    suggestions={SUGGESTION_DICTIONARY.languages}
                  />
                </div>

                {formData.languagesList.map((lang, idx) => (
                  <div key={idx} className="array-item-card">
                    <div className="array-item-header">
                      <span>Language #{idx + 1}</span>
                      <button className="remove-item-btn" onClick={() => removeArrayItem('languagesList', idx)}><Trash2 size={14}/> Remove</button>
                    </div>
                    <div className="grid-2-cols">
                      <div className="input-with-icon">
                        <label className="floating-label">Language Name</label>
                        <Globe size={18} className="input-icon" />
                        <AutocompleteInput
                          value={lang.language}
                          onChange={(val) => handleArrayChange('languagesList', idx, 'language', val)}
                          placeholder="English / Hindi / Bengali"
                          suggestions={SUGGESTION_DICTIONARY.languages}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Proficiency Level</label>
                        <Award size={18} className="input-icon" />
                        <AutocompleteInput
                          value={lang.proficiency}
                          onChange={(val) => handleArrayChange('languagesList', idx, 'proficiency', val)}
                          placeholder="Native / Fluent / Conversational"
                          suggestions={SUGGESTION_DICTIONARY.proficiencies}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="add-item-btn" onClick={() => addArrayItem('languagesList', {language:'', proficiency:''})}>
                  <Plus size={18}/> Add Language Entry
                </button>
              </div>
            </div>
          </>
        )}

        {/* ----------------- TAB: EXTRAS & CERTIFICATIONS ----------------- */}
        {activeTab === 'extra' && (
          <>
            <div className="profile-card">
              <div className="card-header"><h4>Certifications, Licenses & Awards (Add Multiple Certifications)</h4></div>
              <div className="card-body">
                {formData.certifications.map((cert, idx) => (
                  <div key={idx} className="array-item-card">
                    <div className="array-item-header">
                      <span>Certification/Award #{idx + 1}</span>
                      <button className="remove-item-btn" onClick={() => removeArrayItem('certifications', idx)}><Trash2 size={14}/> Remove</button>
                    </div>
                    <div className="grid-2-cols">
                      <div className="input-with-icon">
                        <label className="floating-label">Certification Name & Authority</label>
                        <Award size={18} className="input-icon" />
                        <AutocompleteInput
                          value={cert.name}
                          onChange={(val) => handleArrayChange('certifications', idx, 'name', val)}
                          placeholder="AWS Certified Solutions Architect (Amazon)"
                          suggestions={SUGGESTION_DICTIONARY.certifications}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Verification / Credential Link</label>
                        <LinkIcon size={18} className="input-icon" />
                        <input type="url" value={cert.link} onChange={e => handleArrayChange('certifications', idx, 'link', e.target.value)} placeholder="https://credly.com/..." />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="add-item-btn" onClick={() => addArrayItem('certifications', {name:'', link:''})}>
                  <Plus size={18}/> Add Certification
                </button>
              </div>
            </div>

            {/* HACKATHONS & CODING COMPETITIONS */}
            <div className="profile-card">
              <div className="card-header"><h4>Hackathons, Coding Competitions & Competitions</h4></div>
              <div className="card-body">
                {formData.hackathons.map((hack, idx) => (
                  <div key={idx} className="array-item-card">
                    <div className="array-item-header">
                      <span>Hackathon / Competition #{idx + 1}</span>
                      <button className="remove-item-btn" onClick={() => removeArrayItem('hackathons', idx)}><Trash2 size={14}/> Remove</button>
                    </div>
                    <div className="grid-2-cols">
                      <div className="input-with-icon">
                        <label className="floating-label">Hackathon / Competition Name</label>
                        <Award size={18} className="input-icon" />
                        <AutocompleteInput
                          value={hack.name}
                          onChange={(val) => handleArrayChange('hackathons', idx, 'name', val)}
                          placeholder="Smart India Hackathon (SIH)"
                          suggestions={SUGGESTION_DICTIONARY.hackathonTypes}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Award Position / Result</label>
                        <Sparkles size={18} className="input-icon" />
                        <AutocompleteInput
                          value={hack.position}
                          onChange={(val) => handleArrayChange('hackathons', idx, 'position', val)}
                          placeholder="1st Place Winner / Finalist"
                          suggestions={SUGGESTION_DICTIONARY.scores}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Role in Team</label>
                        <User size={18} className="input-icon" />
                        <input type="text" value={hack.role} onChange={e => handleArrayChange('hackathons', idx, 'role', e.target.value)} placeholder="Team Lead & Backend Engineer" />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Technologies Used</label>
                        <Info size={18} className="input-icon" />
                        <AutocompleteInput
                          value={hack.tech}
                          onChange={(val) => handleArrayChange('hackathons', idx, 'tech', val)}
                          placeholder="React, Python, AWS"
                          suggestions={SUGGESTION_DICTIONARY.technicalSkills}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="add-item-btn" onClick={() => addArrayItem('hackathons', {name:'', position:'', role:'', tech:''})}>
                  <Plus size={18}/> Add Competition / Hackathon Record
                </button>
              </div>
            </div>

            <div className="profile-card">
              <div className="card-header"><h4>Volunteering & Community Leadership (Add Multiple Roles)</h4></div>
              <div className="card-body">
                {formData.volunteering.map((vol, idx) => (
                  <div key={idx} className="array-item-card">
                    <div className="array-item-header">
                      <span>Leadership Role #{idx + 1}</span>
                      <button className="remove-item-btn" onClick={() => removeArrayItem('volunteering', idx)}><Trash2 size={14}/> Remove</button>
                    </div>
                    <div className="grid-2-cols">
                      <div className="input-with-icon">
                        <label className="floating-label">Role Title</label>
                        <User size={18} className="input-icon" />
                        <AutocompleteInput
                          value={vol.role}
                          onChange={(val) => handleArrayChange('volunteering', idx, 'role', val)}
                          placeholder="e.g. Tech Lead & Student Mentor"
                          suggestions={SUGGESTION_DICTIONARY.volunteeringRoles}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Organization Name</label>
                        <Briefcase size={18} className="input-icon" />
                        <AutocompleteInput
                          value={vol.organization}
                          onChange={(val) => handleArrayChange('volunteering', idx, 'organization', val)}
                          placeholder="Google Developer Student Club"
                          suggestions={SUGGESTION_DICTIONARY.companies}
                        />
                      </div>
                    </div>
                    <div className="input-with-icon">
                      <label className="floating-label">Impact Summary</label>
                      <Info size={18} className="input-icon" />
                      <AutocompleteInput
                        value={vol.impact}
                        onChange={(val) => handleArrayChange('volunteering', idx, 'impact', val)}
                        placeholder="Mentored 200+ students in full stack web development..."
                        suggestions={SUGGESTION_DICTIONARY.softSkills}
                      />
                    </div>
                  </div>
                ))}
                <button className="add-item-btn" onClick={() => addArrayItem('volunteering', {role:'', organization:'', impact:''})}>
                  <Plus size={18}/> Add Leadership Role
                </button>
              </div>
            </div>

            <div className="profile-card">
              <div className="card-header"><h4>Publications, Research Papers & Articles (Add Multiple Papers)</h4></div>
              <div className="card-body">
                {formData.publications.map((pub, idx) => (
                  <div key={idx} className="array-item-card">
                    <div className="array-item-header">
                      <span>Publication / Project Paper</span>
                      <button className="remove-item-btn" onClick={() => removeArrayItem('publications', idx)}><Trash2 size={14}/> Remove</button>
                    </div>
                    <div className="grid-2-cols">
                      <div className="input-with-icon">
                        <label className="floating-label">Paper Title</label>
                        <BookOpen size={18} className="input-icon" />
                        <AutocompleteInput
                          value={pub.title}
                          onChange={(val) => handleArrayChange('publications', idx, 'title', val)}
                          placeholder="Machine Learning in Recruitment..."
                          suggestions={SUGGESTION_DICTIONARY.projectNames}
                        />
                      </div>
                      <div className="input-with-icon">
                        <label className="floating-label">Journal / Link</label>
                        <LinkIcon size={18} className="input-icon" />
                        <AutocompleteInput
                          value={pub.journal}
                          onChange={(val) => handleArrayChange('publications', idx, 'journal', val)}
                          placeholder="IEEE / Springer / ArXiv Link"
                          suggestions={SUGGESTION_DICTIONARY.journals}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="add-item-btn" onClick={() => addArrayItem('publications', {title:'', journal:''})}>
                  <Plus size={18}/> Add Research Paper
                </button>
              </div>
            </div>

            <div className="profile-card">
              <div className="card-header"><h4>Interests & ATS Keyword Bank</h4></div>
              <div className="card-body">
                <div className="input-with-icon textarea-icon-wrapper">
                  <label className="floating-label">Interests & Hobbies</label>
                  <Info size={18} className="input-icon align-top" />
                  <AutocompleteTextarea
                    value={formData.interests}
                    onChange={(val) => handleFieldUpdate('interests', val)}
                    rows={2}
                    placeholder="Artificial Intelligence (AI), Robotics, Open Source, Hiking..."
                    suggestions={SUGGESTION_DICTIONARY.interests}
                  />
                </div>
                <div className="input-with-icon textarea-icon-wrapper">
                  <label className="floating-label">Custom Target ATS Keywords Bank (boosts ATS score)</label>
                  <Sparkles size={18} className="input-icon align-top" style={{ color: '#6366f1' }} />
                  <AutocompleteTextarea
                    value={formData.atsKeywords}
                    onChange={(val) => handleFieldUpdate('atsKeywords', val)}
                    rows={2}
                    placeholder="Full Stack Developer | Software Developer | Web Development | React | Node.js | Python | SQL | Firebase | AWS | OpenAI API..."
                    suggestions={SUGGESTION_DICTIONARY.technicalSkills}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ----------------- TAB: CUSTOMIZATION ----------------- */}
        {activeTab === 'customization' && (
          <div className="profile-card" style={{ border: '2px solid #6366f1' }}>
            <div className="card-header">
              <h4>🎨 CV Customization Controls</h4>
            </div>
            <div className="card-body">
              <div className="toggle-switch-wrapper" style={{ marginTop: '0' }}>
                <span className="toggle-label">Main Accent Theme</span>
                <select 
                  value={formData.cvCustomization?.colorTheme || 'blue'} 
                  onChange={e => handleCustomizationChange('colorTheme', e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  <option value="blue">Executive Blue</option>
                  <option value="emerald">Emerald Teal</option>
                  <option value="purple">Modern Purple</option>
                  <option value="slate">Minimalist Slate</option>
                  <option value="coral">Vibrant Coral</option>
                </select>
              </div>

              <div className="toggle-switch-wrapper">
                <span className="toggle-label">Default Template</span>
                <select 
                  value={formData.cvCustomization?.template || 'jakes'} 
                  onChange={e => handleCustomizationChange('template', e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  <option value="jakes">Overleaf (Jake's Resume #1 FAANG)</option>
                  <option value="teal">Teal Executive ATS</option>
                  <option value="reactive">Reactive Resume / FlowCV</option>
                  <option value="enhancv">Enhancv / Novoresume</option>
                  <option value="jobscan">Jobscan ATS Standard</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="profile-actions">
        <button className="save-btn" onClick={handleSave} disabled={isSaving}>
          <Check size={18} />
          {isSaving ? 'Saving Master Profile...' : 'Save Profile & Master CV Settings'}
        </button>
      </div>
    </div>
  );
}
