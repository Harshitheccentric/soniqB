/**
 * Enhanced TrackLibrary Component
 * Shows playlists with type badges, can open playlists to view/play tracks
 */

import { useState, useEffect } from 'react';
import { useSession } from '../../hooks/useSession';
import type { Track } from '../../types';
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
        default: return '🎶';
    }
};

const getPlaylistTypeName = (type: string) => {
    switch (type) {
        case 'liked_songs': return 'Liked';
        case 'uploaded_songs': return 'Uploaded';
        case 'manual': return 'Manual';
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
        );
    }

    // Main Library View
    return (
        <div className="track-library">
            <h2 className="track-library__title">📚 Your Library</h2>

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
                    {tracks.length === 0 ? (
                        <div className="track-library__empty">
                            <p>No tracks found</p>
                        </div>
                    ) : (
                        <div className="track-library__list">
                            {tracks.map((track, index) => (
                                <button
                                    key={track.id}
                                    className="track-library__item"
                                    onClick={() => onTrackSelect(track, tracks)}
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
        </div>
    );
}
