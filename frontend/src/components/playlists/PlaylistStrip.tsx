/**
 * PlaylistStrip Component
 * Horizontal scrollable playlist cards
 */

import { useState, useEffect } from 'react';
import type { PlaylistWithTracks } from '../../types';
import Surface from '../common/Surface';
import PlaylistCard from './PlaylistCard';
import './PlaylistStrip.css';

interface PlaylistStripProps {
  userId: number;
  onTrackSelect: (trackId: number, playlistTracks: any[]) => void;
}

export default function PlaylistStrip({ userId, onTrackSelect }: PlaylistStripProps) {
  const [playlists, setPlaylists] = useState<PlaylistWithTracks[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaylists();
  }, [userId]);

  const fetchPlaylists = async () => {
    try {
      const response = await fetch(`http://localhost:8000/playlists/user/${userId}`);

      if (!response.ok) {
        // Handle non-200 responses gracefully
        console.warn(`Failed to fetch playlists: ${response.status}`);
        setPlaylists([]);
        return;
      }

      const data = await response.json();
      setPlaylists(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
      setPlaylists([]); // Set empty on error to prevent crash
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Surface variant="flat" padding="lg" className="playlist-strip">
        <div className="playlist-strip__loading">Loading playlists...</div>
      </Surface>
    );
  }

  if (playlists.length === 0) {
    return (
      <Surface variant="flat" padding="lg" className="playlist-strip">
        <div className="playlist-strip__empty">No playlists yet</div>
      </Surface>
    );
  }

  return (
    <div className="playlist-strip">
      <h2 className="playlist-strip__title">Your Playlists</h2>
      <div className="playlist-strip__scroll">
        {playlists.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            onTrackSelect={onTrackSelect}
          />
        ))}
      </div>
    </div>
  );
}
