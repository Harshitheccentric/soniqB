/**
 * PlaylistCard Component
 * Individual playlist card with track list
 */

import { useState } from 'react';
import type { PlaylistWithTracks, Track } from '../../types';
import Surface from '../common/Surface';
import './PlaylistCard.css';

interface PlaylistCardProps {
  playlist: PlaylistWithTracks;
  onTrackSelect: (trackId: number, playlistTracks: Track[]) => void;
}

export default function PlaylistCard({ playlist, onTrackSelect }: PlaylistCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleTrackClick = (trackId: number) => {
    onTrackSelect(trackId, playlist.tracks);
  };

  return (
    <Surface variant="raised" padding="md" className="playlist-card">
      <div
        className="playlist-card__header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && setExpanded(!expanded)}
      >
        <div className="playlist-card__icon">
          {playlist.type === 'liked' ? '💖' : '📋'}
        </div>
        <div className="playlist-card__info">
          <h3 className="playlist-card__name">{playlist.name}</h3>
          <p className="playlist-card__count">{playlist.tracks.length} tracks</p>
        </div>
        <div className="playlist-card__toggle">
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {expanded && (
        <div className="playlist-card__tracks">
          {playlist.tracks.map((track: Track, index: number) => (
            <div
              key={track.id}
              className="playlist-card__track"
              onClick={() => handleTrackClick(track.id)}
              role="button"
              tabIndex={0}
            >
              <span className="playlist-card__track-number">{index + 1}</span>
              <div className="playlist-card__track-info">
                <div className="playlist-card__track-title">{track.title}</div>
                <div className="playlist-card__track-artist">{track.artist}</div>
              </div>
              {track.predicted_genre && (
                <span className="playlist-card__track-genre">{track.predicted_genre}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}
