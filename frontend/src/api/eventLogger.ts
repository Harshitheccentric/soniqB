/**
 * Event Logger API
 * Centralized event logging to backend
 * No JWT - events are logged with user_id directly
 */

import axios from 'axios';
import type { EventCreate, Event, EventType } from '../types';

const API_BASE_URL = 'http://localhost:8000';

const eventApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Log a listening event
 */
export async function logEvent(event: EventCreate): Promise<Event> {
  try {
    const response = await eventApi.post<Event>('/events', event);
    console.log(`[Event] ${event.event_type}:`, event);
    return response.data;
  } catch (error) {
    console.error('[Event Logger] Failed to log event:', error);
    throw error;
  }
}

/**
 * Get user's listening events
 */
export async function getUserEvents(userId: number): Promise<Event[]> {
  try {
    const response = await eventApi.get<Event[]>(`/events/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('[Event Logger] Failed to fetch events:', error);
    throw error;
  }
}

/**
 * Helper to create event payload
 */
export function createEventPayload(
  userId: number,
  trackId: number,
  eventType: EventType,
  listenedDuration: number
): EventCreate {
  return {
    user_id: userId,
    track_id: trackId,
    event_type: eventType,
    listened_duration: Math.max(0, listenedDuration), // Ensure non-negative
  };
}
