/**
 * SessionHeader Component
 * Top bar showing user context, session time, theme toggle, and navigation
 */

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import type { User } from '../../types';
import './SessionHeader.css';

interface SessionHeaderProps {
  user: User;
  onLogout: () => void;
}

// Theme Toggle Icons
const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const ModelIcon = ({ status }: { status: string }) => {
  const color = status === 'ready' ? 'var(--color-success)' :
    status === 'error' ? 'var(--color-error)' :
      'var(--color-text-tertiary)';

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
      {status === 'ready' && <path d="M9 12l2 2 4-4" />}
      {status === 'error' && <line x1="12" y1="8" x2="12" y2="12" />}
      {status === 'error' && <line x1="12" y1="16" x2="12.01" y2="16" />}
    </svg>
  );
};

export default function SessionHeader({ user, onLogout }: SessionHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [sessionTime, setSessionTime] = useState(0);
  const [modelStatus, setModelStatus] = useState<string>('loading');

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    // Initial check and auto-load
    checkAndLoadModel();

    // Poll status every 30s to keep sync
    const statusInterval = setInterval(checkAndLoadModel, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, []);

  const checkAndLoadModel = async () => {
    try {
      const res = await axios.get('/api/ml/status');
      const status = res.data.status;
      setModelStatus(status);

      // Auto-load if not loaded
      if (status === 'not_loaded') {
        setModelStatus('loading'); // Show pulsing grey
        try {
          // Trigger load
          await axios.post('/api/ml/load');
          // Wait a bit and check again
          setTimeout(async () => {
            const retry = await axios.get('/api/ml/status');
            setModelStatus(retry.data.status);
          }, 2000);
        } catch (loadErr) {
          console.error('Failed to auto-load model:', loadErr);
          // Don't set error state yet, maybe it's just busy
        }
      }
    } catch (error) {
      console.error('Failed to check ML status:', error);
      setModelStatus('error');
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <header className="session-header">
      <div className="session-header__left">
        <h1 className="session-header__logo">SoniqB</h1>
        <span className="session-header__subtitle">Listening Observatory</span>
      </div>

      <div className="session-header__center">
        <div className="session-badge">
          <span className="session-badge__label">Session Time</span>
          <span className="session-badge__value">{formatTime(sessionTime)}</span>
        </div>
      </div>

      <div className="session-header__right">
        {/* ML Model Status */}
        <div
          className={`model-status model-status--${modelStatus}`}
          title={`ML Model: ${modelStatus.replace('_', ' ')}`}
        >
          <ModelIcon status={modelStatus} />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>

        <div className="user-menu">
          <span className="user-menu__name">{user.username}</span>
          <button
            onClick={onLogout}
            className="user-menu__logout"
            aria-label="Logout"
          >
            Exit
          </button>
        </div>
      </div>
    </header>
  );
}
