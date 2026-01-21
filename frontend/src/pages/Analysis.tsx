/**
 * Analysis Page
 * Visualizes User Listening Profile and Library Structure
 */
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import axios from 'axios';
import './Analysis.css';

interface UserProfile {
    archetype: string;
    description: string;
    stats: {
        total_plays: number;
        avg_duration: number;
        like_ratio: number;
        genre_diversity: number;
    };
    explanation: string;
}

interface MapPoint {
    id: number;
    title: string;
    artist: string;
    genre: string;
    x: number;
    y: number;
}

import { useSession } from '../hooks/useSession';

export default function Analysis() {
    const { session } = useSession();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [mapData, setMapData] = useState<MapPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!session.user?.id) return;

            try {
                const headers = { 'X-User-ID': session.user.id.toString() };
                const [profRes, mapRes] = await Promise.all([
                    axios.get('/api/analytics/profile', { headers }),
                    axios.get('/api/analytics/map', { headers })
                ]);
                setProfile(profRes.data);
                console.log("Analytics Map Data:", mapRes.data);
                setMapData(mapRes.data.points || []);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="analysis-page loading">Loading Insights...</div>;
    if (!profile) return <div className="analysis-page error">Failed to load analysis data.</div>;

    return (
        <div className="analysis-page">
            <header className="analysis-header">
                <h1>Listening Intelligence</h1>
                <p>Deep dive into your musical identity</p>
            </header>

            <div className="analysis-grid">
                {/* User Archetype Card */}
                <motion.div
                    className="analysis-card archetype-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="archetype-icon">
                        {profile.archetype === 'Explorer' ? '🧭' :
                            profile.archetype === 'Enthusiast' ? '🔥' :
                                profile.archetype === 'Niche Fan' ? '🎯' : '🎧'}
                    </div>
                    <h2>{profile.archetype}</h2>
                    <p className="archetype-desc">{profile.description}</p>
                    <div className="archetype-stats">
                        <div className="stat">
                            <span className="label">Total Plays</span>
                            <span className="value">{profile.stats?.total_plays}</span>
                        </div>
                        <div className="stat">
                            <span className="label">Genre Diversity</span>
                            <span className="value">{profile.stats?.genre_diversity.toFixed(1)}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Library Map (Simplified Scatter) */}
                <motion.div
                    className="analysis-card map-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h3>Library Galaxy</h3>
                    <div className="map-container">
                        {(mapData || []).slice(0, 100).map((point, i) => (
                            <motion.div
                                key={point.id}
                                className="map-point"
                                style={{
                                    left: `${(point.x + 1) * 50}%`,
                                    top: `${(point.y + 1) * 50}%`,
                                    backgroundColor: getGenreColor(point.genre)
                                }}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.005 }}
                                title={`${point.title} - ${point.artist}`}
                            />
                        ))}
                    </div>
                    <div className="map-legend">
                        <span>Pop</span> <span>Rock</span> <span>Electronic</span> <span>Hip-Hop</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function getGenreColor(genre: string) {
    const colors: Record<string, string> = {
        'Pop': '#FF4081',
        'Rock': '#F44336',
        'Electronic': '#00E5FF',
        'Hip-Hop': '#FFC107',
        'Classical': '#E040FB',
        'Jazz': '#FF9800',
        'Metal': '#212121',
    };
    return colors[genre] || '#9E9E9E';
}
