from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import Track
import random
import math

router = APIRouter()

@router.get("/universe", tags=["visualization"])
def get_sonic_universe(db: Session = Depends(get_db)):
    """
    Returns 3D coordinates for all tracks to build the Sonic Universe.
    In a real ML scenario, these would be t-SNE reduced embeddings.
    Here, we simulate clusters based on genre.
    """
    tracks = db.query(Track).all()
    
    universe_data = []
    
    # Define centers for genres (x, y, z)
    genre_centers = {
        "Pop": (10, 5, 0),
        "Rock": (-10, 5, 5),
        "Hip-Hop": (-5, -10, 0),
        "Electronic": (5, -10, 5),
        "Instrumental": (0, 15, -5),
        "Jazz": (0, 5, -10),
        "Classical": (5, 10, -10),
        "Folk": (-5, 10, -5),
        "Unknown": (0, 0, 0)
    }
    
    for track in tracks:
        genre = track.predicted_genre or "Unknown"
        center = genre_centers.get(genre, (0, 0, 0))
        
        # Add random spread around the center to create a "cloud"
        spread = 4.0
        x = center[0] + random.uniform(-spread, spread)
        y = center[1] + random.uniform(-spread, spread)
        z = center[2] + random.uniform(-spread, spread)
        
        universe_data.append({
            "id": track.id,
            "title": track.title,
            "artist": track.artist,
            "genre": genre,
            "position": [x, y, z],
            "color": get_genre_color(genre)
        })
        
    return universe_data

def get_genre_color(genre: str) -> str:
    # Neon/Cyberpunk palette
    colors = {
        "Pop": "#ff00ff",        # Magenta
        "Rock": "#ff3333",       # Red
        "Hip-Hop": "#ffff00",    # Yellow
        "Electronic": "#00ffff", # Cyan
        "Instrumental": "#00ff99", # Spring Green
        "Jazz": "#9900ff",       # Purple
        "Classical": "#ffffff",  # White
        "Folk": "#ff9900",       # Orange
        "Unknown": "#888888"     # Grey
    }
    return colors.get(genre, "#888888")
