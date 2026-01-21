import React, { useState, useEffect } from 'react';
import { useAlert } from '../../context/AlertContext';
import { renamePlaylist } from '../../api/musicApi';
import './AddToPlaylistModal.css'; // Reuse styles

interface RenamePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    playlist: { id: number; name: string } | null;
    onRenameSuccess: () => void;
    currentUserId: number;
}

export default function RenamePlaylistModal({ isOpen, onClose, playlist, onRenameSuccess, currentUserId }: RenamePlaylistModalProps) {
    const { showAlert } = useAlert();
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && playlist) {
            setNewName(playlist.name);
        }
    }, [isOpen, playlist]);

    const handleRename = async () => {
        if (!playlist || !newName.trim()) return;

        try {
            setLoading(true);
            await renamePlaylist(playlist.id, newName, currentUserId);
            showAlert({ title: 'Success', description: `Renamed playlist to "${newName}"` });
            onRenameSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to rename playlist', err);
            showAlert({ title: 'Error', description: 'Failed to rename playlist' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !playlist) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h3>Rename Playlist</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="create-form">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Playlist Name"
                            autoFocus
                        />
                        <div className="form-actions">
                            <button className="cancel-btn" onClick={onClose}>Cancel</button>
                            <button
                                className="confirm-btn"
                                onClick={handleRename}
                                disabled={!newName.trim() || loading}
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
