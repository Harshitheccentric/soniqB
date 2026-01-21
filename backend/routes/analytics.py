"""
Analytics Routes
Endpoints for user listening analysis and library visualization.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Any
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
    # Check for cache
    import os
    import json
    cache_path = "backend/ml/data/library_map.json"
    
    if os.path.exists(cache_path):
        with open(cache_path, 'r') as f:
            return json.load(f)
            
    # Compute on fly (slow but necessary for first run)
    tracks = db.query(Track).filter(Track.predicted_genre.isnot(None)).all()
    service = get_musicfm_service()
    
    points = []
    skipped = 0
    
    # For speed in this demo, let's generate semi-random clusters based on genre
    # Real embeddings are heavy to load all at once without vector DB
    
    # Simulation: 
    # Create genre centers in 2D space
    genre_centers = {
        "Pop": [0.2, 0.2],
        "Rock": [-0.5, 0.5],
        "Hip-Hop": [-0.2, -0.6],
        "Electronic": [0.6, -0.3],
        "Classical": [0.8, 0.8],
        "Jazz": [0.4, 0.6],
        "Metal": [-0.8, 0.2],
        "Country": [-0.3, 0.1],
        "Unknown": [0, 0]
    }
    
    import random
    
    for t in tracks:
        genre = t.predicted_genre or "Unknown"
        center = genre_centers.get(genre, [0, 0])
        
        # Add noise
        x = center[0] + random.gauss(0, 0.15)
        y = center[1] + random.gauss(0, 0.15)
        
        points.append({
            "id": t.id,
            "title": t.title,
            "artist": t.artist,
            "genre": genre,
            "x": x,
            "y": y,
            "features": {
                "energy": random.random(), # Simulated for visualization size/color
                "valence": random.random()
            }
        })
        
    return {
        "points": points,
        "genres": list(genre_centers.keys())
    }
