import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, Layers, Check, Copy, AlertTriangle, Key, ShieldCheck, Chrome, Bell, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabaseService } from '../../services/supabaseService';
import { addJob, updateJob } from '../../services/db';
import { syncEmailsWithJobs } from '../../services/gmail';
import './SyncCenter.css';

export default function SyncCenter({ jobs }) {
  const { currentUser, connectAndGetGmailToken } = useAuth();
  const userId = currentUser ? currentUser.uid : '';

  const [accounts, setAccounts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingProvider, setSyncingProvider] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [syncAlerts, setSyncAlerts] = useState(localStorage.getItem('jobtracker_sync_alerts') === 'true');
  const [gmailSyncEnabled, setGmailSyncEnabled] = useState(localStorage.getItem('jobtracker_gmail_sync_enabled') !== 'false');
  const [backendUrl, setBackendUrl] = useState('http://localhost:5001');

  // Load status and logs on mount
  useEffect(() => {
    if (!userId) return;
    loadSyncData();
    
    // Setup log polling
    const interval = setInterval(loadSyncData, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadSyncData = async () => {
    try {
      const connectedAccs = await supabaseService.fetchConnectedAccounts(userId);
      setAccounts(connectedAccs);
      
      const syncLogs = await supabaseService.fetchSyncLogs(userId);
      setLogs(syncLogs);
    } catch (e) {
      console.error('Failed to load sync dashboard data', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect provider redirection
  const handleConnectProvider = (provider) => {
    const userEmail = currentUser ? currentUser.email : '';
    window.location.href = `${backendUrl}/api/auth/connect/${provider}?userId=${userId}&email=${encodeURIComponent(userEmail)}`;
  };

  // Disconnect provider endpoint
  const handleDisconnectProvider = async (provider, email) => {
    if (window.confirm(`Are you sure you want to disconnect your ${provider} account (${email})?`)) {
      try {
        const success = await supabaseService.disconnectAccount(userId, provider, email);
        if (success) {
          alert(`Successfully disconnected ${provider} account.`);
          loadSyncData();
        }
      } catch (error) {
        alert(`Failed to disconnect: ${error.message}`);
      }
    }
  };

  // Trigger immediate AI Sync
  const handleTriggerSync = async (provider, email) => {
    if (provider === 'google' && !gmailSyncEnabled) {
      alert("Gmail Synchronization is disabled. Please enable it in the preferences below.");
      return;
    }
    setSyncingProvider(provider);
    try {
      if (provider === 'google') {
        let accessToken = localStorage.getItem(`jobtracker_google_token_${userId}`);
        let syncResult;

        try {
          if (!accessToken) {
            accessToken = await connectAndGetGmailToken();
          }
          if (!accessToken) throw new Error('Could not obtain Gmail access token.');
          
          syncResult = await syncEmailsWithJobs(accessToken, userId, jobs);
        } catch (innerError) {
          const isUnauthorized = innerError.message?.includes('401') || 
                                 innerError.message?.toLowerCase().includes('unauthorized') || 
                                 innerError.message?.toLowerCase().includes('invalid credentials') ||
                                 innerError.message?.toLowerCase().includes('token expired');
          
          if (isUnauthorized) {
            console.warn("Cached Google token expired, clearing and retrying via popup...");
            localStorage.removeItem(`jobtracker_google_token_${userId}`);
            
            accessToken = await connectAndGetGmailToken();
            if (!accessToken) throw new Error('Could not obtain Gmail access token.');
            
            syncResult = await syncEmailsWithJobs(accessToken, userId, jobs);
          } else {
            throw innerError;
          }
        }

        // Save connection locally in connected accounts
        const storageKey = `jobtracker_connected_accounts_${userId}`;
        const savedAccounts = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (!savedAccounts.some(acc => acc.provider === 'google' && acc.email === currentUser.email)) {
          savedAccounts.push({
            provider: 'google',
            email: currentUser.email,
            connectedAt: new Date().toISOString()
          });
          localStorage.setItem(storageKey, JSON.stringify(savedAccounts));
        }

        setPendingReviews(syncResult.pendingReviews || []);
        let msgStatus = '';
        if (syncResult.updatedCount > 0) {
          msgStatus = `Updated ${syncResult.updatedCount} applications!`;
        } else if (syncResult.fetchedMessages === 0) {
          msgStatus = 'No emails matched the Gmail search query.';
        } else if (syncResult.classifiedMessages === 0) {
          msgStatus = `${syncResult.fetchedMessages} emails found, but none were classified as job-related.`;
        } else if (syncResult.matchedApplications === 0) {
          msgStatus = `${syncResult.classifiedMessages} job emails found, but none matched your active applications.`;
        } else {
          msgStatus = 'Emails scanned, but no application statuses changed.';
        }

        let msg = `Gmail Sync Complete!\nScanned recent emails. ${msgStatus}`;
        if (syncResult.pendingReviews && syncResult.pendingReviews.length > 0) {
          msg += `\n\n⚠️ Flagged ${syncResult.pendingReviews.length} emails for manual review (low match confidence).`;
        }
        alert(msg);
      } else {
        const result = await supabaseService.triggerEmailSync(userId, provider, email);
        
        // Execute the Sync Bridge to move applications directly into Firestore
        const bridgeResult = await supabaseService.bridgeSyncedApplications(userId, jobs, addJob, updateJob);
        
        let message = `AI Sync Complete!\n`;
        if (bridgeResult.added > 0 || bridgeResult.updated > 0) {
          message += `🚀 Imported ${bridgeResult.added} new jobs and updated ${bridgeResult.updated} statuses.`;
        } else {
          message += `No new application updates found in recent emails.`;
        }
        alert(message);
      }
      loadSyncData();
    } catch (error) {
      alert(`Sync failed: ${error.message}`);
    } finally {
      setSyncingProvider(null);
    }
  };

  // Copy Connection Token to Clipboard
  const handleCopyToken = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle Notification Toggles
  const handleToggleAlerts = () => {
    const newVal = !syncAlerts;
    setSyncAlerts(newVal);
    localStorage.setItem('jobtracker_sync_alerts', String(newVal));
  };

  const handleToggleGmailSync = () => {
    const newVal = !gmailSyncEnabled;
    setGmailSyncEnabled(newVal);
    localStorage.setItem('jobtracker_gmail_sync_enabled', String(newVal));
  };

  const isConnected = (provider) => accounts.some(acc => acc.provider === provider);
  const getConnectedEmail = (provider) => accounts.find(acc => acc.provider === provider)?.email || '';

  return (
    <div className="sync-center-container">
      <div className="sync-center-header">
        <h2>Automatic Sync Center</h2>
        <p>Connect your email and browser extension to automatically track application confirmations, status updates, and interview schedules.</p>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="privacy-banner-card">
        <div className="privacy-banner-icon-wrapper">
          <ShieldCheck size={28} className="privacy-icon" />
        </div>
        <div className="privacy-banner-text">
          <h4>Privacy-First Guarantee</h4>
          <p>
            Your trust and privacy are our top priorities. The Gmail Sync system uses advanced client-side AI classification to only process emails related to your job search (e.g. applications, interviews, rejections, and offers). All other emails (personal, promotional, banking, or social) are strictly ignored and never read, processed, or saved.
          </p>
        </div>
      </div>

      <div className="sync-grid">
        {/* Email Connection Panel */}
        <div className="sync-card">
          <div className="sync-card-header">
            <Mail size={22} className="card-icon blue" />
            <div>
              <h3>Email Integration</h3>
              <p className="card-desc">Scan application confirmations, rejections, and interview schedules automatically.</p>
            </div>
          </div>

          <div className="sync-card-body">
            {/* Gmail Connection */}
            <div className="connection-item">
              <div className="connection-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="provider-logo google">G</span>
                  <div>
                    <span className="provider-name">Gmail / Google Workspace</span>
                    {isConnected('google') ? (
                      <div className="connection-status connected">Connected: {getConnectedEmail('google')}</div>
                    ) : (
                      <div className="connection-status disconnected">Not connected</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="connection-actions">
                {isConnected('google') ? (
                  <>
                    <button 
                      className="btn-sync" 
                      onClick={() => handleTriggerSync('google', getConnectedEmail('google'))}
                      disabled={syncingProvider !== null}
                    >
                      <RefreshCw size={14} className={syncingProvider === 'google' ? 'spin' : ''} />
                      Scan
                    </button>
                    <button 
                      className="btn-disconnect" 
                      onClick={() => handleDisconnectProvider('google', getConnectedEmail('google'))}
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button className="btn-connect" onClick={() => handleConnectProvider('google')}>Connect</button>
                )}
              </div>
            </div>

            {/* Outlook Connection */}
            <div className="connection-item">
              <div className="connection-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="provider-logo outlook">O</span>
                  <div>
                    <span className="provider-name">Outlook / Office 365</span>
                    {isConnected('outlook') ? (
                      <div className="connection-status connected">Connected: {getConnectedEmail('outlook')}</div>
                    ) : (
                      <div className="connection-status disconnected">Not connected</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="connection-actions">
                {isConnected('outlook') ? (
                  <>
                    <button 
                      className="btn-sync" 
                      onClick={() => handleTriggerSync('outlook', getConnectedEmail('outlook'))}
                      disabled={syncingProvider !== null}
                    >
                      <RefreshCw size={14} className={syncingProvider === 'outlook' ? 'spin' : ''} />
                      Scan
                    </button>
                    <button 
                      className="btn-disconnect" 
                      onClick={() => handleDisconnectProvider('outlook', getConnectedEmail('outlook'))}
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button className="btn-connect" onClick={() => handleConnectProvider('outlook')}>Connect</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Browser Extension Panel */}
        <div className="sync-card">
          <div className="sync-card-header">
            <Chrome size={22} className="card-icon green" />
            <div>
              <h3>Chrome Extension</h3>
              <p className="card-desc">Sync applications in one-click directly from LinkedIn, Indeed, Greenhouse, or Lever.</p>
            </div>
          </div>

          <div className="sync-card-body">
            <div className="token-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Connection Token</span>
                <span className="secure-badge">
                  <ShieldCheck size={12} /> Encrypted
                </span>
              </div>
              <div className="token-input-wrapper">
                <input type="password" value={userId} readOnly className="token-input" />
                <button className="copy-btn" onClick={handleCopyToken} title="Copy Token">
                  {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                </button>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                Paste this token into the browser extension settings popup to link it with your account.
              </p>
            </div>

            <div className="instructions-list">
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#cbd5e1' }}>Setup Instructions:</h4>
              <ol style={{ paddingLeft: '16px', margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.6' }}>
                <li>Download the <strong>JobTracker Sync</strong> unpacked folder from `/extension`.</li>
                <li>Go to <code>chrome://extensions</code>, enable <strong>Developer Mode</strong>, and click <strong>Load unpacked</strong>.</li>
                <li>Open the extension popup in your toolbar and enter the Connection Token above.</li>
                <li>Browse jobs on LinkedIn or Indeed, click <strong>"Track Application"</strong>, and watch it sync instantly!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Preferences & Settings */}
      <div className="sync-preferences-card">
        <div className="preference-row">
          <div className="preference-details">
            <Bell size={20} color="#3b82f6" />
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', color: '#f1f5f9' }}>Real-time Notifications</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Notify me immediately when a new application is auto-synced or an interview invitation is detected.</p>
            </div>
          </div>
          <label className="switch-toggle">
            <input type="checkbox" checked={syncAlerts} onChange={handleToggleAlerts} />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="preference-divider"></div>

        <div className="preference-row">
          <div className="preference-details">
            <Mail size={20} color="#8b5cf6" />
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', color: '#f1f5f9' }}>Gmail Synchronization</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Allow the system to automatically analyze job-related emails to update your dashboard status.</p>
            </div>
          </div>
          <label className="switch-toggle">
            <input type="checkbox" checked={gmailSyncEnabled} onChange={handleToggleGmailSync} />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      {/* Flagged Emails for Manual Review */}
      {pendingReviews.length > 0 && (
        <div className="pending-reviews-panel" style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Flagged Emails for Manual Review <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', color: '#475569', fontWeight: 500 }}>Dev Debugging Mode</span>
            </h3>
            <button 
              onClick={() => setPendingReviews([])} 
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}
            >
              Clear Flagged List
            </button>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
            The following emails were classified as job-related, but did not match any of your existing job applications with high confidence.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingReviews.map((rev, idx) => (
              <div key={idx} style={{ padding: '14px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc', borderRadius: '8px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '14px', right: '14px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: rev.confidence >= 0.4 ? '#fef3c7' : '#fee2e2', color: rev.confidence >= 0.4 ? '#d97706' : '#b91c1c' }}>
                  Confidence: {(rev.confidence * 100).toFixed(0)}%
                </div>
                
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px', fontSize: '13px', paddingRight: '120px' }}>
                  {rev.subject}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                  From: {rev.from} | Company: <strong style={{color: '#475569'}}>{rev.companyName || 'Unknown'}</strong> | Title: <strong style={{color: '#475569'}}>{rev.jobTitle || 'Unknown'}</strong>
                </div>
                
                <div style={{ fontSize: '12px', backgroundColor: '#f1f5f9', padding: '6px 10px', borderRadius: '6px', color: '#475569', fontStyle: 'italic', marginBottom: '8px' }}>
                  "{rev.snippet}"
                </div>
                
                <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 500 }}>
                  Debug Reason: {rev.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync logs Table */}
      <div className="logs-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Recent Sync Logs</h3>
          <button className="refresh-logs-btn" onClick={loadSyncData} title="Refresh Logs">
            <RefreshCw size={14} /> Refresh Logs
          </button>
        </div>

        {isLoading ? (
          <div className="loading-state">Loading sync logs...</div>
        ) : logs.length === 0 ? (
          <div className="empty-logs">
            <Layers size={32} color="#475569" />
            <p>No synchronization activities logged yet. Connect your email or browser extension to get started!</p>
          </div>
        ) : (
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Event Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="log-time">
                      {new Date(log.created_at || log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span className={`log-source ${log.event_type}`}>
                        {log.event_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`log-status-badge ${log.status}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="log-msg">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
