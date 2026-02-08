import { useState } from 'react';
import axios from 'axios';
import { useSession } from '../../hooks/useSession';
import './WormholeCreator.css';

interface WormholeCreatorProps {
    startNode: any;
    endNode: any;
    selectionMode: 'start' | 'end' | null;
    onSetSelectionMode: (mode: 'start' | 'end' | null) => void;
    onGenerate: (path: any[]) => void;
    onClose: () => void;
    path: any[]; // The generated path (for visualization)
}

export default function WormholeCreator({
    startNode,
    endNode,
    selectionMode,
    onSetSelectionMode,
    onGenerate,
    onClose,
    path
}: WormholeCreatorProps) {
    const { session } = useSession();
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    // Store original API tracks for saving (path prop may be filtered)
    const [originalTracks, setOriginalTracks] = useState<any[]>([]);

    const handleGenerate = async () => {
        if (!startNode || !endNode) return;

        setGenerating(true);
        setSaved(false);
        try {
            const res = await axios.get('http://localhost:8000/recommendations/wormhole', {
                params: {
                    start_track_id: startNode.id,
                    end_track_id: endNode.id,
                    steps: 8
                }
            });
            // Store original tracks for saving
            setOriginalTracks(res.data);
            // Pass to parent for visualization
            onGenerate(res.data);
        } catch (err) {
            console.error("Wormhole generation failed", err);
        } finally {
            setGenerating(false);
        }
    };

    const handleSavePlaylist = async () => {
        if (!originalTracks || originalTracks.length === 0) return;
        if (!session.user) {
            alert("You must be logged in to save playlists.");
            return;
        }

        setSaving(true);
        try {
            // Generate a creative name
            const startGenre = startNode.genre || 'Unknown';
            const endGenre = endNode.genre || 'Unknown';
            const playlistName = startGenre === endGenre
                ? `${startGenre} Journey: ${originalTracks.length} Tracks`
                : `${startGenre} → ${endGenre} Wormhole`;

            const payload = {
                user_id: session.user.id,
                name: playlistName,
                tracks: originalTracks.map((track, index) => ({
                    track_id: track.id,
                    position: index
                }))
            };

            console.log('Saving playlist with tracks:', originalTracks.length, payload);

            await axios.post('http://localhost:8000/playlists/manual', payload, {
                headers: { 'X-User-ID': String(session.user.id) }
            });
            setSaved(true);
            alert(`Playlist saved with ${originalTracks.length} tracks! Check your Library.`);
        } catch (err) {
            console.error("Failed to save playlist", err);
            alert("Failed to save playlist. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="wormhole-creator">
            <div className="wormhole-header">
                <h3>Sonic Wormhole</h3>
                <button onClick={onClose} className="wormhole-close-btn">×</button>
            </div>

            <div className="wormhole-section">
                <span className="wormhole-label">Start Point</span>
                <button
                    className={`wormhole-select-btn ${selectionMode === 'start' ? 'wormhole-select-btn--active' : ''}`}
                    onClick={() => onSetSelectionMode(selectionMode === 'start' ? null : 'start')}
                >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: startNode ? startNode.color : '#444' }}></span>
                    {startNode ? startNode.title : "Select Start Track"}
                </button>
                {selectionMode === 'start' && <div className="wormhole-instruction">Click a star in the universe</div>}
            </div>

            <div className="wormhole-section">
                <span className="wormhole-label">Destination</span>
                <button
                    className={`wormhole-select-btn ${selectionMode === 'end' ? 'wormhole-select-btn--active' : ''}`}
                    onClick={() => onSetSelectionMode(selectionMode === 'end' ? null : 'end')}
                >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: endNode ? endNode.color : '#444' }}></span>
                    {endNode ? endNode.title : "Select Destination"}
                </button>
                {selectionMode === 'end' && <div className="wormhole-instruction">Click a star in the universe</div>}
            </div>

            <button
                className="wormhole-generate-btn"
                disabled={!startNode || !endNode || generating}
                onClick={handleGenerate}
            >
                {generating ? 'Calculating Path...' : 'Engage Wormhole'}
            </button>

            {originalTracks.length > 0 && (
                <>
                    <div className="wormhole-path-info" style={{
                        padding: '8px',
                        margin: '8px 0',
                        background: 'rgba(111, 255, 176, 0.1)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#6fffb0'
                    }}>
                        📍 Path found: {originalTracks.length} tracks
                    </div>
                    <button
                        className="wormhole-save-btn"
                        onClick={handleSavePlaylist}
                        disabled={saving || saved}
                    >
                        {saved ? 'Playlist Saved ✓' : saving ? 'Saving...' : `Save ${originalTracks.length} Tracks as Playlist`}
                    </button>
                </>
            )}
        </div>
    );
}

