/**
 * ListeningSummary Component
 * Dashboard displaying listening statistics and genre distribution
 */
import React, { useState, useEffect } from 'react';
import { getEvents, getTracks } from '../api/musicApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function ListeningSummary({ user }) {
    const [events, setEvents] = useState([]);
    const [tracks, setTracks] = useState([]);
    const [stats, setStats] = useState({
        totalPlays: 0,
        avgDuration: 0,
        likeCount: 0,
        skipCount: 0
    });
    const [genreData, setGenreData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [eventsData, tracksData] = await Promise.all([
                getEvents(user.id),
                getTracks()
            ]);
            setEvents(eventsData);
            setTracks(tracksData);
            calculateStats(eventsData, tracksData);
        } catch (err) {
            console.error('Error loading dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (eventsData, tracksData) => {
        // Calculate statistics from events
        const playEvents = eventsData.filter(e => e.event_type === 'play');
        const likeEvents = eventsData.filter(e => e.event_type === 'like');
        const skipEvents = eventsData.filter(e => e.event_type === 'skip');

        const totalPlays = playEvents.length;
        const totalDuration = playEvents.reduce((sum, e) => sum + e.listened_duration, 0);
        const avgDuration = totalPlays > 0 ? totalDuration / totalPlays : 0;

        setStats({
            totalPlays,
            avgDuration,
            likeCount: likeEvents.length,
            skipCount: skipEvents.length
        });

        // Calculate genre distribution
        const genreCount = {};
        eventsData.forEach(event => {
            const track = tracksData.find(t => t.id === event.track_id);
            if (track) {
                const genre = track.predicted_genre || 'Unknown';
                genreCount[genre] = (genreCount[genre] || 0) + 1;
            }
        });

        const genreChartData = Object.entries(genreCount).map(([genre, count]) => ({
            genre,
            count
        }));

        setGenreData(genreChartData);
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    if (loading) {
        return <div className="listening-summary loading">Loading statistics...</div>;
    }

    return (
        <div className="listening-summary">
            <h2>Listening Summary</h2>
            <p className="user-info">User: {user.username}</p>

            {/* Statistics Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.totalPlays}</div>
                    <div className="stat-label">Total Plays</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{formatDuration(stats.avgDuration)}</div>
                    <div className="stat-label">Avg. Listening Duration</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{stats.likeCount}</div>
                    <div className="stat-label">Likes</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{stats.skipCount}</div>
                    <div className="stat-label">Skips</div>
                </div>
            </div>

            {/* Genre Distribution Chart */}
            <div className="chart-section">
                <h3>Genre Distribution</h3>
                {genreData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={genreData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="genre" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#8884d8" name="Event Count" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="no-data">
                        <p>No listening data available yet.</p>
                        <p>Start playing tracks to see your genre distribution!</p>
                    </div>
                )}
            </div>

            {/* Educational Notice */}
            <div className="info-box">
                <p>
                    <strong>Data Source:</strong> Statistics calculated from listening events
                    stored in the backend database.
                </p>
                <p>
                    <strong>Note:</strong> No ML predictions are performed in the frontend.
                    Genre data comes from backend (Phase 3+).
                </p>
            </div>

            {/* Total Events */}
            <div className="total-events">
                <p>Total Events Logged: {events.length}</p>
            </div>
        </div>
    );
}

export default ListeningSummary;
