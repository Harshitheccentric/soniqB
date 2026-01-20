/**
 * Home Page - Premium Edition
 * Main observatory interface with collapsible sidebar
 */

import { useState } from 'react';
import { useSession } from '../hooks/useSession';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useSidebar } from '../context/SidebarContext';
import SessionHeader from '../components/header/SessionHeader';
import Sidebar, { type ViewType } from '../components/sidebar/Sidebar';
import InteractiveBackground from '../components/background/InteractiveBackground';
import ActiveTrackPanel from '../components/track/ActiveTrackPanel';
import MetricsPanel from '../components/metrics/MetricsPanel';
import TrackLibrary from '../components/library/TrackLibrary';
import ControlDock from '../components/controls/ControlDock';
import type { Track } from '../types';
import './Home.css';

export default function Home() {
  const { session, clearSession } = useSession();
  const { setQueue, play, currentTrack } = useAudioPlayer();
  const { isOpen: sidebarOpen } = useSidebar();
  const [activeView, setActiveView] = useState<ViewType>('nowPlaying');

  const handleLogout = () => {
    clearSession();
    window.location.href = '/signin';
  };

  const handleTrackSelect = (track: Track, allTracks: Track[]) => {
    const trackIndex = allTracks.findIndex((t) => t.id === track.id);
    if (trackIndex !== -1) {
      setQueue(allTracks, trackIndex);
      play(allTracks[trackIndex]);
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
        return <TrackLibrary onTrackSelect={handleTrackSelect} />;
      default:
        return <ActiveTrackPanel track={currentTrack} />;
    }
  };

  return (
    <div className={`home-page ${sidebarOpen ? 'home-page--sidebar-open' : 'home-page--sidebar-closed'}`}>
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
