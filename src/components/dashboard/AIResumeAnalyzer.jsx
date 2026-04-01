import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.js';
import { analyzeResume } from '../../services/openai';
import './AIResumeAnalyzer.css';

// Configure the worker for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

export default function AIResumeAnalyzer() {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const extractTextFromPDF = async (fileRef) => {
    try {
      const url = URL.createObjectURL(fileRef);
      const pdf = await pdfjsLib.getDocument(url).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      URL.revokeObjectURL(url);
      return fullText;
    } catch (err) {
      console.error("PDF extraction error: ", err);
      throw new Error(err.message || 'Failed to parse PDF.');
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = async (selectedFile) => {
    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setIsAnalyzing(true);

    try {
      const text = await extractTextFromPDF(selectedFile);
      if (text.trim().length < 50) {
        throw new Error("Could not extract enough text from the resume. Is it an image-based PDF?");
      }

      // Save to localStorage for cross-component Job Matching
      localStorage.setItem('jobTracker_resumeText', text);
      localStorage.setItem('jobTracker_resumeName', selectedFile.name);

      const analysis = await analyzeResume(text);
      setResult(analysis);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="ai-analyzer-container">
      <div className="ai-header">
        <h2>Smart AI Career Assistant</h2>
        <p>Upload your resume to get instant feedback, uncover missing skills, and boost your hiring chances.</p>
      </div>

      {!isAnalyzing && !result && (
        <div 
          className={`upload-section ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            className="file-input" 
            accept="application/pdf" 
            onChange={handleFileChange} 
          />
          <UploadCloud size={48} className="upload-icon" />
          <h3 className="upload-text">Drag & Drop your Resume (PDF)</h3>
          <p className="upload-subtext">or click to browse files</p>
          {error && <p className="error-text" style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</p>}
        </div>
      )}

      {isAnalyzing && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p className="pulse-text">Analyzing your resume with AI...</p>
        </div>
      )}

      {result && !isAnalyzing && (
        <div className="results-container">
          <div className="score-card">
            <h3>Resume Score</h3>
            <div className="score-circle" style={{ '--score': result.score }}>
              <span>{result.score}</span>
            </div>
            <p className="score-label">
              {result.score >= 80 ? 'Excellent! Highly Competitive.' : 
               result.score >= 60 ? 'Good, but has room for improvement.' : 
               'Needs significant work to stand out.'}
            </p>
            <button className="btn-secondary" style={{marginTop: '2rem', width: '100%'}} onClick={() => {
              setResult(null);
              setFile(null);
            }}>
              Analyze Another
            </button>
          </div>

          <div className="details-card">
            <div className="info-section">
              <h3><AlertTriangle size={20} color="#ef4444" /> Skills to Learn</h3>
              <div className="skills-list">
                {result.skillsToLearn?.length > 0 ? (
                  result.skillsToLearn.map((skill, idx) => (
                    <span key={idx} className="skill-tag">{skill}</span>
                  ))
                ) : (
                  <span className="skill-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)'}}>
                    No major missing skills identified!
                  </span>
                )}
              </div>
            </div>

            <div className="info-section" style={{ marginTop: '2rem' }}>
              <h3><FileText size={20} color="#3b82f6" /> Recommended Courses</h3>
              <ul className="suggestions-list">
                {result.courses?.map((course, idx) => (
                  <li key={idx}>
                    <CheckCircle size={24} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p>{course}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="info-section" style={{ marginTop: '2rem' }}>
              <h3><Lightbulb size={20} color="#f59e0b" /> Resume Edits</h3>
              <ul className="suggestions-list">
                {result.resumeEdits?.map((edit, idx) => (
                  <li key={idx}>
                    <CheckCircle size={24} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p>{edit}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
