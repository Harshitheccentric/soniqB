/**
 * useEventLogger Hook
 * Connects audio player lifecycle to event logging
 */

import { useEffect, useRef } from 'react';
import { useAudioPlayer } from './useAudioPlayer';
import { logEvent, createEventPayload } from '../api/eventLogger';
import type { User, EventType } from '../types';

interface UseEventLoggerOptions {
  user: User | null;
  enabled?: boolean;
}

export function useEventLogger({ user, enabled = true }: UseEventLoggerOptions) {
  const { currentTrack, currentTime } = useAudioPlayer();
  
  // Track playback start time for duration calculation
  const playStartTimeRef = useRef<number>(0);
  const lastEventTypeRef = useRef<EventType | null>(null);

  /**
   * Log event with current listened duration
   */
  const logListeningEvent = async (eventType: EventType) => {
    if (!enabled || !user || !currentTrack) {
      console.warn('[Event Logger] Cannot log event - missing user or track');
      return;
    }

    const listenedDuration = currentTime - playStartTimeRef.current;
    
    try {
      const payload = createEventPayload(
        user.id,
        currentTrack.id,
        eventType,
        listenedDuration
      );
      
      await logEvent(payload);
      lastEventTypeRef.current = eventType;
      
      // Reset start time after logging
      playStartTimeRef.current = currentTime;
    } catch (error) {
      console.error(`[Event Logger] Failed to log ${eventType} event:`, error);
    }
  };

  /**
   * Handle play event
   */
  const handlePlay = () => {
    playStartTimeRef.current = currentTime;
    logListeningEvent('play');
  };

  /**
   * Handle pause event
   */
  const handlePause = () => {
    if (lastEventTypeRef.current !== 'pause') {
      logListeningEvent('pause');
    }
  };

  /**
   * Handle skip event
   */
  const handleSkip = () => {
    logListeningEvent('skip');
  };

  /**
   * Handle seek event
   */
  const handleSeek = (fromTime: number, toTime: number) => {
    // Log seek as a special event with duration = 0
    if (!enabled || !user || !currentTrack) return;

    const seekDistance = Math.abs(toTime - fromTime);
    
    // Only log significant seeks (> 5 seconds)
    if (seekDistance > 5) {
      try {
        const payload = createEventPayload(
          user.id,
          currentTrack.id,
          'seek',
          0 // Seek events don't have duration
        );
        
        logEvent(payload);
        playStartTimeRef.current = toTime;
      } catch (error) {
        console.error('[Event Logger] Failed to log seek event:', error);
      }
    }
  };

  /**
   * Handle track completion
   */
  const handleTrackEnd = () => {
    logListeningEvent('complete');
  };

  /**
   * Reset when track changes
   */
  useEffect(() => {
    playStartTimeRef.current = 0;
    lastEventTypeRef.current = null;
  }, [currentTrack?.id]);

  return {
    handlePlay,
    handlePause,
    handleSkip,
    handleSeek,
    handleTrackEnd,
    logListeningEvent,
  };
}
