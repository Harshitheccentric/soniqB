import { createContext, useState, useRef, useEffect, type ReactNode } from 'react';
import type { Track, AudioPlayerState } from '../types';
import axios from 'axios';

export interface AudioPlayerContextValue extends AudioPlayerState {
    // Playback controls
    play: (track?: Track) => void;
    pause: () => void;
    skip: () => void;
    seekTo: (time: number) => void;
    setVolume: (volume: number) => void;

    // Queue management
    setQueue: (tracks: Track[], startIndex?: number) => void;
    addToQueue: (track: Track) => void;
    clearQueue: () => void;

    // Audio element ref
    audioRef: React.RefObject<HTMLAudioElement>;

    // Playback events
    onPlay?: () => void;
    onPause?: () => void;
    onSkip?: () => void;
    onSeek?: (fromTime: number, toTime: number) => void;
    onTrackEnd?: () => void;
}

export const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

interface AudioPlayerProviderProps {
    children: ReactNode;
    onPlay?: () => void;
    onPause?: () => void;
    onSkip?: () => void;
    onSeek?: (fromTime: number, toTime: number) => void;
    onTrackEnd?: () => void;
}

export function AudioPlayerProvider({
    children,
    onPlay: onPlayCallback,
    onPause: onPauseCallback,
    onSkip: onSkipCallback,
    onSeek: onSeekCallback,
    onTrackEnd: onTrackEndCallback,
}: AudioPlayerProviderProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const skippedTrackIds = useRef<number[]>([]);

    const [state, setState] = useState<AudioPlayerState>({
        currentTrack: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 0.7,
        queue: [],
        queueIndex: -1,
    });

    // Play track or resume
    const play = (track?: Track) => {
        if (track) {
            // Play new track
            setState(prev => ({
                ...prev,
                currentTrack: track,
                isPlaying: true,
                currentTime: 0,
            }));
            onPlayCallback?.();
        } else if (audioRef.current) {
            // Resume current track
            audioRef.current.play();
            setState(prev => ({ ...prev, isPlaying: true }));
            onPlayCallback?.();
        }
    };

    // Pause playback
    const pause = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setState(prev => ({ ...prev, isPlaying: false }));
            onPauseCallback?.();
        }
    };

    // Skip to next track
    const skip = async () => {
        const nextIndex = state.queueIndex + 1;

        // --- Skip Signal Logic ---
        if (state.currentTrack && state.currentTime < 30 && state.duration > 30) {
            console.log("Logged Skip Signal for user preference:", state.currentTrack.id);
            skippedTrackIds.current.push(state.currentTrack.id);
        }

        if (nextIndex < state.queue.length) {
            // Normal skip
            setState(prev => ({
                ...prev,
                queueIndex: nextIndex,
                currentTrack: state.queue[nextIndex],
                isPlaying: true,
                currentTime: 0,
            }));
            onSkipCallback?.();
        } else {
            // End of queue - Fetch Recommendation
            try {
                if (state.currentTrack) {
                    // Construct Query Params manually
                    const skipIds = skippedTrackIds.current;
                    const skipQuery = skipIds.length > 0
                        ? '&' + skipIds.map(id => `skipped_track_ids=${id}`).join('&')
                        : '';

                    const url = `/api/recommendations/next?current_track_id=${state.currentTrack.id}${skipQuery}`;

                    const { data: nextTrack } = await axios.get(url);

                    if (nextTrack) {
                        console.log("Auto-playing recommendation:", nextTrack.title);
                        // Add to queue and play
                        setState(prev => ({
                            ...prev,
                            queue: [...prev.queue, nextTrack],
                            queueIndex: nextIndex,
                            currentTrack: nextTrack,
                            isPlaying: true,
                            currentTime: 0
                        }));
                        return;
                    }
                }
            } catch (err) {
                console.error("Failed to fetch recommendation:", err);
            }

            // Fallback if no recommendation or error
            pause();
        }
    };

    // Seek to specific time
    const seekTo = (time: number) => {
        if (audioRef.current) {
            const fromTime = audioRef.current.currentTime;
            audioRef.current.currentTime = time;
            setState(prev => ({ ...prev, currentTime: time }));
            onSeekCallback?.(fromTime, time);
        }
    };

    // Set volume
    const setVolume = (volume: number) => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
            setState(prev => ({ ...prev, volume }));
        }
    };

    // Set queue and optionally start playing
    const setQueue = (tracks: Track[], startIndex: number = 0) => {
        const index = Math.max(0, Math.min(startIndex, tracks.length - 1));
        setState(prev => ({
            ...prev,
            queue: tracks,
            queueIndex: index,
            currentTrack: tracks[index] || null,
        }));
    };

    // Add track to queue
    const addToQueue = (track: Track) => {
        setState(prev => ({
            ...prev,
            queue: [...prev.queue, track],
        }));
    };

    // Clear queue
    const clearQueue = () => {
        setState(prev => ({
            ...prev,
            queue: [],
            queueIndex: -1,
            currentTrack: null,
        }));
    };

    // Update current time during playback
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => {
            setState(prev => ({ ...prev, currentTime: audio.currentTime }));
        };

        const updateDuration = () => {
            setState(prev => ({ ...prev, duration: audio.duration }));
        };

        const handleEnded = () => {
            onTrackEndCallback?.();
            skip();
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []); // eslint-disable-line

    // Update audio src when track changes
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !state.currentTrack) return;

        const audioUrl = `http://localhost:8000/audio/${state.currentTrack.id}`;
        audio.src = audioUrl;
        audio.volume = state.volume;

        if (state.isPlaying) {
            audio.play().catch(err => {
                console.error('Audio playback failed:', err);
                setState(prev => ({ ...prev, isPlaying: false }));
            });
        }
    }, [state.currentTrack]); // eslint-disable-line

    // Sync playing state with audio element
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (state.isPlaying) {
            audio.play().catch(err => {
                console.error('Audio playback failed:', err);
                setState(prev => ({ ...prev, isPlaying: false }));
            });
        } else {
            audio.pause();
        }
    }, [state.isPlaying]); // eslint-disable-line

    const value: AudioPlayerContextValue = {
        ...state,
        play,
        pause,
        skip,
        seekTo,
        setVolume,
        setQueue,
        addToQueue,
        clearQueue,
        audioRef: audioRef as React.RefObject<HTMLAudioElement>,
    };

    return (
        <AudioPlayerContext.Provider value={value}>
            {children}
            <audio ref={audioRef} style={{ display: 'none' }} />
        </AudioPlayerContext.Provider>
    );
}
