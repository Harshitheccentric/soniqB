/**
 * Enhanced TrackLibrary Component
 * Shows playlists with type badges, can open playlists to view/play tracks
 */

import { useState, useEffect, useMemo } from 'react';
import { useSession } from '../../hooks/useSession';
import type { Track } from '../../types';
import { useAlert } from '../../context/AlertContext';
import { deletePlaylist, generatePersonalizedPlaylist, deleteTrack } from '../../api/musicApi';
import ContextMenu from '../common/ContextMenu';
import AddToPlaylistModal from '../common/AddToPlaylistModal';
import RenamePlaylistModal from '../common/RenamePlaylistModal';
import './TrackLibrary.css';

interface TrackLibraryProps {
    onTrackSelect: (track: Track, allTracks: Track[]) => void;
}

interface Playlist {
    id: number;
    name: string;
    type: string;
    user_id: number;
}

interface PlaylistDetail extends Playlist {
    tracks: Track[];
}

const MusicIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
    </svg>
);

const BackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);

const getPlaylistIcon = (type: string) => {
    switch (type) {
        case 'liked_songs': return '💖';
        case 'uploaded_songs': return '🎵';
        case 'manual': return '📋';
        case 'auto_generated': return '✨';
        default: return '🎶';
    }
};

const getPlaylistTypeName = (type: string) => {
    switch (type) {
        case 'liked_songs': return 'Liked';
        case 'uploaded_songs': return 'Uploaded';
        case 'manual': return 'Manual';
        case 'auto_generated': return 'AI Generated';
        default: return type;
    }
};

export default function TrackLibrary({ onTrackSelect }: TrackLibraryProps) {
    const { session } = useSession();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'playlists' | 'tracks'>('playlists');
    const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistDetail | null>(null);
    const [loadingPlaylist, setLoadingPlaylist] = useState(false);
    const [classifying, setClassifying] = useState(false);
    const [classificationResult, setClassificationResult] = useState<{ classified: number, total: number } | null>(null);
    const [generating, setGenerating] = useState(false);

    // Genre filter for All Tracks
    const [genreFilter, setGenreFilter] = useState<string>('all');

    // Extract unique genres from tracks
    const availableGenres = useMemo(() => {
        const genres = new Set<string>();
        tracks.forEach(track => {
            if (track.predicted_genre) {
                genres.add(track.predicted_genre);
            }
        });
        return Array.from(genres).sort();
    }, [tracks]);

    // Filter tracks by genre
    const filteredTracks = useMemo(() => {
        if (genreFilter === 'all') return tracks;
        return tracks.filter(track => track.predicted_genre === genreFilter);
    }, [tracks, genreFilter]);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number }>({ visible: false, x: 0, y: 0 });
    const [contextMenuTrack, setContextMenuTrack] = useState<Track | null>(null);
    const [contextMenuPlaylist, setContextMenuPlaylist] = useState<Playlist | null>(null);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [playlistModalMode, setPlaylistModalMode] = useState<'list' | 'create'>('list');

    const { showAlert, closeAlert } = useAlert();


    useEffect(() => {
        fetchData();
    }, [session.user]);

    const fetchData = async () => {
        try {
            const tracksResponse = await fetch('http://localhost:8000/tracks');
            if (tracksResponse.ok) {
                const tracksData = await tracksResponse.json();
                setTracks(Array.isArray(tracksData) ? tracksData : []);
            }

            if (session.user) {
                const playlistsResponse = await fetch(`http://localhost:8000/playlists/${session.user.id}`);
                if (playlistsResponse.ok) {
                    const playlistsData = await playlistsResponse.json();
                    setPlaylists(Array.isArray(playlistsData) ? playlistsData : []);
                }
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
            // Replace setError with alert if preferred or keep error state
            setError('Failed to load library');
        } finally {
            setLoading(false);
        }
    };

    const openPlaylist = async (playlist: Playlist) => {
        setLoadingPlaylist(true);
        try {
            const response = await fetch(`http://localhost:8000/playlists/detail/${playlist.id}`);
            if (response.ok) {
                const data = await response.json();
                // Backend returns tracks as array of {position, track} objects
                const extractedTracks = (data.tracks || []).map((item: any) => item.track);
                setSelectedPlaylist({
                    ...playlist,
                    tracks: extractedTracks
                });
            }
        } catch (err) {
            console.error('Failed to load playlist:', err);
        } finally {
            setLoadingPlaylist(false);
        }
    };

    const handleDeletePlaylist = async () => {
        if (!contextMenuPlaylist) return;

        showAlert({
            title: 'Are you sure?',
            description: `This will permanently delete the playlist "${contextMenuPlaylist.name}". This action cannot be undone.`,
            cancelLabel: 'Cancel',
            actions: [
                {
                    label: 'Yes, delete playlist',
                    variant: 'danger',
                    onClick: async () => {
                        try {
                            await deletePlaylist(contextMenuPlaylist.id);
                            closeAlert(); // Close the modal
                            // Show success alert
                            setTimeout(() => {
                                showAlert({ title: 'Success', description: `Deleted playlist "${contextMenuPlaylist.name}"` });
                            }, 300);
                            fetchData();
                        } catch (err) {
                            console.error('Failed to delete playlist', err);
                            showAlert({ title: 'Error', description: 'Failed to delete playlist' });
                        }
                    }
                }
            ]
        });
    };

    const handleDeleteTrack = async () => {
        // Removed session.token check as it's often null in identity-anchoring mode
        // musicApi handles authentication via X-User-ID or stored token
        if (!contextMenuTrack) return;

        showAlert({
            title: 'Delete Song?',
            description: `Are you sure you want to permanently delete "${contextMenuTrack.title}"? This cannot be undone.`,
            cancelLabel: 'Cancel',
            actions: [
                {
                    label: 'Yes, Delete',
                    variant: 'danger',
                    onClick: async () => {
                        try {
                            await deleteTrack(contextMenuTrack.id);

                            closeAlert();

                            // Visual feedback
                            showAlert({ title: 'Deleted', description: 'Track deleted successfully' });

                            // Refresh current view
                            if (selectedPlaylist) {
                                openPlaylist(selectedPlaylist);
                            }
                            // Always refresh main list too
                            fetchData();

                        } catch (err) {
                            console.error('Failed to delete track', err);
                            showAlert({ title: 'Error', description: 'Failed to delete track' });
                        }
                    }
                }
            ]
        });
    };

    const closePlaylist = () => {
        setSelectedPlaylist(null);
    };

    const playTrackFromPlaylist = (track: Track) => {
        if (selectedPlaylist) {
            onTrackSelect(track, selectedPlaylist.tracks);
        }
    };

    if (loading) {
        return (
            <div className="track-library">
                <h2 className="track-library__title">📚 Your Library</h2>
                <div className="track-library__loading">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="track-library">
                <h2 className="track-library__title">📚 Your Library</h2>
                <div className="track-library__error">{error}</div>
            </div>
        );
    }

    // Playlist Detail View
    if (selectedPlaylist) {
        return (
            <div className="track-library">
                <div className="track-library__header">
                    <button className="track-library__back-btn" onClick={closePlaylist}>
                        <BackIcon /> Back
                    </button>
                </div>

                <div className="track-library__playlist-header">
                    <span className="track-library__playlist-header-icon">{getPlaylistIcon(selectedPlaylist.type)}</span>
                    <div>
                        <h2 className="track-library__title">{selectedPlaylist.name}</h2>
                        <span className={`track-library__playlist-badge track-library__playlist-badge--${selectedPlaylist.type}`}>
                            {getPlaylistTypeName(selectedPlaylist.type)}
                        </span>
                        <span className="track-library__track-count">{selectedPlaylist.tracks.length} tracks</span>
                    </div>
                </div>

                {loadingPlaylist ? (
                    <div className="track-library__loading">Loading tracks...</div>
                ) : selectedPlaylist.tracks.length === 0 ? (
                    <div className="track-library__empty">
                        <p>No tracks in this playlist</p>
                    </div>
                ) : (
                    <div className="track-library__list">
                        {selectedPlaylist.tracks.map((track, index) => (
                            <button
                                key={track.id}
                                className="track-library__item"
                                onClick={() => playTrackFromPlaylist(track)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenuTrack(track);
                                    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
                                }}
                            >
                                <span className="track-library__number">{index + 1}</span>
                                <div className="track-library__icon">
                                    <MusicIcon />
                                </div>
                                <div className="track-library__info">
                                    <span className="track-library__track-title">{track.title}</span>
                                    <span className="track-library__artist">
                                        {track.artist || 'Unknown'}
                                        {track.uploaded_by_username && (
                                            <span className="track-library__uploader"> • Uploaded by {track.uploaded_by_username}</span>
                                        )}
                                    </span>
                                </div>
                                {track.predicted_genre && (
                                    <span className="track-library__genre">{track.predicted_genre}</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Context Menu for Playlist Detail */}
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    visible={contextMenu.visible}
                    onClose={() => setContextMenu({ ...contextMenu, visible: false })}
                    items={[
                        {
                            label: 'Play',
                            icon: '▶️',
                            onClick: () => contextMenuTrack && playTrackFromPlaylist(contextMenuTrack)
                        },
                        /* Delete option for uploaded tracks */
                        ...(contextMenuTrack && contextMenuTrack.uploaded_by_user_id === session.user?.id ? [{
                            label: 'Delete Song',
                            icon: '🗑️',
                            onClick: handleDeleteTrack
                        }] : []),
                        /* Remove from Playlist option */
                        ...(selectedPlaylist && (selectedPlaylist.type === 'manual' || selectedPlaylist.type === 'uploaded_songs') && contextMenuTrack ? [{
                            label: 'Remove from Playlist',
                            icon: '❌',
                            divider: true,
                            onClick: async () => {
                                if (!contextMenuTrack || !selectedPlaylist) return;
                                try {
                                    await fetch(`http://localhost:8000/playlists/${selectedPlaylist.id}/tracks/${contextMenuTrack.id}`, {
                                        method: 'DELETE'
                                    });
                                    // Refresh playlist
                                    openPlaylist(selectedPlaylist);
                                    showAlert({ title: 'Removed', description: 'Track removed from playlist' });
                                } catch (err) {
                                    console.error('Failed to remove track', err);
                                    showAlert({ title: 'Error', description: 'Failed to remove track' });
                                }
                            }
                        }] : [])
                    ]}
                />
            </div>
        );
    }


    const handleClassifyLibrary = async () => {
        setClassifying(true);
        try {
            const response = await fetch('http://localhost:8000/ml/classify-all', {
                method: 'POST',
            });
            if (response.ok) {
                const data = await response.json();
                setClassificationResult({
                    classified: data.classified,
                    total: data.total_tracks
                });
                // Refresh tracks to show new genres
                fetchData();

                // Clear success message after 5 seconds
                setTimeout(() => setClassificationResult(null), 5000);
            }
        } catch (err) {
            console.error('Classification failed:', err);
            setError('Failed to classify library');
        } finally {
            setClassifying(false);
        }
    };

    const handleGeneratePersonalizedPlaylist = async () => {
        setGenerating(true);
        try {
            const result = await generatePersonalizedPlaylist();

            // Show success alert
            showAlert({
                title: 'Playlist Created! 🎉',
                description: `Created "${result.name}" with ${result.track_count} tracks based on your listening history.`
            });

            // Refresh playlists to show new one
            await fetchData();

            // Auto-open the new playlist
            const newPlaylist: Playlist = {
                id: result.id,
                name: result.name,
                type: result.type,
                user_id: session.user!.id
            };
            openPlaylist(newPlaylist);

        } catch (err: any) {
            console.error('Failed to generate playlist:', err);
            const errorMsg = err.response?.data?.detail || 'Failed to generate personalized playlist. Please try again.';
            showAlert({
                title: 'Error',
                description: errorMsg
            });
        } finally {
            setGenerating(false);
        }
    };



    // Main Library View
    return (
        <div className="track-library">
            <div className="track-library__header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                <h2 className="track-library__title" style={{ margin: 0 }}>📚 Your Library</h2>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        className="track-library__action-btn"
                        onClick={handleGeneratePersonalizedPlaylist}
                        disabled={generating}
                        style={{
                            padding: '0.5rem 1.25rem',
                            background: generating ? '#666' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            cursor: generating ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            boxShadow: generating ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {generating ? '✨ Generating...' : '🎵 Generate My Playlist'}
                    </button>
                    <button
                        className="track-library__action-btn"
                        onClick={handleClassifyLibrary}
                        disabled={classifying}
                        style={{
                            padding: '0.5rem 1rem',
                            background: classifying ? '#666' : '#1db954',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            cursor: classifying ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}
                    >
                        {classifying ? '✨ Classifying...' : '✨ Classify Library'}
                    </button>
                </div>
            </div>

            {classificationResult && (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(29, 185, 84, 0.1)',
                    border: '1px solid #1db954',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    color: '#fff'
                }}>
                    ✅ Successfully classified {classificationResult.classified} of {classificationResult.total} tracks!
                </div>
            )}

            <div className="track-library__tabs">
                <button
                    className={`track-library__tab ${activeTab === 'playlists' ? 'track-library__tab--active' : ''}`}
                    onClick={() => setActiveTab('playlists')}
                >
                    Playlists ({playlists.length})
                </button>
                <button
                    className={`track-library__tab ${activeTab === 'tracks' ? 'track-library__tab--active' : ''}`}
                    onClick={() => setActiveTab('tracks')}
                >
                    All Tracks ({tracks.length})
                </button>
            </div>

            {activeTab === 'playlists' && (
                <div className="track-library__playlists">
                    {playlists.length === 0 ? (
                        <div className="track-library__empty">
                            <p>No playlists yet</p>
                            <p className="track-library__empty-hint">Like songs or upload tracks to create playlists</p>
                        </div>
                    ) : (
                        <div className="track-library__playlist-grid">
                            {playlists.map((playlist) => (
                                <button
                                    key={playlist.id}
                                    className="track-library__playlist-card"
                                    onClick={() => openPlaylist(playlist)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setContextMenuPlaylist(playlist);
                                        setContextMenuTrack(null); // Clear track selection
                                        setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
                                    }}
                                >
                                    <div className="track-library__playlist-icon">
                                        {getPlaylistIcon(playlist.type)}
                                    </div>
                                    <div className="track-library__playlist-info">
                                        <h3>{playlist.name}</h3>
                                        <span className={`track-library__playlist-badge track-library__playlist-badge--${playlist.type}`}>
                                            {getPlaylistTypeName(playlist.type)}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'tracks' && (
                <div className="track-library__tracks">
                    {/* Genre Filter Dropdown */}
                    <div className="track-library__filter-bar">
                        <label className="track-library__filter-label">Filter by Genre:</label>
                        <select
                            className="track-library__filter-select"
                            value={genreFilter}
                            onChange={(e) => setGenreFilter(e.target.value)}
                        >
                            <option value="all">All Genres ({tracks.length} tracks)</option>
                            {availableGenres.map(genre => (
                                <option key={genre} value={genre}>
                                    {genre} ({tracks.filter(t => t.predicted_genre === genre).length})
                                </option>
                            ))}
                        </select>
                    </div>

                    {filteredTracks.length === 0 ? (
                        <div className="track-library__empty">
                            <p>No tracks found{genreFilter !== 'all' ? ` for genre "${genreFilter}"` : ''}</p>
                        </div>
                    ) : (
                        <div className="track-library__list">
                            {filteredTracks.map((track, index) => (
                                <button
                                    key={track.id}
                                    className="track-library__item"
                                    onClick={() => onTrackSelect(track, filteredTracks)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setContextMenuTrack(track);
                                        setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
                                    }}
                                >
                                    <span className="track-library__number">{index + 1}</span>
                                    <div className="track-library__icon">
                                        <MusicIcon />
                                    </div>
                                    <div className="track-library__info">
                                        <span className="track-library__track-title">{track.title}</span>
                                        <span className="track-library__artist">
                                            {track.artist || 'Unknown'}
                                            {track.uploaded_by_username && (
                                                <span className="track-library__uploader"> • Uploaded by {track.uploaded_by_username}</span>
                                            )}
                                        </span>
                                    </div>
                                    {track.predicted_genre && (
                                        <span className="track-library__genre">{track.predicted_genre}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Context Menu and Modals */}
            <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                visible={contextMenu.visible}
                onClose={() => setContextMenu({ ...contextMenu, visible: false })}
                items={contextMenuPlaylist ? [
                    {
                        label: 'Open',
                        icon: '📂',
                        onClick: () => openPlaylist(contextMenuPlaylist)
                    },
                    {
                        label: 'Rename',
                        icon: '✏️',
                        onClick: () => setShowRenameModal(true)
                    },
                    ...(contextMenuPlaylist.type !== 'uploaded_songs' && contextMenuPlaylist.type !== 'liked_songs' ? [{
                        label: 'Delete',
                        icon: '🗑️',
                        onClick: handleDeletePlaylist
                    }] : [])
                ] : [
                    {
                        label: 'Add to playlist...',
                        icon: '➕',
                        onClick: () => {
                            setPlaylistModalMode('list');
                            setShowPlaylistModal(true);
                        }
                    },
                    {
                        label: 'Play',
                        icon: '▶️',
                        onClick: () => contextMenuTrack && onTrackSelect(contextMenuTrack, tracks)
                    },
                    /* Delete option for uploaded tracks */
                    ...(contextMenuTrack && contextMenuTrack.uploaded_by_user_id === session.user?.id ? [{
                        label: 'Delete Song',
                        icon: '🗑️',
                        onClick: handleDeleteTrack
                    }] : [])
                ]}
            />

            <AddToPlaylistModal
                isOpen={showPlaylistModal}
                onClose={() => setShowPlaylistModal(false)}
                track={contextMenuTrack ? { id: contextMenuTrack.id, title: contextMenuTrack.title, artist: contextMenuTrack.artist } : null}
                initialMode={playlistModalMode}
            />

            <RenamePlaylistModal
                isOpen={showRenameModal}
                onClose={() => setShowRenameModal(false)}
                playlist={contextMenuPlaylist}
                onRenameSuccess={fetchData}
                currentUserId={session.user?.id || 0}
            />
        </div>
    );
}
