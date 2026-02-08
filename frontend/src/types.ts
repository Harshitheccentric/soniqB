/**
 * TypeScript type definitions mirroring backend schemas.py
 * Ensures type safety across frontend-backend boundary.
 */

// ============================================
// User Types
// ============================================

export interface User {
  id: number;
  username: string;
  created_at: string; // ISO 8601 datetime string
}

export interface UserCreate {
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// ============================================
// Track Types
// ============================================

export interface Track {
  id: number;
  title: string;
  artist: string;
  audio_path: string;
  predicted_genre: string | null;
  genre_confidence: number | null;
  uploaded_by_username?: string;
  uploaded_by_user_id?: number;
}

// ============================================
// Event Types
// ============================================

export type EventType = 'play' | 'pause' | 'skip' | 'like' | 'unlike' | 'seek' | 'complete';

export interface EventCreate {
  user_id: number;
  track_id: number;
  event_type: EventType;
  listened_duration: number; // seconds, must be >= 0
}

export interface Event {
  id: number;
  user_id: number;
  track_id: number;
  event_type: string;
  listened_duration: number;
  timestamp: string; // ISO 8601 datetime string
}

// ============================================
// Playlist Types
// ============================================

export interface PlaylistTrackItem {
  track_id: number;
  position: number;
}

export interface PlaylistCreate {
  user_id: number;
  name: string;
  tracks: PlaylistTrackItem[];
}

export interface Playlist {
  id: number;
  user_id: number;
  name: string;
  type: 'liked' | 'manual';
  created_at: string; // ISO 8601 datetime string
}

export interface PlaylistWithTracks extends Playlist {
  tracks: Track[];
}

// ============================================
// ML Types
// ============================================

export interface GenrePrediction {
  track_id: number;
  predicted_genre: string;
  confidence: number;
}

export interface UserCluster {
  user_id: number;
  cluster_label: string;
  listening_profile: {
    total_plays: number;
    avg_duration: number;
    genre_diversity: number;
    skip_rate: number;
  };
}

export interface MLStatus {
  status: string;
  models_loaded: boolean;
  message: string;
}

// ============================================
// UI State Types
// ============================================

export interface AudioPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Track[];
  queueIndex: number;
}

export interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
}

export interface ListeningStats {
  total_plays: number;
  total_duration: number;
  total_likes: number;
  total_skips: number;
  genre_distribution: Record<string, number>;
  recent_events: Event[];
}

// ============================================
// Component Prop Types
// ============================================

export interface CommonComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface SurfaceProps extends CommonComponentProps {
  variant?: 'flat' | 'raised' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface IconButtonProps extends CommonComponentProps {
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'ghost' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel: string;
}

// ============================================
// API Response Wrappers
// ============================================

export interface APIResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface APIError {
  error: string;
  detail?: string;
  status: number;
}

// ============================================
// Antigravity Animation Props
// ============================================

export interface AntigravityProps {
  count?: number;
  magnetRadius?: number;
  ringRadius?: number;
  waveSpeed?: number;
  waveAmplitude?: number;
  particleSize?: number;
  lerpSpeed?: number;
  color?: string;
  autoAnimate?: boolean;
  particleVariance?: number;
  rotationSpeed?: number;
  depthFactor?: number;
  pulseSpeed?: number;
  particleShape?: 'capsule' | 'sphere' | 'box';
  fieldStrength?: number;
}
