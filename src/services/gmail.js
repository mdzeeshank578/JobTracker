import OpenAI from 'openai';
import { updateJob, addJob } from './db';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Helper to instantiate OpenAI
function getOpenAIClient() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });
}

/**
 * Helper to fetch with auth
 */
async function fetchWithAuth(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Extract clean email address from "From" header
 */
function extractEmailAddress(from) {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

/**
 * Helper for fuzzy substring matching
 */
function isFuzzyMatch(str1, str2) {
  if (!str1 || !str2) return false;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  return s1.includes(s2) || s2.includes(s1);
}

/**
 * Decode base64url encoded string
 */
function decodeBase64Url(str) {
  if (!str) return '';
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    try {
      return atob(base64);
    } catch (e2) {
      return '';
    }
  }
}

/**
 * Recursively find MIME part in message payload
 */
function findPartByMimeType(parts, mimeType) {
  for (const part of parts) {
    if (part.mimeType === mimeType) {
      return part;
    }
    if (part.parts) {
      const nestedPart = findPartByMimeType(part.parts, mimeType);
      if (nestedPart) return nestedPart;
    }
  }
  return null;
}

/**
 * Extract email body text from payload
 */
function getEmailBody(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    const plainPart = findPartByMimeType(payload.parts, 'text/plain');
    if (plainPart && plainPart.body && plainPart.body.data) {
      return decodeBase64Url(plainPart.body.data);
    }
    const htmlPart = findPartByMimeType(payload.parts, 'text/html');
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      const htmlText = decodeBase64Url(htmlPart.body.data);
      return htmlText.replace(/<[^>]*>/g, ' '); // Strip HTML tags
    }
  }
  return '';
}

/**
 * Helper to calculate Jaccard similarity of two strings
 */
function getJaccardSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const getTokens = (str) => {
    return new Set(
      str.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .filter(word => word.length > 2)
    );
  };
  const tokens1 = getTokens(str1);
  const tokens2 = getTokens(str2);
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  let intersectionSize = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      intersectionSize++;
    }
  }
  const unionSize = tokens1.size + tokens2.size - intersectionSize;
  return intersectionSize / unionSize;
}

/**
 * Validate status transition logic
 */
function isValidStatusTransition(currentStatus, newStatus) {
  if (currentStatus === newStatus) return false;
  
  const statusPrecedence = { 'Applied': 1, 'Interviewing': 2, 'Rejected': 3, 'Offer': 4, 'Accepted': 5 };
  const currentRank = statusPrecedence[currentStatus] || 0;
  const newRank = statusPrecedence[newStatus] || 0;

  // Always allow updating to Rejected or Offer or Accepted from lower/other ranks
  if (newStatus === 'Rejected' || newStatus === 'Offer' || newStatus === 'Accepted') {
    return true;
  }

  // Allow going from Applied or Rejected to Interviewing
  if (newStatus === 'Interviewing' && (currentStatus === 'Applied' || currentStatus === 'Rejected')) {
    return true;
  }

  // Otherwise, only allow if it is a higher rank
  return newRank > currentRank;
}

/**
 * Detect promotional emails, newsletter blasts, stipends, paper submissions, or job alerts
 */
function isPromotionalOrAlert(from, subject, snippet) {
  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const snippetLower = snippet.toLowerCase();

  // Newsletter/alert domains & addresses
  const promoSenders = [
    'unstop.news', 'noreply@unstop', 'newsletter', 'job-alerts', 'jobalerts',
    'digest', 'marketing', 'offers@', 'alerts@', 'alert@', 'info@unstop', 'hackerearth',
    'ieee', 'acm', '@linkedin.com', 'quora', 'glassdoor', 'indeed'
  ];
  if (promoSenders.some(sender => fromLower.includes(sender))) {
    return true;
  }

  // Promotional/newsletter subject & snippet keywords
  const promoKeywords = [
    'newsletter', 'weekly digest', 'daily digest', 'hackathon', 'hackathons', 
    'stipend', 'apply now', 'top internships', 'hiring event', 'career fair',
    'job alert', 'recommended jobs', 'opportunities for you', 'paper submission',
    'deadline approaching', 'call for papers', 'submit your paper', 'conference',
    'internships & hackathons', 'earn upto', 'stipend!'
  ];
  if (promoKeywords.some(kw => subjectLower.includes(kw) || snippetLower.includes(kw))) {
    return true;
  }

  return false;
}

/**
 * Extract company name from subject line using stopwords heuristic (perfect for forwarded emails)
 */
function extractCompanyFromSubjectHeuristic(subject) {
  const cleanSubject = subject.replace(/^[fF]wd:\s*/, '').replace(/^[rR]e:\s*/, '');
  const words = cleanSubject.split(/[\s-._,():/|]+/);
  
  const stopWords = new Set([
    'fwd', 're', 'job', 'offer', 'letter', 'application', 'status', 'update', 
    'interview', 'assessment', 'received', 'confirmation', 'process', 'stage',
    'scheduling', 'invitation', 'career', 'careers', 'recruiting', 'hr', 'hiring',
    'opportunity', 'opportunities', 'join', 'joining', 'welcome', 'thank', 'you',
    'interest', 'applying', 'position', 'role', 'candidate', 'candidates', 'your',
    'our', 'the', 'for', 'at', 'to', 'with', 'from', 'by', 'on', 'in', 'and', 'a', 'an',
    'software', 'engineer', 'developer', 'designer', 'analyst', 'manager', 'intern', 'full', 'stack', 'frontend', 'backend'
  ]);

  for (const word of words) {
    const cleanWord = word.trim().replace(/[^a-zA-Z]/g, '');
    if (cleanWord.length > 1 && !stopWords.has(cleanWord.toLowerCase())) {
      // Return the first significant capitalized word or acronym
      if (cleanWord === cleanWord.toUpperCase() || (cleanWord.charAt(0) === cleanWord.charAt(0).toUpperCase())) {
        return cleanWord;
      }
    }
  }
  return null;
}

/**
 * Extract job details (company, role) from subject and sender using heuristics
 */
function extractJobDetailsFromEmail(subject, from, snippet) {
  let company = 'Unknown Company';
  let role = 'Software Engineer';

  // 1. Extract company from sender email domain (e.g. careers@stripe.com -> Stripe)
  const emailMatch = from.match(/@([a-zA-Z0-9.-]+)/);
  if (emailMatch && emailMatch[1]) {
    const domain = emailMatch[1].toLowerCase();
    const genericDomains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
      'icloud.com', 'google.com', 'microsoft.com', 'zoho.com', 'yandex.ru', 'mail.ru'
    ];
    if (!genericDomains.includes(domain)) {
      const firstPart = domain.split('.')[0];
      company = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
    }
  }

  // 2. Refine company from subject line (pattern-based)
  if (company === 'Unknown Company') {
    const companySubjectMatch = subject.match(/(?:to|at|with|for|from|by)\s+([A-Z][a-zA-Z0-9\s.-]+)/);
    if (companySubjectMatch && companySubjectMatch[1]) {
      const candidate = companySubjectMatch[1].trim();
      const exclusions = ['me', 'our', 'discuss', 'schedule', 'the', 'my', 'your', 'us', 'interview'];
      if (!exclusions.includes(candidate.toLowerCase()) && candidate.length > 1) {
        company = candidate.replace(/(?:application|resume|developer|engineer|design|manager|role|position|job).*/i, '').trim();
      }
    }
  }

  // 3. Fallback: Stopwords heuristic extraction (for forwarded emails)
  if (company === 'Unknown Company') {
    const heuristicCompany = extractCompanyFromSubjectHeuristic(subject);
    if (heuristicCompany) {
      company = heuristicCompany;
    }
  }

  // 4. Extract role from subject line
  const roleSubjectMatch = subject.match(/(?:for|as|position of|role as)\s+([a-zA-Z0-9\s-]{3,})/i);
  if (roleSubjectMatch && roleSubjectMatch[1]) {
    role = roleSubjectMatch[1].replace(/(?:at|with|to|from|application|received|confirmation|update|status).*/i, '').trim();
  } else {
    // Look in snippet/body for structured position/role lines (e.g. "Position: Junior Open Position")
    const bodyRoleMatch = snippet.match(/(?:position|role|job|title)\s*:\s*([^\r\n]{3,40})/i);
    if (bodyRoleMatch && bodyRoleMatch[1]) {
      role = bodyRoleMatch[1].trim();
    } else {
      // Look in snippet for job title/role (e.g. "position of Software Engineer")
      const snippetRoleMatch = snippet.match(/(?:position of|role of|role as|position as|job as)\s+([a-zA-Z0-9\s-]{3,40})/i);
      if (snippetRoleMatch && snippetRoleMatch[1]) {
        role = snippetRoleMatch[1].trim();
      } else {
      // Scan for common career keywords in subject
      const commonRoles = ['developer', 'engineer', 'manager', 'designer', 'analyst', 'consultant', 'lead', 'intern', 'architect', 'specialist'];
      for (const r of commonRoles) {
        if (subject.toLowerCase().includes(r)) {
          const regex = new RegExp(`[a-zA-Z\\s-]*${r}[a-zA-Z\\s-]*`, 'i');
          const match = subject.match(regex);
          if (match) {
            role = match[0].trim();
            break;
          }
        }
      }
    }
  }
}

  // Clean company name if it resolved to Google/Microsoft domains but the sender is indeed Google
  if (company === 'Unknown Company' && from.toLowerCase().includes('google')) {
    company = 'Google';
  }

  // Capitalize words in role and company
  role = role.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  if (company !== 'Unknown Company') {
    company = company.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return { company, role };
}

/**
 * AI Classifier with structured JSON output and semantic rejection understanding
 */
async function classifyEmailWithAI(from, subject, snippet) {
  const openai = getOpenAIClient();
  if (!openai) {
    console.warn("OpenAI client could not be initialized (missing API key).");
    return null;
  }

  const prompt = `You are a job application assistant. Your task is to analyze an email's sender, subject, and snippet and classify it.

Classify the email into one of these exact categories:
- "Applied": Application confirmations, "thank you for applying", confirming receipt.
- "Interview": Interview schedules, invitations to meet the team, technical chats, calendars.
- "Assessment": Take-home tests, coding tests, hackerRank invitations, online assessments.
- "Offer": Congratulations, job offers, offer letters.
- "Accepted": Confirmation that the offer was accepted.
- "Rejected": Decision not to move forward, rejection letters, closing of application.
- "Unknown": General follow-ups, newsletters, updates that do not match the above.

For "Rejected" detection:
Recognize common rejection phrases and overall semantic meaning even if the word "rejected" is never explicitly used. Common semantic indicators:
- "Thank you for your interest"
- "We appreciate your application"
- "We have decided to move forward with other candidates"
- "We have chosen another candidate"
- "We regret to inform you"
- "Unfortunately"
- "After careful consideration"
- "We will not be moving forward"
- "We are unable to offer you the position"
- "We have filled the position"
- "The role has been closed"
- "We wish you the best in your future endeavors"
- "We encourage you to apply again in the future"
- "Although your qualifications are impressive..."
- "We have selected candidates whose experience more closely matches our needs"

Email Details:
From: ${from}
Subject: ${subject}
Snippet: ${snippet}

Respond with a JSON object in this exact format:
{
  "isJobEmail": true/false,
  "confidence": 0.0 to 1.0,
  "category": "Applied" | "Interview" | "Assessment" | "Offer" | "Accepted" | "Rejected" | "Unknown",
  "companyName": "detected company name, or null",
  "jobTitle": "detected job title/role, or null",
  "recruiterName": "detected recruiter name, or null",
  "recruiterEmail": "detected recruiter email if mentioned, or null",
  "interviewDate": "detected interview date (format YYYY-MM-DD if found, else null)",
  "referenceNumber": "detected application reference number, or null"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You output JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error("OpenAI classification error:", error);
    return null;
  }
}

/**
 * Hybrid Classifier that uses AI if available, falling back to heuristics
 */
async function classifyEmail(from, subject, snippet) {
  // 1. Try AI classification
  const aiResult = await classifyEmailWithAI(from, subject, snippet);
  if (aiResult) {
    if (aiResult.category !== 'Unknown') {
      aiResult.isJobEmail = true;
    }
    return aiResult;
  }

  // 2. Fallback to Heuristics
  console.log("Using heuristic fallback classification");
  const combinedText = `${from} ${subject} ${snippet}`.toLowerCase();
  
  const rejectPhrases = [
    'we have decided to move forward with other candidates',
    'we have chosen another candidate',
    'we regret to inform you',
    'unfortunately',
    'after careful consideration',
    'we will not be moving forward',
    'we are unable to offer you the position',
    'we have filled the position',
    'the role has been closed',
    'we wish you the best in your future endeavors',
    'we encourage you to apply again in the future',
    'although your qualifications are impressive',
    'we have selected candidates whose experience more closely matches our needs',
    'unable to offer',
    'declined',
    'reject',
    'rejection'
  ];
  
  const interviewKeywords = ['interview', 'schedule', 'availability', 'assessment', 'next steps', 'calendly', 'technical discussion', 'meet the team'];
  const offerKeywords = ['job offer', 'congratulations', 'offer letter', 'compensation package', 'joining us', 'offer of employment', 'pleased to offer', 'offer'];
  const appliedKeywords = ['application received', 'thank you for applying', 'confirming your application', 'submitted your application', 'applied to', 'apply', 'application', 'submission'];

  let category = 'Unknown';
  let isJobEmail = false;

  if (rejectPhrases.some(phrase => combinedText.includes(phrase))) {
    category = 'Rejected';
    isJobEmail = true;
  } else if (interviewKeywords.some(kw => combinedText.includes(kw))) {
    category = 'Interview';
    isJobEmail = true;
  } else if (offerKeywords.some(kw => combinedText.includes(kw))) {
    category = 'Offer';
    isJobEmail = true;
  } else if (appliedKeywords.some(kw => combinedText.includes(kw))) {
    category = 'Applied';
    isJobEmail = true;
  }

  const parsedHeuristics = extractJobDetailsFromEmail(subject, from, snippet);

  return {
    isJobEmail,
    confidence: 0.5,
    category,
    companyName: parsedHeuristics.company === 'Unknown Company' ? null : parsedHeuristics.company,
    jobTitle: parsedHeuristics.role,
    recruiterName: null,
    recruiterEmail: null,
    interviewDate: null,
    referenceNumber: null
  };
}

/**
 * Map categories to Firestore jobs status values
 */
function mapCategoryToStatus(category) {
  switch (category) {
    case 'Applied':
      return 'Applied';
    case 'Interview':
    case 'Assessment':
      return 'Interviewing';
    case 'Offer':
      return 'Offer';
    case 'Accepted':
      return 'Accepted';
    case 'Rejected':
      return 'Rejected';
    default:
      return 'Applied';
  }
}

/**
 * Calculate matching confidence score between email details and a job application card.
 * Priority matching rules:
 * Priority 1: Application Reference ID (Confidence: 1.0)
 * Priority 2: Recruiter Email Match (Confidence: 0.9)
 * Priority 3: Exact Company Name & Exact Role (Confidence: 0.85)
 * Priority 4: Fuzzy Role Match within same company (Confidence: 0.75)
 */
function calculateMatchConfidence(details, job, isOnlyJobForCompany = false) {
  const companyName = details.companyName;
  const jobCompany = job.company;
  
  if (!companyName || !jobCompany) {
    return { score: 0.0, reason: 'Missing company name for verification' };
  }
  
  const isCompanyMatch = isFuzzyMatch(jobCompany, companyName);
  if (!isCompanyMatch) {
    return { score: 0.0, reason: `Company mismatch ("${jobCompany}" vs "${companyName}")` };
  }

  const jobTitle = details.jobTitle;
  const recruiterEmail = details.recruiterEmail;
  const referenceNumber = details.referenceNumber;

  // Priority 1: Reference ID Match (Highest confidence)
  if (referenceNumber && job.referenceNumber && String(job.referenceNumber).trim().toLowerCase() === String(referenceNumber).trim().toLowerCase()) {
    return { score: 1.0, reason: `Priority 1: Exact Reference ID Match (${referenceNumber})` };
  }

  // Priority 2: Recruiter Email Match (Avoid self-sent/forwarded Gmail accounts)
  if (recruiterEmail && job.recruiterEmail && isFuzzyMatch(recruiterEmail, job.recruiterEmail)) {
    const emailLower = recruiterEmail.toLowerCase();
    const isGenericOrSelf = emailLower.includes('gmail.com') || emailLower.includes('yahoo.com') || emailLower.includes('outlook.com') || emailLower.includes('hotmail.com');
    if (!isGenericOrSelf) {
      return { score: 0.9, reason: `Priority 2: Recruiter Email Match (${recruiterEmail})` };
    }
  }

  // Priority 3 & 4: Job Title Match within the same company
  if (jobTitle && job.role) {
    const normalizeRole = (r) => r.toLowerCase()
      .replace(/\b(position|role|opening|job)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const normJobTitle = normalizeRole(jobTitle);
    const normJobRole = normalizeRole(job.role);

    const exactMatch = normJobRole === normJobTitle;
    if (exactMatch) {
      return { score: 0.85, reason: `Priority 3 & 4: Exact Company & Exact Role Match` };
    }

    const fuzzyMatch = isFuzzyMatch(normJobRole, normJobTitle);
    const tokenSim = getJaccardSimilarity(normJobRole, normJobTitle);
    
    // Match role if it satisfies fuzzy matching or meets the similarity threshold (Jaccard >= 50%, or >= 40% if it's the only job for this company)
    const matchesRole = fuzzyMatch || (isOnlyJobForCompany ? tokenSim >= 0.4 : tokenSim >= 0.5);
    
    if (matchesRole) {
      return { score: 0.75, reason: `Priority 3 & 4: Exact Company & Fuzzy Role Match (Similarity: ${(tokenSim * 100).toFixed(0)}%)` };
    } else {
      return { score: 0.0, reason: `Company matches, but role mismatch ("${job.role}" vs "${jobTitle}")` };
    }
  }

  // Company match only (missing role details)
  return { score: 0.6, reason: `Company match only (missing role details)` };
}

/**
 * Loop through current jobs to find the best matching application based on confidence score.
 * Only compares applications from the same company.
 */
function findBestMatchingJob(details, currentJobs) {
  const companyName = details.companyName;
  if (!companyName) {
    return { match: null, score: 0.0, reason: 'No company name extracted from email' };
  }

  // Filter current jobs to those of the same company (fuzzy match)
  const companyJobs = currentJobs.filter(job => job.company && isFuzzyMatch(job.company, companyName));
  
  if (companyJobs.length === 0) {
    return { match: null, score: 0.0, reason: `No active job card found for company "${companyName}"` };
  }

  const isOnlyJobForCompany = companyJobs.length === 1;
  let bestJob = null;
  let highestScore = 0.0;
  let highestReason = 'No match';

  for (const job of companyJobs) {
    const { score, reason } = calculateMatchConfidence(details, job, isOnlyJobForCompany);
    if (score > highestScore) {
      highestScore = score;
      highestReason = reason;
      bestJob = job;
    }
  }

  return { match: bestJob, score: highestScore, reason: highestReason };
}

/**
 * Searches and scans recent emails for keywords related to jobs,
 * matches them with current applications, and updates status in Firestore.
 * Does NOT auto-import new jobs; updates existing jobs only.
 */
export async function syncEmailsWithJobs(accessToken, userId, currentJobs = []) {
  if (!accessToken || !userId) {
    return { updatedCount: 0, fetchedMessages: 0, classifiedMessages: 0, matchedApplications: 0, updates: [], pendingReviews: [] };
  }

  // Check if Gmail synchronization is enabled
  const syncEnabled = localStorage.getItem('jobtracker_gmail_sync_enabled') !== 'false';
  if (!syncEnabled) {
    throw new Error('Gmail synchronization is disabled in settings.');
  }

  // If there are no existing jobs, skip sync entirely
  if (currentJobs.length === 0) {
    return { updatedCount: 0, fetchedMessages: 0, classifiedMessages: 0, matchedApplications: 0, updates: [], pendingReviews: [] };
  }

  // Get list of unique company names from user's dashboard applications
  const uniqueCompanies = Array.from(
    new Set(currentJobs.map(job => job.company.trim()).filter(c => c.length > 0))
  );

  if (uniqueCompanies.length === 0) {
    return { updatedCount: 0, fetchedMessages: 0, classifiedMessages: 0, matchedApplications: 0, updates: [], pendingReviews: [] };
  }

  // Format companies for GMail search query, e.g. ("Google" OR "IBM" OR "Netflix")
  // Note: GMail assumes AND between space-separated terms; literal "AND" is treated as a search string!
  const keywords = 'apply OR applied OR application OR interview OR assessment OR offer OR rejection OR unfortunate OR "not moving forward" OR careers OR recruiting';
  const query = encodeURIComponent(`(${keywords})`);
  const url = `${GMAIL_API_BASE}/messages?q=${query}&maxResults=50`;
  
  const data = await fetchWithAuth(url, accessToken);

  // Step 1: Check whether Gmail is returning any emails
  console.log("Gmail Query:", decodeURIComponent(query));
  console.log("Messages returned:", data.messages?.length || 0);
  console.log(data);
  
  if (!data.messages || data.messages.length === 0) {
    return { updatedCount: 0, fetchedMessages: 0, classifiedMessages: 0, matchedApplications: 0, updates: [], pendingReviews: [] };
  }

  // 1. Fetch message data in parallel using Promise.all to drastically reduce round-trip delay
  const messagePromises = data.messages.map(async (msg) => {
    try {
      const messageUrl = `${GMAIL_API_BASE}/messages/${msg.id}?format=full&fields=id,threadId,labelIds,snippet,internalDate,payload(mimeType,headers,body/data,parts)`;
      const msgData = await fetchWithAuth(messageUrl, accessToken);
      return { msg, msgData };
    } catch (err) {
      console.error(`Failed to fetch message details for ${msg.id}:`, err);
      return null;
    }
  });

  const fetchedMessages = (await Promise.all(messagePromises)).filter(m => m !== null);

  // Step 2: Check metadata fetching
  console.log("Messages fetched:", fetchedMessages.length);

  // 2. Perform local promotional/newsletter filtering first
  const validMessages = [];
  for (const { msg, msgData } of fetchedMessages) {
    const headers = msgData.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const snippet = msgData.snippet || '';
    const bodyText = getEmailBody(msgData.payload);
    const combinedSnippet = (snippet + '\n' + bodyText).substring(0, 2000);

    if (isPromotionalOrAlert(from, subject, combinedSnippet)) {
      console.log(`Privacy Filter: Discarded promotional/newsletter/job-alert email: "${subject}"`);
      continue;
    }
    validMessages.push({ msg, msgData, subject, from, snippet: combinedSnippet });
  }

  // 3. Classify remaining emails in parallel using Promise.all
  const classifyPromises = validMessages.map(async ({ msg, msgData, subject, from, snippet }) => {
    try {
      const fromEmail = extractEmailAddress(from);
      const emailTimestamp = msgData.internalDate ? new Date(parseInt(msgData.internalDate)).toISOString() : new Date().toISOString();

      const classification = await classifyEmail(from, subject, snippet);

      // Discard immediately if not a job email or is Unknown
      if (!classification.isJobEmail || classification.category === 'Unknown') {
        return null;
      }

      const detectedStatus = mapCategoryToStatus(classification.category);
      const fallbackDetails = extractJobDetailsFromEmail(subject, from, snippet);
      
      const mergedDetails = {
        ...classification,
        companyName: classification.companyName || fallbackDetails.company,
        jobTitle: classification.jobTitle || fallbackDetails.role,
        recruiterEmail: classification.recruiterEmail || fromEmail
      };

      let company = mergedDetails.companyName;
      let role = mergedDetails.jobTitle;

      // Privacy guard fallback: if company name is Unknown or doesn't match active dashboard companies, search subject & snippet
      const activeCompanies = Array.from(new Set(currentJobs.map(job => job.company.trim()).filter(Boolean)));
      const hasActiveCompanyMatch = company && activeCompanies.some(c => isFuzzyMatch(c, company));

      if (!hasActiveCompanyMatch) {
        const combinedTextForCompany = `${from} ${subject} ${snippet}`.toLowerCase();
        for (const actComp of activeCompanies) {
          if (combinedTextForCompany.includes(actComp.toLowerCase())) {
            company = actComp;
            mergedDetails.companyName = actComp;
            break;
          }
        }
      }

      if (!company || company === 'Unknown Company') {
        return null;
      }

      // Match against current dashboard applications
      const { match, score, reason } = findBestMatchingJob(mergedDetails, currentJobs);

      return {
        msg,
        msgData,
        subject,
        from,
        snippet,
        fromEmail,
        emailTimestamp,
        classification,
        detectedStatus,
        mergedDetails,
        company,
        role,
        match,
        score,
        reason
      };
    } catch (e) {
      console.error(`Error classifying email:`, e);
      return null;
    }
  });

  const processedResults = (await Promise.all(classifyPromises)).filter(r => r !== null);

  // Step 3: Check AI classification
  console.log("Job emails:", processedResults.length);

  const updatesApplied = [];
  const pendingReviews = [];
  const processedKeys = new Set(); // Prevent duplicate updates in the same sync run

  // 4. Sequential loop to safely commit updates to Firestore and gather reviews
  for (const result of processedResults) {
    const {
      msg,
      msgData,
      subject,
      from,
      snippet,
      fromEmail,
      emailTimestamp,
      classification,
      detectedStatus,
      mergedDetails,
      company,
      role,
      match,
      score,
      reason
    } = result;

    // Print confidence score log to console for debugging during development
    console.log(`[Gmail Sync Debug] Subject: "${subject}" | Company: "${company}" | Role: "${role}" | Best Match: ${match ? `${match.company} - ${match.role}` : 'None'} | Score: ${score} | Reason: ${reason}`);

    if (match && score >= 0.7) {
      const uniqueKey = `${company.toLowerCase()}_${role.toLowerCase()}`;
      if (processedKeys.has(uniqueKey)) continue;
      processedKeys.add(uniqueKey);

      // Prevent duplicate updates if this specific email was already processed for this job
      const processedEmailIds = match.processedEmailIds || [];
      if (processedEmailIds.includes(msg.id)) {
        console.log(`Skipping message ${msg.id} - already processed for job ${match.id}`);
        continue;
      }

      // Extract attachments from msgData
      const attachments = [];
      const parts = msgData.payload?.parts || [];
      
      function findAttachmentsInParts(partsList) {
        for (const part of partsList) {
          if (part.filename && part.body && part.body.attachmentId) {
            attachments.push({
              attachmentId: part.body.attachmentId,
              messageId: msg.id,
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size
            });
          }
          if (part.parts) {
            findAttachmentsInParts(part.parts);
          }
        }
      }
      findAttachmentsInParts(parts);

      const statusChanged = match.status !== detectedStatus && 
                            isValidStatusTransition(match.status, detectedStatus);
      
      const hasNewRecruiter = (mergedDetails.recruiterName && match.recruiterName !== mergedDetails.recruiterName) ||
                             (mergedDetails.recruiterEmail && match.recruiterEmail !== mergedDetails.recruiterEmail);
      const hasNewInterviewDate = (mergedDetails.interviewDate && match.interviewDate !== mergedDetails.interviewDate);
      const hasNewAttachments = attachments.length > 0 && (!match.attachments || match.attachments.length < attachments.length);

      if (statusChanged || hasNewRecruiter || hasNewInterviewDate || hasNewAttachments) {
        const updateData = {
          processedEmailIds: [...processedEmailIds, msg.id]
        };
        
        if (statusChanged) {
          updateData.status = detectedStatus;
          updateData.notes = `${match.notes || ''}\nAutomatically updated to ${detectedStatus} via Privacy-First Gmail Sync (Match Confidence: ${(score * 100).toFixed(0)}%).\nEmail Subject: ${subject}`;
        }
        
        // Save rejection details if Rejected
        if (detectedStatus === 'Rejected') {
          updateData.rejectionTimestamp = emailTimestamp;
          updateData.rejectionEmailText = `Subject: ${subject}\nFrom: ${from}\nDate: ${emailTimestamp}\n\n${snippet}`;
        }

        // Add to activities timeline history log
        const existingActivities = match.activities || [];
        const newActivity = {
          id: `activity_${Date.now()}_${msg.id}`,
          type: 'status_update',
          status: detectedStatus,
          timestamp: new Date().toISOString(),
          message: detectedStatus === 'Rejected'
            ? `Rejection received from ${company} on ${new Date(emailTimestamp).toLocaleString()} (Confidence: ${(score * 100).toFixed(0)}%). Email subject: "${subject}"`
            : `Status updated to ${detectedStatus} via Gmail Sync (Confidence: ${(score * 100).toFixed(0)}%). Email subject: "${subject}"`
        };
        updateData.activities = [...existingActivities, newActivity];
        
        if (mergedDetails.recruiterName) updateData.recruiterName = mergedDetails.recruiterName;
        if (mergedDetails.recruiterEmail) updateData.recruiterEmail = mergedDetails.recruiterEmail;
        if (mergedDetails.interviewDate) updateData.interviewDate = mergedDetails.interviewDate;
        if (mergedDetails.referenceNumber) updateData.referenceNumber = mergedDetails.referenceNumber;

        // Merge and save attachments
        if (attachments.length > 0) {
          const existingAttachments = match.attachments || [];
          const mergedAttachments = [...existingAttachments];
          for (const att of attachments) {
            if (!mergedAttachments.some(x => x.attachmentId === att.attachmentId)) {
              mergedAttachments.push(att);
            }
          }
          updateData.attachments = mergedAttachments;
        }

        console.log("BEFORE updateJob", {
          jobId: match.id,
          currentStatus: match.status,
          newStatus: detectedStatus,
          updateData
        });

        await updateJob(userId, match.id, updateData);

        console.log("AFTER updateJob", match.id);
        updatesApplied.push({
          company: match.company,
          role: match.role,
          fromStatus: match.status,
          toStatus: statusChanged ? detectedStatus : match.status,
          score: score,
          reason: reason,
          type: 'updated'
        });
      }
    } else {
      // Flag email for manual review ONLY if there is some matching connection (score > 0.0)
      // Completely unmatched mails (score = 0.0) are ignored silently to prevent UI clutter.
      if (score > 0.0) {
        console.warn(`[Gmail Sync Flag] Low matching confidence (${(score * 100).toFixed(0)}%): No job card updated for email "${subject}"`);
        pendingReviews.push({
          messageId: msg.id,
          subject: subject,
          from: from,
          companyName: company,
          jobTitle: role,
          confidence: score,
          reason: reason,
          category: classification.category,
          snippet: snippet,
          timestamp: emailTimestamp
        });
      } else {
        console.log(`Privacy Filter: Ignored and hid job email from "${company}" (${role}) - score is 0%`);
      }
    }
  }

  // Step 4: Check application matching
  const matchedApps = processedResults.filter(r => r.match && r.score >= 0.7);
  console.log("Matched jobs:", matchedApps.length);

  return {
    updatedCount: updatesApplied.length,
    fetchedMessages: data.messages?.length || 0,
    classifiedMessages: processedResults.length,
    matchedApplications: matchedApps.length,
    updates: updatesApplied,
    pendingReviews: pendingReviews
  };
}
