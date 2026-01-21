/**
 * ActiveTrackPanel Component - Premium Edition
 * Visual representation with waveform visualization
 */

import type { Track } from '../../types';
import './ActiveTrackPanel.css';

interface ActiveTrackPanelProps {
  track: Track | null;
}

export default function ActiveTrackPanel({ track }: ActiveTrackPanelProps) {
  if (!track) {
    return (
      <div className="active-track-panel active-track-panel--empty">
        <div className="active-track-panel__empty-state">
          <div className="active-track-panel__empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <p className="active-track-panel__empty-text">No track selected</p>
          <p className="active-track-panel__empty-hint">Browse your library and select a track to start listening</p>
        </div>
      </div>
    );
  }

  return (
    <div className="active-track-panel">
      <div className="active-track-panel__artwork">
        <div className="active-track-panel__artwork-placeholder">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
      </div>

      {/* Waveform Visualization */}
      <div className="active-track-panel__waveform">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="active-track-panel__wave-bar" />
        ))}
      </div>

      <div className="active-track-panel__meta">
        <h2 className="active-track-panel__title">{track.title}</h2>
        <p className="active-track-panel__artist">
          {track.artist}
          {track.uploaded_by_username && (
            <span className="active-track-panel__uploader"> • Uploaded by {track.uploaded_by_username}</span>
          )}
        </p>

        {track.predicted_genre && (
          <div className="active-track-panel__genre">
            <span className="genre-badge">
              {track.predicted_genre}
              {track.genre_confidence && (
                <span className="genre-badge__confidence">
                  {Math.round(track.genre_confidence * 100)}%
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
