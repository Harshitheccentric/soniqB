import React, { useState } from 'react';
import { register } from '../api/musicApi';
import '../styles/Auth.css';

function Register({ onRegisterSuccess, onSwitchToLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (username.length < 3) {
            setError('Username must be at least 3 characters long');
            return;
        }

        if (password.length < 4) {
            setError('Password must be at least 4 characters long');
            return;
        }

        setLoading(true);

        try {
            const data = await register(username, password);
            onRegisterSuccess(data.user);
        } catch (err) {
            if (err.response && err.response.status === 400) {
                setError('Username already taken');
            } else {
                const detail = err.response?.data?.detail;
                if (typeof detail === 'string') {
                    setError(detail);
                } else if (Array.isArray(detail)) {
                    setError(detail[0]?.msg || 'Registration failed');
                } else {
                    setError('Registration failed. Please try again.');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>🎵 SoniqB</h1>
                <h2>Register</h2>
                
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a username"
                            required
                            minLength={3}
                            maxLength={50}
                            autoFocus
                        />
                        <small>At least 3 characters</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Choose a password"
                            required
                            minLength={4}
                        />
                        <small>At least 4 characters</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            required
                            minLength={4}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Creating account...' : 'Register'}
                    </button>
                </form>

                <div className="auth-switch">
                    Already have an account?{' '}
                    <button onClick={onSwitchToLogin} className="link-button">
                        Login
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Register;
