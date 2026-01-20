/**
 * ControlDock Component - Premium Edition
 * Floating control bar with dynamic positioning based on sidebar
 */

import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useSidebar } from '../../context/SidebarContext';
import './ControlDock.css';

// Premium SVG Icons
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

export default function ControlDock() {
  const { currentTrack, isPlaying, currentTime, duration, play, pause, skip, seekTo, volume, setVolume } = useAudioPlayer();
  const { isOpen: sidebarOpen } = useSidebar();

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    seekTo(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`control-dock ${sidebarOpen ? 'control-dock--sidebar-open' : 'control-dock--sidebar-closed'}`}>
      {/* Progress Bar - Now at top for better UX */}
      <div className="control-dock__progress">
        <div className="control-dock__progress-track">
          <div
            className="control-dock__progress-fill"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            disabled={!currentTrack}
            className="control-dock__progress-input"
            aria-label="Seek"
          />
        </div>
      </div>

      <div className="control-dock__main">
        {/* Track Info */}
        <div className="control-dock__track">
          <div className="control-dock__artwork">
            {currentTrack ? (
              <span className="control-dock__artwork-icon">♪</span>
            ) : (
              <span className="control-dock__artwork-empty">♪</span>
            )}
          </div>
          <div className="control-dock__info">
            {currentTrack ? (
              <>
                <div className="control-dock__title">{currentTrack.title}</div>
                <div className="control-dock__artist">{currentTrack.artist}</div>
              </>
            ) : (
              <div className="control-dock__empty">Select a track to play</div>
            )}
          </div>
        </div>

        {/* Transport Controls */}
        <div className="control-dock__controls">
          <button
            className="control-dock__btn control-dock__btn--secondary"
            onClick={() => seekTo(Math.max(0, currentTime - 15))}
            disabled={!currentTrack}
            aria-label="Rewind 15 seconds"
          >
            <RewindIcon />
            <span className="control-dock__btn-label">15</span>
          </button>

          <button
            className="control-dock__btn control-dock__btn--primary"
            onClick={() => (isPlaying ? pause() : play())}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            className="control-dock__btn control-dock__btn--secondary"
            onClick={() => seekTo(Math.min(duration, currentTime + 15))}
            disabled={!currentTrack}
            aria-label="Forward 15 seconds"
          >
            <ForwardIcon />
            <span className="control-dock__btn-label">15</span>
          </button>

          <button
            className="control-dock__btn control-dock__btn--ghost"
            onClick={skip}
            disabled={!currentTrack}
            aria-label="Skip"
          >
            <SkipIcon />
          </button>
        </div>

        {/* Time & Volume */}
        <div className="control-dock__right">
          <div className="control-dock__time">
            <span>{formatTime(currentTime)}</span>
            <span className="control-dock__time-separator">/</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="control-dock__volume">
            <VolumeIcon />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="control-dock__volume-slider"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
