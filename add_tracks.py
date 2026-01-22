"""
Quick script to add tracks from existing audio files in storage.
"""
from backend.db import SessionLocal, init_db
from backend.models import Track
import os

def add_tracks_from_storage():
    """Add tracks from existing audio files."""
    
    init_db()
    db = SessionLocal()
    
    try:
        print("Adding tracks from storage...")
        print("=" * 50)
        
        # Check existing tracks (skip if already added)
        existing_count = db.query(Track).filter(Track.title != "No Tracks Found").count()
        if existing_count > 0:
            print(f"Found {existing_count} existing tracks. Skipping...")
            return
        
        # Define tracks based on actual files in storage
        audio_base = "backend/storage/audio"
        tracks = [
            Track(
                title="In Due Time",
                artist="Unknown Artist",
                audio_path=f"{audio_base}/04 - In Due Time.flac",
                uploaded_by_user_id=1  # alice
            ),
            Track(
                title="Threnody",
                artist="Unknown Artist",
                audio_path=f"{audio_base}/06. Threnody.flac",
                uploaded_by_user_id=2  # bob
            ),
            Track(
                title="Over Drive",
                artist="Pokemon OST",
                audio_path=f"{audio_base}/2-30. Over Drive.flac",
                uploaded_by_user_id=1  # alice
            ),
            Track(
                title="Battle! (Azelf-Mesprit-Uxie)",
                artist="Pokemon OST",
                audio_path=f"{audio_base}/2-37. Battle! (Azelf-Mesprit-Uxie).flac",
                uploaded_by_user_id=3  # charlie
            ),
            Track(
                title="Orochimaru's Full Theme",
                artist="Naruto OST",
                audio_path=f"{audio_base}/Orochimaru's Full Theme (Audio Restored).mp3",
                uploaded_by_user_id=2  # bob
            ),
        ]
        
        db.add_all(tracks)
        db.commit()
        
        for track in tracks:
            db.refresh(track)
            print(f"✓ Added: '{track.title}' by {track.artist} (ID: {track.id})")
        
        print("=" * 50)
        print(f"✓ Successfully added {len(tracks)} tracks!")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_tracks_from_storage()
