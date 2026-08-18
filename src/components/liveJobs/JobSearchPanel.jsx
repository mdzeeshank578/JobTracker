import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BriefcaseBusiness, MapPin, Search, Globe, ExternalLink, Award } from 'lucide-react';

const jobTypes = ['Full-time', 'Part-time', 'Internship', 'Remote'];

const platforms = [
  { id: 'all', name: 'All Platforms (Aggregated)' },
  { id: 'linkedin', name: 'LinkedIn Jobs (Professional Network)', url: 'https://www.linkedin.com/jobs/search/' },
  { id: 'naukri', name: 'Naukri.com (Indian Market Leader)', url: 'https://www.naukri.com/' },
  { id: 'indeed', name: 'Indeed (Broad Search Aggregator)', url: 'https://in.indeed.com/jobs' },
  { id: 'glassdoor', name: 'Glassdoor (Reviews & Salaries)', url: 'https://www.glassdoor.co.in/Job/jobs.htm' },
  { id: 'apna', name: 'Apna.co (Local & Entry-Level Work)', url: 'https://apna.co/jobs' },
];

const ROLES_SUGGESTIONS = [
  'DevOps Engineer',
  'Frontend Engineer',
  'Full Stack Developer',
  'Backend Developer',
  'React Developer',
  'Node.js Developer',
  'Python Developer',
  'Java Engineer',
  'Cloud Platform Architect (AWS / Azure / GCP)',
  'Data Engineer',
  'Data Scientist',
  'AI / Machine Learning Engineer',
  'Product Manager',
  'UI / UX Designer',
  'QA Automation Engineer',
  'Cybersecurity Specialist',
  'System Engineer',
  'Mobile Developer (iOS / Android)',
  'Kubernetes / Infrastructure Engineer',
  'Site Reliability Engineer (SRE)'
];

const LOCATION_SUGGESTIONS = [
  'Kolkata, West Bengal',
  'Bangalore / Bengaluru, Karnataka',
  'Remote (Work from home)',
  'Hyderabad, Telangana',
  'Pune, Maharashtra',
  'Mumbai, Maharashtra',
  'Delhi NCR (Gurgaon / Noida)',
  'Chennai, Tamil Nadu',
  'San Francisco, CA, USA',
  'New York, NY, USA',
  'London, United Kingdom',
  'Austin, TX, USA',
  'Seattle, WA, USA',
  'Toronto, Canada'
];

const EXPERIENCE_SUGGESTIONS = [
  'Fresher / Entry Level (0-1 yrs)',
  '1-3 years (Junior)',
  '3-5 years (Mid-Level)',
  '5-8 years (Senior)',
  '8+ years (Lead / Architect)'
];

function AutocompleteInput({ icon: Icon, label, value, onChange, placeholder, suggestions, badgeLabel = "Suggestion" }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Filter suggestions based on current input text
  const filtered = useMemo(() => {
    if (!value || !value.trim()) return suggestions.slice(0, 6);
    const query = value.toLowerCase().trim();
    const matched = suggestions.filter(s => s.toLowerCase().includes(query));
    return matched.length > 0 ? matched.slice(0, 7) : suggestions.slice(0, 5);
  }, [value, suggestions]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <label>
        <span><Icon size={15} /> {label}</span>
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
      </label>

      {isOpen && filtered.length > 0 && (
        <div className="autocomplete-dropdown">
          {filtered.map((item) => (
            <div
              key={item}
              className="autocomplete-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(item);
                setIsOpen(false);
              }}
            >
              <div className="autocomplete-item-text">
                <Search size={13} style={{ color: '#2563eb' }} />
                <span>{item}</span>
              </div>
              <span className="autocomplete-item-badge">{badgeLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobSearchPanel({ filters, setFilters, onSearch, isLoading }) {
  const update = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const getDirectPlatformUrl = (platformId) => {
    const role = encodeURIComponent(filters.role || 'Software Engineer');
    const loc = encodeURIComponent(filters.location || '');
    
    switch (platformId) {
      case 'linkedin':
        return `https://www.linkedin.com/jobs/search/?keywords=${role}&location=${loc}`;
      case 'naukri':
        return loc ? `https://www.naukri.com/${role.replace(/%20/g, '-')}-jobs-in-${loc.replace(/%20/g, '-')}` : `https://www.naukri.com/${role.replace(/%20/g, '-')}-jobs`;
      case 'indeed':
        return `https://in.indeed.com/jobs?q=${role}&l=${loc}`;
      case 'glassdoor':
        return `https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=${role}&locKeyword=${loc}`;
      case 'apna':
        return `https://apna.co/jobs?q=${role}&location=${loc}`;
      default:
        return '#';
    }
  };

  return (
    <form className="live-search-panel" onSubmit={onSearch}>
      <div className="live-search-title">
        <div>
          <h2>Multi-Platform Live Jobs Search</h2>
          <p>Search real vacancies across LinkedIn, Naukri.com, Indeed, Glassdoor, and Apna with smart auto-suggestions.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#2563eb', fontWeight: 600, background: '#eff6ff', padding: '6px 12px', borderRadius: '999px' }}>
          <Globe size={16} /> 5 Target Job Networks Connected
        </div>
      </div>

      <div className="live-search-grid">
        <AutocompleteInput
          icon={BriefcaseBusiness}
          label="Job Role / Keywords"
          value={filters.role}
          onChange={(val) => update('role', val)}
          placeholder="e.g. DevOps Engineer, Frontend, React"
          suggestions={ROLES_SUGGESTIONS}
          badgeLabel="Role"
        />

        <AutocompleteInput
          icon={MapPin}
          label="Target Location"
          value={filters.location}
          onChange={(val) => update('location', val)}
          placeholder="e.g. Kolkata, Bangalore, Remote"
          suggestions={LOCATION_SUGGESTIONS}
          badgeLabel="Location"
        />

        <label>
          <span>Target Platform</span>
          <select value={filters.platform || 'all'} onChange={e => update('platform', e.target.value)}>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <AutocompleteInput
          icon={Award}
          label="Experience Level"
          value={filters.experience}
          onChange={(val) => update('experience', val)}
          placeholder="e.g. Fresher, 2+ years"
          suggestions={EXPERIENCE_SUGGESTIONS}
          badgeLabel="Level"
        />

        <label>
          <span>Job Type</span>
          <select value={filters.jobType} onChange={e => update('jobType', e.target.value)}>
            <option value="">Any type</option>
            {jobTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>

        <button className="live-search-button" type="submit" disabled={isLoading}>
          <Search size={18} />
          {isLoading ? 'Searching...' : 'Search Jobs'}
        </button>
      </div>

      {/* Direct Portal Search Shortcuts */}
      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Quick Direct Search:</span>
        <a href={getDirectPlatformUrl('linkedin')} target="_blank" rel="noopener noreferrer" className="platform-shortcut linkedin">
          LinkedIn Jobs <ExternalLink size={12} />
        </a>
        <a href={getDirectPlatformUrl('naukri')} target="_blank" rel="noopener noreferrer" className="platform-shortcut naukri">
          Naukri.com <ExternalLink size={12} />
        </a>
        <a href={getDirectPlatformUrl('indeed')} target="_blank" rel="noopener noreferrer" className="platform-shortcut indeed">
          Indeed <ExternalLink size={12} />
        </a>
        <a href={getDirectPlatformUrl('glassdoor')} target="_blank" rel="noopener noreferrer" className="platform-shortcut glassdoor">
          Glassdoor <ExternalLink size={12} />
        </a>
        <a href={getDirectPlatformUrl('apna')} target="_blank" rel="noopener noreferrer" className="platform-shortcut apna">
          Apna.co <ExternalLink size={12} />
        </a>
      </div>
    </form>
  );
}
