/**
 * PlayerView Component
 * Main music player interface with audio controls and event logging
 * Includes ML calibration (Phase 3) to "teach" the model genres
 */
import React, { useState, useEffect, useRef } from 'react';
import { getTracks, getAudioUrl, logEvent, calibrateTrack, getLikedTrackIds, getPlaylists, removeTrackFromPlaylist } from '../api/musicApi';

function PlayerView({ user, selectedTrack }) {
    const [tracks, setTracks] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [likedTrackIds, setLikedTrackIds] = useState(new Set());
    const [likedPlaylistId, setLikedPlaylistId] = useState(null);

    // ML Calibration states
    const [showCalibration, setShowCalibration] = useState(false);
    const [calibrationGenre, setCalibrationGenre] = useState('');
    const [calibrating, setCalibrating] = useState(false);

    const audioRef = useRef(null);

    useEffect(() => {
        loadTracks();
        loadLikedTracks();
    }, []);

    // Load liked tracks to check like status
    const loadLikedTracks = async () => {
        try {
            const trackIds = await getLikedTrackIds();
            setLikedTrackIds(new Set(trackIds));
            
            // Also get the liked playlist ID for unlike functionality
            const playlists = await getPlaylists(user.id);
            const likedPlaylist = playlists.find(p => p.type === 'liked_songs');
            if (likedPlaylist) {
                setLikedPlaylistId(likedPlaylist.id);
            }
        } catch (err) {
            console.error('Error loading liked tracks:', err);
        }
    };

    // Check if current track is liked whenever track changes
    useEffect(() => {
        if (currentTrack) {
            setIsLiked(likedTrackIds.has(currentTrack.id));
        }
    }, [currentTrackIndex, likedTrackIds, tracks]);

    // Handle track selection from playlists
    useEffect(() => {
        if (selectedTrack && tracks.length > 0) {
            const trackIndex = tracks.findIndex(t => t.id === selectedTrack.id);
            if (trackIndex !== -1) {
                setCurrentTrackIndex(trackIndex);
                setIsPlaying(false);
                setShowCalibration(false);
                // Auto-play the selected track
                setTimeout(() => {
                    if (audioRef.current) {
                        audioRef.current.play();
                        setIsPlaying(true);
                        logPlayEvent();
                    }
                }, 100);
            }
        }
    }, [selectedTrack, tracks]);

    const loadTracks = async () => {
        try {
            setLoading(true);
            const data = await getTracks();
            setTracks(data);
        } catch (err) {
            console.error('Error loading tracks:', err);
        } finally {
            setLoading(false);
        }
    };

    const currentTrack = tracks[currentTrackIndex];

    // Event logging functions
    const logPlayEvent = async () => {
        if (!currentTrack) return;
        try {
            await logEvent({
                user_id: user.id,
                track_id: currentTrack.id,
                event_type: 'play',
                listened_duration: audioRef.current?.currentTime || 0
            });
            console.log('✓ Play event logged');
        } catch (err) {
            console.error('Error logging play event:', err);
        }
    };

    const logPauseEvent = async () => {
        if (!currentTrack) return;
        try {
            await logEvent({
                user_id: user.id,
                track_id: currentTrack.id,
                event_type: 'pause',
                listened_duration: audioRef.current?.currentTime || 0
            });
            console.log('✓ Pause event logged');
        } catch (err) {
            console.error('Error logging pause event:', err);
        }
    };

    const logSkipEvent = async () => {
        if (!currentTrack) return;
        try {
            await logEvent({
                user_id: user.id,
                track_id: currentTrack.id,
                event_type: 'skip',
                listened_duration: audioRef.current?.currentTime || 0
            });
            console.log('✓ Skip event logged');
        } catch (err) {
            console.error('Error logging skip event:', err);
        }
    };

    const logLikeEvent = async () => {
        if (!currentTrack) return;
        try {
            await logEvent({
                user_id: user.id,
                track_id: currentTrack.id,
                event_type: 'like',
                listened_duration: 0
            });
            console.log('✓ Like event logged');
        } catch (err) {
            console.error('Error logging like event:', err);
        }
    };

    // Player controls
    const handlePlayPause = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            logPauseEvent();
        } else {
            audioRef.current.play();
            logPlayEvent();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSkip = () => {
        logSkipEvent();
        const nextIndex = (currentTrackIndex + 1) % tracks.length;
        setCurrentTrackIndex(nextIndex);
        setIsPlaying(false);
        setShowCalibration(false);
    };

    const handleLike = async () => {
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);
        
        if (newLikedState) {
            // Like: Add to liked tracks set and log event
            setLikedTrackIds(prev => new Set([...prev, currentTrack.id]));
            await logLikeEvent();
        } else {
            // Unlike: Remove from liked tracks set and playlist
            setLikedTrackIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(currentTrack.id);
                return newSet;
            });
            
            if (likedPlaylistId) {
                try {
                    await removeTrackFromPlaylist(likedPlaylistId, currentTrack.id);
                    console.log('✓ Track removed from Liked Songs');
                } catch (err) {
                    console.error('Error removing track from playlist:', err);
                }
            }
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        const seekTime = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = seekTime;
            setCurrentTime(seekTime);
        }
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ML Calibration handler
    const handleCalibrate = async () => {
        if (!calibrationGenre.trim()) return;

        try {
            setCalibrating(true);
            await calibrateTrack(currentTrack.id, calibrationGenre);

            // Refresh tracks to show new genre
            await loadTracks();
            setShowCalibration(false);
            setCalibrationGenre('');
            alert(`Thanks! MusicFM has learned that this track is '${calibrationGenre}'.`);
        } catch (err) {
            console.error('Calibration failed:', err);
            alert('Calibration failed. Check console for details.');
        } finally {
            setCalibrating(false);
        }
    };

    if (loading) {
        return <div className="player-view loading">Loading tracks...</div>;
    }

    if (!currentTrack) {
        return <div className="player-view">No tracks available</div>;
    }

    const hasPredictedGenre = currentTrack.predicted_genre && currentTrack.predicted_genre !== 'Unknown';

    return (
        <div className="player-view">
            <div className="player-card">
                <h2>Now Playing</h2>

                {/* Track Metadata */}
                <div className="track-info">
                    <img
                        src="/album-placeholder.png"
                        alt="Album Art"
                        className="album-art"
                    />
                    <h3 className="track-title">{currentTrack.title}</h3>
                    <p className="track-artist">{currentTrack.artist}</p>

                    {hasPredictedGenre ? (
                        <div className="genre-badge">
                            Genre: {currentTrack.predicted_genre}
                            <span className="confidence">({Math.round((currentTrack.genre_confidence || 0) * 100)}%)</span>
                        </div>
                    ) : (
                        <div className="genre-badge unknown">
                            Genre: Not predicted yet
                        </div>
                    )}
                </div>

                {/* Audio Element */}
                <audio
                    ref={audioRef}
                    src={getAudioUrl(currentTrack.id)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleSkip}
                />

                {/* Progress Bar */}
                <div className="progress-section">
                    <span className="time">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        className="seek-bar"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                    />
                    <span className="time">{formatTime(duration)}</span>
                </div>

                {/* Player Controls */}
                <div className="player-controls">
                    <button
                        className={`like-btn ${isLiked ? 'liked' : ''}`}
                        onClick={handleLike}
                        title="Like this track"
                    >
                        ❤️ {isLiked ? 'Liked' : 'Like'}
                    </button>

                    <button
                        className="play-pause-btn"
                        onClick={handlePlayPause}
                    >
                        {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                    </button>

                    <button
                        className="skip-btn"
                        onClick={handleSkip}
                        title="Skip to next track"
                    >
                        ⏭️ Skip
                    </button>
                </div>

                {/* Track Counter */}
                <p className="track-counter">
                    Track {currentTrackIndex + 1} of {tracks.length}
                </p>

                {/* ML Calibration UI */}
                <div className="calibration-section">
                    {!showCalibration ? (
                        <button
                            className="calibrate-trigger"
                            onClick={() => setShowCalibration(true)}
                        >
                            🎓 Teach the Model (Calibrate)
                        </button>
                    ) : (
                        <div className="calibration-form">
                            <h4>What genre is this?</h4>
                            <div className="form-row">
                                <input
                                    type="text"
                                    placeholder="e.g. Rock, Techno, Jazz"
                                    value={calibrationGenre}
                                    onChange={(e) => setCalibrationGenre(e.target.value)}
                                    disabled={calibrating}
                                />
                                <button
                                    onClick={handleCalibrate}
                                    disabled={calibrating || !calibrationGenre.trim()}
                                >
                                    {calibrating ? 'Learning...' : 'Submit'}
                                </button>
                                <button
                                    className="cancel-btn"
                                    onClick={() => setShowCalibration(false)}
                                    disabled={calibrating}
                                >
                                    ✕
                                </button>
                            </div>
                            <p className="calibration-note">
                                This will extract the MusicFM embedding and use it as a reference for all future classification.
                            </p>
                        </div>
                    )}
                </div>

                {/* Educational Notice */}
                <div className="info-box ml-info">
                    <p>
                        <strong>🤖 Phase 3: MusicFM Lab</strong>
                    </p>
                    <p>
                        Since MusicFM is a foundation model, it needs "anchor" examples to connect its audio analysis to human labels.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default PlayerView;
