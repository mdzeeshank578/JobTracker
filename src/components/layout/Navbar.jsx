import React, { useState, useEffect } from 'react';
import { Briefcase, LogOut, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile } from '../../services/db';
import { calculateProfileCompletion } from '../profile/Profile';
import './Navbar.css';

export default function Navbar({ onAddApplication, onOpenProfile }) {
  const { currentUser, logout } = useAuth();
  const [completion, setCompletion] = useState(null);

  useEffect(() => {
    async function loadProfileCompleteness() {
      if (currentUser?.uid) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          if (profile) {
            setCompletion(calculateProfileCompletion(profile));
          }
        } catch (err) {
          console.error("Failed to load profile for navbar:", err);
        }
      }
    }
    loadProfileCompleteness();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="logo-container">
          <Briefcase size={24} color="white" />
        </div>
        <div className="brand-text">
          <h1>JobTracker</h1>
          <p>Track your applications</p>
        </div>
      </div>
      
      <div className="navbar-right">
        {currentUser ? (
          <>
            <span className="user-greeting">Hi, {currentUser.displayName || currentUser.email}</span>
            {completion && (
              <button
                className="profile-completion-badge"
                onClick={onOpenProfile}
                title="Click to view & edit Profile"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  background: 'rgba(37, 99, 235, 0.1)',
                  border: '1px solid rgba(37, 99, 235, 0.25)',
                  color: '#2563eb',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <CheckCircle2 size={13} color={completion.color} />
                {completion.percentage}% Profile
              </button>
            )}
            <button className="btn-icon" onClick={onOpenProfile} title="Profile Settings">
              <User size={20} />
            </button>
            <button className="btn-logout" onClick={handleLogout} title="Log Out / Switch Account">
              <LogOut size={16} /> Sign Out
            </button>
          </>
        ) : (
          <p>Please log in</p>
        )}
      </div>
    </nav>
  );
}
