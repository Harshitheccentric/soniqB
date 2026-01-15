"""
User Clustering Module for SoniqB - Phase 3

Clusters users based on their listening patterns to identify
listener archetypes/categories.

Listening Categories:
- Casual: Low engagement, few plays, short durations
- Explorer: Diverse genres, many skips, trying new things
- Enthusiast: High engagement, long durations, many likes
- Niche: Focused on specific genres, consistent preferences
"""
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# Default user cluster labels
USER_CLUSTER_LABELS = [
    "Casual Listener",
    "Explorer",
    "Enthusiast", 
    "Niche Fan"
]

# Cluster descriptions for UI
CLUSTER_DESCRIPTIONS = {
    "Casual Listener": "Relaxed listening habits with occasional engagement",
    "Explorer": "Frequently discovers new music across diverse genres",
    "Enthusiast": "Deeply engaged with long listening sessions and favorites",
    "Niche Fan": "Focused preferences with consistent genre choices"
}


class UserClusterAnalyzer:
    """
    Analyzes user listening patterns and assigns cluster categories.
    
    Features used for clustering:
    - Total play count
    - Average listening duration (seconds)
    - Like ratio (likes / total events)
    - Skip ratio (skips / play events)
    - Genre diversity (number of unique genres)
    - Session frequency (events per day on average)
    """
    
    def __init__(self, n_clusters: int = 4):
        """
        Initialize user cluster analyzer.
        
        Args:
            n_clusters: Number of user clusters (default: 4)
        """
        self.n_clusters = n_clusters
        self._kmeans: Optional[KMeans] = None
        self._scaler: Optional[StandardScaler] = None
        self._cluster_labels = USER_CLUSTER_LABELS[:n_clusters]
        self._is_fitted = False
    
    def build_user_vector(
        self,
        events: List[Dict],
        tracks: Optional[List[Dict]] = None
    ) -> np.ndarray:
        """
        Build feature vector for a user from their listening events.
        
        Args:
            events: List of listening event dicts
            tracks: Optional list of track dicts for genre info
            
        Returns:
            Feature vector of shape (6,)
        """
        if not events:
            # Return default vector for users with no events
            return np.zeros(6)
        
        # Extract event types
        play_events = [e for e in events if e.get('event_type') == 'play']
        like_events = [e for e in events if e.get('event_type') == 'like']
        skip_events = [e for e in events if e.get('event_type') == 'skip']
        
        # 1. Total play count
        total_plays = len(play_events)
        
        # 2. Average listening duration
        durations = [e.get('listened_duration', 0) for e in play_events]
        avg_duration = np.mean(durations) if durations else 0
        
        # 3. Like ratio
        like_ratio = len(like_events) / max(len(events), 1)
        
        # 4. Skip ratio
        skip_ratio = len(skip_events) / max(total_plays, 1)
        
        # 5. Genre diversity (unique track IDs as proxy if no genre info)
        if tracks:
            genres = set()
            track_genres = {t['id']: t.get('predicted_genre', 'Unknown') for t in tracks}
            for e in play_events:
                track_id = e.get('track_id')
                if track_id in track_genres:
                    genres.add(track_genres[track_id])
            genre_diversity = len(genres)
        else:
            # Use unique track count as proxy
            unique_tracks = len(set(e.get('track_id') for e in play_events))
            genre_diversity = unique_tracks
        
        # 6. Session frequency (events per day)
        if len(events) >= 2:
            timestamps = []
            for e in events:
                ts = e.get('timestamp')
                if isinstance(ts, str):
                    try:
                        ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    except:
                        continue
                if isinstance(ts, datetime):
                    timestamps.append(ts)
            
            if len(timestamps) >= 2:
                timestamps.sort()
                date_range = (timestamps[-1] - timestamps[0]).days + 1
                session_freq = len(events) / max(date_range, 1)
            else:
                session_freq = len(events)
        else:
            session_freq = len(events)
        
        return np.array([
            total_plays,
            avg_duration,
            like_ratio,
            skip_ratio,
            genre_diversity,
            session_freq
        ], dtype=np.float32)
    
    def fit(self, user_vectors: np.ndarray) -> None:
        """
        Fit the clustering model on user vectors.
        
        Args:
            user_vectors: Array of shape (n_users, 6)
        """
        logger.info(f"Fitting user clusters on {len(user_vectors)} users")
        
        # Normalize features
        self._scaler = StandardScaler()
        normalized = self._scaler.fit_transform(user_vectors)
        
        # Fit K-Means
        self._kmeans = KMeans(
            n_clusters=self.n_clusters,
            random_state=42,
            n_init=10
        )
        self._kmeans.fit(normalized)
        
        self._is_fitted = True
        logger.info(f"User clustering fitted with {self.n_clusters} clusters")
    
    def predict(
        self, 
        user_vector: np.ndarray
    ) -> Tuple[str, Dict]:
        """
        Predict cluster for a user.
        
        Args:
            user_vector: Feature vector of shape (6,)
            
        Returns:
            Tuple of (cluster_label, cluster_info_dict)
        """
        if not self._is_fitted:
            # Use heuristic classification if not fitted
            return self._heuristic_classify(user_vector)
        
        # Normalize
        normalized = self._scaler.transform(user_vector.reshape(1, -1))
        
        # Predict cluster
        cluster_id = self._kmeans.predict(normalized)[0]
        
        # Get label
        if cluster_id < len(self._cluster_labels):
            label = self._cluster_labels[cluster_id]
        else:
            label = f"Cluster_{cluster_id}"
        
        # Build info dict
        info = {
            "cluster_id": int(cluster_id),
            "label": label,
            "description": CLUSTER_DESCRIPTIONS.get(label, ""),
            "features": {
                "total_plays": float(user_vector[0]),
                "avg_duration": float(user_vector[1]),
                "like_ratio": float(user_vector[2]),
                "skip_ratio": float(user_vector[3]),
                "genre_diversity": float(user_vector[4]),
                "session_frequency": float(user_vector[5])
            }
        }
        
        return (label, info)
    
    def _heuristic_classify(
        self, 
        user_vector: np.ndarray
    ) -> Tuple[str, Dict]:
        """
        Heuristic classification when clustering model is not fitted.
        Uses rule-based logic based on feature values.
        """
        total_plays = user_vector[0]
        avg_duration = user_vector[1]
        like_ratio = user_vector[2]
        skip_ratio = user_vector[3]
        genre_diversity = user_vector[4]
        session_freq = user_vector[5]
        
        # Decision rules
        if total_plays < 5 or avg_duration < 30:
            label = "Casual Listener"
        elif skip_ratio > 0.4 and genre_diversity > 3:
            label = "Explorer"
        elif like_ratio > 0.3 and avg_duration > 120:
            label = "Enthusiast"
        elif genre_diversity <= 2 and total_plays > 10:
            label = "Niche Fan"
        elif session_freq > 5:
            label = "Enthusiast"
        else:
            label = "Casual Listener"
        
        info = {
            "cluster_id": self._cluster_labels.index(label) if label in self._cluster_labels else 0,
            "label": label,
            "description": CLUSTER_DESCRIPTIONS.get(label, ""),
            "features": {
                "total_plays": float(total_plays),
                "avg_duration": float(avg_duration),
                "like_ratio": float(like_ratio),
                "skip_ratio": float(skip_ratio),
                "genre_diversity": float(genre_diversity),
                "session_frequency": float(session_freq)
            },
            "method": "heuristic"
        }
        
        return (label, info)


# Singleton instance
_analyzer_instance: Optional[UserClusterAnalyzer] = None


def get_user_cluster_analyzer() -> UserClusterAnalyzer:
    """Get or create singleton user cluster analyzer instance."""
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = UserClusterAnalyzer(n_clusters=4)
    return _analyzer_instance
