/**
 * App Component
 * Main application with routing and global providers
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './hooks/useSession.tsx';
import { AudioPlayerProvider } from './hooks/useAudioPlayer';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { useEventLogger } from './hooks/useEventLogger';
import LandingPage from './pages/LandingPage';
import LoginPage from './auth/LoginPage';
import Home from './pages/Home';
import './styles/theme.css';
import './styles/globals.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session } = useSession();

  if (!session.isAuthenticated) {
    return <Navigate to="/signin" replace />;
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
  useEventLogger({
    user: session.user,
    enabled: session.isAuthenticated,
  });

  return <>{children}</>;
}

function AppContent() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<LoginPage />} />

      {/* Protected Routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SidebarProvider>
          <SessionProvider>
            <AudioPlayerProvider>
              <EventLoggerWrapper>
                <AppContent />
              </EventLoggerWrapper>
            </AudioPlayerProvider>
          </SessionProvider>
        </SidebarProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
