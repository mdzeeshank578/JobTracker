import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, Send, Sparkles, Brain, AlertCircle, 
  Menu, Plus, Trash2, Edit2, Volume2, VolumeX, Sun, Moon, 
  Mic, MicOff, Globe, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile } from '../../services/db';
import './ChatAssistant.css';

export default function ChatAssistant({ jobs = [] }) {
  const { currentUser } = useAuth();
  const userId = currentUser ? currentUser.uid : 'anonymous';

  // Toggle state
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('jobTracker_chat_theme') || 'light');

  // Speech output state
  const [isSpeechMuted, setIsSpeechMuted] = useState(
    localStorage.getItem('jobTracker_chat_muted') === 'true'
  );

  // Speech input state
  const [isListening, setIsListening] = useState(false);

  // Selected Language
  const [language, setLanguage] = useState(localStorage.getItem('jobTracker_chat_lang') || 'en-US');

  // Sessions state (loaded from localStorage)
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Input states
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  // API Key state
  const [apiKey, setApiKey] = useState(
    import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('jobTracker_OpenAI_API_Key') || ''
  );

  // Editing session title
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  const closeChat = () => {
    setIsOpen(false);
    setIsSidebarOpen(false);
    setIsListening(false);
    window.speechSynthesis?.cancel();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        // The speech recognizer can throw if it is already stopped.
      }
    }
  };

  // Load profile on mount
  useEffect(() => {
    async function fetchProfile() {
      if (currentUser) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          setUserProfile(profile);
        } catch (e) {
          console.error("Failed to fetch profile for AI context", e);
        }
      }
    }
    fetchProfile();
  }, [currentUser]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        closeChat();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Load chat sessions from localStorage on mount/user change
  useEffect(() => {
    const storageKey = `jobTracker_sessions_${userId}`;
    const savedSessions = localStorage.getItem(storageKey);
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        } else {
          createNewSession(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved chat sessions", e);
        createNewSession([]);
      }
    } else {
      createNewSession([]);
    }
  }, [userId]);

  // Save sessions to localStorage when updated
  const saveSessionsToStorage = (updatedSessions) => {
    const storageKey = `jobTracker_sessions_${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedSessions));
    setSessions(updatedSessions);
  };

  // Create a new session
  const createNewSession = (currentSessions = sessions) => {
    const newSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `New Conversation`,
      messages: [
        { 
          role: 'assistant', 
          content: getGreetingMessage(), 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: [
             "📝 Improve my CV",
             "🗣️ Practice mock interview",
             "⚙️ How to use this platform?",
             "💡 Career guidance & skills"
          ]
        }
      ],
      createdAt: Date.now()
    };
    const updated = [newSession, ...currentSessions];
    saveSessionsToStorage(updated);
    setActiveSessionId(newSession.id);
    setIsSidebarOpen(false);
  };

  // Get active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isTyping]);

  // Handle theme persistence
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('jobTracker_chat_theme', newTheme);
  };

  // Handle mute toggling
  const toggleMute = () => {
    const newMuted = !isSpeechMuted;
    setIsSpeechMuted(newMuted);
    localStorage.setItem('jobTracker_chat_muted', newMuted.toString());
    if (newMuted) {
      window.speechSynthesis.cancel();
    }
  };

  // Handle language change
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    localStorage.setItem('jobTracker_chat_lang', newLang);
    // Add instruction to switch language if user changes it
    if (activeSession) {
      const langNames = {
        'en-US': 'English',
        'es-ES': 'Spanish',
        'fr-FR': 'French',
        'de-DE': 'German',
        'hi-IN': 'Hindi',
        'pt-PT': 'Portuguese',
        'ja-JP': 'Japanese'
      };
      const systemNote = `[System Language Context changed: User requested response in ${langNames[newLang] || 'English'}]`;
      const updatedMessages = [
        ...activeSession.messages,
        { role: 'system_note', content: systemNote }
      ];
      updateMessagesInSession(activeSessionId, updatedMessages);
    }
  };

  // Save API key
  const handleApiKeyChange = (e) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem('jobTracker_OpenAI_API_Key', val);
  };

  // Handle input textarea auto-resize
  const handleInputResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const getGreetingMessage = () => {
    const langGreetings = {
      'en-US': "Hi there! I'm your 24/7 AI Support & Guidance Assistant. How can I assist you with your career goals, resume building, mock interviews, or navigating the platform today?",
      'es-ES': "¡Hola! Soy tu Asistente de IA de Soporte y Guía 24/7. ¿Cómo puedo ayudarte hoy con tus metas profesionales, creación de currículum, simulacros de entrevista o navegación de la plataforma?",
      'fr-FR': "Bonjour! Je suis votre Assistant d'IA d'aide et d'orientation 24h/24. Comment puis-je vous aider aujourd'hui avec vos objectifs de carrière, la rédaction de CV, la préparation d'entretiens ou la navigation sur la plateforme?",
      'de-DE': "Hallo! Ich bin dein 24/7 KI-Support- und Beratungsassistent. Wie kann ich dich heute bei deinen Karrierezielen, der Erstellung deines Lebenslaufs, Mock-Interviews oder der Navigation auf der Plattform unterstützen?",
      'hi-IN': "नमस्ते! मैं आपका 24/7 एआई सहायता और मार्गदर्शन सहायक हूँ। आज मैं आपके करियर लक्ष्यों, रेज़्यूमे निर्माण, मॉक इंटरव्यू या प्लेटफ़ॉर्म का उपयोग करने में आपकी क्या मदद कर सकता हूँ?",
      'pt-PT': "Olá! Sou o teu Assistente de IA de Suporte e Orientação 24/7. Como posso ajudar-te hoje com os teus objetivos de carreira, elaboração de currículos, simulação de entrevistas ou navegação na plataforma?",
      'ja-JP': "こんにちは！私は24時間365日対応のAIサポート＆ガイダンスアシスタントです。本日は、キャリアの目標、履歴書の作成、模擬面接、またはプラットフォームの操作についてどのようにお手伝いしましょうか？"
    };
    return langGreetings[language] || langGreetings['en-US'];
  };

  // Update messages in a specific session
  const updateMessagesInSession = (sessionId, updatedMessages) => {
    const updated = sessions.map(s => {
      if (s.id === sessionId) {
        // Auto update title if it was default
        let title = s.title;
        if (title === 'New Conversation') {
          const firstUserMsg = updatedMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
             title = firstUserMsg.content.length > 28 
                ? firstUserMsg.content.substr(0, 25) + '...' 
                : firstUserMsg.content;
          }
        }
        return {
          ...s,
          title,
          messages: updatedMessages
        };
      }
      return s;
    });
    saveSessionsToStorage(updated);
  };

  // Delete a chat session
  const deleteSession = (e, sessionId) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== sessionId);
    if (updated.length === 0) {
      createNewSession([]);
    } else {
      saveSessionsToStorage(updated);
      if (activeSessionId === sessionId) {
        setActiveSessionId(updated[0].id);
      }
    }
  };

  // Rename a chat session
  const startRenameSession = (e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleInput(session.title);
  };

  const saveSessionRename = (sessionId) => {
    if (!editTitleInput.trim()) return;
    const updated = sessions.map(s => {
      if (s.id === sessionId) {
        return { ...s, title: editTitleInput.trim() };
      }
      return s;
    });
    saveSessionsToStorage(updated);
    setEditingSessionId(null);
  };

  // Text to Speech
  const speakText = (text, langCode) => {
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/\[SUGGESTIONS:.*?\]/gs, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = langCode || language;

      // Select matching voice
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith(utterance.lang));
      if (voice) {
        utterance.voice = voice;
      }
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech Synthesis failed", e);
    }
  };

  // Speech to Text (Voice Input)
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcriptText = event.results[0][0].transcript;
      setInput(prev => (prev ? prev + ' ' + transcriptText : transcriptText));
      setTimeout(handleInputResize, 50);
    };

    recognition.onerror = (e) => {
      console.error("Speech Recognition Error:", e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const generateSystemPrompt = () => {
    const profileContext = userProfile ? JSON.stringify({
      fullName: userProfile.fullName,
      professionalTitle: userProfile.professionalTitle,
      bio: userProfile.bio,
      technicalSkills: userProfile.technicalSkills,
      softSkills: userProfile.softSkills,
      workExperience: userProfile.workExperience,
      education: userProfile.education,
      goals: userProfile.careerObjective
    }, null, 2) : "User profile not fully completed yet.";

    const jobsContext = jobs.length > 0 ? JSON.stringify(
      jobs.map(j => ({ company: j.company, role: j.role, status: j.status })), 
      null, 2
    ) : "No actively tracked jobs.";

    return `You are an intelligent, 24/7 AI Support, Career Guidance, and Platform Assistant.
You act as a personal career assistant, mentor, and customer support agent inside the JobTracker web application.

CORE CAPABILITIES:
1. Answer general questions on any topic in a natural, conversational manner.
2. Provide personalized career guidance and professional advice.
3. Assist with resume tailoring, cover letters, and job application strategy.
4. Assist with interview preparation and mock interview training.
5. Explain concepts, technologies, and industry trends.
6. Provide specific walkthroughs/help for JobTracker platform features.
7. Always maintain a friendly, professional, encouraging, and supportive tone.
8. Support multi-language requests. Present all responses in the selected language.

PLATFORM GUIDE & NAVIGATION DETAILS (JobTracker App):
- Dashboard / Overview: View total applications, interview pipelines, upcoming deadlines, success metrics, and recent alerts.
- Applications Tab: View and edit existing jobs, upload resumes/cover letters, or delete applications. Has a search bar at the top to query global job vacancies from companies like Google, Stripe, etc., and save them. Also contains AI Interview Prep target buttons for each job.
- AI Resume Analyzer Tab: Upload a resume to get a matching score (0-100), key skills to learn, matching course recommendations, and detailed edit suggestions.
- Success Predictor Tab: Analyzes job application history to predict the probability of landing a job. Provides an actionable roadmap.
- Resume Studio Tab: A resume builder where users enter their contact info, professional title, bio, work history, and skills. Clicking "Optimize with AI" polishes the text into high-impact bullet points and organizes it into a professional layout.
- AI Interview Training Tab (accessible via the AI tab's Target Application dropdown or active job card details): Conducts live mock interview practice tailored to that specific job. Uses camera/mic, transcribes user answers, and evaluates posture, tonality, fluency, and content.
- AI Support Chatbot (this widget): Available on all pages in the bottom right for immediate help.

- Use the user's profile context and tracked jobs below to personalize responses.
- Write clear, well-structured answers using markdown formatting (lists, bolding).
- Keep answers concise but insightful.
- Never leave the user without guidance.
- CRITICAL: At the very end of your response, you MUST provide exactly 2-3 short suggested follow-up questions that the user might want to click next. Format them strictly inside a JSON tag like: [SUGGESTIONS: ["First question?", "Second question?"]]. Keep the suggestions brief, and do not reference the tag in the normal text response.

User Profile Context JSON:
${profileContext}

Tracked Job Applications Context JSON:
${jobsContext}

Selected Output Language: ${language}
`;
  };

  const getFallbackResponse = (lastMsgText) => {
    const lastMsg = lastMsgText.toLowerCase().trim();
    let content = "";
    let suggestions = [];

    // --- SPECIFIC TOPIC ANSWERS (To prevent repetitive generic fallbacks) ---

    // 1. Explain Load Balancing
    if (lastMsg.includes('load balancing') || lastMsg.includes('load balancer')) {
      content = `### What is Load Balancing? ⚖️

**Load Balancing** is the practice of distributing incoming network traffic across a group of backend servers (often referred to as a *server pool* or *server farm*). 

**Why it is important:**
- **High Availability:** If one server crashes, the load balancer redirects traffic to the remaining healthy servers.
- **Scalability:** You can easily add more servers to the pool as your traffic grows.
- **Performance:** Prevents any single server from becoming a bottleneck by distributing the load evenly.

**Common Load Balancing Algorithms:**
- **Round Robin:** Traffic is distributed sequentially (Server 1, Server 2, Server 3, then repeat).
- **Least Connections:** Sends traffic to the server with the fewest active sessions.
- **IP Hash:** The client's IP address determines which server receives the request, ensuring session persistence.

Would you like to learn about another system design concept?`;
      suggestions = ["Explain React Server Components", "Explain Vector Databases", "Give me a technical question"];
    }
    // 2. Explain React Server Components
    else if (lastMsg.includes('react server component') || lastMsg.includes('rsc') || lastMsg.includes('server component')) {
      content = `### React Server Components (RSC) ⚛️

**React Server Components (RSC)** represent a new architectural paradigm where React components can run and render exclusively on the server.

**Key Differences from Client Components:**
- **Zero Bundle Size:** The code for Server Components stays on the server. Libraries used inside them do not get sent to the user's browser, making the page load much faster.
- **Direct Backend Access:** Server Components can fetch data directly from databases, APIs, or filesystems without needing REST/GraphQL endpoints.
- **No Client-side Interactivity:** Server Components cannot use hooks like \`useState\`, \`useEffect\`, or browser APIs. Interactive parts must still be built using Client Components (declared with \`"use client"\`).

**How they work together:**
Server Components render on the server and pass rendered HTML/JSON down to Client Components, which handle the client-side interactions.

Would you like to learn about another frontend concept?`;
      suggestions = ["Explain Load Balancing", "Explain Vector Databases", "Give me a technical question"];
    }
    // 3. Explain Vector Databases
    else if (lastMsg.includes('vector database') || lastMsg.includes('vector databases') || lastMsg.includes('embeddings')) {
      content = `### What is a Vector Database? 🧠

A **Vector Database** is a database specifically optimized to store, index, and query high-dimensional vector representations of data (known as **vector embeddings**).

**How it works in AI:**
- Machine learning models convert text, images, or audio into long lists of numbers (embeddings) that capture their semantic meaning.
- The Vector Database indexes these embeddings so you can perform **Similarity Searches** (e.g. finding documents that are *conceptually* similar to a query, even if they don't share any exact keywords).

**Popular Examples:**
- **Pinecone:** A fully managed cloud-native vector database.
- **Chroma / FAISS:** Open-source vector stores ideal for local development.
- **pgvector:** An extension that adds vector capabilities directly to PostgreSQL.

Would you like to learn more about AI technology?`;
      suggestions = ["Explain Load Balancing", "Explain React Server Components", "Give me a technical question"];
    }
    // 4. STAR Method details
    else if (lastMsg.includes('star method') || lastMsg.includes('explain the star')) {
      content = `### The STAR Method for Behavioral Interviews ⭐

The **STAR Method** is a structured manner of responding to behavioral interview questions (e.g., *"Tell me about a time you..."*).

1. **S - Situation:** Set the scene and give context. What company did you work at? What was the project? Keep this to 2-3 sentences.
2. **T - Task:** Describe the challenge or goal you faced. What was the specific problem you needed to solve?
3. **A - Action:** Explain the *exact steps* you took to address the problem. Focus on **your** actions (use "I" instead of "we"), the technologies you chose, and the engineering decisions you made.
4. **R - Result:** Highlight the positive outcome. **Always quantify the results** (e.g., *"reduced loading times by 40%"*, *"saved the team 5 hours a week"*, *"increased user signups by 12%"*).

**Example Response Outline:**
- **Situation:** *"At TechCorp, our React web app was suffering from high load latency."*
- **Task:** *"I was tasked with improving the page loading times to improve user retention."*
- **Action:** *"I implemented code-splitting using React.lazy, compressed all static assets, and cached API requests in local storage."*
- **Result:** *"As a result, our Lighthouse score improved from 54 to 92, and bounce rate dropped by 18%."*`;
      suggestions = ["Give me a behavioral question", "Suggest action verbs for resume", "Resume optimization tips"];
    }
    // 5. ATS rules
    else if (lastMsg.includes('ats rules') || lastMsg.includes('ats compliance') || lastMsg.includes('ats friendly')) {
      content = `### ATS (Applicant Tracking System) Rules 📋

Most major companies use **ATS** software to scan resumes for keywords before a human recruiter ever sees them. To pass the ATS scan, follow these guidelines:

1. **Keep the Layout Simple:** Use a clean, single-column format. Multi-column layouts often get scrambled by ATS parser engines.
2. **Standard Fonts Only:** Use common fonts like Arial, Calibri, Helvetica, or Times New Roman.
3. **Avoid Tables and Graphics:** Do not put important information (like contact details or skills) inside headers, footers, text boxes, or tables, as the parser might ignore them.
4. **Keyword Match:** Tailor your resume for each job. Ensure the exact technical skills and keywords from the job description appear on your resume.
5. **Standard Section Titles:** Use standard headers like "Work Experience", "Education", and "Skills". Don't get creative with titles like "My Professional Journey".`;
      suggestions = ["Suggest action verbs for resume", "Rewrite a bullet point for me", "Help me optimize my CV"];
    }
    // 6. Action Verbs
    else if (lastMsg.includes('action verbs') || lastMsg.includes('suggest action verbs')) {
      content = `### Powerful Action Verbs for Your Resume ⚡

Starting your resume bullet points with strong action verbs is a key way to show impact. Avoid passive terms like *"Responsible for..."* or *"Worked on..."*.

**Leadership & Initiative:**
- *Spearheaded* (e.g., "Spearheaded the migration of...")
- *Orchestrated*
- *Chambered*
- *Direct*

**Development & Engineering:**
- *Engineered* (e.g., "Engineered a scalable messaging microservice...")
- *Architected*
- *Designed*
- *Optimized*

**Improvement & Execution:**
- *Overhauled* (e.g., "Overhauled legacy styling using modular CSS...")
- *Streamlined*
- *Boosted*
- *Maximized*`;
      suggestions = ["Rewrite a bullet point for me", "Explain ATS rules", "Resume optimization tips"];
    }
    // 7. Udemy courses
    else if (lastMsg.includes('udemy') || lastMsg.includes('courses') || lastMsg.includes('course')) {
      content = `### Recommended Online Courses 🎓

To bridge your skill gaps, here are highly-rated online courses:

1. **React / Frontend:**
   - *React - The Complete Guide (Udemy by Academind)*: Excellent depth covering hooks, state management, and modern patterns.
2. **Backend & Node.js:**
   - *The Complete Node.js Developer Course (Udemy by Andrew Mead)*: Focuses on REST APIs, databases, and testing.
3. **System Design:**
   - *Grokking the System Design Interview (DesignGurus)*: The gold standard for preparing for architectural loops.
4. **Cloud / AWS:**
   - *AWS Certified Solutions Architect Associate (Udemy by Stephane Maarek)*: Comprehensive cloud architecture training.`;
      suggestions = ["Suggest project ideas", "List high-demand skills", "Guidance & Skills"];
    }
    // 8. Project Ideas
    else if (lastMsg.includes('project ideas') || lastMsg.includes('suggest project') || lastMsg.includes('projects to build')) {
      content = `### Recommended Portfolio Projects 💡

Building robust, deployed projects is the best way to stand out. Here are three project ideas with high impact:

1. **Collaborative Kanban Board (Trello Clone):**
   - *Concepts:* Real-time data syncing (WebSockets or Firebase Firestore), drag-and-drop UI, user authentication.
   - *Tech:* React, Node.js, Socket.io, MongoDB.
2. **AI-Powered Semantic Document Search:**
   - *Concepts:* Vector embeddings, RAG (Retrieval-Augmented Generation), file uploading/parsing.
   - *Tech:* Next.js, Python/Node, Pinecone, OpenAI API.
3. **Personal Job Application Tracker:**
   - *Concepts:* Analytics dashboards (Recharts/Chart.js), deadline reminders, resume versioning.
   - *Tech:* React, Firebase, Tailwind CSS.`;
      suggestions = ["List high-demand skills", "Resume optimization tips", "How to message recruiters"];
    }
    // 9. Messaging Recruiters
    else if (lastMsg.includes('message recruiters') || lastMsg.includes('outreach') || lastMsg.includes('linkedin message')) {
      content = `### LinkedIn Outreach Template ✉️

When reaching out to recruiters or engineering managers on LinkedIn, keep your note concise, polite, and specific. 

**LinkedIn Template (within 300 character limit):**
> *"Hi [Name], I saw your team at [Company] is hiring for a [Role]. As a Software Engineer specializing in [Skills], I recently built a [Project] that addresses [related problem]. I’d love to connect and share my resume if you have 2 minutes. Thanks! - [Your Name]"*

**Key Tips:**
- Customize the bracketed fields for every outreach.
- Follow up once after 4-5 days if you don't receive a reply.
- Connect with peers (other engineers) as they can provide referrals.`;
      suggestions = ["Salary negotiation tips", "Suggest project ideas", "List high-demand skills"];
    }
    // 10. High-demand skills
    else if (lastMsg.includes('high-demand skills') || lastMsg.includes('skills to learn') || lastMsg.includes('list high-demand')) {
      content = `### High-Demand Technical Skills in 2026 📈

Focusing on these key areas will maximize your hiring potential:

1. **Frontend Architecture:** TypeScript, Next.js (App Router), Tailwind CSS, React Query / state management.
2. **Backend & Cloud:** Go (Golang), Node.js, Docker, Kubernetes, AWS (Lambda, ECS, S3).
3. **AI & Data Engineering:** Prompt engineering, Vector Databases (Pinecone/Chroma), langchain integrations, SQL optimization.
4. **Testing & QA:** Cypress, Playwright, Jest, CI/CD pipelines (GitHub Actions).`;
      suggestions = ["Suggest project ideas", "Explain Vector Databases", "Resume optimization tips"];
    }
    // 11. Salary Negotiation
    else if (lastMsg.includes('salary') || lastMsg.includes('negotiate') || lastMsg.includes('negotiation')) {
      content = `### Salary Negotiation Strategy 💸

Negotiation is a standard part of the hiring process. Use these steps to secure the best compensation:

1. **Express Gratitude:** Always start with enthusiasm: *"Thank you so much! I am thrilled about the offer and excited to join the team."*
2. **Ask for Time:** Request 24 to 48 hours to review the full details in writing.
3. **Research Market Rates:** Use sites like Levels.fyi or Glassdoor to find average compensation for your role, level, and location.
4. **Propose a Counter-Offer:** Back your request with data and your specific value: *"Based on market research and my experience with [Skill], I was hoping we could align closer to [Target Number]."*
5. **Consider Total Compensation:** If base salary is fixed, negotiate sign-on bonuses, equity, extra vacation days, or remote allowances.`;
      suggestions = ["How to message recruiters", "Suggest project ideas", "Explain the STAR method"];
    }

    // --- GENERAL CATEGORY ANSWERS ---

    // Greetings
    else if (lastMsg === 'hi' || lastMsg === 'hello' || lastMsg === 'hey' || lastMsg.startsWith('greetings') || lastMsg.includes('good morning') || lastMsg.includes('good afternoon') || lastMsg.includes('good evening')) {
      const name = userProfile?.fullName ? `, ${userProfile.fullName.split(' ')[0]}` : "";
      content = `Hello${name}! 👋 I am your 24/7 AI Support and Guidance mentor.

How can I help you take the next step in your career today? You can ask me to:
- Optimize your **resume/CV** or **cover letter** draft.
- Prepare for **interviews** with mock questions.
- Learn how to navigate and use the **JobTracker platform** features.
- Recommend **skills and projects** based on your target roles.`;
      suggestions = ["How to use this platform?", "Mock Interview prep", "Resume optimization tips"];
    }
    // Platform Navigation & Troubleshooting Help
    else if (lastMsg.includes('how to use') || lastMsg.includes('navigate') || lastMsg.includes('dashboard') || lastMsg.includes('features') || lastMsg.includes('platform') || lastMsg.includes('help') || lastMsg.includes('troubleshoot') || lastMsg.includes('how do i') || lastMsg.includes('where is')) {
      content = `Here is a quick guide on how to navigate and use the key features of the **JobTracker** platform:

1. **Dashboard & Overview:** View application statistics, upcoming deadlines, success metrics, and active notifications. You can also sync your Gmail or manually paste email updates here.
2. **Applications Tab:** Track your applications. You can view, edit, or delete existing tracked jobs, upload your resume/cover letter, or search global vacancies using the search engine at the top. You can also access AI Interview Prep tools (Target icon) for each job card.
3. **AI Resume Analyzer:** Upload your resume to receive a match score (0-100), key skills to learn, Udemy/AWS course recommendations, and detailed edit suggestions.
4. **Success Predictor:** Analyzes your application history to forecast landing probability and provides an actionable weekly roadmap.
5. **Resume Studio:** A comprehensive resume builder. Fill in your details and click **"Optimize with AI"** to polish weak statements into action-based bullet points.
6. **AI Mock Interview Training:** Conduct live mock interview practice tailored to a specific job. Available in the AI tab or by clicking the Target icon on any active job card under the Applications tab.

Which feature would you like to explore?`;
      suggestions = ["AI Resume Analyzer help", "How mock interviews work", "Success Predictor details"];
    }
    // Cover Letters
    else if (lastMsg.includes('cover letter') || lastMsg.includes('coverletter') || lastMsg.includes('writing a letter') || lastMsg.includes('writing a cover')) {
      content = `A compelling cover letter should be tailored to the specific role and structured in four parts:

1. **The Hook (Intro):** State the role you're applying for, where you found it, and why you are excited.
2. **The "Why You" (Core Paragraph):** Share 1-2 major professional accomplishments that align directly with the company's challenges. Use metrics (e.g., *"Engineered a system that reduced latency by 30%"*).
3. **The "Why Them" (Connection):** Show you researched the company. Mention their culture, recent product releases, or mission.
4. **The Close (Call to Action):** Reiterate your enthusiasm, mention your attached resume, and request an interview.

*Tip:* Paste your cover letter draft here, and I can help you proofread and polish it!`;
      suggestions = ["Can you review my cover letter?", "How to tailor to a job description", "Suggest action verbs"];
    }
    // Specific Mock Question Requests (Behavioral/Technical)
    else if (lastMsg.includes('behavioral question') || lastMsg.includes('mock question') || lastMsg.includes('give me a behavioral')) {
      const behavioralQuestions = [
        "Could you describe a time when you had to work with a difficult stakeholder or team member? How did you resolve the situation?",
        "Tell me about a complex project you spearheaded. What was the impact, and how did you measure success?",
        "Describe a situation where you had a tight deadline and multiple competing priorities. How did you organize your work?",
        "Can you share an example of a mistake you made in a past project? How did you handle it and what did you learn?"
      ];
      const question = behavioralQuestions[lastMsgText.length % behavioralQuestions.length];
      content = `Here is a common **Behavioral Interview Question** for your practice:

> **"${question}"**

*Practice Prompt:* Draft your response using the **STAR Method** (Situation, Task, Action, Result) below, and I will evaluate it for you!`;
      suggestions = ["Give me a technical question", "Explain the STAR method", "Resume optimization tips"];
    }
    else if (lastMsg.includes('technical question') || lastMsg.includes('give me a technical')) {
      const technicalQuestions = [
        "Explain the difference between optimistic and pessimistic locking in database transactions, and give a use case for each.",
        "How does the browser render a webpage? Briefly walk through the DOM, CSSOM, Render Tree, Layout, and Paint steps.",
        "What is the difference between a process and a thread? How do they share memory in a multi-threaded application?",
        "Explain the concept of CORS (Cross-Origin Resource Sharing) and how a preflight request works."
      ];
      const question = technicalQuestions[lastMsgText.length % technicalQuestions.length];
      content = `Here is a standard **Technical Interview Question** for your practice:

> **"${question}"**

*Practice Prompt:* Explain your thoughts and structure your explanation step-by-step below, and I will critique it for you!`;
      suggestions = ["Give me a behavioral question", "Explain the STAR method", "How to use this platform?"];
    }
    // Resume & CV Help
    else if (lastMsg.includes('cv') || lastMsg.includes('resume') || lastMsg.includes('bullet point') || lastMsg.includes('experience') || lastMsg.includes('skills')) {
      const title = userProfile?.professionalTitle || "your targeted roles";
      const skillList = userProfile?.technicalSkills ? ` (especially your skills in ${userProfile.technicalSkills})` : "";
      
      content = `Here are specific recommendations to optimize your CV/Resume for **${title}** roles${skillList}:

- **Quantify Impact:** Rewrite generic descriptions to show results. Instead of *"Responsible for maintaining database"*, write *"Optimized database schemas, reducing query response times by 35% and improving platform stability."*
- **Tailor for ATS:** Ensure keywords from the job description (like specific languages, frameworks, or methodologies) appear naturally in your resume.
- **Strong Action Verbs:** Begin every bullet point with powerful verbs like *Spearheaded*, *Architected*, *Optimized*, *Engineered*, or *Fostered*.
- **Keep it to 1 Page:** Unless you have 10+ years of experience, a single page is highly preferred by recruiters.

If you have a bullet point you want to improve, paste it here, and I'll rewrite it into a strong, action-oriented statement!`;
      suggestions = ["Rewrite a bullet point for me", "Explain ATS rules", "UDEMY course recommendations"];
    }
    // Mock Interview & Preparation (Generic guidelines)
    else if (lastMsg.includes('interview') || lastMsg.includes('mock') || lastMsg.includes('star method')) {
      const role = userProfile?.professionalTitle || "Software Engineer";
      content = `To excel in your **${role}** interviews, I recommend practicing with the **STAR Method**:

- **S - Situation:** Set the scene (what was the project/context?).
- **T - Task:** Describe the challenge or goal you faced.
- **A - Action:** Explain the *specific steps* you took to address the challenge (focus on your actions, not just the team's).
- **R - Result:** Highlight the positive outcome (always quantify, e.g. saved 10 hours/week, boosted conversion by 15%).

**Try a Mock Prompt:**
Would you like me to give you a practice interview question? You can type your answer below, and I will critique it for you!`;
      suggestions = ["Give me a behavioral question", "Give me a technical question", "Tell me about AI Interview Training"];
    }
    // Career Guidance, Skills & Job Search
    else if (lastMsg.includes('career') || lastMsg.includes('job search') || lastMsg.includes('find a job') || lastMsg.includes('guidance') || lastMsg.includes('salary') || lastMsg.includes('negotiate') || lastMsg.includes('recommend') || lastMsg.includes('project')) {
      const title = userProfile?.professionalTitle || "Software Engineer";
      const skills = userProfile?.technicalSkills || "React, JavaScript, CSS";
      content = `Based on your profile as a **${title}** and your tracked applications, here is your career guidance:

1. **Skill Expansion:** Focus on mastering high-demand technologies that match your current skillset of *${skills}*. Consider learning cloud providers (AWS/GCP), containerization (Docker), or advanced framework patterns.
2. **Build Portfolio Projects:** Recruiters love interactive, deployed applications. Build a real-world project (like a custom tracker, full-stack dashboard, or AI integration) and write a clean README on GitHub.
3. **Outreach Strategy:** Don't just submit online applications. Leverage LinkedIn to connect with recruiters and engineering managers at companies you are targeting. Send a polite, personalized 150-word message.
4. **Salary Negotiation:** Never accept the first offer immediately. Express excitement, thank them, and ask for 24-48 hours to review. Research market rates for similar roles in your region.

Would you like some specific project ideas to build next?`;
      suggestions = ["Suggest project ideas", "How to message recruiters", "List high-demand skills"];
    }
    // General Concepts / Explanations
    else if (lastMsg.includes('explain') || lastMsg.includes('what is') || lastMsg.includes('concept') || lastMsg.includes('technology') || lastMsg.includes('trend')) {
      content = `I can explain technical concepts, software architectures, or industry trends! 

For example, I can explain:
- **System Design concepts** (e.g. Load Balancers, Caching, Database Sharding).
- **Frontend architectural patterns** (e.g. state management, React Server Components, server-side rendering).
- **AI/ML basics** (e.g. LLMs, vector search, embeddings, Prompt engineering).
- **DevOps practices** (e.g. CI/CD pipelines, Docker containerization, Kubernetes).

Please type the specific technology or concept you would like me to break down for you!`;
      suggestions = ["Explain Load Balancing", "Explain React Server Components", "Explain Vector Databases"];
    }
    // Capabilities Inquiry
    else if (lastMsg.includes('who are you') || lastMsg.includes('what can you do') || lastMsg.includes('capabilities') || lastMsg.includes('tell me about yourself')) {
      content = `I am your **AI Support & Guidance Mentor**! 

I'm here 24/7 to help you with:
- **Resume & CV Optimization:** Polishing work history, action verbs, and ATS compliance.
- **Cover Letter Guidance:** Writing hooks and structuring tailored cover letters.
- **Interview Preparation:** Teaching the STAR method and asking practice questions.
- **JobTracker Nav Support:** Walking you through how to use the applications page, resume analyzer, mock interviews, and success predictor.
- **Career & Skill Roadmaps:** Suggesting projects and skills based on your profile.

How can I help you take the next step in your career today?`;
      suggestions = ["Help me optimize my CV", "How do I use this platform?", "I want mock interview prep"];
    }
    // Default Fallback Router if no keywords matched
    else {
      content = `I am analyzing your request: *"${lastMsgText}"*.

I can provide guidance tailored to your query. What specific aspect of your career or the JobTracker platform would you like to focus on?

- **CV / Resume help:** Optimizing your experience, keywords, and action verbs.
- **Interview training:** Mock questions, behavioral practice, and the STAR method.
- **Platform support:** Walkthroughs of the Resume Analyzer, Success Predictor, and Applications tracker.
- **Cover Letters:** Structuring and drafting tailored letters.

Tell me a bit more, or select one of the quick options below!`;
      suggestions = ["Resume optimization tips", "Mock Interview prep", "How to use this platform"];
    }

    return { content, suggestions };
  };

  const sendMessageToOpenAI = async (currentMessages) => {
    if (!activeSessionId) return;

    if (!apiKey) {
      const lastMsg = currentMessages[currentMessages.length - 1].content;
      const { content, suggestions } = getFallbackResponse(lastMsg);
      const updatedMessages = [
        ...currentMessages,
        { 
          role: 'assistant', 
          content: content,
          suggestions: suggestions,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
      updateMessagesInSession(activeSessionId, updatedMessages);
      setIsTyping(false);
      return;
    }

    try {
      // Filter out any system notes or local-only messages
      const apiMessages = currentMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const messagesApiFormat = [
        { role: 'system', content: generateSystemPrompt() },
        ...apiMessages
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messagesApiFormat,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        if (errData.error?.code === 'insufficient_quota' || errData.error?.message?.includes('quota')) {
           throw new Error('QUOTA_EXCEEDED');
        }
        throw new Error(errData.error?.message || 'OpenAI API Error');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;

      // Parse suggested questions
      let cleanContent = assistantMessage;
      let suggestions = [];
      const match = assistantMessage.match(/\[SUGGESTIONS:\s*(.*?)\]/s);
      if (match) {
        try {
          suggestions = JSON.parse(match[1]);
          cleanContent = assistantMessage.replace(/\[SUGGESTIONS:\s*(.*?)\]/gs, '').trim();
        } catch (e) {
          console.error("Failed to parse suggestions", e);
        }
      }

      const newMsg = {
        role: 'assistant',
        content: cleanContent,
        suggestions: suggestions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const updatedMessages = [...currentMessages, newMsg];
      updateMessagesInSession(activeSessionId, updatedMessages);

      if (!isSpeechMuted) {
        speakText(cleanContent);
      }

    } catch (error) {
      console.error(error);
      const lastMsg = currentMessages[currentMessages.length - 1].content;
      const { content, suggestions } = getFallbackResponse(lastMsg);

      const newMsg = {
        role: 'assistant',
        content: content,
        suggestions: suggestions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      const updatedMessages = [...currentMessages, newMsg];
      updateMessagesInSession(activeSessionId, updatedMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = (textToSend = input) => {
    if (!textToSend.trim() || !activeSessionId) return;

    const newMsg = { 
      role: 'user', 
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const updatedMessages = [...(activeSession?.messages || []), newMsg];
    updateMessagesInSession(activeSessionId, updatedMessages);
    setInput('');
    setIsTyping(true);
    
    if (textareaRef.current) textareaRef.current.style.height = '24px';

    sendMessageToOpenAI(updatedMessages);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptClick = (promptText) => {
    // Process quick actions
    let actionText = promptText;
    if (promptText === "📝 Improve my CV") {
      actionText = "I need help improving my CV. Can you review my profile details and suggest ways to make my bullet points stronger?";
    } else if (promptText === "🗣️ Practice mock interview") {
      actionText = "Can you help me practice for a mock interview? I want to practice behavioral questions using the STAR method.";
    } else if (promptText === "⚙️ How to use this platform?") {
      actionText = "How do I use this platform? Tell me about the different features and how to navigate to them.";
    } else if (promptText === "💡 Career guidance & skills") {
      actionText = "Based on my current profile and target jobs, what skills do you recommend I learn and what projects should I build?";
    }
    handleSend(actionText);
  };

  const parseMarkdown = (text) => {
    if (!text) return { __html: '' };
    let html = text
      .replace(/^### (.*$)/gim, '<strong>$1</strong><br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\s*-\s(.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    return { __html: `<p>${html}</p>` };
  };

  return (
    <div className="chat-assistant-wrapper">
      {/* Chat Panel with Light/Dark theme class */}
      <div className={`chat-panel ${isOpen ? 'open' : ''} ${theme === 'dark' ? 'chat-dark' : ''}`}>
        
        {/* Sidebar for Chat History */}
        <div className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>Chat History</h3>
            <button type="button" className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <button type="button" className="new-chat-btn" onClick={() => createNewSession()}>
            <Plus size={16} /> New Chat
          </button>
          <div className="session-list">
            {sessions.map(session => (
              <div 
                key={session.id} 
                className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setIsSidebarOpen(false);
                }}
              >
                {editingSessionId === session.id ? (
                  <div className="rename-input-container" onClick={e => e.stopPropagation()}>
                    <input 
                      type="text" 
                      className="rename-input"
                      value={editTitleInput}
                      onChange={e => setEditTitleInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveSessionRename(session.id);
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                      autoFocus
                    />
                    <button type="button" className="save-rename-btn" onClick={() => saveSessionRename(session.id)}>
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="session-title">{session.title}</span>
                    <div className="session-actions">
                      <button
                        type="button"
                        className="session-action-btn" 
                        onClick={(e) => startRenameSession(e, session)}
                        title="Rename chat"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        className="session-action-btn delete" 
                        onClick={(e) => deleteSession(e, session.id)}
                        title="Delete chat"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Main Window */}
        <div className="chat-main">
          <div className="chat-header">
            <div className="chat-header-info">
              <button type="button" className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <div className="chat-avatar">
                <Brain size={20} />
              </div>
              <div className="chat-header-text">
                <h3>AI Assistant <span className="chat-status-dot"></span></h3>
                <p>24/7 Personal Mentor</p>
              </div>
            </div>
            
            {/* Header controls: Dark/Light Mode, Mute/Speech synthesis, Language Selector */}
            <div className="chat-header-controls">
              <button 
                type="button"
                className="header-control-btn" 
                onClick={toggleTheme} 
                title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              
              <button 
                type="button"
                className="header-control-btn" 
                onClick={toggleMute}
                title={isSpeechMuted ? "Unmute Voice Responses" : "Mute Voice Responses"}
              >
                {isSpeechMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <div className="lang-select-wrapper" title="Change Language">
                <Globe size={16} className="lang-icon" />
                <select 
                  className="lang-select" 
                  value={language} 
                  onChange={handleLanguageChange}
                >
                  <option value="en-US">English</option>
                  <option value="es-ES">Español</option>
                  <option value="fr-FR">Français</option>
                  <option value="de-DE">Deutsch</option>
                  <option value="hi-IN">हिंदी</option>
                  <option value="pt-PT">Português</option>
                  <option value="ja-JP">日本語</option>
                </select>
              </div>

              <button type="button" className="chat-close-btn" onClick={closeChat} aria-label="Close AI Assistant">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Dynamic API Key requirement banner */}
          {!import.meta.env.VITE_OPENAI_API_KEY && (
            <div className="api-key-warning">
              <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600}}>
                <AlertCircle size={14} /> Provide OpenAI API Key:
              </div>
              <input 
                type="password" 
                className="api-key-input" 
                placeholder="sk-..." 
                value={apiKey} 
                onChange={handleApiKeyChange}
                title="Locally stored in your browser"
              />
            </div>
          )}

          <div className="chat-messages">
            {activeSession?.messages.filter(m => m.role !== 'system_note').map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="message-avatar">
                    <Sparkles size={16} />
                  </div>
                )}
                <div className="message-bubble-wrapper">
                  <div className="message-bubble">
                    {msg.role === 'assistant' ? (
                      <>
                        <span dangerouslySetInnerHTML={parseMarkdown(msg.content)} />
                        
                        {/* Audio control inside bubble */}
                        <button 
                          type="button"
                          className="speech-btn" 
                          onClick={() => speakText(msg.content)}
                          title="Read aloud"
                        >
                          <Volume2 size={13} />
                        </button>
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.timestamp && <span className="message-timestamp">{msg.timestamp}</span>}
                  
                  {/* Clickable suggested follow up questions */}
                  {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && idx === activeSession.messages.filter(m => m.role !== 'system_note').length - 1 && (
                    <div className="suggestions-container">
                      {msg.suggestions.map((suggestion, sIdx) => (
                        <button 
                          type="button"
                          key={sIdx} 
                          className="suggestion-pill"
                          onClick={() => handleSend(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="chat-message assistant">
                <div className="message-avatar"><Sparkles size={16} /></div>
                <div className="message-bubble-wrapper">
                  <div className="message-bubble">
                    <div className="typing-indicator">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt options if chat is fresh/empty */}
          {activeSession?.messages.length <= 1 && (
            <div className="quick-prompts-grid">
               <p className="quick-prompts-title">Select a quick action or ask a custom question:</p>
               <div className="quick-prompts-buttons">
                  <button type="button" onClick={() => handlePromptClick("📝 Improve my CV")}>📝 Improve my CV</button>
                  <button type="button" onClick={() => handlePromptClick("🗣️ Practice mock interview")}>🗣️ Mock Interview</button>
                  <button type="button" onClick={() => handlePromptClick("⚙️ How to use this platform?")}>⚙️ How to use platform?</button>
                  <button type="button" onClick={() => handlePromptClick("💡 Career guidance & skills")}>💡 Guidance & Skills</button>
               </div>
            </div>
          )}

          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                placeholder={language === 'es-ES' ? 'Escribe tu pregunta...' : 'Ask anything, 24/7 Support...'}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleInputResize();
                }}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              
              {/* Mic Icon for Voice Input */}
              <button 
                type="button"
                className={`mic-btn ${isListening ? 'listening' : ''}`}
                onClick={startSpeechRecognition}
                title={isListening ? "Listening... click to stop" : "Start Voice Input"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
            <button 
              type="button"
              className="chat-send-btn" 
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
            >
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </div>
        </div>
      </div>

      {/* FAB Button */}
      <button 
        type="button"
        className={`chat-fab ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Career Assistant"
      >
        <MessageSquare size={24} className="chat-fab-icon" />
      </button>
    </div>
  );
}
