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

// Add JWT token to requests if available
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle 401 responses (expired/invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Clear invalid token and redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('current_user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// Auth API calls
export const register = async (username, password) => {
    const response = await api.post('/auth/register', { username, password });
    if (response.data.access_token) {
        localStorage.setItem('auth_token', response.data.access_token);
        localStorage.setItem('current_user', JSON.stringify(response.data.user));
    }
    return response.data;
};

export const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.access_token) {
        localStorage.setItem('auth_token', response.data.access_token);
        localStorage.setItem('current_user', JSON.stringify(response.data.user));
    }
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
};

export const getCurrentUser = () => {
    const userJson = localStorage.getItem('current_user');
    return userJson ? JSON.parse(userJson) : null;
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('auth_token');
};

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

export const getPlaylistDetails = async (playlistId) => {
    const response = await api.get(`/playlists/detail/${playlistId}`);
    return response.data;
};

export const getLikedTrackIds = async () => {
    const response = await api.get('/playlists/liked_songs/track_ids');
    return response.data;
};

export const removeTrackFromPlaylist = async (playlistId, trackId) => {
    const response = await api.delete(`/playlists/${playlistId}/tracks/${trackId}`);
    return response.data;
};

export const createPlaylist = async (playlistData) => {
    const response = await api.post('/playlists/manual', playlistData);
    return response.data;
};

// Track scanning
export const scanTracks = async () => {
    const response = await api.post('/tracks/scan');
    return response.data;
};

// Track upload - Updated to send user_id
export const uploadTrack = async (file, userId, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId.toString());

    const response = await api.post('/tracks/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
    });
    return response.data;
};


// ML API calls (Phase 3)
export const getMLStatus = async () => {
    const response = await api.get('/ml/status');
    return response.data;
};

export const getUserCluster = async (userId) => {
    const response = await api.get(`/ml/user-cluster/${userId}`);
    return response.data;
};

export const classifyTrack = async (trackId) => {
    const response = await api.post(`/ml/classify/${trackId}`);
    return response.data;
};

export const classifyAllTracks = async () => {
    const response = await api.post('/ml/classify-all');
    return response.data;
};

export const calibrateTrack = async (trackId, genre) => {
    const response = await api.post(`/ml/calibrate/${trackId}`, null, {
        params: { genre }
    });
    return response.data;
};

export default api;
