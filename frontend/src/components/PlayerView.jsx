/**
 * PlayerView Component
 * Main music player interface with audio controls and event logging
 */
import React, { useState, useEffect, useRef } from 'react';
import { getTracks, getAudioUrl, logEvent } from '../api/musicApi';

function PlayerView({ user }) {
    const [tracks, setTracks] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [loading, setLoading] = useState(true);

    const audioRef = useRef(null);

    useEffect(() => {
        loadTracks();
    }, []);

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
        setIsLiked(false);
    };

    const handleLike = () => {
        setIsLiked(!isLiked);
        logLikeEvent();
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

    if (loading) {
        return <div className="player-view loading">Loading tracks...</div>;
    }

    if (!currentTrack) {
        return <div className="player-view">No tracks available</div>;
    }

    return (
        <div className="player-view">
            <div className="player-card">
                <h2>Now Playing</h2>

                {/* Track Metadata */}
                <div className="track-info">
                    <h3 className="track-title">{currentTrack.title}</h3>
                    <p className="track-artist">{currentTrack.artist}</p>
                    <p className="track-genre">
                        Genre: {currentTrack.predicted_genre || 'Not predicted yet'}
                    </p>
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

                {/* Educational Notice */}
                <div className="info-box">
                    <p>
                        <strong>Event Logging:</strong> Your listening activity is recorded
                        to improve future recommendations.
                    </p>
                    <p className="events-logged">
                        Events logged: Play, Pause, Skip, Like
                    </p>
                </div>
            </div>
        </div>
    );
}

export default PlayerView;
