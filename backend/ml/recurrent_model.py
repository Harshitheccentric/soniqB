"""
Combined Recurrent Genre Classifier Model for SoniqB - Phase 3 (Standalone)

This is a custom CNN+LSTM model that directly classifies audio into 8 FMA genres.
Architecture matches checkpoint_combinedrecurrent.pt exactly.
"""
import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import librosa
import numpy as np
import logging
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# FMA Genre labels (must match training order)
FMA_GENRES = [
    "Electronic",
    "Experimental",
    "Folk",
    "Hip-Hop",
    "Instrumental",
    "International",
    "Pop",
    "Rock"
]


class ConvBNRelu1D(nn.Module):
    """Single 1D conv block with BN and ReLU, named 'block' to match checkpoint."""
    def __init__(self, in_ch, out_ch, kernel_size, stride=1, padding=0):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv1d(in_ch, out_ch, kernel_size=kernel_size, stride=stride, padding=padding),
            nn.BatchNorm1d(out_ch),
            nn.ReLU()
        )
    
    def forward(self, x):
        return self.block(x)


class ConvBlock1D(nn.Module):
    """1D CNN block matching checkpoint structure exactly."""
    def __init__(self):
        super().__init__()
        # checkpoint keys: block.0.block.0/1, block.2.block.0/1, etc.
        # block.0 = ConvBNRelu, block.1 = MaxPool, block.2 = ConvBNRelu, ...
        self.block = nn.Sequential(
            ConvBNRelu1D(1, 16, kernel_size=256, stride=256),  # block.0
            nn.MaxPool1d(4),  # block.1
            ConvBNRelu1D(16, 32, kernel_size=32, stride=1, padding=16),  # block.2
            nn.MaxPool1d(4),  # block.3
            ConvBNRelu1D(32, 64, kernel_size=16, stride=1, padding=8),  # block.4
            nn.MaxPool1d(4),  # block.5
            ConvBNRelu1D(64, 128, kernel_size=8, stride=1, padding=4),  # block.6
            nn.AdaptiveAvgPool1d(1)  # block.7
        )
    
    def forward(self, x):
        return self.block(x)


class ResidualBlock2D(nn.Module):
    """2D Residual block matching checkpoint structure."""
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.main_path = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels)
        )
        self.shortcut_path = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=1),
            nn.BatchNorm2d(out_channels)
        )
        
    def forward(self, x):
        return F.relu(self.main_path(x) + self.shortcut_path(x))


class ConvBlock2D(nn.Module):
    """2D CNN block matching checkpoint structure."""
    def __init__(self):
        super().__init__()
        self.block = nn.Sequential(
            ResidualBlock2D(1, 16),  # block.0
            nn.MaxPool2d(2),  # block.1
            ResidualBlock2D(16, 32),  # block.2
            nn.MaxPool2d(2),  # block.3
            ResidualBlock2D(32, 64),  # block.4
            nn.MaxPool2d(2),  # block.5
            ResidualBlock2D(64, 128),  # block.6
            nn.AdaptiveAvgPool2d((1, None))  # block.7
        )
    
    def forward(self, x):
        return self.block(x)


class CombinedRecurrentClassifier(nn.Module):
    """
    Combined 1D + 2D CNN with LSTM for genre classification.
    Architecture matches checkpoint_combinedrecurrent.pt exactly.
    """
    def __init__(self, num_classes=8):
        super().__init__()
        self.num_classes = num_classes
        
        # 1D CNN on waveform
        self.conv_block_1d = ConvBlock1D()
        
        # 2D CNN on mel spectrogram
        self.conv_block_2d = ConvBlock2D()
        
        # LSTM to combine features (input=256, hidden=128)
        self.lstm = nn.LSTM(
            input_size=256,
            hidden_size=128,
            batch_first=True
        )
        
        # Classifier
        self.classifier = nn.Linear(128, num_classes)
    
    def forward(self, waveform, mel_spec):
        """
        Args:
            waveform: (batch, 1, samples) - raw audio
            mel_spec: (batch, 1, n_mels, time) - mel spectrogram
            
        Returns:
            logits: (batch, num_classes)
        """
        # 1D path
        feat_1d = self.conv_block_1d(waveform)  # (B, 128, 1)
        feat_1d = feat_1d.squeeze(-1)  # (B, 128)
        
        # 2D path
        feat_2d = self.conv_block_2d(mel_spec)  # (B, 128, 1, T)
        feat_2d = feat_2d.squeeze(2)  # (B, 128, T)
        feat_2d = feat_2d.mean(dim=-1)  # Global average pool -> (B, 128)
        
        # Combine features
        combined = torch.cat([feat_1d, feat_2d], dim=1)  # (B, 256)
        combined = combined.unsqueeze(1)  # (B, 1, 256) for LSTM
        
        # LSTM
        lstm_out, _ = self.lstm(combined)  # (B, 1, 128)
        lstm_out = lstm_out.squeeze(1)  # (B, 128)
        
        # Classify
        logits = self.classifier(lstm_out)  # (B, 8)
        
        return logits


class RecurrentClassifier2D(nn.Module):
    """
    2D-only CNN + LSTM classifier.
    Architecture matches checkpoint_recurrent.pt.
    """
    def __init__(self, num_classes=8):
        super().__init__()
        self.conv_block = ConvBlock2D()
        
        # LSTM input size is 128 (output of ConvBlock2D)
        self.lstm = nn.LSTM(
            input_size=128,
            hidden_size=128,
            batch_first=True
        )
        
        self.classifier = nn.Linear(128, num_classes)

    def forward(self, waveform, mel_spec):
        """
        Args:
            waveform: Ignored (kept for API compatibility)
            mel_spec: (batch, 1, n_mels, time)
        """
        # (B, 1, F, T) -> (B, 128, T)
        feat = self.conv_block(mel_spec) 
        
        feat = feat.squeeze(2) 
        
        # Global pooling over frequency is already done by AdaptiveAvgPool in ConvBlock2D
        # Wait, ConvBlock2D ends with AdaptiveAvgPool2d((1, None))
        # So output of ConvBlock2D is (B, 128, 1, T)
        if feat.shape[-1] != 128:
            # Just a sanity check for future maintenance
            pass
            
        # LSTM expects (B, T, Features)
        feat = feat.permute(0, 2, 1) # (B, T, 128)

        # LSTM
        lstm_out, _ = self.lstm(feat) # (B, T, 128)
        
        # Take last time step
        lstm_out = lstm_out[:, -1, :] 
        
        return self.classifier(lstm_out)


class RecurrentClassifierService:
    """Service wrapper for the Combined Recurrent Classifier."""
    
    def __init__(
        self,
        model_path: str = "checkpoint_recurrent.pt", # Changed default
        sample_rate: int = 22050,
        duration: float = 30.0,
        device: str = "cpu"
    ):
        self.model_path = model_path
        self.sample_rate = sample_rate
        self.duration = duration
        self.device = device
        self.target_samples = int(sample_rate * duration)
        
        self._model: Optional[CombinedRecurrentClassifier] = None
        self._loaded = False
    
    def is_ready(self) -> bool:
        return self._loaded
    
    def ensure_loaded(self) -> None:
        """Load model if not already loaded."""
        if self._loaded:
            return
            
        logger.info(f"Loading Recurrent Classifier from {self.model_path}")
        
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found: {self.model_path}")
        
        # Determine architecture based on state dict keys
        checkpoint = torch.load(self.model_path, map_location=self.device)
        state_dict = checkpoint['model_state_dict'] if 'model_state_dict' in checkpoint else checkpoint
        
        if 'conv_block_1d.block.0.block.0.weight' in state_dict:
            logger.info("Detected Combined (1D+2D) architecture")
            self._model = CombinedRecurrentClassifier(num_classes=8)
        else:
            logger.info("Detected 2D-only architecture")
            self._model = RecurrentClassifier2D(num_classes=8)
        
        # Load weights
        self._model.load_state_dict(state_dict)
        self._model.to(self.device)
        self._model.eval()
        
        self._loaded = True
        logger.info("Recurrent Classifier loaded successfully")
    
    def preprocess_audio(self, audio_path: str) -> Tuple[torch.Tensor, torch.Tensor]:
        """Load and preprocess audio file."""
        # Load audio
        y, sr = librosa.load(audio_path, sr=self.sample_rate, duration=self.duration)
        
        # Pad or trim to target length
        if len(y) < self.target_samples:
            y = np.pad(y, (0, self.target_samples - len(y)))
        else:
            y = y[:self.target_samples]
        
        # Create waveform tensor
        waveform = torch.from_numpy(y).float().unsqueeze(0).unsqueeze(0)
        
        # Create mel spectrogram
        mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
        mel_db = librosa.power_to_db(mel, ref=np.max)
        mel_tensor = torch.from_numpy(mel_db).float().unsqueeze(0).unsqueeze(0)
        
        return waveform.to(self.device), mel_tensor.to(self.device)
    
    def classify(self, audio_path: str) -> Tuple[str, float, dict]:
        """Classify audio file into a genre."""
        self.ensure_loaded()
        
        # Preprocess
        waveform, mel_spec = self.preprocess_audio(audio_path)
        
        # Inference
        with torch.no_grad():
            logits = self._model(waveform, mel_spec)
            probs = F.softmax(logits, dim=-1).squeeze(0)
        
        # Get prediction
        pred_idx = probs.argmax().item()
        confidence = probs[pred_idx].item()
        genre = FMA_GENRES[pred_idx]
        
        # Build probability dict
        all_probs = {FMA_GENRES[i]: float(probs[i]) for i in range(len(FMA_GENRES))}
        
        return genre, confidence, all_probs


# Singleton instance
_recurrent_service: Optional[RecurrentClassifierService] = None


def get_recurrent_classifier_service() -> RecurrentClassifierService:
    """Get or create singleton recurrent classifier service."""
    global _recurrent_service
    if _recurrent_service is None:
        ml_dir = Path(__file__).parent
        # Prefer checkpoint_recurrent.pt if asked, but let's look for it
        if (ml_dir / "data/checkpoint_recurrent.pt").exists():
             model_path = ml_dir / "data/checkpoint_recurrent.pt"
        else:
             model_path = ml_dir / "data/checkpoint_combinedrecurrent.pt"

        _recurrent_service = RecurrentClassifierService(
            model_path=str(model_path),
            device="cpu"
        )
    return _recurrent_service
