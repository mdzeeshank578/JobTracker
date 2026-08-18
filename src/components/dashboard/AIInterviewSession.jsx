import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Activity, ArrowRight, XCircle, CheckCircle, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { evaluateInterviewSession, generateInterviewPrep } from '../../services/openai';
import './AIInterviewSession.css';

export default function AIInterviewSession({ job, onEnd }) {
  const [stream, setStream] = useState(null);
  const [hasPermissions, setHasPermissions] = useState(null);
  const [permissionError, setPermissionError] = useState('');
  
  const [sessionActive, setSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  
  const [questions, setQuestions] = useState([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(true);

  // Raw Audio transcript from user
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);

  const videoRef = useRef(null);

  // Request Permissions on Mount
  useEffect(() => {
    let activeStream = null;
    
    async function setupMedia() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(mediaStream);
        setHasPermissions(true);
        activeStream = mediaStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        
        // Auto-start session once permissions granted
        setSessionActive(true);
        
      } catch (err) {
        console.error("Media access error:", err);
        setHasPermissions(false);
        setPermissionError("We need camera and microphone access to conduct the AI interview. Please allow access in your browser settings.");
      }
    }

    setupMedia();

    // Cleanup function
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Fetch Dynamic Questions
  useEffect(() => {
    async function loadQuestions() {
      setIsGeneratingQuestions(true);
      try {
        const generated = await generateInterviewPrep(job?.role, job?.company);
        
        if (generated && generated.questions && generated.questions.length > 0) {
          setQuestions([...generated.questions, "Do you have any questions for us before we wrap up?"]); // Added a closing question
        } else {
           setQuestions([
              "Please introduce yourself and summarize your professional background.",
              "What do you consider to be your greatest professional achievement?",
              "Describe a time you faced a difficult challenge at work and how you overcame it."
           ]);
        }
      } catch (err) {
        console.error("Failed to fetch custom questions", err);
        setQuestions([
           "Please introduce yourself.",
           "Describe a difficult challenge you overcame.",
           "Why should we hire you?"
        ]);
      } finally {
        setIsGeneratingQuestions(false);
      }
    }
    
    if (job) {
       loadQuestions();
    }
  }, [job]);

  // Timer Countdown
  useEffect(() => {
    if (!sessionActive || timeLeft <= 0) return;

    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endSession(stream);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [sessionActive, timeLeft, stream]);

  // Speech Recognition Live Translation
  useEffect(() => {
    if (!sessionActive) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
       const recognition = new SpeechRecognition();
       recognition.continuous = true;
       recognition.interimResults = true; // Capture interim to prevent empty text on abrupt stops
       recognition.lang = 'en-US';

       recognition.onresult = (event) => {
         let finalSegment = '';
         let interimSegment = '';
         
         for (let i = event.resultIndex; i < event.results.length; ++i) {
           if (event.results[i].isFinal) {
             finalSegment += event.results[i][0].transcript + ' ';
           } else {
             interimSegment += event.results[i][0].transcript;
           }
         }
         
         if (finalSegment) {
            setTranscript(prev => prev + finalSegment);
         }
         setInterimTranscript(interimSegment);
       };

       // Robust restart if the speech service momentarily disconnects during the 2 min window
       recognition.onend = () => {
         // Because functional components can be tricky with closures, 
         // we check if we still want it running using the class ref pattern or just standard try-catch
         try {
             if (recognitionRef.current) {
                recognition.start();
             }
         } catch(e) {}
       };

       try {
          recognition.start();
          recognitionRef.current = recognition;
       } catch(e) {}
    } else {
       console.warn("Speech Recognition API not supported in this browser.");
    }

    return () => {
       if (recognitionRef.current) {
          recognitionRef.current.onend = null; // Prevent infinite restart loop
          recognitionRef.current.stop();
          recognitionRef.current = null;
       }
    };
  }, [sessionActive]);

  // Make sure video stream is attached if component re-renders
  useEffect(() => {
     if (videoRef.current && stream && !videoRef.current.srcObject) {
         videoRef.current.srcObject = stream;
     }
  }, [stream, isAnalyzing]);

  const endSession = async (currentStream = stream) => {
    setSessionActive(false);
    setIsAnalyzing(true);
    
    // Stop transcription
    if (recognitionRef.current) {
       recognitionRef.current.onend = null;
       recognitionRef.current.stop();
       recognitionRef.current = null;
    }

    // Stop the camera
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    try {
       // Combine final and any pending interim text
       const fullTranscript = (transcript + ' ' + interimTranscript).trim();
       
       // Pass transcript explicitly into the intelligence evaluator
       const evaluation = await evaluateInterviewSession(job, fullTranscript);
       setResults(evaluation);
    } catch(err) {
       console.error("Evaluation error:", err);
    } finally {
       setIsAnalyzing(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      endSession();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (hasPermissions === false) {
    return (
      <div className="interview-error-state">
         <AlertTriangle size={48} className="icon-red mb-4" />
         <h2>Camera/Mic Access Denied</h2>
         <p>{permissionError}</p>
         <button className="btn-secondary mt-4" onClick={onEnd}>Return to Hub</button>
      </div>
    );
  }

  if (isGeneratingQuestions) {
    return (
      <div className="interview-processing-state">
         <RefreshCw size={48} className="spin-animation icon-purple mb-4" />
         <h2>Generating Tailored Questions...</h2>
         <p>Analyzing the role "{job?.role}" at {job?.company} to generate your practice session.</p>
      </div>
    );
  }

  if (results) {
    return (
      <div className="interview-results-container">
        <div className="results-header">
           <TrendingUp size={32} className="icon-purple" />
           <h2>Interview Analysis Complete</h2>
           <p>Here is your comprehensive breakdown.</p>
        </div>

        <div className="metrics-grid">
           <div className="metric-card">
              <h4>Overall Score</h4>
              <div className="score-circle-large">
                 <span>{results.score}</span>
              </div>
           </div>
           <div className="metric-card secondary-metrics">
              <div className="metric-row">
                 <span className="metric-label">Posture:</span>
                 <span className={`metric-status ${results.posture.status === 'Good' ? 'good' : ''}`}>{results.posture.status}</span>
              </div>
              <p className="metric-feedback">{results.posture.feedback}</p>
              
              <div className="metric-row mt-3">
                 <span className="metric-label">Tonality:</span>
                 <span className={`metric-status ${results.tonality.status === 'Excellent' ? 'good' : ''}`}>{results.tonality.status}</span>
              </div>
              <p className="metric-feedback">{results.tonality.feedback}</p>

              <div className="metric-row mt-3">
                 <span className="metric-label">Fluency:</span>
                 <span className="metric-status warning">{results.fluency.status}</span>
              </div>
              <p className="metric-feedback">{results.fluency.feedback}</p>
           </div>
        </div>

        <div className="feedback-lists">
           <div className="feedback-section good">
              <h3><CheckCircle size={20} className="icon-green"/> What You Did Well</h3>
              <ul>
                 {results.overallGood.map((item, idx) => (
                    <li key={idx}>{item}</li>
                 ))}
              </ul>
           </div>
           
           <div className="feedback-section improve">
              <h3><AlertTriangle size={20} className="icon-orange" /> Areas to Improve</h3>
              <ul>
                 {results.overallImprove.map((item, idx) => (
                    <li key={idx}>{item}</li>
                 ))}
              </ul>
           </div>
        </div>

        <button className="btn-primary" style={{marginTop: '24px'}} onClick={onEnd}>Exit Session</button>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="interview-processing-state">
         <RefreshCw size={48} className="spin-animation icon-purple mb-4" />
         <h2>Analyzing Your Session...</h2>
         <p>Processing tonality, fluency, and posture via our AI model.</p>
      </div>
    );
  }

  return (
    <div className="interview-active-container">
      <div className="interview-header">
        <div className="timer-badge">
           <span>{formatTime(timeLeft)}</span>
           <span style={{ fontSize: '0.8rem', opacity: 0.8, marginLeft: '6px' }}>Remaining</span>
        </div>
        <div className="live-caption-indicator">
           {(transcript.length > 0 || interimTranscript.length > 0) ? (
             <span style={{color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
                <Mic size={14} className="icon-green pulse-icon"/> Listening
             </span>
           ) : (
             <span style={{color: '#94a3b8', fontSize: '0.85rem'}}>Awaiting Voice...</span>
           )}
        </div>
        <button className="btn-abort" onClick={() => endSession(stream)}>End Early</button>
      </div>

      <div className="video-wrapper">
         <video 
           ref={videoRef} 
           autoPlay 
           muted 
           playsInline
           className="user-video"
         />
         <div className="ai-overlays">
            <div className="ai-overlay-chip"><Activity size={14} className="pulse-icon"/> Checking Posture</div>
            <div className="ai-overlay-chip"><Activity size={14} className="pulse-icon delay-1"/> Analyzing Tonality</div>
            <div className="ai-overlay-chip"><Activity size={14} className="pulse-icon delay-2"/> Tracking Fluency</div>
         </div>

         <div className="question-prompter">
            <p className="question-text">
               "{questions[currentQuestionIndex] || 'Loading question...'}"
            </p>
            <div className="prompter-footer">
               <span className="question-counter">Question {currentQuestionIndex + 1} of {questions.length}</span>
               <button className="btn-next-question" onClick={handleNextQuestion}>
                  {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Interview'}
                  <ArrowRight size={18} />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
