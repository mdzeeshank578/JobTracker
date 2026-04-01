export async function analyzeResume(resumeText) {
  // Simulate network delay for realistic UI loading
  await new Promise(r => setTimeout(r, 1500));
  
  // Calculate a simple hash of the resume text to generate pseudo-random dynamic results
  let hash = 0;
  const text = resumeText || "default";
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0; 
  }
  const positiveHash = Math.abs(hash);

  // Score between 60 and 96
  const score = 60 + (positiveHash % 37);

  const possibleSkills = ["Cloud Architecture", "System Design", "Advanced React Patterns", "GraphQL", "Docker", "Kubernetes", "TypeScript", "Node.js", "Python", "Machine Learning", "Data Engineering", "CI/CD"];
  const possibleCourses = ["AWS Certified Developer", "React: The Complete Guide on Udemy", "Complete Node.js Developer", "Docker and Kubernetes: The Complete Guide", "Grokking the System Design Interview", "TypeScript Masterclass"];
  const possibleEdits = [
    "Your resume looks great, but you should quantify your bullet points (e.g., 'Increased performance by 25%').",
    "Include a link to your GitHub or interactive portfolio in the header.",
    "Tailor your skills section to strictly match the job descriptions you are targeting.",
    "Add more action verbs at the beginning of your experience bullet points.",
    "Ensure your formatting is consistent throughout the document.",
    "Consider adding a brief summary section at the top of your resume."
  ];

  // Pick pseudo-random skills based on hash
  const numSkills = 2 + (positiveHash % 3);
  const skillsToLearn = [];
  for (let i = 0; i < numSkills; i++) {
    const skillIndex = (positiveHash + i * 13) % possibleSkills.length;
    if (!skillsToLearn.includes(possibleSkills[skillIndex])) {
      skillsToLearn.push(possibleSkills[skillIndex]);
    }
  }

  // Pick courses
  const numCourses = 1 + (positiveHash % 2);
  const courses = [];
  for (let i = 0; i < numCourses; i++) {
    const courseIndex = (positiveHash + i * 17) % possibleCourses.length;
    if (!courses.includes(possibleCourses[courseIndex])) {
      courses.push(possibleCourses[courseIndex]);
    }
  }

  // Pick edits
  const numEdits = 2 + (positiveHash % 2);
  const resumeEdits = [];
  for (let i = 0; i < numEdits; i++) {
    const editIndex = (positiveHash + i * 23) % possibleEdits.length;
    if (!resumeEdits.includes(possibleEdits[editIndex])) {
      resumeEdits.push(possibleEdits[editIndex]);
    }
  }

  return {
    score,
    skillsToLearn,
    courses,
    resumeEdits
  };
}

export async function analyzeJobMatch(resumeText, jobDescription) {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 1200));

  let hash = 0;
  const combinedText = (resumeText || "") + (jobDescription || "");
  for (let i = 0; i < combinedText.length; i++) {
    hash = ((hash << 5) - hash) + combinedText.charCodeAt(i);
    hash |= 0; 
  }
  const positiveHash = Math.abs(hash);
  
  const matchPercentage = 65 + (positiveHash % 32);

  const possibleSuggestions = [
    "Strong match detected. Highlight your relevant experience more prominently.",
    "Add more details about your backend integration work.",
    "Consider mentioning your experience with modern state management.",
    "Your skills align well, but emphasize your leadership and mentoring experience.",
    "Include specific metrics that show the impact of your previous work.",
    "Ensure your resume specifically uses the keywords from this job description."
  ];

  const numSuggestions = 2 + (positiveHash % 2);
  const smartSuggestions = [];
  for (let i = 0; i < numSuggestions; i++) {
    const index = (positiveHash + i * 7) % possibleSuggestions.length;
    if (!smartSuggestions.includes(possibleSuggestions[index])) {
      smartSuggestions.push(possibleSuggestions[index]);
    }
  }

  return {
    matchPercentage,
    smartSuggestions
  };
}

export async function simulateAutoFillJob(url) {
  // Simulate network delay parsing the URL
  await new Promise(r => setTimeout(r, 1800));

  const lowerUrl = (url || '').trim().toLowerCase();

  // Smart URL Domain Extractor
  let dynamicCompanyName = "Tech Innovators Inc.";
  try {
    const validUrlStr = lowerUrl.startsWith('http') ? lowerUrl : 'https://' + lowerUrl;
    const urlObj = new URL(validUrlStr);
    const domainParts = urlObj.hostname.replace('www.', '').split('.');
    
    // Usually the company name is right before the top-level domain (.com, .org)
    if (domainParts.length >= 2) {
      let coreName = domainParts[domainParts.length - 2];
      // Handle special double TLDs like .co.uk or .com.au
      if (coreName === 'co' || coreName === 'com' || coreName === 'ac') {
         coreName = domainParts[domainParts.length - 3] || coreName;
      }
      dynamicCompanyName = coreName.charAt(0).toUpperCase() + coreName.slice(1);
    } else if (domainParts.length === 1) {
      dynamicCompanyName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
    }
  } catch (e) {
    // Fallback if URL parsing completely fails
    if (lowerUrl.includes('netflix')) dynamicCompanyName = "Netflix";
    if (lowerUrl.includes('microsoft')) dynamicCompanyName = "Microsoft";
  }

  if (lowerUrl.includes('ibm')) {
    return {
      company: "IBM",
      role: "Cloud Solutions Architect",
      type: "Full-time",
      deadline: "2026-05-15",
      description: "Join IBM's hybrid cloud team. Experience with Kubernetes, Red Hat OpenShift, and enterprise architecture is highly desired."
    };
  }

  if (lowerUrl.includes('tcs') || lowerUrl.includes('tata')) {
    return {
      company: "Tata Consultancy Services (TCS)",
      role: "System Engineer",
      type: "Full-time",
      deadline: "2026-04-30",
      description: "TCS is hiring System Engineers for global clients. Strong background in Java, Python, and SQL databases required."
    };
  }

  if (lowerUrl.includes('google')) {
    return {
      company: "Google",
      role: "Software Engineer III",
      type: "Full-time",
      deadline: "2026-06-01",
      description: "Design, develop, and deploy large scale distributed systems. C++, Java, or Go proficiency expected."
    };
  }

  // Generic Mock using the Dynamically Extracted Company
  return {
    company: dynamicCompanyName,
    role: lowerUrl.includes('manager') ? "Product Manager" : "Senior Software Engineer",
    type: "Full-time",
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: `We are looking for an experienced professional to join ${dynamicCompanyName} and drive technological excellence.`
  };
}

export async function generateInterviewPrep(role, company) {
  // Simulate network delay generating the tailored prep
  await new Promise(r => setTimeout(r, 2000));

  return {
    questions: [
      `Can you explain how you would architect a scalable frontend for ${company || 'our company'}?`,
      `Describe a time you had to optimize performance in a React application.`,
      `How do you handle state management across large, complex components?`
    ],
    answers: [
      `Focus on modularity, splitting code efficiently, and using established design patterns like feature-based folder structures.`,
      `Discuss specific metrics (like Core Web Vitals), tools used (Lighthouse, React Profiler), and actions taken (memoization, lazy loading).`,
      `Mention modern approaches like Context API for simple state, or Zustand/Redux for complex global state, and explain the tradeoffs.`
    ],
    tips: [
      `Research ${company || 'the company'}'s recent product launches and incorporate them into your answers.`,
      `Be prepared to whiteboard a system design question specifically focused on React performance.`,
      `Ask insightful questions about their deployment pipeline during the reverse interview.`
    ]
  };
}

export async function searchGlobalJobs(keyword) {
  // Simulate network delay finding jobs across the world
  await new Promise(r => setTimeout(r, 1200));

  const k = (keyword || '').toLowerCase();
  
  // Massive Database of Real Top-Tier Companies for ultra-realistic global simulation
  const techGiants = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Spotify', 'Tesla', 'Nvidia', 'IBM', 'Salesforce', 'Oracle', 'SAP', 'Adobe', 'Cisco', 'Intel', 'AMD'];
  const startups = ['Stripe', 'Airbnb', 'Notion', 'Figma', 'Vercel', 'Linear', 'Anthropic', 'OpenAI', 'Uber', 'Lyft', 'Pinterest', 'Reddit', 'Discord', 'Slack', 'Datadog', 'Snowflake'];
  const finance = ['JPMorgan Chase', 'Goldman Sachs', 'Bloomberg', 'Morgan Stanley', 'Citi', 'Visa', 'Mastercard', 'PayPal', 'Square'];
  const consultancies = ['TCS', 'Infosys', 'Accenture', 'Deloitte', 'Cognizant', 'Wipro', 'Capgemini'];
  const aerospace = ['SpaceX', 'Blue Origin', 'NASA', 'Lockheed Martin', 'Boeing'];
  const allRealCompanies = [...techGiants, ...startups, ...finance, ...consultancies, ...aerospace];

  // Try to extract if the user specifically typed a real company name
  let targetedCompany = allRealCompanies.find(c => k.includes(c.toLowerCase()));
  
  // Clean up the role name by strictly removing company names and generic filler words
  let rolePart = keyword;
  for (const c of allRealCompanies) {
    rolePart = rolePart.replace(new RegExp(`${c}`, 'gi'), '');
  }
  rolePart = rolePart.replace(/(?:company|companies|jobs|job|roles|role|vacancies|vacancy|at|for|in)/gi, '')
                     .replace(/\s+/g, ' ').trim() || 'Software Engineer';

  // Format role string capitalizing each word
  const formattedRole = rolePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').trim();

  // Route companies intelligently based on the role domain if no specific company was typed
  let pool = allRealCompanies;
  if (k.includes('ai') || k.includes('ml') || k.includes('machine learning')) {
      pool = ['OpenAI', 'Anthropic', 'Google DeepMind', 'Nvidia', 'Tesla', 'Meta', 'Hugging Face', ...techGiants];
  } else if (k.includes('finance') || k.includes('bank') || k.includes('quant')) {
      pool = finance;
  } else if (k.includes('aero') || k.includes('space')) {
      pool = aerospace;
  } else if (k.includes('consult')) {
      pool = consultancies;
  } else if (k.includes('startup')) {
      pool = startups;
  }

  // Shuffle the selected pool securely
  const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
  
  // Decide dynamically to return between 6 and 8 matching vacancies
  const numJobs = Math.floor(Math.random() * 3) + 6; 
  const prefixes = ['Senior', 'Lead', 'Principal', 'Staff', 'Junior', 'Associate', 'Director of', 'Head of', ''];
  const results = [];

  for (let i = 0; i < numJobs; i++) {
     const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
     const roleLevel = prefix ? `${prefix} ${formattedRole}` : formattedRole;
     
     // Provide mostly the targeted company, but sprinkle in 20% competitors
     let assignedCompany = targetedCompany;
     if (!targetedCompany || Math.random() > 0.8) {
         assignedCompany = shuffledPool[i % shuffledPool.length];
     }

     const type = Math.random() > 0.6 ? 'Full-time' : (Math.random() > 0.5 ? 'Remote' : 'Contract');
     const daysRemaining = Math.floor(Math.random() * 45) + 5;

     results.push({
      id: `global-${i}-${Date.now()}`,
      company: assignedCompany,
      role: roleLevel.trim(),
      type: type,
      status: 'Open',
      deadline: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      appliedDate: new Date().toISOString(), 
      notes: `Global vacancy discovered at ${assignedCompany}. Highly rated employer.`
    });
  }

  return results;
}
