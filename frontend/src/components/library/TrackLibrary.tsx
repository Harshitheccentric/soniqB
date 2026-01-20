/**
 * TrackLibrary Component
 * Shows all available tracks when there are no playlists
 */

import { useState, useEffect } from 'react';
import type { Track } from '../../types';
import './TrackLibrary.css';

interface TrackLibraryProps {
    onTrackSelect: (track: Track, allTracks: Track[]) => void;
}

// Music icon for tracks
const MusicIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
    </svg>
);

export default function TrackLibrary({ onTrackSelect }: TrackLibraryProps) {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTracks();
    }, []);

    const fetchTracks = async () => {
        try {
            const response = await fetch('http://localhost:8000/tracks');
            if (!response.ok) {
                throw new Error(`Failed to fetch tracks: ${response.status}`);
            }
            const data = await response.json();
            setTracks(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch tracks:', err);
            setError('Failed to load tracks');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="track-library">
                <h2 className="track-library__title">🎵 Track Library</h2>
                <div className="track-library__loading">Loading tracks...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="track-library">
                <h2 className="track-library__title">🎵 Track Library</h2>
                <div className="track-library__error">{error}</div>
            </div>
        );
    }

    if (tracks.length === 0) {
        return (
            <div className="track-library">
                <h2 className="track-library__title">🎵 Track Library</h2>
                <div className="track-library__empty">
                    <p>No tracks found</p>
                    <p className="track-library__empty-hint">Add audio files to backend/storage/audio/ and run the scan</p>
                </div>
            </div>
        );
    }

    return (
        <div className="track-library">
            <h2 className="track-library__title">🎵 Track Library</h2>
            <p className="track-library__count">{tracks.length} tracks available</p>

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
                            <span className="track-library__artist">{track.artist || 'Unknown Artist'}</span>
                        </div>
                        {track.predicted_genre && (
                            <span className="track-library__genre">{track.predicted_genre}</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
