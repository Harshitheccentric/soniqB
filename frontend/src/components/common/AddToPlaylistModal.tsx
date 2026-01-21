import React, { useState, useEffect } from 'react';
import { getPlaylists, createSimplePlaylist, addTrackToPlaylist } from '../../api/musicApi';
import { useSession } from '../../hooks/useSession';
import { useAlert } from '../../context/AlertContext';
import './AddToPlaylistModal.css';

interface AddToPlaylistModalProps {
    track: { id: number; title: string; artist?: string } | null;
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'list' | 'create'; // list existing or create new
}

export default function AddToPlaylistModal({ track, isOpen, onClose, initialMode = 'list' }: AddToPlaylistModalProps) {
    const { session } = useSession();
    const { showAlert } = useAlert();
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [mode, setMode] = useState<'list' | 'create'>(initialMode);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && session.user) {
            loadPlaylists();
            setMode(initialMode); // Reset mode when reopening
            setNewPlaylistName('');
            setError(null);
        }
    }, [isOpen, session.user, initialMode]);

    const loadPlaylists = async () => {
        if (!session.user) return;
        try {
            setLoading(true);
            const data = await getPlaylists(session.user.id);
            // Filter manual playlists only? or allow adding to others if supported
            // Usually we add to manual playlists
            const manualPlaylists = data.filter((p: any) => p.type === 'manual');
            setPlaylists(manualPlaylists);
        } catch (err) {
            console.error('Failed to load playlists', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToPlaylist = async (playlistId: number) => {
        if (!track || !session.user) return;
        try {
            setLoading(true);
            await addTrackToPlaylist(playlistId, track.id);
            onClose();
            showAlert({ title: 'Success', description: `Added "${track.title}" to playlist!` });
        } catch (err: any) {
            console.error('Failed to add track', err);
            // Check if it's "Track already in playlist"
            if (err.response && err.response.status === 400) {
                showAlert({ title: 'Info', description: `Track is already in this playlist.` });
            } else {
                setError('Failed to add track. Try again.');
                showAlert({ title: 'Error', description: 'Failed to add track.' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim() || !session.user || !track) return;
        try {
            setLoading(true);
            // 1. Create Playlist
            const playlist = await createSimplePlaylist(session.user.id, newPlaylistName);

            // 2. Add Track
            await addTrackToPlaylist(playlist.id, track.id);

            onClose();
            showAlert({ title: 'Success', description: `Created playlist "${newPlaylistName}" and added track!` });
        } catch (err) {
            console.error('Failed to create playlist or add track', err);
            setError('Failed to create playlist.');
            showAlert({ title: 'Error', description: 'Failed to create playlist' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !track) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>
                        {mode === 'create' ? 'New Playlist' : 'Add to Playlist'}
                    </h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <p className="track-summary">
                        Adding: <strong>{track.title}</strong> by {track.artist || 'Unknown'}
                    </p>

                    {error && <div className="error-message">{error}</div>}

                    {mode === 'list' ? (
                        <div className="playlist-list-container">
                            <button
                                className="create-new-btn"
                                onClick={() => setMode('create')}
                            >
                                + New Playlist
                            </button>

                            {loading ? (
                                <div className="loading">Loading playlists...</div>
                            ) : playlists.length === 0 ? (
                                <div className="empty-state">No playlists found. Create one!</div>
                            ) : (
                                <div className="playlist-list">
                                    {playlists.map(p => (
                                        <button
                                            key={p.id}
                                            className="playlist-item"
                                            onClick={() => handleAddToPlaylist(p.id)}
                                        >
                                            <span className="playlist-icon">🎵</span>
                                            <span className="playlist-name">{p.name}</span>
                                            <span className="playlist-count">User Playlist</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="create-form">
                            <input
                                type="text"
                                placeholder="My Awesome Playlist"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                autoFocus
                            />
                            <div className="form-actions">
                                <button
                                    className="cancel-btn"
                                    onClick={() => setMode('list')} // Go back to list
                                >
                                    Cancel
                                </button>
                                <button
                                    className="confirm-btn"
                                    onClick={handleCreatePlaylist}
                                    disabled={!newPlaylistName.trim() || loading}
                                >
                                    {loading ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
