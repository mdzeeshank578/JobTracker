// Content Script for JobTracker Sync Extension
// Runs in the context of job boards and applicant tracking systems.

// Avoid injecting multiple instances
if (!window.jobTrackerScriptInjected) {
  window.jobTrackerScriptInjected = true;
  initExtensionScraper();
}

function initExtensionScraper() {
  console.log('🤖 JobTracker Scraper Active on:', window.location.hostname);
  
  // Periodically check for active job detail pages
  setInterval(checkForJobPostings, 2000);
  
  // Setup ATS submission listeners
  setupAtsSubmitListeners();
}

let activeWidget = null;
let currentJobInfo = null;

// Core check function
function checkForJobPostings() {
  const jobInfo = scrapeJobDetails();
  
  if (!jobInfo) {
    removeFloatingWidget();
    return;
  }
  
  // If the job has changed, recreate the widget
  if (!currentJobInfo || currentJobInfo.company !== jobInfo.company || currentJobInfo.role !== jobInfo.role) {
    currentJobInfo = jobInfo;
    renderFloatingWidget(jobInfo);
  }
}

// Scrape job details from the current page
function scrapeJobDetails() {
  let info = null;

  // 1. Try Schema.org JSON-LD (Standard for most modern job postings)
  try {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const json = JSON.parse(script.textContent);
        const findJobPosting = (obj) => {
          if (!obj) return null;
          if (obj['@type'] === 'JobPosting') return obj;
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const res = findJobPosting(item);
              if (res) return res;
            }
          }
          if (typeof obj === 'object') {
            if (obj['@graph']) return findJobPosting(obj['@graph']);
          }
          return null;
        };

        const jobPosting = findJobPosting(json);
        if (jobPosting) {
          const company = jobPosting.hiringOrganization?.name || jobPosting.hiringOrganization || '';
          const role = jobPosting.title || '';
          const location = typeof jobPosting.jobLocation === 'object' 
            ? (jobPosting.jobLocation?.address?.addressLocality || jobPosting.jobLocation?.address?.addressCountry || '')
            : (jobPosting.jobLocation || '');
          
          if (company && role) {
            info = {
              company: cleanString(company),
              role: cleanString(role),
              location: cleanString(location),
              jobUrl: window.location.href,
              snippet: cleanString(jobPosting.description?.substring(0, 200) || '') + '...'
            };
            break;
          }
        }
      } catch (e) {
        // Ignore single parse error
      }
    }
  } catch (e) {
    console.error('Error parsing JSON-LD:', e);
  }

  if (info) return info;

  // 2. Platform Specific Selectors (Fallback)
  const host = window.location.hostname;
  
  if (host.includes('linkedin.com')) {
    const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .jobs-details-top-card__job-title, h1');
    const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .jobs-details-top-card__company-url, .job-details-jobs-unified-top-card__primary-description-container a');
    const locEl = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container, .jobs-unified-top-card__bullet');
    
    if (titleEl && companyEl) {
      info = {
        company: cleanString(companyEl.textContent),
        role: cleanString(titleEl.textContent),
        location: locEl ? cleanString(locEl.textContent.split('·')[0]) : '',
        jobUrl: window.location.href,
        snippet: 'Viewed on LinkedIn'
      };
    }
  } 
  
  else if (host.includes('indeed.com')) {
    const titleEl = document.querySelector('h1[class*="JobInfoHeader-title"], .jobsearch-JobInfoHeader-title');
    const companyEl = document.querySelector('[data-company-name="true"], [class*="InlineCompanyRating"] a, .jobsearch-InlineCompanyRating a');
    const locEl = document.querySelector('[class*="JobInfoHeader-companyLocation"], .jobsearch-JobInfoHeader-companyLocation');
    
    if (titleEl && companyEl) {
      info = {
        company: cleanString(companyEl.textContent),
        role: cleanString(titleEl.textContent),
        location: locEl ? cleanString(locEl.textContent) : '',
        jobUrl: window.location.href,
        snippet: 'Viewed on Indeed'
      };
    }
  }

  else if (host.includes('greenhouse.io')) {
    const titleEl = document.querySelector('.app-title, h1.heading');
    const companyEl = document.querySelector('.company-name, #header h1');
    
    if (titleEl) {
      info = {
        company: companyEl ? cleanString(companyEl.textContent.replace('at ', '')) : 'Greenhouse Client',
        role: cleanString(titleEl.textContent),
        location: cleanString(document.querySelector('.location')?.textContent || ''),
        jobUrl: window.location.href,
        snippet: 'Greenhouse Application Form'
      };
    }
  }

  else if (host.includes('lever.co')) {
    const titleEl = document.querySelector('.posting-header h2');
    const logoEl = document.querySelector('.posting-header img');
    
    if (titleEl) {
      let company = 'Lever Client';
      if (logoEl && logoEl.alt) {
        company = logoEl.alt.replace(' logo', '');
      } else {
        const titleParts = document.title.split(' - ');
        if (titleParts.length > 1) {
          company = titleParts[titleParts.length - 1];
        }
      }
      info = {
        company: cleanString(company),
        role: cleanString(titleEl.textContent),
        location: cleanString(document.querySelector('.posting-categories .location')?.textContent || ''),
        jobUrl: window.location.href,
        snippet: 'Lever Application Form'
      };
    }
  }

  else if (host.includes('naukri.com')) {
    const titleEl = document.querySelector('.jd-header-title, .job-title, h1');
    const companyEl = document.querySelector('.jd-header-comp-name a, .comp-name, .subTitle a');
    const locEl = document.querySelector('.location, .loc');
    
    if (titleEl) {
      info = {
        company: companyEl ? cleanString(companyEl.textContent) : 'Naukri Employer',
        role: cleanString(titleEl.textContent),
        location: locEl ? cleanString(locEl.textContent) : '',
        jobUrl: window.location.href,
        snippet: 'Viewed on Naukri.com'
      };
    }
  }

  else if (host.includes('glassdoor')) {
    const titleEl = document.querySelector('[data-test="job-title"], .JobDetails_jobTitle__g9_1D, h1');
    const companyEl = document.querySelector('[data-test="employer-name"], .EmployerProfile_employerName__d22gP');
    const locEl = document.querySelector('[data-test="location"]');
    
    if (titleEl) {
      info = {
        company: companyEl ? cleanString(companyEl.textContent.replace(/\d+\.\d+★?/, '')) : 'Glassdoor Employer',
        role: cleanString(titleEl.textContent),
        location: locEl ? cleanString(locEl.textContent) : '',
        jobUrl: window.location.href,
        snippet: 'Viewed on Glassdoor'
      };
    }
  }

  else if (host.includes('apna.co')) {
    const titleEl = document.querySelector('h1, [class*="JobTitle"]');
    const companyEl = document.querySelector('[class*="CompanyName"], [class*="CompanyTitle"]');
    const locEl = document.querySelector('[class*="Location"]');

    if (titleEl) {
      info = {
        company: companyEl ? cleanString(companyEl.textContent) : 'Apna Employer',
        role: cleanString(titleEl.textContent),
        location: locEl ? cleanString(locEl.textContent) : '',
        jobUrl: window.location.href,
        snippet: 'Viewed on Apna.co'
      };
    }
  }

  // 3. Document Title parsing (Final Fallback)
  if (!info && document.title.toLowerCase().includes('job') || document.title.toLowerCase().includes('career')) {
    // Standard format e.g., "Software Engineer at Google"
    const match = document.title.match(/([a-zA-Z0-9\s\.\_]+)\s+(?:at|join|hiring)\s+([a-zA-Z0-9\s\.\_\-]+)/i);
    if (match && match[1] && match[2]) {
      info = {
        company: cleanString(match[2]),
        role: cleanString(match[1]),
        location: '',
        jobUrl: window.location.href,
        snippet: 'Detected via Document Title'
      };
    }
  }

  return info;
}

// Clean up DOM strings
function cleanString(str) {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').trim();
}

// Render Floating Sync Widget in Viewport
function renderFloatingWidget(jobInfo) {
  removeFloatingWidget();

  const widget = document.createElement('div');
  widget.id = 'jobtracker-floating-widget';
  
  // Custom Styles (Scope-isolated widget)
  widget.style.position = 'fixed';
  widget.style.bottom = '20px';
  widget.style.right = '20px';
  widget.style.zIndex = '999999';
  widget.style.background = 'rgba(30, 41, 59, 0.95)'; // Slate 800
  widget.style.color = '#f8fafc';
  widget.style.border = '1px solid rgba(148, 163, 184, 0.2)';
  widget.style.borderRadius = '16px';
  widget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.3)';
  widget.style.padding = '16px';
  widget.style.width = '300px';
  widget.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  widget.style.backdropFilter = 'blur(8px)';
  widget.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  widget.style.animation = 'jtFadeIn 0.3s ease-out';

  // Inject animation keyframes
  if (!document.getElementById('jt-widget-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'jt-widget-styles';
    styleSheet.textContent = `
      @keyframes jtFadeIn {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .jt-btn {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
      }
      .jt-btn:hover {
        opacity: 0.95;
        transform: translateY(-1px);
        box-shadow: 0 6px 10px -1px rgba(59, 130, 246, 0.3);
      }
      .jt-btn:active {
        transform: translateY(0);
      }
      .jt-btn.synced {
        background: #10b981 !important;
        cursor: default;
        box-shadow: none;
      }
    `;
    document.head.appendChild(styleSheet);
  }

  widget.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="height: 8px; width: 8px; background: #3b82f6; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite;"></span>
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8;">JobTracker Sync</span>
      </div>
      <button id="jt-widget-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0; font-size: 16px; line-height: 1;">&times;</button>
    </div>
    <div style="margin-bottom: 12px;">
      <div id="jt-role" style="font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #f1f5f9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${jobInfo.role}</div>
      <div id="jt-company" style="font-size: 13px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${jobInfo.company}</div>
      ${jobInfo.location ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">📍 ${jobInfo.location}</div>` : ''}
    </div>
    <button id="jt-sync-action-btn" class="jt-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      Track Application
    </button>
  `;

  document.body.appendChild(widget);
  activeWidget = widget;

  // Add Button Click Handler
  document.getElementById('jt-sync-action-btn').addEventListener('click', () => {
    syncActiveJob(jobInfo);
  });

  // Add Close Handler
  document.getElementById('jt-widget-close').addEventListener('click', () => {
    removeFloatingWidget();
  });
}

function removeFloatingWidget() {
  if (activeWidget) {
    activeWidget.remove();
    activeWidget = null;
  }
}

// Sync job details with Background worker
function syncActiveJob(jobInfo) {
  const btn = document.getElementById('jt-sync-action-btn');
  if (!btn || btn.classList.contains('synced')) return;

  btn.innerHTML = `
    <svg style="animation: spin 1s linear infinite" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
    Syncing...
  `;
  btn.style.opacity = '0.8';

  chrome.runtime.sendMessage({
    action: 'syncJob',
    jobData: {
      ...jobInfo,
      status: 'Applied'
    }
  }, (response) => {
    if (response && response.success) {
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Tracked! ✓
      `;
      btn.classList.add('synced');
      btn.style.opacity = '1';
      
      // Auto close after 3 seconds
      setTimeout(removeFloatingWidget, 3000);
    } else {
      btn.innerHTML = 'Retry Sync';
      btn.style.opacity = '1';
      btn.style.background = '#ef4444'; // Red error color
      console.error('Failed to sync job application:', response ? response.error : 'No response');
    }
  });
}

// --- ATS APPLICATION SUBMISSIONS LISTENER ---
function setupAtsSubmitListeners() {
  const host = window.location.hostname;
  
  // Greenhouse submission
  if (host.includes('greenhouse.io')) {
    const form = document.querySelector('form#application_form');
    if (form) {
      form.addEventListener('submit', () => {
        handleAtsSubmission('Greenhouse');
      });
    }
  }

  // Lever submission
  if (host.includes('lever.co')) {
    const form = document.querySelector('form#application-form');
    if (form) {
      form.addEventListener('submit', () => {
        handleAtsSubmission('Lever');
      });
    }
  }

  // Generic Submit Form click listeners for Workday / Ashby
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, input[type="submit"]');
    if (!btn) return;
    
    const text = btn.textContent || btn.value || '';
    const cleanText = text.toLowerCase().trim();

    if (cleanText === 'submit' || cleanText === 'submit application' || cleanText === 'apply') {
      // Check if this resides on Workday or Ashby domains
      if (host.includes('workdayjobs.com')) {
        handleAtsSubmission('Workday');
      } else if (host.includes('ashbyhq.com')) {
        handleAtsSubmission('Ashby');
      }
    }
  });
}

// Scrapes and submits the application automatically on submit trigger
function handleAtsSubmission(sourceName) {
  const jobInfo = scrapeJobDetails();
  if (jobInfo) {
    console.log(`[ATS Sync] Automatic sync triggered for ${sourceName}:`, jobInfo);
    chrome.runtime.sendMessage({
      action: 'syncJob',
      jobData: {
        ...jobInfo,
        status: 'Applied',
        source: `${sourceName} AutoSync`,
        snippet: `Automatically tracked upon submitting form on ${sourceName}.`
      }
    });
  }
}
