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
    
    return {
        "archetype": archetype,
        "description": info["description"],
        "stats": info["features"],
        "explanation": f"Based on your {int(info['features']['total_plays'])} plays and listening habits."
    }

@router.get("/map")
def get_library_map(db: Session = Depends(get_db)):
    """
    Get 2D coordinates for all tracks in library for visualization.
    Uses PCA/t-SNE on MusicFM embeddings.
    """
    points = []
    
    # Force Real Data Mode - Ignore Cache
    embedding_path = "backend/ml/data/track_embeddings.npy"
    id_path = "backend/ml/data/track_ids.npy"
    
    # Try Real Data First
    if os.path.exists(embedding_path) and os.path.exists(id_path):
        try:
            print("Loading real embeddings...")
            embeddings_np = np.load(embedding_path)
            track_ids_np = np.load(id_path)
            
            # Create map with NATIVE INT keys to ensure matching with DB IDs
            track_id_map = {int(id): i for i, id in enumerate(track_ids_np)}
            
            print(f"Loaded {len(embeddings_np)} embeddings. Running PCA...")
            from sklearn.decomposition import PCA
            pca = PCA(n_components=2)
            coords_2d = pca.fit_transform(embeddings_np)
            
            # Normalize
            max_val = np.max(np.abs(coords_2d))
            if max_val > 0:
                coords_2d = coords_2d / max_val
            
            # Match back to DB tracks
            tracks = db.query(Track).filter(Track.id.in_([int(i) for i in track_ids_np])).all()
            print(f"Found {len(tracks)} matching tracks in DB.")
            
            for t in tracks:
                if t.id not in track_id_map:
                    continue
                    
                idx = track_id_map[t.id]
                x, y = coords_2d[idx]
                
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
            
            print(f"Successfully generated {len(points)} map points from REAL data.")
            return {"points": points, "genres": []}
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"CRITICAL ERROR in Real Data Mode: {e}")
            # Fallthrough to simulation only on crash
            
    # --- SIMULATION FALLBACK (If no cache) ---
    tracks = db.query(Track).filter(Track.predicted_genre.isnot(None)).all()
    
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
        
    return {
        "points": points,
        "genres": list(genre_centers.keys())
    }
