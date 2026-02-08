"""
Analytics Routes
Endpoints for user listening analysis and library visualization.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Any
import os
import numpy as np
from sklearn.decomposition import PCA

from backend.db import get_db
from backend.models import Track, ListeningEvent, User
from backend.auth import get_current_user
from backend.ml.user_clustering import get_user_cluster_analyzer
from backend.ml.service import get_musicfm_service

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/profile")
def get_user_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get user's listening personality profile (Archetype + Stats).
    """
    analyzer = get_user_cluster_analyzer()
    
    # Fetch events
    events = db.query(ListeningEvent).filter(ListeningEvent.user_id == user.id).all()
    
    # Convert to dicts
    event_dicts = [
        {
            "event_type": e.event_type,
            "listened_duration": e.listened_duration,
            "track_id": e.track_id,
            "timestamp": e.timestamp
        }
        for e in events
    ]
    
    # Build vector
    # Ideally pass track genres too, but let's keep it simpler for now or fetch genres
    track_ids = {e.track_id for e in events}
    tracks = db.query(Track).filter(Track.id.in_(track_ids)).all()
    track_map = {t.id: {"id": t.id, "predicted_genre": t.predicted_genre} for t in tracks}
    
    # Build vector with genre info
    vector = analyzer.build_user_vector(event_dicts, [track_map[e.track_id] for e in events if e.track_id in track_map])
    
    # Predict
    archetype, info = analyzer.predict(vector)
    
    # Force exact total plays count from DB events (bypass ML vector normalization)
    real_total_plays = len([e for e in events if e.event_type == 'play'])
    info['features']['total_plays'] = real_total_plays
    
    return {
        "archetype": archetype,
        "description": info["description"],
        "stats": info["features"],
        "explanation": f"Based on your {real_total_plays} plays and listening habits."
    }

@router.get("/map")
def get_library_map(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get 2D coordinates for tracks the user has listened to, for visualization.
    Uses PCA/t-SNE on MusicFM embeddings.
    Returns empty for new users with no listening history.
    """
    points = []
    
    # Get track IDs the user has actually listened to
    user_events = db.query(ListeningEvent).filter(
        ListeningEvent.user_id == user.id,
        ListeningEvent.event_type == 'play'
    ).all()
    
    user_track_ids = list(set(e.track_id for e in user_events))
    
    # New users with no listening history get empty galaxy
    if not user_track_ids:
        return {"points": [], "genres": []}
    
    # Force Real Data Mode - Ignore Cache
    embedding_path = "backend/ml/data/track_embeddings.npy"
    id_path = "backend/ml/data/track_ids.npy"
    
    # Try Real Data First
    if os.path.exists(embedding_path) and os.path.exists(id_path):
        try:
            print(f"Loading real embeddings for user {user.id}...")
            embeddings_np = np.load(embedding_path)
            track_ids_np = np.load(id_path)
            
            # Create map with NATIVE INT keys to ensure matching with DB IDs
            track_id_map = {int(id): i for i, id in enumerate(track_ids_np)}
            
            # Filter to only user's tracks that have embeddings
            user_track_ids_with_embeddings = [tid for tid in user_track_ids if tid in track_id_map]
            
            if not user_track_ids_with_embeddings:
                # User's tracks don't have embeddings, fallback to simulation
                raise ValueError("No embeddings for user's tracks")
            
            # Extract embeddings for user's tracks only
            user_embedding_indices = [track_id_map[tid] for tid in user_track_ids_with_embeddings]
            user_embeddings = embeddings_np[user_embedding_indices]
            
            print(f"Running PCA on {len(user_embeddings)} user embeddings...")
            
            if len(user_embeddings) >= 2:
                from sklearn.decomposition import PCA
                pca = PCA(n_components=2)
                coords_2d = pca.fit_transform(user_embeddings)
            else:
                # Only one track, just center it
                coords_2d = np.array([[0.0, 0.0]])
            
            # Normalize
            max_val = np.max(np.abs(coords_2d)) if len(coords_2d) > 0 else 1
            if max_val > 0:
                coords_2d = coords_2d / max_val
            
            # Match back to DB tracks
            tracks = db.query(Track).filter(Track.id.in_(user_track_ids_with_embeddings)).all()
            track_lookup = {t.id: t for t in tracks}
            
            for i, tid in enumerate(user_track_ids_with_embeddings):
                t = track_lookup.get(tid)
                if not t:
                    continue
                    
                x, y = coords_2d[i]
                
                # Add slight jitter
                import random
                x += random.gauss(0, 0.02)
                y += random.gauss(0, 0.02)
                
                points.append({
                    "id": t.id,
                    "title": t.title,
                    "artist": t.artist,
                    "genre": t.predicted_genre or "Unknown",
                    "x": float(x),
                    "y": float(y),
                })
            
            # Get unique genres for legend
            genres = list(set(p["genre"] for p in points))
            
            print(f"Generated {len(points)} map points for user {user.id}.")
            return {"points": points, "genres": genres}
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error in Real Data Mode: {e}, falling back to simulation")
            
    # --- SIMULATION FALLBACK (If no cache or error) ---
    # Filter to user's tracks only
    tracks = db.query(Track).filter(
        Track.id.in_(user_track_ids),
        Track.predicted_genre.isnot(None)
    ).all()
    
    # Expanded Simulation Centers to match more folders
    genre_centers = {
        "Pop": [0.3, 0.3],
        "pop": [0.3, 0.3],
        "Rock": [-0.5, 0.5],
        "rock": [-0.5, 0.5],
        "Hip-Hop": [-0.2, -0.6],
        "hip-hop": [-0.2, -0.6],
        "Electronic": [0.6, -0.3],
        "electronic": [0.6, -0.3],
        "Classical": [0.8, 0.8],
        "Jazz": [0.4, 0.6],
        "Metal": [-0.8, 0.2],
        "Country": [-0.3, 0.1],
        "Folk": [0.1, 0.7],
        "folk": [0.1, 0.7],
        "Instrumental": [0.7, 0.2],
        "instrumental": [0.7, 0.2],
        "International": [0.0, -0.8],
        "international": [0.0, -0.8],
        "Experimental": [-0.6, -0.6],
        "experimental": [-0.6, -0.6],
        "Unknown": [0, 0]
    }
    
    import random
    
    for t in tracks:
        genre = t.predicted_genre or "Unknown"
        # Try exact match, then Title Case, then fallback
        center = genre_centers.get(genre)
        if not center:
             center = genre_centers.get(genre.capitalize(), [0, 0])
             
        # Add noise
        x = center[0] + random.gauss(0, 0.15)
        y = center[1] + random.gauss(0, 0.15)
        
        points.append({
            "id": t.id,
            "title": t.title,
            "artist": t.artist,
            "genre": genre,
            "x": x,
            "y": y
        })
    
    # Get unique genres for legend
    genres = list(set(p["genre"] for p in points))
        
    return {
        "points": points,
        "genres": genres
    }

