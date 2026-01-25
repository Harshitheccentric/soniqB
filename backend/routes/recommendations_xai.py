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
    "acousticness": 0.3,
    "valence": 0.5,
    "instrumentalness": 0.1
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
    base_val = 0.5
    base_inst = 0.1
    
    if genre == "Pop":
        base_tempo = 110
        base_energy = 0.7
        base_val = 0.8
        base_inst = 0.05
    elif genre == "Rock":
        base_tempo = 130
        base_energy = 0.8
        base_val = 0.6
        base_inst = 0.3
    elif genre == "Hip-Hop":
        base_tempo = 95
        base_energy = 0.6
        base_val = 0.7
        base_inst = 0.05
    elif genre == "Electronic":
        base_tempo = 128
        base_energy = 0.9
        base_val = 0.7
        base_inst = 0.8
    elif genre == "Classical":
        base_tempo = 80
        base_energy = 0.3
        base_val = 0.4
        base_inst = 0.95
    elif genre == "Jazz":
        base_tempo = 100
        base_energy = 0.4
        base_val = 0.6
        base_inst = 0.7
    elif genre == "Ambient":
        base_tempo = 60
        base_energy = 0.2
        base_val = 0.3
        base_inst = 0.95
        
    return {
        "tempo": base_tempo + random.uniform(-10, 10),
        "energy": min(1.0, max(0.0, base_energy + random.uniform(-0.1, 0.1))),
        "danceability": random.random(),
        "acousticness": random.random(),
        "valence": min(1.0, max(0.0, base_val + random.uniform(-0.1, 0.1))),
        "instrumentalness": min(1.0, max(0.0, base_inst + random.uniform(-0.1, 0.1)))
    }

def get_user_centroid(user_id: int, db: Session) -> Dict[str, float]:
    """
    Calculate the centroid of the user's listening history.
    """
    history = db.query(ListeningEvent).filter(ListeningEvent.user_id == user_id).all()
    
    if not history:
        return POPULATION_AVG
        
    track_ids = [e.track_id for e in history[-50:]]
    tracks = db.query(Track).filter(Track.id.in_(track_ids)).all()
    
    if not tracks:
        return POPULATION_AVG

    # Aggregate features
    totals = {
        "tempo": 0, "energy": 0, "danceability": 0, 
        "acousticness": 0, "valence": 0, "instrumentalness": 0
    }
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
    match_score = 0
    explanations = []
    
    # Tempo Logic
    tempo_diff = abs(track_feats['tempo'] - user_feats['tempo'])
    if tempo_diff < 15:
        explanations.append(f"Matches your typical Tempo ({int(user_feats['tempo'])} BPM)")
        match_score += 0.2
    
    # Energy Logic
    energy_diff = abs(track_feats['energy'] - user_feats['energy'])
    if energy_diff < 0.2:
        intensity = "High" if user_feats['energy'] > 0.7 else "Chill" if user_feats['energy'] < 0.4 else "Balanced"
        explanations.append(f"Fits your {intensity} energy preference")
        match_score += 0.2
        
    # Valence (Mood) Logic
    val_diff = abs(track_feats['valence'] - user_feats['valence'])
    if val_diff < 0.2:
        mood = "Upbeat" if user_feats['valence'] > 0.6 else "Melancholic" if user_feats['valence'] < 0.4 else "Neutral"
        explanations.append(f"Resonates with your recent {mood} mood")
        match_score += 0.2
        
    # Instrumentalness Logic
    inst_diff = abs(track_feats['instrumentalness'] - user_feats['instrumentalness'])
    if inst_diff < 0.3 and track_feats['instrumentalness'] > 0.6:
        explanations.append("Aligns with your taste for Instrumentals")
        match_score += 0.2
        
    # Fallback explanation
    if not explanations:
        explanations.append("Sonic texture matches your listening profile")
        match_score += 0.1
        
    return {
        "track_id": track_id,
        "track_title": target_track.title,
        "match_score": min(0.96, 0.45 + match_score),
        "reasons": explanations,
        "features": {
            "track": track_feats,
            "user": user_feats
        }
    }
