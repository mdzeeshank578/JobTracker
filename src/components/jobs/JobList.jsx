import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Globe } from 'lucide-react';
import JobCard from './JobCard';
import { searchGlobalJobs } from '../../services/openai';
import './JobList.css';

export default function JobList({ jobs, onEdit, onDelete, onSaveGlobal, globalSearchTerm = '', setGlobalSearchTerm, onStartPractice }) {
  const [searchTerm, setSearchTerm] = useState(globalSearchTerm);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  
  const [globalJobs, setGlobalJobs] = useState([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // Sync incoming voice searches
  useEffect(() => {
    setSearchTerm(globalSearchTerm);
  }, [globalSearchTerm]);

  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setGlobalJobs([]);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const results = await searchGlobalJobs(searchTerm.trim());
        setGlobalJobs(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.company?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.role?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || job.status === filterStatus;
    
    // As per prompt, we don't naturally have a "type" field yet, but we allow filtering if it existed. 
    const jobType = job.type || 'Full-time';
    const matchesType = filterType === 'All' || jobType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const dateA = a.dateApplied ? new Date(a.dateApplied) : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0));
    const dateB = b.dateApplied ? new Date(b.dateApplied) : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0));
    return sortBy === 'Newest' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="job-list-container">
      <div className="list-controls">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search company or role..." 
            value={searchTerm}
            onChange={(e) => {
               setSearchTerm(e.target.value);
               if (setGlobalSearchTerm) setGlobalSearchTerm(e.target.value);
            }}
          />
        </div>
        
        <div className="filter-dropdown">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Applied">Applied</option>
            <option value="Interview">Interview</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="filter-dropdown">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="All">All Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>
        </div>

        <div className="filter-dropdown sort-dropdown">
          <SlidersHorizontal size={14} className="filter-icon" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="Newest">Newest First</option>
            <option value="Oldest">Oldest First</option>
          </select>
        </div>
      </div>

      <div className="job-grid">
        {sortedJobs.length > 0 ? (
          sortedJobs.map(job => (
            <JobCard 
              key={job.id} 
              job={job} 
              onEdit={onEdit} 
              onDelete={onDelete} 
              onStartPractice={onStartPractice}
            />
          ))
        ) : (
          <div className="no-results">
            <p>No tracked applications align with these criteria.</p>
          </div>
        )}
      </div>

      {searchTerm && searchTerm.trim().length >= 2 && (
        <div className="global-vacancies-section" style={{ marginTop: '50px', paddingTop: '30px', borderTop: '2px dashed #cbd5e1' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Globe size={24} color="#4f46e5" /> Global Vacancies for "{searchTerm}"
          </h2>
          
          {isSearchingGlobal ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#64748b' }}>
              <div style={{ width: '20px', height: '20px', borderWidth: '3px', borderColor: '#4f46e5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              Scanning intelligent job boards worldwide...
            </div>
          ) : globalJobs.length > 0 ? (
            <div className="job-grid">
              {globalJobs.map(job => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  isGlobal={true}
                  onSaveGlobal={onSaveGlobal}
                />
              ))}
            </div>
          ) : (
             <p style={{ color: '#64748b' }}>No global vacancies discovered at the moment.</p>
          )}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}} />
        </div>
      )}
    </div>
  );
}
