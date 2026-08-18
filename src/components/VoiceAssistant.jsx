import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, X } from 'lucide-react';
import './VoiceAssistant.css';

export default function VoiceAssistant({ jobs, setCurrentTab, onAddApplication, onVoiceSearch }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setAiResponse('');
      };

      recognition.onresult = (event) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        processCommand(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setAiResponse('Microphone access denied. Please allow microphone access in your browser settings.');
        } else {
          setAiResponse(`Error listening: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setAiResponse("Voice Assistant is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
    }
  }, [jobs]); // Rebuild closure on jobs update

  const speak = (text) => {
    setAiResponse(text);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // clear previous
      const msg = new SpeechSynthesisUtterance();
      msg.text = text;
      msg.volume = 1;
      msg.rate = 1;
      msg.pitch = 1.1;
      
      // Try finding a good English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (preferredVoice) msg.voice = preferredVoice;

      window.speechSynthesis.speak(msg);
    }
  };

  const processCommand = (command) => {
    const cmd = command.toLowerCase();
    
    // 1. Dynamic Job Search Intent (Regex to catch conversational voice queries)
    const matchTypeA = cmd.match(/(?:find|show|get|search|look for)(?:\s+me|\s+us)?(?:\s+a|\s+some|\s+any|\s+all)?\s+(?:job|jobs|role|roles|position|positions|vacancy|vacancies)(?:\s+for|\s+in|\s+as|\s+about|\s+related\s+to)?\s+(.*)/i);
    const matchTypeB = cmd.match(/(?:find|show|get|how many|search|look for)(?:\s+me|\s+us)?(?:\s+a|\s+some|\s+any|\s+all)?\s+(.*?)\s+(?:job|jobs|role|roles|position|positions|application|applications|vacancy|vacancies)/i);

    let keywordRaw = '';
    if (matchTypeA && matchTypeA[1]) {
        keywordRaw = matchTypeA[1];
    } else if (matchTypeB && matchTypeB[1]) {
        keywordRaw = matchTypeB[1];
    }
    
    if (keywordRaw) {
       let keyword = keywordRaw.trim();
       // Strip generic filler words including punctuation
       keyword = keyword.replace(/^(my|some|any|the|all|a|an)\s+/, '').trim();
       
       if (!keyword || keyword === 'all') {
          speak(`You have ${jobs.length} tracked applications in total. Here they are!`);
          if (onVoiceSearch) onVoiceSearch('');
          setCurrentTab('applications');
       } else {
          speak(`Allow me to search the global job boards for ${keyword} vacancies now!`);
          if (onVoiceSearch) onVoiceSearch(keyword);
       }
    } 
    else if (cmd.includes('success rate') || cmd.includes('offer rate') || cmd.includes('doing')) {
       const total = jobs.length;
       const offers = jobs.filter(j => j.status === 'Offer').length;
       const rate = total > 0 ? Math.round((offers/total)*100) : 0;
       speak(`Your overall success rate is currently ${rate} percent with ${offers} total offers!`);
       setCurrentTab('overview');
    }
    else if (cmd.includes('dashboard') || cmd.includes('overview') || cmd.includes('home')) {
       speak("Taking you to your main dashboard overview.");
       setCurrentTab('overview');
    }
    else if (cmd.includes('analyzer') || cmd.includes('resume')) {
       speak("Opening the AI Resume Analyzer.");
       setCurrentTab('ai-analyzer');
    }
    else if (cmd.includes('joke')) {
       speak("Why do programmers prefer dark mode? Because light attracts bugs!");
    }
    else {
      speak(`I heard you say "${command}". Try asking me to "Find remote jobs" or "What is my success rate?"`);
    }
  };

  const toggleListening = () => {
    if (!isOpen) setIsOpen(true);
    
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch(e) {
             console.error("Already started", e);
        }
      }
    }
  };

  const closePanel = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if(isListening) recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
  }

  // Handle voice loading
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  return (
    <div className="voice-assistant-container">
      {isOpen && (
        <div className="voice-dialogue">
          <button className="close-voice" onClick={closePanel}><X size={16} /></button>
          
          <div className="voice-content">
             <div className="mic-status">
               {isListening ? (
                 <>
                  <div className="listening-waves"><span></span><span></span><span></span></div>
                  <p>Listening...</p>
                 </>
               ) : (
                 <p className="ready-text">Assistant Ready <Sparkles size={14} className="sparkle-icon" /></p>
               )}
             </div>

             {transcript && (
               <div className="user-bubble">
                 "{transcript}"
               </div>
             )}

             {aiResponse && (
               <div className="ai-bubble">
                 <Sparkles size={16} className="ai-bubble-icon" />
                 <p>{aiResponse}</p>
               </div>
             )}

             {!transcript && !aiResponse && !isListening && (
               <p className="hint-text">Try: "Find me frontend jobs" or "Add a new job"</p>
             )}
          </div>
        </div>
      )}

      <button 
        className={`fab-mic ${isListening ? 'listening' : ''} ${isOpen ? 'panel-open' : ''}`}
        onClick={toggleListening}
        aria-label="Toggle Voice Assistant"
      >
        {isListening ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
        {!isListening && !isOpen && <span className="tooltip">Voice AI</span>}
      </button>
    </div>
  );
}
