// JavaScript for JobTracker Sync Popup Settings

document.addEventListener('DOMContentLoaded', async () => {
  const tokenInput = document.getElementById('token-input');
  const backendInput = document.getElementById('backend-input');
  const saveBtn = document.getElementById('save-btn');
  const badge = document.getElementById('status-badge');
  const historySection = document.getElementById('history-section');
  const historyList = document.getElementById('history-list');

  // Load existing credentials
  chrome.storage.local.get(['userId', 'backendUrl', 'syncedHistory'], (data) => {
    if (data.userId) {
      tokenInput.value = data.userId;
      badge.textContent = 'Connected';
      badge.className = 'badge connected';
      saveBtn.textContent = 'Disconnect Account';
      saveBtn.style.backgroundColor = '#ef4444'; // Red for disconnect
      historySection.style.display = 'block';
    } else {
      badge.textContent = 'Disconnected';
      badge.className = 'badge disconnected';
      saveBtn.textContent = 'Connect Account';
      saveBtn.style.backgroundColor = '#3b82f6';
      historySection.style.display = 'none';
    }

    if (data.backendUrl) {
      backendInput.value = data.backendUrl;
    }

    // Render local cached history
    if (data.syncedHistory && data.syncedHistory.length > 0) {
      renderHistoryList(data.syncedHistory);
    } else if (data.userId) {
      fetchSyncedHistory(data.userId, data.backendUrl || 'http://localhost:5001');
    }
  });

  // Handle Save/Connect button click
  saveBtn.addEventListener('click', async () => {
    chrome.storage.local.get('userId', async (data) => {
      if (data.userId) {
        // Disconnect Flow
        await chrome.storage.local.remove(['userId', 'syncedHistory']);
        tokenInput.value = '';
        badge.textContent = 'Disconnected';
        badge.className = 'badge disconnected';
        saveBtn.textContent = 'Connect Account';
        saveBtn.style.backgroundColor = '#3b82f6';
        historySection.style.display = 'none';
        historyList.innerHTML = '';
      } else {
        // Connect Flow
        const token = tokenInput.value.trim();
        const backend = backendInput.value.trim() || 'http://localhost:5001';

        if (!token) {
          alert('Please enter your Connection Token (available in the dashboard Sync Center).');
          return;
        }

        saveBtn.textContent = 'Connecting...';
        saveBtn.disabled = true;

        try {
          // Verify endpoint is active by querying applications
          const response = await fetch(`${backend}/api/sync/applications?userId=${token}`);
          if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
          }
          const result = await response.json();

          // Save credentials
          await chrome.storage.local.set({
            userId: token,
            backendUrl: backend,
            syncedHistory: result.applications ? result.applications.slice(0, 5) : []
          });

          badge.textContent = 'Connected';
          badge.className = 'badge connected';
          saveBtn.textContent = 'Disconnect Account';
          saveBtn.style.backgroundColor = '#ef4444';
          saveBtn.disabled = false;
          historySection.style.display = 'block';

          if (result.applications) {
            renderHistoryList(result.applications.slice(0, 5));
          }

        } catch (error) {
          console.error(error);
          alert(`Failed to connect. Please ensure the backend is running and the token is valid.\nError: ${error.message}`);
          saveBtn.textContent = 'Connect Account';
          saveBtn.disabled = false;
        }
      }
    });
  });

  // Fetch recent synced applications from Express server
  async function fetchSyncedHistory(userId, backendUrl) {
    try {
      const response = await fetch(`${backendUrl}/api/sync/applications?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.applications) {
          const recent = data.applications.slice(0, 5);
          await chrome.storage.local.set({ syncedHistory: recent });
          renderHistoryList(recent);
        }
      }
    } catch (e) {
      console.warn('Could not fetch online history, showing local cache:', e);
    }
  }

  // Render recent sync list
  function renderHistoryList(apps) {
    historyList.innerHTML = '';
    if (!apps || apps.length === 0) {
      historyList.innerHTML = '<li style="font-size: 11px; color: #64748b; padding: 4px;">No applications synced yet.</li>';
      return;
    }

    apps.forEach(app => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <div>
          <div class="history-company">${app.company}</div>
          <div class="history-role">${app.role}</div>
        </div>
        <span class="history-status">${app.status}</span>
      `;
      historyList.appendChild(li);
    });
  }
});
