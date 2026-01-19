/**
 * Home Page - Premium Edition
 * Main observatory interface with interactive cursor background
 */

import { useState } from 'react';
import { useSession } from '../hooks/useSession';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import SessionHeader from '../components/header/SessionHeader';
import Sidebar, { type ViewType } from '../components/sidebar/Sidebar';
import InteractiveBackground from '../components/background/InteractiveBackground';
import ActiveTrackPanel from '../components/track/ActiveTrackPanel';
import MetricsPanel from '../components/metrics/MetricsPanel';
import PlaylistStrip from '../components/playlists/PlaylistStrip';
import ControlDock from '../components/controls/ControlDock';
import type { Track } from '../types';
import './Home.css';

export default function Home() {
  const { session, clearSession } = useSession();
  const { setQueue, play, currentTrack } = useAudioPlayer();
  const [activeView, setActiveView] = useState<ViewType>('nowPlaying');

  const handleLogout = () => {
    clearSession();
    window.location.href = '/login';
  };

  const handleTrackSelect = (trackId: number, playlistTracks: Track[]) => {
    const trackIndex = playlistTracks.findIndex((t) => t.id === trackId);
    if (trackIndex !== -1) {
      setQueue(playlistTracks, trackIndex);
      play(playlistTracks[trackIndex]);
      setActiveView('nowPlaying');
    }
  };

  if (!session.user) {
    return null;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'nowPlaying':
        return <ActiveTrackPanel track={currentTrack} />;
      case 'metrics':
        return <MetricsPanel userId={session.user!.id} />;
      case 'playlists':
        return <PlaylistStrip userId={session.user!.id} onTrackSelect={handleTrackSelect} />;
      default:
        return <ActiveTrackPanel track={currentTrack} />;
    }
  };

  return (
    <div className="home-page">
      {/* Interactive Cursor-Following Background */}
      <InteractiveBackground />

      <SessionHeader user={session.user} onLogout={handleLogout} />

      <div className="home-page__body">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <main className="home-page__main">
          <div className="home-page__content">
            {renderContent()}
          </div>
        </main>
      </div>

      <ControlDock />
    </div>
  );
}
