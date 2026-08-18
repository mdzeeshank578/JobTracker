// Background Service Worker for JobTracker Sync Extension
// Ephemeral and stateless. Uses chrome.storage for credentials persistence.

const DEFAULT_BACKEND_URL = 'http://localhost:5001';
const MOCK_NOTIFICATION_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Listen to messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'syncJob') {
    handleSyncJob(message.jobData, sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'checkConnection') {
    handleCheckConnection(sendResponse);
    return true;
  }
});

// Perform synchronization call to Express Backend
async function handleSyncJob(jobData, sendResponse) {
  try {
    const config = await chrome.storage.local.get(['userId', 'backendUrl']);
    const userId = config.userId;
    const backendUrl = config.backendUrl || DEFAULT_BACKEND_URL;

    if (!userId) {
      console.warn('Sync failed: Extension is not connected to a user account.');
      showNotification('sync-error-not-connected', 'JobTracker: Connect Account', 'Please open the extension popup and input your Connection Token to sync applications.', true);
      sendResponse({ success: false, error: 'Not connected' });
      return;
    }

    console.log(`Syncing job for user ${userId} at ${backendUrl}/api/sync/extension:`, jobData);

    const response = await fetch(`${backendUrl}/api/sync/extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        ...jobData
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sync Server returned ${response.status}: ${errText}`);
    }

    const result = await response.json();
    console.log('Sync response successful:', result);

    // Show success notification
    showNotification(
      `sync-success-${Date.now()}`,
      'Job Synced Automatically! 🚀',
      `Successfully tracked "${jobData.role}" at "${jobData.company}"`
    );

    sendResponse({ success: true, data: result.data });
  } catch (error) {
    console.error('Job sync failed:', error);
    showNotification(
      'sync-error-general',
      'JobTracker Sync Failed ❌',
      `Error connecting to server: ${error.message}`
    );
    sendResponse({ success: false, error: error.message });
  }
}

// Check if connection token is set
async function handleCheckConnection(sendResponse) {
  try {
    const config = await chrome.storage.local.get(['userId', 'backendUrl']);
    sendResponse({
      connected: !!config.userId,
      userId: config.userId || null,
      backendUrl: config.backendUrl || DEFAULT_BACKEND_URL
    });
  } catch (e) {
    sendResponse({ connected: false, error: e.message });
  }
}

// Display System Notification using Base64 inline icon to prevent missing icon crashes
function showNotification(notificationId, title, message, isAlert = false) {
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: MOCK_NOTIFICATION_ICON,
    title: title,
    message: message,
    priority: isAlert ? 2 : 0
  });
}
