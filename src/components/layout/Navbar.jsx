import React from 'react';
import { Briefcase, Plus, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar({ onAddApplication }) {
  const { currentUser, logout } = useAuth();

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
            <button className="btn-primary" onClick={onAddApplication}>
              <Plus size={18} /> Add Application
            </button>
            <button className="btn-icon" onClick={logout} title="Logout">
              <LogOut size={20} />
            </button>
          </>
        ) : (
          <p>Please log in</p>
        )}
      </div>
    </nav>
  );
}
