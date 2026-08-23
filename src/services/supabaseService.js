// Client Service to communicate with Node.js Express Sync Backend
// Operates on http://localhost:5001

const BACKEND_URL = 'http://localhost:5001';

export const supabaseService = {
  /**
   * Fetch connected Gmail/Outlook accounts from backend
   */
  async fetchConnectedAccounts(userId) {
    if (!userId) return [];
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/status?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      return data.connectedAccounts || [];
    } catch (error) {
      console.warn('Backend server not connected. Falling back to local storage cache.', error.message);
      // Retrieve accounts from localStorage if backend is down
      const cached = localStorage.getItem(`jobtracker_connected_accounts_${userId}`);
      return cached ? JSON.parse(cached) : [];
    }
  },

  /**
   * Disconnect Gmail or Outlook account
   */
  async disconnectAccount(userId, provider, email) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/disconnect`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, provider, email })
      });
      if (!response.ok) throw new Error('Disconnect request failed');
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.warn('Backend connection failed. Disconnecting locally.', error.message);
      // Disconnect locally
      const cached = localStorage.getItem(`jobtracker_connected_accounts_${userId}`);
      if (cached) {
        const accounts = JSON.parse(cached).filter(acc => !(acc.provider === provider && acc.email === email));
        localStorage.setItem(`jobtracker_connected_accounts_${userId}`, JSON.stringify(accounts));
      }
      return true;
    }
  },

  /**
   * Trigger AI scan for Gmail or Outlook account
   */
  async triggerEmailSync(userId, provider, email) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/sync/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, provider, email })
      });
      if (!response.ok) throw new Error('Email sync failed');
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to trigger email sync:', error);
      throw error;
    }
  },

  /**
   * Fetch recent sync logs
   */
  async fetchSyncLogs(userId) {
    if (!userId) return [];
    try {
      const response = await fetch(`${BACKEND_URL}/api/sync/logs?userId=${userId}`);
      if (!response.ok) throw new Error('Logs fetch failed');
      const data = await response.json();
      return data.logs || [];
    } catch (error) {
      console.warn('Could not connect to backend logs. Loading cached local logs.');
      const cachedLogs = localStorage.getItem(`jobtracker_sync_logs_${userId}`);
      return cachedLogs ? JSON.parse(cachedLogs) : [];
    }
  },

  /**
   * Fetch applications stored in the backend (Supabase / JSON DB)
   */
  async fetchSyncedApplications(userId) {
    if (!userId) return [];
    try {
      const response = await fetch(`${BACKEND_URL}/api/sync/applications?userId=${userId}`);
      if (!response.ok) throw new Error('Applications fetch failed');
      const data = await response.json();
      return data.applications || [];
    } catch (error) {
      console.warn('Could not fetch synced applications from backend.');
      return [];
    }
  },

  /**
   * Smart Sync Bridge:
   * Compares synced applications from Supabase with Firestore applications.
   * Automatically adds missing applications or updates outdated statuses in Firestore.
   */
  async bridgeSyncedApplications(userId, currentJobs, addJobHelper, updateJobHelper) {
    if (!userId || !currentJobs) return { added: 0, updated: 0 };
    
    try {
      const syncedApps = await this.fetchSyncedApplications(userId);
      if (syncedApps.length === 0) return { added: 0, updated: 0 };

      let addedCount = 0;
      let updatedCount = 0;

      for (const app of syncedApps) {
        // Find match in current Firestore jobs
        const match = currentJobs.find(
          job => job.company.toLowerCase().trim() === app.company.toLowerCase().trim() &&
                 (job.role || '').toLowerCase().trim() === app.role.toLowerCase().trim()
        );

        if (match) {
          // If status differs, update in Firestore to keep in sync
          if (match.status !== app.status) {
            await updateJobHelper(userId, match.id, {
              status: app.status,
              notes: app.notes || match.notes,
              jobUrl: app.job_url || match.jobUrl || match.job_url
            });
            updatedCount++;
          }
        } else {
          // If not present in Firestore, import it!
          await addJobHelper(userId, {
            company: app.company,
            role: app.role,
            status: app.status,
            dateApplied: app.date_applied || new Date().toISOString().split('T')[0],
            deadline: app.deadline || null,
            notes: app.notes || `Synced automatically from ${app.source}.`,
            jobUrl: app.job_url || '',
            location: app.location || '',
            resumeUrl: null,
            coverLetterUrl: null
          });
          addedCount++;
        }
      }

      return { added: addedCount, updated: updatedCount };
    } catch (error) {
      console.error('Error executing Sync Bridge:', error);
      return { added: 0, updated: 0 };
    }
  }
};
