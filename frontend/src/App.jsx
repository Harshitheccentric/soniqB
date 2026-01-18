/**
 * Main App Component
 * Manages application state and navigation between views
 */
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import PlayerView from './components/PlayerView';
import PlaylistView from './components/PlaylistView';
import ListeningSummary from './components/ListeningSummary';
import { getCurrentUser, isAuthenticated, logout as apiLogout } from './api/musicApi';
import './App.css';

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentView, setCurrentView] = useState('player');
    const [authView, setAuthView] = useState('login'); // 'login' or 'register'
    const [loading, setLoading] = useState(true);
    const [selectedTrack, setSelectedTrack] = useState(null);

    // Check for existing authentication on mount
    useEffect(() => {
        if (isAuthenticated()) {
            const user = getCurrentUser();
            if (user) {
                setCurrentUser(user);
            }
        }
        setLoading(false);
    }, []);

    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
    };

    const handleRegisterSuccess = (user) => {
        setCurrentUser(user);
    };

    const handleLogout = () => {
        apiLogout();
        setCurrentUser(null);
        setCurrentView('player');
        setSelectedTrack(null);
    };

    const handleTrackSelect = (track) => {
        setSelectedTrack(track);
        setCurrentView('player'); // Switch to player view automatically
    };

    // Show loading state
    if (loading) {
        return (
            <div className="app-loading">
                <h1>🎵 SoniqB</h1>
                <p>Loading...</p>
            </div>
        );
    }

    // Show auth screens if not logged in
    if (!currentUser) {
        if (authView === 'login') {
            return (
                <Login
                    onLoginSuccess={handleLoginSuccess}
                    onSwitchToRegister={() => setAuthView('register')}
                />
            );
        } else {
            return (
                <Register
                    onRegisterSuccess={handleRegisterSuccess}
                    onSwitchToLogin={() => setAuthView('login')}
                />
            );
        }
    }

    // Main application
    return (
        <div className="app">
            {/* Sidebar Navigation */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1 className="app-logo">🎵 SoniqB</h1>
                </div>

                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${currentView === 'player' ? 'active' : ''}`}
                        onClick={() => setCurrentView('player')}
                    >
                        <span className="nav-icon">🏠</span>
                        <span className="nav-label">Home</span>
                    </button>
                    <button
                        className={`nav-item ${currentView === 'playlists' ? 'active' : ''}`}
                        onClick={() => setCurrentView('playlists')}
                    >
                        <span className="nav-icon">📋</span>
                        <span className="nav-label">Playlists</span>
                    </button>
                    <button
                        className={`nav-item ${currentView === 'summary' ? 'active' : ''}`}
                        onClick={() => setCurrentView('summary')}
                    >
                        <span className="nav-icon">📊</span>
                        <span className="nav-label">Listening Summary</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <span className="user-icon">👤</span>
                        <span className="username">{currentUser.username}</span>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                    <div className="ml-notice">
                        <p>Phase 3: ML-Powered Music Player</p>
                        <p>✅ Authentication Enabled</p>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                <div className="content-wrapper">
                    {currentView === 'player' && <PlayerView user={currentUser} selectedTrack={selectedTrack} />}
                    {currentView === 'playlists' && <PlaylistView user={currentUser} onTrackSelect={handleTrackSelect} />}
                    {currentView === 'summary' && <ListeningSummary user={currentUser} />}
                </div>
            </main>

            {/* Sticky Bottom Player Bar */}
            <div className="bottom-player">
                <div className="player-info">
                    <div className="track-thumbnail">🎵</div>
                    <div className="track-details">
                        <div className="track-name">SoniqB Player</div>
                        <div className="track-artist">Select a track to play</div>
                    </div>
                </div>
                <div className="player-controls-center">
                    <button className="control-btn" disabled>⏮️</button>
                    <button className="control-btn play-btn" disabled>▶️</button>
                    <button className="control-btn" disabled>⏭️</button>
                </div>
                <div className="player-right">
                    <div className="volume-control">🔊</div>
                </div>
            </div>
        </div>
    );
}

export default App;
