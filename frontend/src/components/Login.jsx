import React, { useState } from 'react';
import { login } from '../api/musicApi';
import '../styles/Auth.css';

function Login({ onLoginSuccess, onSwitchToRegister }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await login(username, password);
            onLoginSuccess(data.user);
        } catch (err) {
            if (err.response && err.response.status === 401) {
                setError('Incorrect username or password');
            } else {
                setError(err.response?.data?.detail || 'Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>🎵 SoniqB</h1>
                <h2>Login</h2>
                
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                            minLength={3}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            minLength={4}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="auth-switch">
                    Don't have an account?{' '}
                    <button onClick={onSwitchToRegister} className="link-button">
                        Register
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;
