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
    
    # Define centers for genres (x, y, z) - BOTH cases for robustness
    genre_centers = {
        "Pop": (10, 5, 0), "pop": (10, 5, 0),
        "Rock": (-10, 5, 5), "rock": (-10, 5, 5),
        "Hip-Hop": (-5, -10, 0), "hip-hop": (-5, -10, 0),
        "Electronic": (5, -10, 5), "electronic": (5, -10, 5),
        "Instrumental": (0, 15, -5), "instrumental": (0, 15, -5),
        "Jazz": (0, 5, -10), "jazz": (0, 5, -10),
        "Classical": (5, 10, -10), "classical": (5, 10, -10),
        "Folk": (-5, 10, -5), "folk": (-5, 10, -5),
        "International": (0, -5, 10), "international": (0, -5, 10),
        "Unknown": (0, 0, 0)
    }
    
    for track in tracks:
        genre = track.predicted_genre or "Unknown"
        # Try exact match, then title case, then fallback
        center = genre_centers.get(genre) or genre_centers.get(genre.capitalize(), (0, 0, 0))
        
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
    # Neon/Cyberpunk palette - BOTH cases for robustness
    colors = {
        "Pop": "#ff00ff", "pop": "#ff00ff",           # Magenta
        "Rock": "#ff3333", "rock": "#ff3333",         # Red
        "Hip-Hop": "#ffff00", "hip-hop": "#ffff00",   # Yellow
        "Electronic": "#00ffff", "electronic": "#00ffff", # Cyan
        "Instrumental": "#00ff99", "instrumental": "#00ff99", # Spring Green
        "Jazz": "#9900ff", "jazz": "#9900ff",         # Purple
        "Classical": "#ffffff", "classical": "#ffffff", # White
        "Folk": "#ff9900", "folk": "#ff9900",         # Orange
        "International": "#ff6699", "international": "#ff6699", # Pink
        "Unknown": "#888888"
    }
    return colors.get(genre) or colors.get(genre.capitalize(), "#888888")

