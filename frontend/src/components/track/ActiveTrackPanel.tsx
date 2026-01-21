/**
 * ActiveTrackPanel Component - Premium Edition
 * Visual representation with waveform visualization
 */

import { useState } from 'react';
import type { Track } from '../../types';
import { getAlbumArtUrl } from '../../api/musicApi';
import ContextMenu from '../common/ContextMenu';
import AddToPlaylistModal from '../common/AddToPlaylistModal';
import './ActiveTrackPanel.css';

interface ActiveTrackPanelProps {
  track: Track | null;
}

export default function ActiveTrackPanel({ track }: ActiveTrackPanelProps) {
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number }>({ visible: false, x: 0, y: 0 });
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistModalMode, setPlaylistModalMode] = useState<'create' | 'list'>('create');

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
    <div
      className="active-track-panel"
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
      }}
    >
      <div className="active-track-panel__artwork">
        <img
          src={getAlbumArtUrl(track.id)}
          alt={track.title}
          className="active-track-panel__artwork-img"
          onError={(e: any) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
        <div className="active-track-panel__artwork-placeholder" style={{ display: 'none' }}>
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

      {/* Context Menu and Modals */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        items={[
          {
            label: 'Create new playlist',
            icon: '➕',
            onClick: () => {
              setPlaylistModalMode('create');
              setShowPlaylistModal(true);
            }
          },
          {
            label: 'Add to playlist...',
            icon: '🎵',
            onClick: () => {
              setPlaylistModalMode('list');
              setShowPlaylistModal(true);
            }
          }
        ]}
      />

      <AddToPlaylistModal
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        track={track}
        initialMode={playlistModalMode}
      />
    </div>
  );
}
