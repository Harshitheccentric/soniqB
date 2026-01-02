/**
 * API Service Layer
 * Centralized module for all backend API calls
 */
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// User API calls
export const getUsers = async () => {
    const response = await api.get('/users');
    return response.data;
};

export const getUser = async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
};

// Track API calls
export const getTracks = async () => {
    const response = await api.get('/tracks');
    return response.data;
};

export const getTrack = async (trackId) => {
    const response = await api.get(`/tracks/${trackId}`);
    return response.data;
};

export const getAudioUrl = (trackId) => {
    return `${API_BASE_URL}/audio/${trackId}`;
};

// Event logging API calls
export const logEvent = async (eventData) => {
    const response = await api.post('/events', eventData);
    return response.data;
};

export const getEvents = async (userId = null) => {
    const params = userId ? { user_id: userId } : {};
    const response = await api.get('/events', { params });
    return response.data;
};

// Playlist API calls
export const getPlaylists = async (userId) => {
    const response = await api.get(`/playlists/${userId}`);
    return response.data;
};

export const createPlaylist = async (playlistData) => {
    const response = await api.post('/playlists/manual', playlistData);
    return response.data;
};

export default api;
