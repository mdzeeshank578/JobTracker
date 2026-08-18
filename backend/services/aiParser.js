import fetch from 'node-fetch'; // or use native fetch if supported, node-fetch is standard in older node, but in Node 18+ global fetch is available. Let's use global fetch.

/**
 * AI Email Parser Service
 * Extracts structured job application details from email text
 */
export async function parseEmailWithAI(subject, body, senderEmail = '') {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const systemPrompt = `You are an AI Email Parsing Engine for a job application tracker.
Analyze the email subject and body provided and extract the following structured details as a JSON object:
{
  "company": "Company Name",
  "role": "Job Title / Position",
  "status": "Applied" | "Interviewing" | "Assessment" | "Rejected" | "Offer" | "Accepted",
  "location": "Job Location (e.g. Remote, New York, NY) or null if unknown",
  "jobUrl": "Application or Job URL if explicitly mentioned in email, otherwise null",
  "snippet": "A brief 1-sentence summary of the email status (e.g., 'Received application confirmation' or 'Invited to first-round technical interview')"
}

Guidelines for status mapping:
- "Applied": Application received, confirmation of submission, thank you for applying.
- "Interviewing": Request to schedule a call, interview invitation, calendar link.
- "Assessment": Code test, coding challenge, design challenge, hackerrank, online test invitation.
- "Rejected": Rejection, unfortunately not moving forward, other candidates selected.
- "Offer": Offer letter, congratulations we want to extend an offer.
- "Accepted": User accepted the offer (rare in inbound email).

Return ONLY the raw JSON object, without any markdown formatting or explanation.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Subject: ${subject}\nSender: ${senderEmail}\nBody:\n${body}` }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        return {
          success: true,
          company: parsed.company || 'Unknown Company',
          role: parsed.role || 'Job Position',
          status: parsed.status || 'Applied',
          location: parsed.location || null,
          jobUrl: parsed.jobUrl || null,
          snippet: parsed.snippet || 'Parsed via AI email parser',
          method: 'AI (OpenAI)'
        };
      } else {
        const errText = await response.text();
        console.warn('OpenAI API Parse failed, falling back to heuristics:', errText);
      }
    } catch (e) {
      console.warn('AI Parsing failed due to error, falling back to heuristics:', e.message);
    }
  }

  // --- HEURISTIC FALLBACK PARSER ---
  return parseEmailWithHeuristics(subject, body, senderEmail);
}

/**
 * Heuristic/Regex-based fallback parser
 */
function parseEmailWithHeuristics(subject, body, senderEmail) {
  const combinedText = `${senderEmail} ${subject} ${body}`.toLowerCase();
  
  // 1. Determine Status
  let status = 'Applied';
  let snippet = 'Received application confirmation';

  if (combinedText.includes('unfortunately') || 
      combinedText.includes('not moving forward') || 
      combinedText.includes('other candidates') || 
      combinedText.includes('unable to offer') || 
      combinedText.includes('thank you for your interest')) {
    status = 'Rejected';
    snippet = 'Received rejection email';
  } else if (combinedText.includes('congratulations') && 
            (combinedText.includes('offer letter') || combinedText.includes('pleased to offer'))) {
    status = 'Offer';
    snippet = 'Received job offer!';
  } else if (combinedText.includes('assessment') || 
             combinedText.includes('coding challenge') || 
             combinedText.includes('hackerrank') || 
             combinedText.includes('online test')) {
    status = 'Assessment';
    snippet = 'Technical assessment assigned';
  } else if (combinedText.includes('interview') || 
             combinedText.includes('schedule') || 
             combinedText.includes('availability') || 
             combinedText.includes('chat') || 
             combinedText.includes('speak with')) {
    status = 'Interviewing';
    snippet = 'Invited to schedule interview';
  }

  // 2. Extract Company
  let company = 'Unknown Company';
  // Check common ATS formats or subject headers
  // Subject: "Application to [Company]" or "[Company] Application Update"
  const companyRegexes = [
    /application\s+(?:to|at|for)\s+([a-zA-Z0-9\s\.\,\-\_]+)(?:\b|$)/i,
    /([a-zA-Z0-9\s\.\,\-\_]+)\s+application\s+(?:update|received|confirmation)/i,
    /thank\s+you\s+for\s+applying\s+to\s+([a-zA-Z0-9\s\.\,\-\_]+)(?:\b|$)/i,
    /careers\s+at\s+([a-zA-Z0-9\s\.\,\-\_]+)/i
  ];

  for (const regex of companyRegexes) {
    const match = subject.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Clean up common suffix
      if (candidate.length > 1 && candidate.length < 50) {
        company = candidate;
        break;
      }
    }
  }

  // If still unknown, try parsing the sender domain
  if (company === 'Unknown Company' && senderEmail && senderEmail.includes('@')) {
    const domain = senderEmail.split('@')[1];
    const domainParts = domain.split('.');
    if (domainParts.length >= 2) {
      const cleanDomain = domainParts[0];
      const excludedDomains = ['gmail', 'outlook', 'yahoo', 'hotmail', 'protonmail', 'icloud', 'mail'];
      if (!excludedDomains.includes(cleanDomain)) {
        company = cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
      }
    }
  }

  // 3. Extract Role
  let role = 'Software Engineer'; // Default
  const roleRegexes = [
    /(software engineer|full\s*stack|frontend|backend|product manager|ui\/ux|designer|developer|data scientist|analyst)/i
  ];

  const roleMatch = `${subject} ${body}`.match(roleRegexes[0]);
  if (roleMatch && roleMatch[1]) {
    role = roleMatch[1].split('\n')[0].trim();
    // Capitalize words
    role = role.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return {
    success: true,
    company,
    role,
    status,
    location: null,
    jobUrl: null,
    snippet,
    method: 'Heuristic Parser (Fallback)'
  };
}
