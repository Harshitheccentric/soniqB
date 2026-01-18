/**
 * PlaylistView Component
 * Displays user playlists with track information
 */
import React, { useState, useEffect } from 'react';
import { getPlaylists, getPlaylistDetails } from '../api/musicApi';

function PlaylistView({ user, onTrackSelect }) {
    const [playlists, setPlaylists] = useState([]);
    const [expandedPlaylist, setExpandedPlaylist] = useState(null);
    const [playlistTracks, setPlaylistTracks] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadPlaylists();
    }, [user.id]);

    const loadPlaylists = async () => {
        try {
            setLoading(true);
            const playlistsData = await getPlaylists(user.id);
            setPlaylists(playlistsData);
            setError(null);
        } catch (err) {
            setError('Failed to load playlists');
            console.error('Error loading playlists:', err);
        } finally {
            setLoading(false);
        }
    };

    const togglePlaylist = async (playlistId) => {
        if (expandedPlaylist === playlistId) {
            setExpandedPlaylist(null);
        } else {
            setExpandedPlaylist(playlistId);
            // Load tracks if not already loaded
            if (!playlistTracks[playlistId]) {
                try {
                    const details = await getPlaylistDetails(playlistId);
                    setPlaylistTracks(prev => ({
                        ...prev,
                        [playlistId]: details.tracks
                    }));
                } catch (err) {
                    console.error('Error loading playlist tracks:', err);
                }
            }
        }
    };

    const handleTrackClick = (track) => {
        if (onTrackSelect) {
            onTrackSelect(track);
        }
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
                    <p className="hint">Like some tracks to populate your "Liked Songs" playlist!</p>
                </div>
            ) : (
                <div className="playlists-container">
                    {playlists.map(playlist => (
                        <div key={playlist.id} className="playlist-card">
                            <div 
                                className="playlist-header clickable" 
                                onClick={() => togglePlaylist(playlist.id)}
                            >
                                <div className="playlist-title-area">
                                    <span className="expand-icon">
                                        {expandedPlaylist === playlist.id ? '▼' : '▶'}
                                    </span>
                                    <h3>{playlist.name}</h3>
                                </div>
                                <span className={`playlist-type ${playlist.type}`}>
                                    {playlist.type === 'liked_songs' ? '💖 Liked' : '📋 Manual'}
                                </span>
                            </div>
                            <p className="playlist-date">
                                Created: {new Date(playlist.created_at).toLocaleDateString()}
                            </p>

                            {/* Expanded track list */}
                            {expandedPlaylist === playlist.id && (
                                <div className="playlist-tracks">
                                    {!playlistTracks[playlist.id] ? (
                                        <p className="loading-tracks">Loading tracks...</p>
                                    ) : playlistTracks[playlist.id].length === 0 ? (
                                        <p className="no-tracks">No tracks in this playlist yet.</p>
                                    ) : (
                                        <div className="track-list">
                                            {playlistTracks[playlist.id].map((item, index) => (
                                                <div 
                                                    key={index} 
                                                    className="track-item"
                                                    onClick={() => handleTrackClick(item.track)}
                                                >
                                                    <span className="track-number">{index + 1}</span>
                                                    <div className="track-details">
                                                        <div className="track-title">{item.track.title}</div>
                                                        <div className="track-artist">{item.track.artist}</div>
                                                    </div>
                                                    <div className="track-genre">
                                                        {item.track.predicted_genre || '-'}
                                                    </div>
                                                    <button className="play-button" title="Play">
                                                        ▶️
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default PlaylistView;
