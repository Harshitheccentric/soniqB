import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { VscClose, VscCheck } from 'react-icons/vsc';
import { useSession } from '../../hooks/useSession';
import './CompatibilityCard.css';

interface ComparisonData {
    subject: string;
    A: number; // User
    B: number; // Track
    fullMark: number;
}

interface ExplanationData {
    match_score: number;
    reasons: string[];
    features: {
        track: {
            tempo: number; energy: number; danceability: number;
            acousticness: number; valence: number; instrumentalness: number;
        };
        user: {
            tempo: number; energy: number; danceability: number;
            acousticness: number; valence: number; instrumentalness: number;
        };
    };
}

interface CompatibilityCardProps {
    trackId: number;
    onClose: () => void;
}

export default function CompatibilityCard({ trackId, onClose }: CompatibilityCardProps) {
    const { session } = useSession();
    const [data, setData] = useState<ExplanationData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session.user) return;

        async function fetchExplanation() {
            try {
                const res = await axios.get(`http://localhost:8000/recommendations/explain`, {
                    params: { track_id: trackId, user_id: session.user?.id }
                });
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch explanation", err);
            } finally {
                setLoading(false);
            }
        }
        fetchExplanation();
    }, [trackId, session.user]);

    if (!data && !loading) return null;

    // Transform data for Recharts (6 Axes)
    const chartData: ComparisonData[] = data ? [
        { subject: 'Tempo', A: normalize(data.features.user.tempo, 0, 200), B: normalize(data.features.track.tempo, 0, 200), fullMark: 100 },
        { subject: 'Energy', A: data.features.user.energy * 100, B: data.features.track.energy * 100, fullMark: 100 },
        { subject: 'Mood', A: data.features.user.valence * 100, B: data.features.track.valence * 100, fullMark: 100 },
        { subject: 'Dance', A: data.features.user.danceability * 100, B: data.features.track.danceability * 100, fullMark: 100 },
        { subject: 'Instr.', A: data.features.user.instrumentalness * 100, B: data.features.track.instrumentalness * 100, fullMark: 100 },
        { subject: 'Acoustic', A: data.features.user.acousticness * 100, B: data.features.track.acousticness * 100, fullMark: 100 },
    ] : [];

    function normalize(val: number, min: number, max: number) {
        return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
    }

    const modalContent = (
        <>
            <div className="compatibility-overlay" onClick={onClose} />
            <div className="compatibility-card">
                <div className="compatibility-card__header">
                    <h2>Why This Song?</h2>
                    <button className="compatibility-card__close" onClick={onClose}>
                        <VscClose />
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Analyzing audio DNA...</div>
                ) : (
                    <>
                        <div className="compatibility-card__score">
                            <div className="compatibility-card__score-value">
                                {Math.round(data!.match_score * 100)}%
                            </div>
                            <div className="compatibility-card__score-label">Compatibility Match</div>
                        </div>

                        <div className="compatibility-card__chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                    <PolarGrid stroke="#444" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="You" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                                    <Radar name="Track" dataKey="B" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                        labelStyle={{ color: '#fff' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="compatibility-card__reasons">
                            {data!.reasons.map((reason, i) => (
                                <div key={i} className="compatibility-card__reason">
                                    <span className="compatibility-card__reason-icon"><VscCheck /></span>
                                    {reason}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );

    // Use Portal to render at document root
    return createPortal(modalContent, document.body);
}
