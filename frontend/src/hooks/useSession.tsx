/**
 * useSession Hook
 * Simplified session management for identity anchoring
 * No JWT tokens - just user identity for event logging
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, SessionState } from '../types';

const CURRENT_USER_KEY = 'soniq_user';

interface SessionContextValue {
  session: SessionState;
  initializeSession: (user: User) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({
    user: null,
    isAuthenticated: false,
    token: null, // Kept for type compatibility, always null
  });

  // Initialize session from localStorage on mount
  useEffect(() => {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);

    if (userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        setSession({
          user,
          isAuthenticated: true,
          token: null,
        });
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
  }, []);

  // Initialize session (identity anchoring - no token needed)
  const initializeSession = useCallback((user: User) => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    
    setSession({
      user,
      isAuthenticated: true,
      token: null,
    });
  }, []);

  // Clear session from localStorage and state
  const clearSession = useCallback(() => {
    localStorage.removeItem(CURRENT_USER_KEY);
    
    setSession({
      user: null,
      isAuthenticated: false,
      token: null,
    });
  }, []);

  const value: SessionContextValue = {
    session,
    initializeSession,
    clearSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
