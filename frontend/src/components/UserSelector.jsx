/**
 * UserSelector Component
 * Simple user selection screen for choosing a user profile
 */
import React, { useState, useEffect } from 'react';
import { getUsers } from '../api/musicApi';

function UserSelector({ onUserSelect }) {
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await getUsers();
            setUsers(data);
            setError(null);
        } catch (err) {
            setError('Failed to load users. Make sure the backend is running.');
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedUserId) {
            const user = users.find(u => u.id === parseInt(selectedUserId));
            onUserSelect(user);
        }
    };

    if (loading) {
        return <div className="user-selector loading">Loading users...</div>;
    }

    if (error) {
        return (
            <div className="user-selector error">
                <p>{error}</p>
                <button onClick={loadUsers}>Retry</button>
            </div>
        );
    }

    return (
        <div className="user-selector">
            <div className="user-selector-card">
                <h1>SoniqB Music Player</h1>
                <p className="subtitle">Phase 2: Educational AIML Lab Project</p>

                <form onSubmit={handleSubmit}>
                    <label htmlFor="user-select">
                        Select your user profile to start listening:
                    </label>
                    <select
                        id="user-select"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        required
                    >
                        <option value="">-- Choose a user --</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.username} (ID: {user.id})
                            </option>
                        ))}
                    </select>

                    <button type="submit" disabled={!selectedUserId}>
                        Start Listening
                    </button>
                </form>

                <div className="info-box">
                    <p>
                        <strong>Note:</strong> This is a minimal user selection system.
                        No authentication is implemented in Phase 2.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default UserSelector;
