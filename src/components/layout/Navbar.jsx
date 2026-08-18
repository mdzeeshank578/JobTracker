import React from 'react';
import { Briefcase, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar({ onAddApplication, onOpenProfile }) {
  const { currentUser, logout } = useAuth();

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
