/**
 * LoginPage Component
 * Full-screen identity anchoring interface with Antigravity background
 * No real authentication - just identity selection for event logging
 */

import { useState, useEffect, Suspense, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Antigravity from '../components/animation/Antigravity';
import { getUsers, createUser } from '../api/authApi';
import { useSession } from '../hooks/useSession';
import type { User } from '../types';
import '../styles/LoginPage.css';

type LoginMode = 'select' | 'create';

export default function LoginPage() {
  const navigate = useNavigate();
  const { initializeSession, session } = useSession();

  const [mode, setMode] = useState<LoginMode>('select');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    if (session.isAuthenticated) {
      navigate('/app');
    }
  }, [session.isAuthenticated, navigate]);

  // Fetch available users on mount
  useEffect(() => {
    async function fetchUsers() {
      try {
        const userList = await getUsers();
        setUsers(userList);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError('Failed to load user profiles');
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handleSelectUser = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUserId) {
      setError('Please select a user profile');
      return;
    }

    const user = users.find(u => u.id === parseInt(selectedUserId, 10));
    if (user) {
      initializeSession(user);
      navigate('/app');
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newUsername.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      setLoading(true);
      const user = await createUser(newUsername.trim());
      initializeSession(user);
      navigate('/app');
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to create user';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'select' ? 'create' : 'select');
    setError(null);
  };

  return (
    <div className="login-page">
      {/* Antigravity Background */}
      <div className="login-page__background">
        <Suspense fallback={<div className="login-page__fallback" />}>
          <Antigravity
            count={250}
            magnetRadius={5}
            ringRadius={8}
            waveSpeed={0.3}
            waveAmplitude={0.8}
            particleSize={1.2}
            lerpSpeed={0.04}
            color="#8d5a97"
            autoAnimate
            particleVariance={2}
            rotationSpeed={0.05}
            depthFactor={0.8}
            pulseSpeed={2}
            particleShape="capsule"
            fieldStrength={8}
          />
        </Suspense>
      </div>

      {/* Floating Login Form */}
      <div className="login-page__content">
        <div className="login-card">
          <div className="login-card__header">
            <h1 className="login-card__title">SoniqB</h1>
            <p className="login-card__subtitle">
              {mode === 'select'
                ? 'Select your listening identity'
                : 'Create a new observer profile'}
            </p>
          </div>

          {mode === 'select' ? (
            <form onSubmit={handleSelectUser} className="login-form">
              <div className="login-form__group">
                <label htmlFor="user-select" className="login-form__label">
                  Observer Profile
                </label>
                <select
                  id="user-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="login-form__select"
                  disabled={loading}
                >
                  <option value="">
                    {loading ? 'Loading profiles...' : '-- Select a profile --'}
                  </option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="login-form__error" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedUserId}
                className="login-form__submit"
              >
                Enter Observatory
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateUser} className="login-form">
              <div className="login-form__group">
                <label htmlFor="username" className="login-form__label">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="login-form__input"
                  placeholder="Enter your username"
                  autoFocus
                />
              </div>

              {error && (
                <div className="login-form__error" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-form__submit"
              >
                {loading ? 'Creating...' : 'Create Profile'}
              </button>
            </form>
          )}

          <div className="login-card__footer">
            <button
              type="button"
              onClick={toggleMode}
              className="login-card__toggle"
            >
              {mode === 'select'
                ? "New here? Create a profile"
                : 'Already have a profile? Select it'}
            </button>
          </div>

          <div className="login-card__notice">
            <p>🧠 Educational AIML Lab Project</p>
            <p>Your listening patterns become research data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
