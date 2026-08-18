import express from 'express';
import { dbService } from '../services/db.js';
import { parseEmailWithAI } from '../services/aiParser.js';

const router = express.Router();

// 1. Chrome Extension Sync Endpoint
router.post('/extension', async (req, res) => {
  const { userId, company, role, status, jobUrl, location, snippet, dateApplied } = req.body;

  if (!userId || !company || !role) {
    return res.status(400).json({ error: 'userId, company, and role are required fields.' });
  }

  try {
    // Check if job application already exists in the database
    const currentApps = await dbService.getApplications(userId);
    const existingJob = currentApps.find(
      app => app.company.toLowerCase().trim() === company.toLowerCase().trim() &&
             app.role.toLowerCase().trim() === role.toLowerCase().trim()
    );

    let result;
    if (existingJob) {
      // Update existing application
      const updates = {
        updated_at: new Date().toISOString()
      };
      if (jobUrl) updates.job_url = jobUrl;
      if (location) updates.location = location;
      if (snippet) updates.snippet = snippet;

      result = await dbService.updateApplication(userId, company, role, status || 'Applied', updates);
      await dbService.addSyncLog(
        userId, 
        'extension_sync', 
        'success', 
        `Updated application for ${company} (${role}) to ${status || 'Applied'} via Extension.`
      );
    } else {
      // Add new application
      const record = {
        company,
        role,
        status: status || 'Applied',
        dateApplied: dateApplied || new Date().toISOString().split('T')[0],
        jobUrl: jobUrl || '',
        location: location || '',
        source: 'Chrome Extension',
        snippet: snippet || 'Captured automatically from browser application submit.'
      };
      result = await dbService.addApplication(userId, record);
      await dbService.addSyncLog(
        userId, 
        'extension_sync', 
        'success', 
        `Imported new job application: ${company} - ${role} via Extension.`
      );
    }

    res.json({
      success: true,
      message: 'Job application synced successfully.',
      data: result
    });
  } catch (error) {
    console.error('Extension Sync Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Email Scan & Sync Trigger Endpoint
router.post('/email', async (req, res) => {
  const { userId, provider, email } = req.body;

  if (!userId || !provider || !email) {
    return res.status(400).json({ error: 'userId, provider, and email are required.' });
  }

  try {
    let account = await dbService.getSyncAccount(userId, provider, email);
    
    const isGoogleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const isMicrosoftConfigured = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
    const providerConfigured = provider === 'google' ? isGoogleConfigured : isMicrosoftConfigured;

    if (!account && (!providerConfigured || email.startsWith('mock_'))) {
      account = await dbService.saveSyncAccount(userId, provider, email, {
        access_token: 'mock_access_token_123',
        refresh_token: 'mock_refresh_token_123',
        expiry_date: new Date(Date.now() + 3600000).toISOString()
      });
    }
    
    if (!account) {
      return res.status(404).json({ error: 'Connected account details not found. Please connect first.' });
    }

    const updates = [];
    const logs = [];

    // Simulate scanning or do actual scanning if configured
    const isMockAccount = !providerConfigured || email.startsWith('mock_') || (account.access_token && account.access_token.startsWith('mock_'));

    if (isMockAccount) {
      // MOCK SCANNING FLOW
      console.log(`[Email Scan] Scanning mock emails for ${email}`);

      // List of simulated job emails
      const mockEmails = [
        {
          id: 'msg_101',
          from: 'jobs@vercel.com',
          subject: 'Application Received: Full Stack Developer at Vercel',
          body: `Hi Sonia, thank you for applying to the Full Stack Developer position at Vercel. We have successfully received your application. Our recruiting team will review your application and portfolio shortly and follow up if there is a match.`
        },
        {
          id: 'msg_102',
          from: 'recruiting@stripe.com',
          subject: 'Interview Schedule - Stripe Software Engineer',
          body: `Hi Sonia, we are impressed by your background and would love to schedule a 45-minute technical coding interview to discuss your experience. Please click this Calendly link to schedule your slot with our engineering team: https://calendly.com/stripe-tech/interview`
        },
        {
          id: 'msg_103',
          from: 'careers@openai.com',
          subject: 'Job Offer - Senior Frontend Engineer at OpenAI',
          body: `Dear Sonia, we are thrilled to offer you the position of Senior Frontend Engineer at OpenAI. We were highly impressed by your experience with modern React layouts and AI integrations. Please review the attached compensation sheet and return a signed copy by next Monday.`
        },
        {
          id: 'msg_104',
          from: 'no-reply@google.com',
          subject: 'Your Application to Google',
          body: `Dear Sonia, thank you for your interest in joining Google. We appreciated learning more about your background. Unfortunately, we are unable to move forward with your application for the Software Engineer role at this time. We will keep your profile in our system for future opportunities.`
        }
      ];

      // Randomly select 1 to 2 mock emails to process per sync so it feels dynamic
      const countToProcess = Math.floor(Math.random() * 2) + 2; // 2 or 3 emails
      const shuffled = mockEmails.sort(() => 0.5 - Math.random());
      const selectedEmails = shuffled.slice(0, countToProcess);

      for (const mail of selectedEmails) {
        // Run AI Email Parser
        const parsed = await parseEmailWithAI(mail.subject, mail.body, mail.from);
        
        if (parsed.success) {
          // Check if application already exists
          const currentApps = await dbService.getApplications(userId);
          const existingJob = currentApps.find(
            app => app.company.toLowerCase().trim() === parsed.company.toLowerCase().trim() &&
                   app.role.toLowerCase().trim() === parsed.role.toLowerCase().trim()
          );

          if (existingJob) {
            if (existingJob.status !== parsed.status) {
              await dbService.updateApplication(userId, parsed.company, parsed.role, parsed.status, {
                snippet: parsed.snippet,
                notes: `Automatically updated status from ${existingJob.status} to ${parsed.status} via AI Email Sync.`
              });
              const msg = `AI synced update: ${parsed.company} status changed to ${parsed.status}.`;
              await dbService.addSyncLog(userId, 'email_sync', 'success', msg, parsed);
              updates.push({ company: parsed.company, role: parsed.role, status: parsed.status, type: 'updated' });
            }
          } else {
            // Import new job application
            const record = {
              company: parsed.company,
              role: parsed.role,
              status: parsed.status,
              source: 'Gmail Sync',
              snippet: parsed.snippet,
              notes: `Automatically imported via AI Email Sync on ${new Date().toLocaleDateString()}`
            };
            await dbService.addApplication(userId, record);
            const msg = `AI synced import: Added new application for ${parsed.company} - ${parsed.role} as ${parsed.status}.`;
            await dbService.addSyncLog(userId, 'email_sync', 'success', msg, parsed);
            updates.push({ company: parsed.company, role: parsed.role, status: parsed.status, type: 'imported' });
          }
        }
      }
    } else {
      // --- LIVE SCANNING FLOW (Google Gmail API or Microsoft Graph API) ---
      // Real API parsing implementation
      if (provider === 'google') {
        const accessToken = account.access_token;
        // Fetch last 10 email messages from Gmail API...
        // For simplicity, we fallback to heuristic if access token is invalid
        const gmailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=interview+OR+offer+OR+apply+OR+rejection`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (!gmailResponse.ok) {
          throw new Error('Gmail API Token expired or invalid. Please reconnect account.');
        }

        const gmailData = await gmailResponse.json();
        if (gmailData.messages) {
          for (const msg of gmailData.messages) {
            const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            const detail = await detailResponse.json();
            
            const headers = detail.payload?.headers || [];
            const subject = headers.find(h => h.name === 'Subject')?.value || '';
            const from = headers.find(h => h.name === 'From')?.value || '';
            const snippet = detail.snippet || '';

            // Run AI Parse
            const parsed = await parseEmailWithAI(subject, snippet, from);
            if (parsed.success && parsed.company !== 'Unknown Company') {
              // Upsert application logic...
              const currentApps = await dbService.getApplications(userId);
              const existingJob = currentApps.find(
                app => app.company.toLowerCase().trim() === parsed.company.toLowerCase().trim() &&
                       app.role.toLowerCase().trim() === parsed.role.toLowerCase().trim()
              );
              
              if (existingJob) {
                if (existingJob.status !== parsed.status) {
                  await dbService.updateApplication(userId, parsed.company, parsed.role, parsed.status, { snippet: parsed.snippet });
                  updates.push({ company: parsed.company, role: parsed.role, status: parsed.status, type: 'updated' });
                }
              } else {
                await dbService.addApplication(userId, {
                  company: parsed.company,
                  role: parsed.role,
                  status: parsed.status,
                  source: 'Gmail Sync',
                  snippet: parsed.snippet
                });
                updates.push({ company: parsed.company, role: parsed.role, status: parsed.status, type: 'imported' });
              }
            }
          }
        }
      } else {
        // Outlook Live Graph API implementation...
        const accessToken = account.access_token;
        const outlookResponse = await fetch(`https://graph.microsoft.com/v1.0/me/messages?$top=5&$search="subject:interview OR subject:offer OR subject:apply OR subject:rejection"`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!outlookResponse.ok) {
          throw new Error('Outlook Graph API Access token invalid. Please reconnect.');
        }

        const outlookData = await outlookResponse.json();
        if (outlookData.value) {
          for (const msg of outlookData.value) {
            const subject = msg.subject || '';
            const from = msg.from?.emailAddress?.address || '';
            const bodyPreview = msg.bodyPreview || '';

            const parsed = await parseEmailWithAI(subject, bodyPreview, from);
            if (parsed.success && parsed.company !== 'Unknown Company') {
              const currentApps = await dbService.getApplications(userId);
              const existingJob = currentApps.find(
                app => app.company.toLowerCase().trim() === parsed.company.toLowerCase().trim() &&
                       app.role.toLowerCase().trim() === parsed.role.toLowerCase().trim()
              );
              
              if (existingJob) {
                if (existingJob.status !== parsed.status) {
                  await dbService.updateApplication(userId, parsed.company, parsed.role, parsed.status, { snippet: parsed.snippet });
                  updates.push({ company: parsed.company, role: parsed.role, status: parsed.status, type: 'updated' });
                }
              } else {
                await dbService.addApplication(userId, {
                  company: parsed.company,
                  role: parsed.role,
                  status: parsed.status,
                  source: 'Outlook Sync',
                  snippet: parsed.snippet
                });
                updates.push({ company: parsed.company, role: parsed.role, status: parsed.status, type: 'imported' });
              }
            }
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Sync completed. Scan parsed email logs.`,
      updates
    });
  } catch (error) {
    console.error('Email Sync Error:', error);
    await dbService.addSyncLog(userId, `${provider}_sync`, 'error', `Failed to sync ${provider}: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Sync Logs Endpoint
router.get('/logs', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  try {
    const logs = await dbService.getSyncLogs(userId);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get Synced Applications Endpoint
router.get('/applications', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  try {
    const apps = await dbService.getApplications(userId);
    res.json({ applications: apps });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
