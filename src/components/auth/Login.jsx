import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Briefcase } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser, login, signup, resetPassword, loginWithGoogle } = useAuth();

  if (currentUser) {
    return <Navigate to="/" />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, name);
      }
    } catch (err) {
      if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password. Please try again or create an account if you don't have one.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account already exists with this email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Failed to authenticate. ' + (err.message || ''));
      }
    }

    setLoading(false);
  }

  async function handleGoogleLogin(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        // user closed popup, ignore
      } else {
        setError('Failed to log in with Google. ' + (err.message || ''));
      }
    }
    setLoading(false);
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!email) {
      return setError('Please enter your email address to reset password');
    }
    try {
      setMessage('');
      setError('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Check your inbox for further instructions');
    } catch (err) {
      setError('Failed to reset password. ' + (err.message || ''));
    }
    setLoading(false);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-container auth-logo">
            <Briefcase size={28} color="white" />
          </div>
          <h2>{isLogin ? 'Welcome back' : 'Create an account'}</h2>
          <p>to track your job applications</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-message" style={{backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #10b981', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center'}}>{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
              {isLogin && (
                <button 
                  type="button" 
                  className="text-btn" 
                  onClick={handleResetPassword}
                  style={{ fontSize: '0.8rem', padding: 0 }}
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button disabled={loading} type="submit" className="btn-primary auth-btn">
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
          
          <div className="google-divider" style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', textAlign: 'center', color: '#64748b' }}>
             <hr style={{ flex: 1, borderTop: '1px solid #e2e8f0' }} />
             <span style={{ padding: '0 10px', fontSize: '0.85rem' }}>or</span>
             <hr style={{ flex: 1, borderTop: '1px solid #e2e8f0' }} />
          </div>
          
          <button 
            type="button" 
            disabled={loading}
            onClick={handleGoogleLogin} 
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'white',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Sign in with Google
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              className="text-btn" 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setMessage('');
              }}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
