#!/usr/bin/env python3
"""
MusicFM Linear Probe Training Script for SoniqB

This script trains a linear classifier on top of frozen MusicFM embeddings
using the FMA dataset for genre classification.

Usage:
    python backend/ml/train_probe.py

The script will:
1. Load track metadata from FMA
2. Extract MusicFM embeddings for each track
3. Train a linear probe (small classifier) on top
4. Save the trained probe to backend/ml/data/musicfm_probe.pt
"""
import os
import sys
import json
import logging
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from tqdm import tqdm

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.ml.service import get_musicfm_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FMA top-level genre mapping (from genres.csv)
FMA_TOP_GENRES = [
    "Electronic",
    "Rock", 
    "Pop",
    "Folk",
    "Instrumental",
    "Hip-Hop",
    "International",
    "Experimental"
]


class LinearProbe(nn.Module):
    """Simple linear classifier on top of MusicFM embeddings."""
    
    def __init__(self, input_dim: int = 1024, num_classes: int = 8):
        super().__init__()
        self.classifier = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes)
        )
    
    def forward(self, x):
        return self.classifier(x)


def load_fma_metadata(metadata_dir: str) -> pd.DataFrame:
    """Load FMA track metadata with genre labels."""
    tracks_path = os.path.join(metadata_dir, "tracks.csv")
    
    # Load with multi-level header
    tracks = pd.read_csv(tracks_path, index_col=0, header=[0, 1])
    
    # Extract relevant columns
    # The CSV has multi-level columns like ('set', 'subset'), ('track', 'genre_top')
    subset = tracks[('set', 'subset')]
    genre_top = tracks[('track', 'genre_top')]
    
    # Create simplified dataframe
    df = pd.DataFrame({
        'track_id': tracks.index,
        'subset': subset,
        'genre_top': genre_top
    })
    
    # Filter for small subset (what we have audio for)
    df = df[df['subset'] == 'small'].copy()
    
    # Remove tracks without genre
    df = df.dropna(subset=['genre_top'])
    
    logger.info(f"Loaded {len(df)} tracks from FMA small subset")
    logger.info(f"Genre distribution:\n{df['genre_top'].value_counts()}")
    
    return df


def get_audio_path(track_id: int, audio_dir: str) -> Optional[str]:
    """Get audio file path for a track ID."""
    # FMA stores files as XXX/XXXXXX.mp3
    tid_str = f"{track_id:06d}"
    folder = tid_str[:3]
    filename = f"{tid_str}.mp3"
    path = os.path.join(audio_dir, folder, filename)
    
    if os.path.exists(path):
        return path
    return None


def extract_embeddings(
    df: pd.DataFrame,
    audio_dir: str,
    max_samples: Optional[int] = None,
    cache_path: Optional[str] = None
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Extract MusicFM embeddings for all tracks.
    
    Returns:
        embeddings: (N, 1024) array
        labels: (N,) array of genre indices
        label_names: list of genre names
    """
    # Check for cached embeddings
    if cache_path and os.path.exists(cache_path):
        logger.info(f"Loading cached embeddings from {cache_path}")
        data = np.load(cache_path)
        return data['embeddings'], data['labels'], list(data['label_names'])
    
    # Get MusicFM service
    service = get_musicfm_service()
    service.ensure_loaded()
    
    # Encode labels
    label_encoder = LabelEncoder()
    label_encoder.fit(df['genre_top'].unique())
    
    embeddings = []
    labels = []
    
    # Limit samples if specified
    if max_samples:
        df = df.sample(n=min(max_samples, len(df)), random_state=42)
    
    logger.info(f"Extracting embeddings for {len(df)} tracks...")
    
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Extracting"):
        track_id = row['track_id']
        genre = row['genre_top']
        
        audio_path = get_audio_path(track_id, audio_dir)
        if audio_path is None:
            continue
        
        try:
            embedding = service.get_embedding(audio_path)
            embeddings.append(embedding)
            labels.append(label_encoder.transform([genre])[0])
        except Exception as e:
            logger.warning(f"Failed to process track {track_id}: {e}")
            continue
    
    embeddings = np.array(embeddings)
    labels = np.array(labels)
    label_names = list(label_encoder.classes_)
    
    # Cache for future runs
    if cache_path:
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        np.savez(cache_path, embeddings=embeddings, labels=labels, label_names=label_names)
        logger.info(f"Cached embeddings to {cache_path}")
    
    return embeddings, labels, label_names


def train_probe(
    embeddings: np.ndarray,
    labels: np.ndarray,
    num_classes: int,
    epochs: int = 50,
    batch_size: int = 64,
    lr: float = 0.001,
    device: str = "cpu"
) -> LinearProbe:
    """Train linear probe on embeddings."""
    
    # Split data
    X_train, X_val, y_train, y_val = train_test_split(
        embeddings, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    logger.info(f"Training set: {len(X_train)}, Validation set: {len(X_val)}")
    
    # Create data loaders
    train_dataset = TensorDataset(
        torch.FloatTensor(X_train),
        torch.LongTensor(y_train)
    )
    val_dataset = TensorDataset(
        torch.FloatTensor(X_val),
        torch.LongTensor(y_val)
    )
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size)
    
    # Create model
    model = LinearProbe(input_dim=embeddings.shape[1], num_classes=num_classes)
    model.to(device)
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5)
    
    best_val_acc = 0.0
    best_state = None
    
    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = outputs.max(1)
            train_total += batch_y.size(0)
            train_correct += predicted.eq(batch_y).sum().item()
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x, batch_y = batch_x.to(device), batch_y.to(device)
                outputs = model(batch_x)
                loss = criterion(outputs, batch_y)
                
                val_loss += loss.item()
                _, predicted = outputs.max(1)
                val_total += batch_y.size(0)
                val_correct += predicted.eq(batch_y).sum().item()
        
        train_acc = 100.0 * train_correct / train_total
        val_acc = 100.0 * val_correct / val_total
        
        scheduler.step(val_loss)
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = model.state_dict().copy()
        
        if (epoch + 1) % 10 == 0 or epoch == 0:
            logger.info(
                f"Epoch {epoch+1}/{epochs}: "
                f"Train Loss={train_loss/len(train_loader):.4f}, Train Acc={train_acc:.2f}%, "
                f"Val Loss={val_loss/len(val_loader):.4f}, Val Acc={val_acc:.2f}%"
            )
    
    # Load best model
    model.load_state_dict(best_state)
    logger.info(f"Best validation accuracy: {best_val_acc:.2f}%")
    
    return model


def save_probe(
    model: LinearProbe,
    label_names: List[str],
    save_path: str
):
    """Save trained probe and metadata."""
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    
    checkpoint = {
        'model_state_dict': model.state_dict(),
        'label_names': label_names,
        'input_dim': 1024,
        'num_classes': len(label_names)
    }
    
    torch.save(checkpoint, save_path)
    logger.info(f"Saved probe to {save_path}")


def main():
    parser = argparse.ArgumentParser(description="Train MusicFM linear probe")
    parser.add_argument("--metadata-dir", default="backend/fma/fma_metadata",
                        help="Path to FMA metadata directory")
    parser.add_argument("--audio-dir", default="backend/fma/fma_small",
                        help="Path to FMA audio directory")
    parser.add_argument("--output", default="backend/ml/data/musicfm_probe.pt",
                        help="Output path for trained probe")
    parser.add_argument("--cache", default="backend/ml/data/fma_embeddings.npz",
                        help="Path to cache embeddings")
    parser.add_argument("--max-samples", type=int, default=None,
                        help="Max samples to use (for testing)")
    parser.add_argument("--epochs", type=int, default=50,
                        help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=64,
                        help="Batch size")
    parser.add_argument("--device", default="cpu",
                        help="Device to train on")
    
    args = parser.parse_args()
    
    # Load metadata
    logger.info("Loading FMA metadata...")
    df = load_fma_metadata(args.metadata_dir)
    
    # Extract embeddings
    embeddings, labels, label_names = extract_embeddings(
        df,
        args.audio_dir,
        max_samples=args.max_samples,
        cache_path=args.cache
    )
    
    logger.info(f"Extracted {len(embeddings)} embeddings")
    logger.info(f"Classes: {label_names}")
    
    # Train probe
    model = train_probe(
        embeddings,
        labels,
        num_classes=len(label_names),
        epochs=args.epochs,
        batch_size=args.batch_size,
        device=args.device
    )
    
    # Save
    save_probe(model, label_names, args.output)
    
    logger.info("Training complete!")


if __name__ == "__main__":
    main()
