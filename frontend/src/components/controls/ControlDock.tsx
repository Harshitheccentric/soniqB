/**
 * ControlDock Component - With Like Button
 * Floating control bar with like functionality
 */

import { useState, useEffect } from 'react';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useSession } from '../../hooks/useSession';
import { useSidebar } from '../../context/SidebarContext';
import api from '../../api/musicApi';
import './ControlDock.css';

// SVG Icons
const PlayIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
);

const PauseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
);

const RewindIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 19 2 12 11 5 11 19" />
        <polygon points="22 19 13 12 22 5 22 19" />
    </svg>
);

const ForwardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 19 22 12 13 5 13 19" />
        <polygon points="2 19 11 12 2 5 2 19" />
    </svg>
);

const SkipIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 4 15 12 5 20 5 4" />
        <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
);

const VolumeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
);

const HeartIcon = ({ filled }: { filled: boolean }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "#e91e63" : "none"} stroke={filled ? "#e91e63" : "currentColor"} strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

export default function ControlDock() {
    const { currentTrack, isPlaying, currentTime, duration, play, pause, skip, seekTo, volume, setVolume } = useAudioPlayer();
    const { session } = useSession();
    const { isOpen: sidebarOpen } = useSidebar();
    const [likedTrackIds, setLikedTrackIds] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Load liked tracks on mount and when user changes
    useEffect(() => {
        if (session.user) {
            loadLikedTracks();
        }
    }, [session.user]);

    const loadLikedTracks = async () => {
        try {
            const ids = await api.getLikedTrackIds();
            setLikedTrackIds(ids);
        } catch (e) {
            console.error('Failed to load liked tracks:', e);
        }
    };

    const isCurrentTrackLiked = currentTrack ? likedTrackIds.includes(currentTrack.id) : false;

    const toggleLike = async () => {
        if (!currentTrack || !session.user || isProcessing) return;

        setIsProcessing(true);

        try {
            if (isCurrentTrackLiked) {
                // UNLIKE: Find playlist and remove track
                const playlists = await api.getPlaylists(session.user.id);
                const likedPlaylist = playlists.find((p: any) => p.type === 'liked_songs');
                if (likedPlaylist) {
                    await api.removeTrackFromPlaylist(likedPlaylist.id, currentTrack.id);
                    setLikedTrackIds(prev => prev.filter(id => id !== currentTrack.id));
                }
            } else {
                // LIKE: Post event (backend auto-creates Liked Songs playlist)
                await api.logEvent({
                    user_id: session.user.id,
                    track_id: currentTrack.id,
                    event_type: 'like',
                    listened_duration: 0.0
                });
                setLikedTrackIds(prev => [...prev, currentTrack.id]);
            }
        } catch (e) {
            console.error('Failed to toggle like:', e);
        } finally {
            setIsProcessing(false);
        }
    };

    const formatTime = (sec: number) => {
        if (isNaN(sec)) return '0:00';
        return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`control-dock ${sidebarOpen ? 'control-dock--sidebar-open' : 'control-dock--sidebar-closed'}`}>
            <div className="control-dock__progress">
                <div className="control-dock__progress-track">
                    <div className="control-dock__progress-fill" style={{ width: `${progress}%` }} />
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="0.1"
                        value={currentTime}
                        onChange={(e) => seekTo(parseFloat(e.target.value))}
                        disabled={!currentTrack}
                        className="control-dock__progress-input"
                    />
                </div>
            </div>

            <div className="control-dock__main">
                <div className="control-dock__track">
                    <div className="control-dock__artwork">
                        <span className="control-dock__artwork-icon">♪</span>
                    </div>
                    <div className="control-dock__info">
                        {currentTrack ? (
                            <>
                                <div className="control-dock__title">{currentTrack.title}</div>
                                <div className="control-dock__artist">{currentTrack.artist}</div>
                            </>
                        ) : (
                            <div className="control-dock__empty">Select a track</div>
                        )}
                    </div>
                    {currentTrack && (
                        <button
                            type="button"
                            className={`control-dock__like-btn ${isCurrentTrackLiked ? 'control-dock__like-btn--liked' : ''}`}
                            onClick={toggleLike}
                            disabled={isProcessing}
                            title={isCurrentTrackLiked ? 'Unlike' : 'Like'}
                        >
                            <HeartIcon filled={isCurrentTrackLiked} />
                        </button>
                    )}
                </div>

                <div className="control-dock__controls">
                    <button className="control-dock__btn control-dock__btn--secondary" onClick={() => seekTo(Math.max(0, currentTime - 15))} disabled={!currentTrack}>
                        <RewindIcon /><span className="control-dock__btn-label">15</span>
                    </button>
                    <button className="control-dock__btn control-dock__btn--primary" onClick={() => isPlaying ? pause() : play()} disabled={!currentTrack}>
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <button className="control-dock__btn control-dock__btn--secondary" onClick={() => seekTo(Math.min(duration, currentTime + 15))} disabled={!currentTrack}>
                        <ForwardIcon /><span className="control-dock__btn-label">15</span>
                    </button>
                    <button className="control-dock__btn control-dock__btn--ghost" onClick={skip} disabled={!currentTrack}>
                        <SkipIcon />
                    </button>
                </div>

                <div className="control-dock__right">
                    <div className="control-dock__time">
                        <span>{formatTime(currentTime)}</span>
                        <span className="control-dock__time-separator">/</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                    <div className="control-dock__volume">
                        <VolumeIcon />
                        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="control-dock__volume-slider" />
                    </div>
                </div>
            </div>
        </div>
    );
}
