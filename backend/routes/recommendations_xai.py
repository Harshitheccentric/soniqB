from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import Track, User, ListeningEvent
from typing import List, Dict
import numpy as np
import random

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

# Mock stats for 'Average User' to compare against
POPULATION_AVG = {
    "tempo": 120,
    "energy": 0.6,
    "danceability": 0.5,
    "acousticness": 0.3
}

def get_track_features_mock(track: Track) -> Dict[str, float]:
    """
    Simulate feature extraction. In a real app, this would query the DB
    or running librosa analysis on the file.
    Hashing the ID ensures consistent 'features' for the same track.
    """
    # Use track ID to seed random generator for consistency
    random.seed(track.id)
    
    # Generate mock features tailored to genre if known
    genre = track.predicted_genre or "Unknown"
    
    base_tempo = 120
    base_energy = 0.5
    
    if genre == "Pop":
        base_tempo = 110
        base_energy = 0.7
    elif genre == "Rock":
        base_tempo = 130
        base_energy = 0.8
    elif genre == "Hip-Hop":
        base_tempo = 95
        base_energy = 0.6
    elif genre == "Electronic":
        base_tempo = 128
        base_energy = 0.9
    elif genre == "Classical":
        base_tempo = 80
        base_energy = 0.3
        
    return {
        "tempo": base_tempo + random.uniform(-10, 10),
        "energy": min(1.0, max(0.0, base_energy + random.uniform(-0.1, 0.1))),
        "danceability": random.random(),
        "acousticness": random.random()
    }

def get_user_centroid(user_id: int, db: Session) -> Dict[str, float]:
    """
    Calculate the centroid of the user's listening history.
    """
    history = db.query(ListeningEvent).filter(ListeningEvent.user_id == user_id).all()
    
    if not history:
        return POPULATION_AVG
        
    track_ids = [e.track_id for e in history[-50:]] # Use last 50 tracks
    tracks = db.query(Track).filter(Track.id.in_(track_ids)).all()
    
    if not tracks:
        return POPULATION_AVG

    # Aggregate features
    totals = {"tempo": 0, "energy": 0, "danceability": 0, "acousticness": 0}
    count = 0
    
    for t in tracks:
        feats = get_track_features_mock(t)
        for k in totals:
            totals[k] += feats[k]
        count += 1
        
    return {k: v / count for k, v in totals.items()}

@router.get("/explain")
def explain_recommendation(
    track_id: int, 
    user_id: int, 
    db: Session = Depends(get_db)
):
    """
    Explain why a track is good for a user.
    """
    target_track = db.query(Track).filter(Track.id == track_id).first()
    if not target_track:
        raise HTTPException(status_code=404, detail="Track not found")
        
    # 1. Get Features
    track_feats = get_track_features_mock(target_track)
    user_feats = get_user_centroid(user_id, db)
    
    # 2. Compare
    # We look for features where the track matches the user's preference closely
    # OR features where the track complements the user
    
    match_score = 0
    explanations = []
    
    # Tempo Logic
    tempo_diff = abs(track_feats['tempo'] - user_feats['tempo'])
    if tempo_diff < 10:
        explanations.append(f"Matches your preferred Tempo ({int(user_feats['tempo'])} BPM)")
        match_score += 0.3
    
    # Energy Logic
    energy_diff = abs(track_feats['energy'] - user_feats['energy'])
    if energy_diff < 0.15:
        intensity = "High" if user_feats['energy'] > 0.7 else "Mellow" if user_feats['energy'] < 0.4 else "Moderate"
        explanations.append(f"Fits your {intensity} Energy vibe")
        match_score += 0.3
        
    # Discovery Logic (if Genre is different from recent history?)
    # ... for now simple feature matching
    
    # Fallback explanation
    if not explanations:
        explanations.append("Sonic texture matches your recent plays")
        match_score += 0.2
        
    return {
        "track_id": track_id,
        "track_title": target_track.title,
        "match_score": min(0.98, 0.4 + match_score), # Base confidence
        "reasons": explanations,
        "features": {
            "track": track_feats,
            "user": user_feats
        }
    }
