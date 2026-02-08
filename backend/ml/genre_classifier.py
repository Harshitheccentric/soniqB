"""
Genre Classification Module for SoniqB - Phase 3

Uses MusicFM embeddings to classify music tracks into genres.
Since we're using a foundation model (not a fine-tuned classifier),
we use embedding similarity to a genre reference set.

FMA Genre Categories (8 top-level):
- Electronic
- Experimental  
- Folk
- Hip-Hop
- Instrumental
- International
- Pop
- Rock
"""
import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity

from backend.ml.service import get_musicfm_service

logger = logging.getLogger(__name__)

# FMA top-level genres
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


class GenreClassifier:
    """
    Genre classifier using MusicFM embeddings.
    
    This classifier works by:
    1. Using a trained linear probe (if available) - BEST
    2. Comparing to pre-computed genre centroids OR
    3. Using unsupervised clustering if no labeled data is available
    """
    
    def __init__(
        self,
        n_clusters: int = 8,
        centroids_path: Optional[str] = None,
        probe_path: Optional[str] = None
    ):
        """
        Initialize genre classifier.
        
        Args:
            n_clusters: Number of genre clusters
            centroids_path: Path to saved genre centroids (JSON)
            probe_path: Path to trained linear probe (PT)
        """
        self.n_clusters = n_clusters
        self.centroids_path = centroids_path
        self.probe_path = probe_path
        
        # Genre centroids: {genre_name: embedding_vector}
        self._centroids: Optional[Dict[str, np.ndarray]] = None
        self._kmeans: Optional[KMeans] = None
        self._cluster_labels: List[str] = []
        
        # Linear probe (trained classifier)
        self._probe = None
        self._probe_labels: List[str] = []
        
        # Try to load probe first (preferred method)
        if probe_path and os.path.exists(probe_path):
            self._load_probe()
        # Fall back to centroids
        elif centroids_path and os.path.exists(centroids_path):
            self._load_centroids()
    
    def _load_probe(self) -> None:
        """Load trained linear probe."""
        try:
            import torch
            import torch.nn as nn
            
            checkpoint = torch.load(self.probe_path, map_location='cpu')
            
            # Reconstruct model
            input_dim = checkpoint.get('input_dim', 1024)
            num_classes = checkpoint.get('num_classes', 8)
            
            self._probe = nn.Sequential(
                nn.Linear(input_dim, 256),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(256, num_classes)
            )
            
            # Handle state_dict key mismatch (training saves with 'classifier.' prefix)
            state_dict = checkpoint['model_state_dict']
            # Strip 'classifier.' prefix if present
            fixed_state_dict = {}
            for k, v in state_dict.items():
                if k.startswith('classifier.'):
                    fixed_state_dict[k[11:]] = v  # Remove 'classifier.' prefix
                else:
                    fixed_state_dict[k] = v
            
            self._probe.load_state_dict(fixed_state_dict)
            self._probe.eval()
            
            self._probe_labels = checkpoint.get('label_names', FMA_GENRES)
            
            logger.info(f"Loaded trained probe with {len(self._probe_labels)} classes: {self._probe_labels}")
            
        except Exception as e:
            logger.error(f"Failed to load probe: {e}")
            self._probe = None
    
    def _load_centroids(self) -> None:
        """Load pre-computed genre centroids from file."""
        try:
            with open(self.centroids_path, 'r') as f:
                data = json.load(f)
            
            self._centroids = {
                name: np.array(vec) 
                for name, vec in data['centroids'].items()
            }
            self._cluster_labels = data.get('labels', list(self._centroids.keys()))
            logger.info(f"Loaded {len(self._centroids)} genre centroids")
            
        except Exception as e:
            logger.error(f"Failed to load centroids: {e}")
            self._centroids = None
    
    def add_centroid(self, genre_name: str, embedding: np.ndarray) -> None:
        """
        Add or update a genre centroid for calibration.
        
        Args:
            genre_name: Name of the genre
            embedding: Reference embedding vector
        """
        if self._centroids is None:
            self._centroids = {}
            
        self._centroids[genre_name] = embedding
        if genre_name not in self._cluster_labels:
            self._cluster_labels.append(genre_name)
            
        logger.info(f"Added centroid for genre: {genre_name}")
        
        # Save automatically if path is set
        if self.centroids_path:
            self.save_centroids(self.centroids_path)

    def save_centroids(self, path: str) -> None:
        """Save genre centroids to file."""
        if self._centroids is None:
            raise ValueError("No centroids to save")
            
        # Ensure directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True)
            
        data = {
            'centroids': {
                name: vec.tolist() 
                for name, vec in self._centroids.items()
            },
            'labels': self._cluster_labels
        }
        
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"Saved {len(self._centroids)} genre centroids to {path}")
    
    def classify_embedding(
        self, 
        embedding: np.ndarray
    ) -> Tuple[str, float]:
        """
        Classify a single embedding into a genre.
        
        Priority: Probe > Centroids > K-Means > Unknown
        
        Args:
            embedding: Audio embedding vector
            
        Returns:
            Tuple of (genre_name, confidence_score)
        """
        if self._probe is not None:
            # Use trained probe (best method)
            return self._classify_with_probe(embedding)
        elif self._centroids is not None:
            # Use pre-computed centroids
            return self._classify_with_centroids(embedding)
        elif self._kmeans is not None:
            # Use fitted K-Means
            return self._classify_with_kmeans(embedding)
        else:
            # No model available - return unknown
            return ("Unknown", 0.0)
    
    def _classify_with_probe(
        self,
        embedding: np.ndarray
    ) -> Tuple[str, float]:
        """Classify using trained linear probe."""
        import torch
        import torch.nn.functional as F
        
        with torch.no_grad():
            x = torch.FloatTensor(embedding).unsqueeze(0)
            logits = self._probe(x)
            probs = F.softmax(logits, dim=-1).squeeze(0)
            
            pred_idx = probs.argmax().item()
            confidence = probs[pred_idx].item()
            genre = self._probe_labels[pred_idx]
            
        return (genre, confidence)
    
    def _classify_with_centroids(
        self, 
        embedding: np.ndarray
    ) -> Tuple[str, float]:
        """Classify using centroid similarity."""
        centroid_names = list(self._centroids.keys())
        centroid_vectors = np.array([self._centroids[n] for n in centroid_names])
        
        # Compute cosine similarity
        embedding_2d = embedding.reshape(1, -1)
        similarities = cosine_similarity(embedding_2d, centroid_vectors)[0]
        
        # Get best match
        best_idx = np.argmax(similarities)
        best_genre = centroid_names[best_idx]
        confidence = float(similarities[best_idx])
        
        # Normalize confidence to 0-1 range (cosine sim can be negative)
        confidence = (confidence + 1) / 2
        
        return (best_genre, confidence)
    
    def _classify_with_kmeans(
        self, 
        embedding: np.ndarray
    ) -> Tuple[str, float]:
        """Classify using fitted K-Means."""
        # Predict cluster
        cluster_id = self._kmeans.predict(embedding.reshape(1, -1))[0]
        
        # Get cluster label
        if cluster_id < len(self._cluster_labels):
            genre = self._cluster_labels[cluster_id]
        else:
            genre = f"Cluster_{cluster_id}"
        
        # Compute confidence as inverse distance to centroid
        centroid = self._kmeans.cluster_centers_[cluster_id]
        distance = np.linalg.norm(embedding - centroid)
        
        # Convert distance to confidence (closer = higher confidence)
        # Using exponential decay
        confidence = float(np.exp(-distance / 10))
        
        return (genre, confidence)
    
    def fit_clusters(
        self, 
        embeddings: np.ndarray,
        labels: Optional[List[str]] = None
    ) -> None:
        """
        Fit K-Means clustering on a set of embeddings.
        
        Args:
            embeddings: Array of shape (n_samples, embedding_dim)
            labels: Optional cluster labels (uses default FMA genres if None)
        """
        logger.info(f"Fitting K-Means with {self.n_clusters} clusters on {len(embeddings)} samples")
        
        self._kmeans = KMeans(
            n_clusters=self.n_clusters,
            random_state=42,
            n_init=10
        )
        self._kmeans.fit(embeddings)
        
        # Set labels
        if labels is not None:
            self._cluster_labels = labels
        else:
            # Use FMA genre names as default labels
            if self.n_clusters <= len(FMA_GENRES):
                self._cluster_labels = FMA_GENRES[:self.n_clusters]
            else:
                self._cluster_labels = list(FMA_GENRES) + [f"Genre_{i}" for i in range(len(FMA_GENRES), self.n_clusters)]
        
        # Convert to centroids dict
        self._centroids = {
            self._cluster_labels[i]: self._kmeans.cluster_centers_[i]
            for i in range(self.n_clusters)
        }
        
        logger.info(f"K-Means fitted. Cluster labels: {self._cluster_labels}")
    
    def classify_audio_file(
        self, 
        audio_path: str
    ) -> Tuple[str, float]:
        """
        Classify an audio file into a genre.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Tuple of (genre_name, confidence_score)
        """
        # Get MusicFM service
        service = get_musicfm_service()
        
        # Extract embedding
        embedding = service.get_embedding(audio_path)
        
        # Classify
        return self.classify_embedding(embedding)


# Singleton instance
_classifier_instance: Optional[GenreClassifier] = None


def get_genre_classifier() -> GenreClassifier:
    """Get or create singleton genre classifier instance."""
    global _classifier_instance
    if _classifier_instance is None:
        ml_dir = Path(__file__).parent
        
        # Check for trained probe (preferred)
        probe_path = ml_dir / "data" / "musicfm_probe.pt"
        
        # Check for pre-computed centroids (fallback)
        centroids_path = ml_dir / "data" / "genre_centroids.json"
        
        _classifier_instance = GenreClassifier(
            n_clusters=8,
            centroids_path=str(centroids_path), # Always pass path so we can save to it
            probe_path=str(probe_path) if probe_path.exists() else None
        )
    return _classifier_instance
