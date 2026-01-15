"""
ML Service Module for SoniqB - Phase 3
Provides audio embedding extraction using MusicFM foundation model.
"""
import os
import sys
import logging
from pathlib import Path
from typing import Optional, Tuple
import numpy as np

# Setup logging
logger = logging.getLogger(__name__)

# Add MusicFM to path
ML_DIR = Path(__file__).parent.absolute()
MUSICFM_DIR = ML_DIR / "musicfm"
sys.path.insert(0, str(ML_DIR))

# Import torch first to check availability
import torch
import torchaudio
import librosa


class MusicFMService:
    """
    Service class for MusicFM audio embedding extraction.
    
    MusicFM is a foundation model for music informatics that provides
    high-quality audio embeddings useful for downstream tasks like
    genre classification, similarity search, and clustering.
    """
    
    # Audio configuration
    SAMPLE_RATE = 24000  # MusicFM expects 24kHz audio
    MAX_DURATION = 30.0  # Maximum audio duration in seconds
    EMBEDDING_DIM = 1024  # Conformer encoder dimension
    
    def __init__(
        self,
        stat_path: Optional[str] = None,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
        lazy_load: bool = True
    ):
        """
        Initialize MusicFM service.
        
        Args:
            stat_path: Path to normalization stats JSON file
            model_path: Path to pretrained model weights
            device: Device to run model on ('cpu', 'cuda', or None for auto)
            lazy_load: If True, defer model loading until first use
        """
        # Set default paths
        self.stat_path = stat_path or str(ML_DIR / "data" / "fma_stats.json")
        self.model_path = model_path or str(ML_DIR / "data" / "pretrained_fma.pt")
        
        # Determine device
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        
        # Model state
        self._model = None
        self._is_ready = False
        
        # Load immediately if not lazy
        if not lazy_load:
            self._load_model()
    
    def _load_model(self) -> None:
        """Load MusicFM model into memory."""
        if self._model is not None:
            return
            
        logger.info(f"Loading MusicFM model on device: {self.device}")
        
        # Check files exist
        if not os.path.exists(self.stat_path):
            raise FileNotFoundError(f"Stats file not found: {self.stat_path}")
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found: {self.model_path}")
        
        try:
            # Import MusicFM model class
            from musicfm.model.musicfm_25hz import MusicFM25Hz
            
            # Load model
            self._model = MusicFM25Hz(
                is_flash=False,  # Use standard attention for CPU compatibility
                stat_path=self.stat_path,
                model_path=self.model_path
            )
            
            # Move to device and set eval mode
            self._model = self._model.to(self.device)
            self._model.eval()
            
            self._is_ready = True
            logger.info("MusicFM model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load MusicFM model: {e}")
            raise
    
    def is_ready(self) -> bool:
        """Check if model is loaded and ready."""
        return self._is_ready
    
    def ensure_loaded(self) -> None:
        """Ensure model is loaded, loading it if necessary."""
        if not self._is_ready:
            self._load_model()
    
    def load_audio(self, audio_path: str) -> torch.Tensor:
        """
        Load and preprocess audio file for MusicFM.
        
        Args:
            audio_path: Path to audio file (mp3, wav, etc.)
            
        Returns:
            Audio tensor of shape (1, samples) at 24kHz
        """
        # Load audio with librosa (handles various formats)
        waveform, sr = librosa.load(
            audio_path, 
            sr=self.SAMPLE_RATE,
            mono=True,
            duration=self.MAX_DURATION
        )
        
        # Convert to tensor
        audio_tensor = torch.from_numpy(waveform).float()
        
        # Add batch dimension
        audio_tensor = audio_tensor.unsqueeze(0)
        
        # Pad or trim to exactly 30 seconds
        target_length = int(self.SAMPLE_RATE * self.MAX_DURATION)
        current_length = audio_tensor.shape[1]
        
        if current_length < target_length:
            # Pad with zeros
            padding = torch.zeros(1, target_length - current_length)
            audio_tensor = torch.cat([audio_tensor, padding], dim=1)
        elif current_length > target_length:
            # Trim
            audio_tensor = audio_tensor[:, :target_length]
        
        return audio_tensor
    
    @torch.no_grad()
    def get_embedding(
        self, 
        audio_path: str,
        layer_ix: int = 7
    ) -> np.ndarray:
        """
        Extract audio embedding from a file.
        
        Args:
            audio_path: Path to audio file
            layer_ix: Which transformer layer to extract from (default: 7)
            
        Returns:
            Embedding array of shape (embedding_dim,) - sequence-level
        """
        self.ensure_loaded()
        
        # Load audio
        audio = self.load_audio(audio_path)
        audio = audio.to(self.device)
        
        # Get latent representation
        # Shape: (batch, time, channels)
        emb = self._model.get_latent(audio, layer_ix=layer_ix)
        
        # Global average pooling over time dimension
        # Shape: (batch, channels) -> (channels,)
        seq_emb = emb.mean(dim=1).squeeze(0)
        
        # Move to CPU and convert to numpy
        return seq_emb.cpu().numpy()
    
    @torch.no_grad()
    def get_frame_embeddings(
        self,
        audio_path: str,
        layer_ix: int = 7,
        target_fps: int = 10
    ) -> np.ndarray:
        """
        Extract frame-level embeddings for temporal analysis.
        
        Args:
            audio_path: Path to audio file
            layer_ix: Which transformer layer to extract from
            target_fps: Target frames per second (resampled from 25Hz)
            
        Returns:
            Embedding array of shape (n_frames, embedding_dim)
        """
        self.ensure_loaded()
        
        # Load audio
        audio = self.load_audio(audio_path)
        audio = audio.to(self.device)
        
        # Get latent representation
        emb = self._model.get_latent(audio, layer_ix=layer_ix)
        
        # Resample temporal resolution if needed
        if target_fps != 25:
            n_target_frames = int(target_fps * self.MAX_DURATION)
            emb = torch.nn.functional.adaptive_avg_pool1d(
                emb.transpose(1, 2),
                n_target_frames
            ).transpose(1, 2)
        
        # Move to CPU and convert to numpy
        return emb.squeeze(0).cpu().numpy()


# Singleton instance for easy access
_service_instance: Optional[MusicFMService] = None


def get_musicfm_service() -> MusicFMService:
    """Get or create singleton MusicFM service instance."""
    global _service_instance
    if _service_instance is None:
        _service_instance = MusicFMService(lazy_load=True)
    return _service_instance
