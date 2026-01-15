/**
 * ListeningSummary Component
 * Dashboard displaying listening statistics, genre distribution, and user cluster
 */
import React, { useState, useEffect } from 'react';
import { getEvents, getTracks, getUserCluster } from '../api/musicApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

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
    const [userCluster, setUserCluster] = useState(null);
    const [clusterLoading, setClusterLoading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            setClusterLoading(true);

            const [eventsData, tracksData] = await Promise.all([
                getEvents(user.id),
                getTracks()
            ]);
            setEvents(eventsData);
            setTracks(tracksData);
            calculateStats(eventsData, tracksData);

            // Load user cluster from ML backend
            try {
                const clusterData = await getUserCluster(user.id);
                setUserCluster(clusterData);
            } catch (err) {
                console.error('Error loading user cluster:', err);
                setUserCluster(null);
            }
        } catch (err) {
            console.error('Error loading dashboard data:', err);
        } finally {
            setLoading(false);
            setClusterLoading(false);
        }
    };

    const calculateStats = (eventsData, tracksData) => {
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

    // Map cluster labels to emoji icons
    const getClusterEmoji = (label) => {
        const emojiMap = {
            'Casual Listener': '🎧',
            'Explorer': '🔍',
            'Enthusiast': '🎵',
            'Niche Fan': '⭐'
        };
        return emojiMap[label] || '🎶';
    };

    // Build radar chart data from cluster features
    const getRadarData = (features) => {
        if (!features) return [];
        return [
            { feature: 'Plays', value: Math.min(features.total_plays / 10, 10), fullMark: 10 },
            { feature: 'Duration', value: Math.min(features.avg_duration / 60, 10), fullMark: 10 },
            { feature: 'Likes', value: features.like_ratio * 10, fullMark: 10 },
            { feature: 'Exploration', value: Math.min(features.genre_diversity, 10), fullMark: 10 },
            { feature: 'Activity', value: Math.min(features.session_frequency, 10), fullMark: 10 }
        ];
    };

    if (loading) {
        return <div className="listening-summary loading">Loading statistics...</div>;
    }

    return (
        <div className="listening-summary">
            <h2>Listening Summary</h2>
            <p className="user-info">User: {user.username}</p>

            {/* User Cluster Card - ML Feature */}
            {userCluster && (
                <div className="cluster-card">
                    <div className="cluster-header">
                        <span className="cluster-emoji">{getClusterEmoji(userCluster.cluster_label)}</span>
                        <div className="cluster-info">
                            <h3 className="cluster-label">{userCluster.cluster_label}</h3>
                            <p className="cluster-description">{userCluster.description}</p>
                        </div>
                    </div>

                    {/* Radar Chart for User Profile */}
                    <div className="cluster-radar">
                        <ResponsiveContainer width="100%" height={200}>
                            <RadarChart data={getRadarData(userCluster.features)}>
                                <PolarGrid stroke="#444" />
                                <PolarAngleAxis dataKey="feature" tick={{ fill: '#ccc', fontSize: 11 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#888' }} />
                                <Radar
                                    name="Profile"
                                    dataKey="value"
                                    stroke="#8b5cf6"
                                    fill="#8b5cf6"
                                    fillOpacity={0.5}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="ml-badge">
                        <span>🤖 ML-Powered Analysis</span>
                    </div>
                </div>
            )}

            {/* Statistics Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.totalPlays}</div>
                    <div className="stat-label">Total Plays</div>
                </div>

                <div className="stat-card">
                    <div className="stat-value">{formatDuration(stats.avgDuration)}</div>
                    <div className="stat-label">Avg. Duration</div>
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
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="genre" tick={{ fill: '#ccc' }} />
                            <YAxis tick={{ fill: '#ccc' }} />
                            <Tooltip
                                contentStyle={{ background: '#1a1a2e', border: '1px solid #444' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Bar dataKey="count" fill="#8b5cf6" name="Event Count" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="no-data">
                        <p>No listening data available yet.</p>
                        <p>Start playing tracks to see your genre distribution!</p>
                    </div>
                )}
            </div>

            {/* Phase 3 Notice */}
            <div className="info-box ml-info">
                <p>
                    <strong>🤖 Phase 3 ML Features Active</strong>
                </p>
                <p>
                    User clustering powered by listening pattern analysis.
                    Genre classification uses MusicFM audio embeddings.
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
