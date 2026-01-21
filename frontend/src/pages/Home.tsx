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
import Analysis from '../pages/Analysis';
import ControlDock from '../components/controls/ControlDock';
import UploadSong from '../components/UploadSong';
import IntroOverlay from '../components/IntroOverlay';
import type { Track } from '../types';
import './Home.css';

export default function Home() {
  const { session, clearSession } = useSession();
  const { setQueue, play, currentTrack } = useAudioPlayer();
  const { isOpen: sidebarOpen } = useSidebar();
  const [activeView, setActiveView] = useState<ViewType>('nowPlaying');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);

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

  const handleUploadComplete = (track: any) => {
    console.log('Upload complete:', track);
    setShowUploadModal(false);
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
      case 'analysis':
        return <Analysis />;
      case 'playlists':
        return <TrackLibrary onTrackSelect={handleTrackSelect} />;
      default:
        return <ActiveTrackPanel track={currentTrack} />;
    }
  };

  return (
    <div className={`home-page ${sidebarOpen ? 'home-page--sidebar-open' : 'home-page--sidebar-closed'}`}>
      {/* Intro Animation */}
      {!introSeen && <IntroOverlay onComplete={() => setIntroSeen(true)} />}

      {/* Interactive Cursor-Following Background */}
      <InteractiveBackground />

      <SessionHeader user={session.user} onLogout={handleLogout} />

      <div className="home-page__body">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          onUploadClick={() => setShowUploadModal(true)}
        />

        <main className="home-page__main">
          <div className="home-page__content">
            {renderContent()}
          </div>
        </main>
      </div>

      <ControlDock />

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadSong
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}
