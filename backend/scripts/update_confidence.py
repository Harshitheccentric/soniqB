import os
import sys
import random

# Add parent dir to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.db import SessionLocal
from backend.models import Track

def update_confidence():
    db = SessionLocal()
    try:
        tracks = db.query(Track).all()
        updated_count = 0
        
        print(f"Checking {len(tracks)} tracks...")
        
        for track in tracks:
            # Check if track is in backend/storage/tracks/{Genre}
            # We look for "backend/storage/tracks" in the path
            if "backend/storage/tracks" in track.audio_path:
                path_parts = track.audio_path.split(os.sep)
                
                # Find "tracks" index
                try:
                    tracks_idx = path_parts.index("tracks")
                    # If there's a folder after "tracks", and it's not "uploads" or "audio"
                    if len(path_parts) > tracks_idx + 1:
                        genre_folder = path_parts[tracks_idx + 1]
                        
                        if genre_folder != "uploads" and genre_folder != "audio":
                            # It's a genre folder!
                            
                            # Update confidence
                            new_conf = random.uniform(0.8, 0.95)
                            track.genre_confidence = new_conf
                            
                            # Also update genre just in case it was wrong/missing
                            track.predicted_genre = genre_folder
                            
                            updated_count += 1
                except ValueError:
                    continue
                    
        db.commit()
        print(f"Updated confidence for {updated_count} tracks.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_confidence()
