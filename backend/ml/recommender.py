"""
Recommendation Engine Module for SoniqB - Phase 3

Provides content-based recommendation logic using MusicFM embeddings.
"""
import logging
import numpy as np
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics.pairwise import cosine_similarity

from backend.models import Track, ListeningEvent, User
from backend.ml.service import get_musicfm_service

logger = logging.getLogger(__name__)

class TrackRecommender:
    """
    Content-based recommender system using MusicFM embeddings.
    """
    
    def __init__(self, n_neighbors: int = 20):
        self.n_neighbors = n_neighbors
        self._model: Optional[NearestNeighbors] = None
        self._track_ids: List[int] = []
        self._embeddings: Optional[np.ndarray] = None
        self._is_fitted = False
        
    def fit(self, db: Session) -> None:
        """
        Fit the recommender on all tracks in the database.
        This loads embeddings for all tracks into memory.
        """
        logger.info("Fitting recommender on track library...")
        
        # Fetch all tracks
        tracks = db.query(Track).all()
        
        valid_tracks = []
        embeddings_list = []
        
        service = get_musicfm_service()
        
        # Load or compute embeddings
        # ideally these are cached in DB/File, but for now we might compute on fly
        # For simplicity in this demo, let's assume valid tracks have them or we skip
        # NOTE: In a real system, you'd store embeddings in a vector DB or .npy file
        
        # Fallback: Generate random embeddings for demo if real ones missing
        # BUT since we have the service, let's try to extract if fast enough, 
        # or use a cached lookup if we built one.
        
        # Optimization: We'll assume a matrix exists or build a small one.
        # For this "Phase 3" prototype, let's simulate the embedding matrix
        # based on genre clusters if actual file scanning is too slow for 100s of tracks.
        
        # actually, let's just use what we have.
        # Check if we have a precomputed embedding file
        import os
        embedding_cache_path = "backend/ml/data/track_embeddings.npy"
        id_cache_path = "backend/ml/data/track_ids.npy"
        
        if os.path.exists(embedding_cache_path) and os.path.exists(id_cache_path):
            self._embeddings = np.load(embedding_cache_path)
            self._track_ids = np.load(id_cache_path).tolist()
            self._is_fitted = True
            logger.info(f"Loaded {len(self._track_ids)} cached embeddings")
        else:
            logger.warning("No embedding cache found. Recommender will be empty until scan.")
            self._is_fitted = False
            
        if self._is_fitted and self._embeddings is not None:
             self._model = NearestNeighbors(
                n_neighbors=self.n_neighbors, 
                metric='cosine', 
                algorithm='brute'
            )
             self._model.fit(self._embeddings)
    
    def recommend_next_track(
        self, 
        current_track_id: int, 
        history_ids: List[int],
        top_k: int = 5
    ) -> Optional[int]:
        """
        Recommend the next track based on the current one.
        
        Args:
            current_track_id: ID of the currently playing track
            history_ids: IDs of tracks recently played (to avoid repeats)
            top_k: Number of candidates to consider
            
        Returns:
            Recommended track ID or None
        """
        if not self._is_fitted or self._model is None:
            # Cold Start Fallback: If not fitted or empty, return random from DB?
            # Ideally handled by caller, but here return None
            return None
            
        # --- Cold Start Strategy ---
        if len(history_ids) < 5:
            # User is new (Cold Start). 
            # Strategy: Sample from pre-computed Global KMeans centroids (simulated here)
            # We pick a random "Cluster" to start them off in.
            import random
            random_idx = random.randint(0, len(self._track_ids) - 1)
            # Return a random track to seed their taste
            return self._track_ids[random_idx]

        # Find index of current track
        try:
            query_idx = self._track_ids.index(current_track_id)
        except ValueError:
            return None
            
        # Get embedding
        query_emb = self._embeddings[query_idx].reshape(1, -1)
        
        # --- Skip Signal Penalty ---
        # If we passed skipped_ids, we temporarily adjust the query vector
        # pushing it AWAY from the skipped tracks' centroid.
        # For simplicity in this demo (stateless), we'll do this if skipped_ids is added later.
        # Since the signature assumes stateless, we'll keep it simple: 
        # Just use standard similarity but filter aggressively.
        
        # Find neighbors (fetch more to allow for exploration reranking)
        # Fetch 20 candidates
        distances, indices = self._model.kneighbors(query_emb, n_neighbors=20 + len(history_ids))
        
        # Filter candidates
        candidates = []
        for idx in indices[0]:
            tid = self._track_ids[idx]
            if tid == current_track_id:
                continue
            if tid in history_ids:
                continue
            candidates.append(tid)
        
        if not candidates:
            return None
            
        # --- Probabilistic Reranking (Exploration vs Exploitation) ---
        import random
        
        # 20% Chance to Explore (pick from rank 5-15)
        # 80% Chance to Exploit (pick from rank 0-4)
        
        if len(candidates) >= 10 and random.random() < 0.2:
            # Exploration Mode
            # Pick a random track from the "Next Best" tier
            # ranks 5 to 15 (or end of list)
            start = 5
            end = min(15, len(candidates))
            if start < end:
                return candidates[random.randint(start, end - 1)]
        
        # Exploitation Mode (Default)
        # Pick the absolute best match
        return candidates[0]
    
    def generate_playlist(
        self, 
        seed_track_ids: List[int], 
        n_tracks: int = 20,
        exclude_ids: List[int] = []
    ) -> List[int]:
        """
        Generate a playlist based on a set of seed tracks.
        """
        if not self._is_fitted or self._model is None:
            return []
            
        # Get mean embedding of seeds
        seed_indices = [i for i, tid in enumerate(self._track_ids) if tid in seed_track_ids]
        if not seed_indices:
            return []
            
        seed_embs = self._embeddings[seed_indices]
        center_emb = np.mean(seed_embs, axis=0).reshape(1, -1)
        
        # Find neighbors around center
        # Request more than n_tracks to account for exclusions
        distances, indices = self._model.kneighbors(center_emb, n_neighbors=n_tracks * 2 + len(exclude_ids))
        
        playlist = []
        for idx in indices[0]:
            tid = self._track_ids[idx]
            if tid in seed_track_ids or tid in exclude_ids:
                continue
            playlist.append(tid)
            if len(playlist) >= n_tracks:
                break
                
        return playlist

# Singleton
_recommender_instance: Optional[TrackRecommender] = None

def get_recommender() -> TrackRecommender:
    global _recommender_instance
    if _recommender_instance is None:
        _recommender_instance = TrackRecommender()
    return _recommender_instance
