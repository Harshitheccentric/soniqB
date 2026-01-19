/**
 * App Component
 * Main application with routing and global providers
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './hooks/useSession.tsx';
import { AudioPlayerProvider } from './hooks/useAudioPlayer';
import { ThemeProvider } from './context/ThemeContext';
import { useEventLogger } from './hooks/useEventLogger';
import LoginPage from './auth/LoginPage';
import Home from './pages/Home';
import './styles/theme.css';
import './styles/globals.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session } = useSession();

  if (!session.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * EventLoggerWrapper - Must be inside AudioPlayerProvider
 * This component connects event logging to the audio player
 */
function EventLoggerWrapper({ children }: { children: React.ReactNode }) {
  const { session } = useSession();

  // Event logging callbacks - now safely inside AudioPlayerProvider
  const {
    handlePlay,
    handlePause,
    handleSkip,
    handleSeek,
    handleTrackEnd,
  } = useEventLogger({
    user: session.user,
    enabled: session.isAuthenticated,
  });

  // Pass callbacks to AudioPlayerProvider via context or render props
  // For now, we just need to initialize the hook to enable logging

  return <>{children}</>;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SessionProvider>
          <AudioPlayerProvider>
            <EventLoggerWrapper>
              <AppContent />
            </EventLoggerWrapper>
          </AudioPlayerProvider>
        </SessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
