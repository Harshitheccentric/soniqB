/**
 * Main App Component
 * Manages application state and navigation between views
 */
import React, { useState } from 'react';
import UserSelector from './components/UserSelector';
import PlayerView from './components/PlayerView';
import PlaylistView from './components/PlaylistView';
import ListeningSummary from './components/ListeningSummary';
import './App.css';

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentView, setCurrentView] = useState('player');

    const handleUserSelect = (user) => {
        setCurrentUser(user);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentView('player');
    };

    // User selection screen
    if (!currentUser) {
        return <UserSelector onUserSelect={handleUserSelect} />;
    }

    // Main application
    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="header-content">
                    <h1>🎵 SoniqB</h1>
                    <div className="user-section">
                        <span className="current-user">👤 {currentUser.username}</span>
                        <button className="logout-btn" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="app-nav">
                <button
                    className={currentView === 'player' ? 'active' : ''}
                    onClick={() => setCurrentView('player')}
                >
                    🎵 Player
                </button>
                <button
                    className={currentView === 'playlists' ? 'active' : ''}
                    onClick={() => setCurrentView('playlists')}
                >
                    📋 Playlists
                </button>
                <button
                    className={currentView === 'summary' ? 'active' : ''}
                    onClick={() => setCurrentView('summary')}
                >
                    📊 Summary
                </button>
            </nav>

            {/* Main Content */}
            <main className="app-main">
                {currentView === 'player' && <PlayerView user={currentUser} />}
                {currentView === 'playlists' && <PlaylistView user={currentUser} />}
                {currentView === 'summary' && <ListeningSummary user={currentUser} />}
            </main>

            {/* Footer */}
            <footer className="app-footer">
                <p>Phase 2: Educational AIML Lab Project</p>
                <p className="ml-notice">⚠️ No ML logic implemented in frontend</p>
            </footer>
        </div>
    );
}

export default App;
