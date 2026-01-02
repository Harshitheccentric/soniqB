/**
 * PlaylistView Component
 * Displays user playlists with track information
 */
import React, { useState, useEffect } from 'react';
import { getPlaylists, getTracks } from '../api/musicApi';

function PlaylistView({ user }) {
    const [playlists, setPlaylists] = useState([]);
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [playlistsData, tracksData] = await Promise.all([
                getPlaylists(user.id),
                getTracks()
            ]);
            setPlaylists(playlistsData);
            setTracks(tracksData);
            setError(null);
        } catch (err) {
            setError('Failed to load playlists');
            console.error('Error loading playlists:', err);
        } finally {
            setLoading(false);
        }
    };

    const getTrackById = (trackId) => {
        return tracks.find(t => t.id === trackId);
    };

    if (loading) {
        return <div className="playlist-view loading">Loading playlists...</div>;
    }

    if (error) {
        return <div className="playlist-view error">{error}</div>;
    }

    return (
        <div className="playlist-view">
            <h2>Your Playlists</h2>
            <p className="user-info">User: {user.username}</p>

            {playlists.length === 0 ? (
                <div className="no-playlists">
                    <p>You don't have any playlists yet.</p>
                    <p className="hint">Create playlists using the backend API.</p>
                </div>
            ) : (
                <div className="playlists-container">
                    {playlists.map(playlist => (
                        <div key={playlist.id} className="playlist-card">
                            <div className="playlist-header">
                                <h3>Playlist #{playlist.id}</h3>
                                <span className={`playlist-type ${playlist.type}`}>
                                    {playlist.type}
                                </span>
                            </div>
                            <p className="playlist-date">
                                Created: {new Date(playlist.created_at).toLocaleDateString()}
                            </p>

                            {/* Note: Track details would require additional API endpoint 
                  to get playlist tracks with positions */}
                            <p className="playlist-note">
                                View track details via backend API
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Auto-playlist placeholder */}
            <div className="auto-playlist-section">
                <h3>🤖 Auto-Generated Playlists</h3>
                <div className="info-box">
                    <p>
                        <strong>Coming in Future Phases:</strong> ML-based auto-playlists
                        will be generated using your listening patterns.
                    </p>
                    <p>Currently, only manual playlists are supported.</p>
                </div>
            </div>
        </div>
    );
}

export default PlaylistView;
