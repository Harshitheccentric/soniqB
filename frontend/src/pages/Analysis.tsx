/**
 * Analysis Page
 * Visualizes User Listening Profile and Library Structure
 */
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import axios from 'axios';
import './Analysis.css';
import { useSession } from '../hooks/useSession';

interface Attribution {
    feature: string;
    score: number;
    impact: string;
}

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
    attribution?: Attribution[];
}

interface MapPoint {
    id: number;
    title: string;
    artist: string;
    genre: string;
    x: number;
    y: number;
}

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
    }, [session.user?.id]);

    const handleMapClick = (trackId: number) => {
        console.log("Playing track from Galaxy:", trackId);
        // Dispatch event for Home.tsx to catch
        window.dispatchEvent(new CustomEvent('playTrack', { detail: { trackId } }));
    };

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

                    {/* Attribution "Why?" Section */}
                    {profile.attribution && (
                        <div className="attribution-section">
                            <h4>Why?</h4>
                            <div className="attribution-tags">
                                {profile.attribution.map((attr, i) => (
                                    <span key={i} className="attr-tag" title={`Z-Score: ${attr.score}`}>
                                        {attr.impact}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

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

                {/* Library Map */}
                <motion.div
                    className="analysis-card map-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h3>Library Galaxy</h3>
                    <p className="subtitle">Click a star to play</p>
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
                                whileHover={{ scale: 2.5, zIndex: 100 }}
                                transition={{ delay: i * 0.005 }}
                                title={`${point.title} - ${point.artist}`}
                                onClick={() => handleMapClick(point.id)}
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
    if (!genre) return '#9E9E9E';

    // Normalize to Title Case or lower for matching
    const normalized = genre.charAt(0).toUpperCase() + genre.slice(1).toLowerCase();

    const colors: Record<string, string> = {
        'Pop': '#FF00CC', 'pop': '#FF00CC',
        'Rock': '#FF3300', 'rock': '#FF3300',
        'Electronic': '#00FFFF', 'electronic': '#00FFFF',
        'Hip-hop': '#FFD700', 'hip-hop': '#FFD700',
        'Hip-Hop': '#FFD700',
        'Classical': '#D500F9', 'classical': '#D500F9',
        'Jazz': '#FF9100', 'jazz': '#FF9100',
        'Metal': '#B0BEC5', 'metal': '#B0BEC5',
        'Country': '#76FF03', 'country': '#76FF03',
        'Folk': '#8BC34A', 'folk': '#8BC34A',
        'R&b': '#651FFF', 'r&b': '#651FFF',
        'Instrumental': '#00B0FF', 'instrumental': '#00B0FF',
        'International': '#FF1744', 'international': '#FF1744',
        'Experimental': '#AA00FF', 'experimental': '#AA00FF',
        'Unknown': '#607D8B', 'unknown': '#607D8B'
    };
    return colors[normalized] || colors[genre] || '#9E9E9E';
}
