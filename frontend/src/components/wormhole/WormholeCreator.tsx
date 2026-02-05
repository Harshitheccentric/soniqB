import { useState } from 'react';
import api from '../../api/musicApi';
import { useSession } from '../../hooks/useSession';
import { useToast } from '../../context/ToastContext';
import './WormholeCreator.css';

interface WormholeCreatorProps {
    startNode: any;
    endNode: any;
    selectionMode: 'start' | 'end' | null;
    onSetSelectionMode: (mode: 'start' | 'end' | null) => void;
    onGenerate: (path: any[]) => void;
    onClose: () => void;
    path: any[]; // The generated path
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
    const { showToast } = useToast();
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleGenerate = async () => {
        if (!startNode || !endNode) return;

        setGenerating(true);
        setSaved(false);
        try {
            const res = await api.get('/recommendations/wormhole', {
                params: {
                    start_track_id: startNode.id,
                    end_track_id: endNode.id,
                    steps: 8
                }
            });
            onGenerate(res.data);
        } catch (err) {
            console.error("Wormhole generation failed", err);
            showToast('Failed to generate wormhole path', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleSavePlaylist = async () => {
        if (!path || path.length === 0) return;

        if (!session?.user?.id) {
            showToast('Please log in to save playlists', 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                user_id: session.user.id,
                name: `Wormhole: ${startNode.title} to ${endNode.title}`,
                tracks: path.map((node, index) => ({
                    track_id: node.id,
                    position: index
                }))
            };

            await api.post('/playlists/manual', payload);
            setSaved(true);
            showToast('Playlist saved successfully!', 'success');
        } catch (err) {
            console.error("Failed to save playlist", err);
            showToast('Failed to save playlist', 'error');
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

            {path.length > 0 && (
                <button
                    className="wormhole-save-btn"
                    onClick={handleSavePlaylist}
                    disabled={saving || saved}
                >
                    {saved ? 'Playlist Saved ✓' : saving ? 'Saving...' : 'Save Path as Playlist'}
                </button>
            )}
        </div>
    );
}
