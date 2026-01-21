/**
 * UploadSong Component
 * Allows users to upload their own songs with drag-and-drop support
 */
import { useState } from 'react';
import { uploadTrack } from '../api/musicApi';
import { useSession } from '../hooks/useSession';
import './UploadSong.css';

interface UploadSongProps {
    onUploadComplete?: (track: any) => void;
    onClose?: () => void;
}

export default function UploadSong({ onUploadComplete, onClose }: UploadSongProps) {
    const { session } = useSession();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [uploadedTrack, setUploadedTrack] = useState<any>(null);
    const [dragActive, setDragActive] = useState(false);

    if (!session.user) {
        return null;
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleFileSelect = (file: File) => {
        const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/flac', 'audio/opus'];
        const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.opus'];

        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
            setError('Invalid file type. Please upload an audio file (MP3, WAV, OGG, M4A, FLAC, or OPUS).');
            return;
        }

        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            setError('File too large. Maximum size is 50MB.');
            return;
        }

        setSelectedFile(file);
        setError(null);
        setUploadedTrack(null);
    };

    const handleUpload = async () => {
        if (!selectedFile || !session.user) return;

        setUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            const track = await uploadTrack(selectedFile, session.user.id, (progressEvent: any) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
            });

            setUploadedTrack(track);
            setSelectedFile(null);
            setUploadProgress(100);

            if (onUploadComplete) {
                onUploadComplete(track);
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.response?.data?.detail || 'Failed to upload track. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setUploadedTrack(null);
        setError(null);
        setUploadProgress(0);
    };

    return (
        <div className="upload-song-modal">
            <div className="upload-song-content">
                <div className="upload-header">
                    <h2>🎵 Upload Your Song</h2>
                    {onClose && (
                        <button className="close-btn" onClick={onClose}>✕</button>
                    )}
                </div>

                {!uploadedTrack ? (
                    <>
                        <div
                            className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {selectedFile ? (
                                <div className="file-selected">
                                    <p className="file-icon">🎵</p>
                                    <p className="file-name">{selectedFile.name}</p>
                                    <p className="file-size">
                                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                    <button className="change-file-btn" onClick={handleReset}>
                                        Choose Different File
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="upload-icon">📁</p>
                                    <p className="upload-text">
                                        Drag and drop your audio file here
                                    </p>
                                    <p className="upload-subtext">or</p>
                                    <label className="file-input-label">
                                        <input
                                            type="file"
                                            accept=".mp3,.wav,.ogg,.m4a,.flac,.opus,audio/*"
                                            onChange={handleFileInput}
                                            style={{ display: 'none' }}
                                        />
                                        <span className="browse-btn">Browse Files</span>
                                    </label>
                                    <p className="upload-hint">
                                        Supported formats: MP3, WAV, OGG, M4A, FLAC, OPUS (Max 50MB)
                                    </p>
                                </>
                            )}
                        </div>

                        {error && (
                            <div className="upload-error">
                                <p>❌ {error}</p>
                            </div>
                        )}

                        {uploading && (
                            <div className="upload-progress">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="progress-text">{uploadProgress}%</p>
                            </div>
                        )}

                        <div className="upload-actions">
                            <button
                                className="upload-btn"
                                onClick={handleUpload}
                                disabled={!selectedFile || uploading}
                            >
                                {uploading ? 'Uploading...' : 'Upload Song'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="upload-success">
                        <p className="success-icon">✅</p>
                        <h3>Upload Successful!</h3>
                        <div className="uploaded-track-info">
                            <p><strong>Title:</strong> {uploadedTrack.title}</p>
                            <p><strong>Artist:</strong> {uploadedTrack.artist}</p>
                            {uploadedTrack.predicted_genre && (
                                <p>
                                    <strong>Genre:</strong> {uploadedTrack.predicted_genre}
                                    {uploadedTrack.genre_confidence && (
                                        <span className="confidence">
                                            {' '}({(uploadedTrack.genre_confidence * 100).toFixed(0)}% confidence)
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                        <p className="success-message">
                            Your song has been added to "Songs Uploaded" playlist!
                        </p>
                        <div className="upload-actions">
                            <button className="upload-another-btn" onClick={handleReset}>
                                Upload Another Song
                            </button>
                            {onClose && (
                                <button className="done-btn" onClick={onClose}>
                                    Done
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
