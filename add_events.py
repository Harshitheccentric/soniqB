"""
Add sample listening events for analytics data.
"""
from backend.db import SessionLocal
from backend.models import ListeningEvent
from datetime import datetime, timedelta
import random

def add_sample_events():
    """Add sample listening events for analytics."""
    
    db = SessionLocal()
    
    try:
        print("Adding sample listening events...")
        print("=" * 50)
        
        # Check if events already exist
        existing = db.query(ListeningEvent).count()
        if existing > 10:
            print(f"Found {existing} existing events. Skipping...")
            return
        
        # Create varied listening events for users 1-3 and tracks 2-6
        events = []
        event_types = ['play', 'pause', 'skip', 'like']
        
        # User 1 (alice) - likes Pokemon music
        for track_id in [4, 5]:  # Pokemon tracks
            events.append(ListeningEvent(
                user_id=1,
                track_id=track_id,
                event_type='play',
                listened_duration=random.uniform(120, 240)
            ))
            events.append(ListeningEvent(
                user_id=1,
                track_id=track_id,
                event_type='like',
                listened_duration=0.0
            ))
        
        # User 2 (bob) - likes Naruto OST
        events.append(ListeningEvent(
            user_id=2,
            track_id=6,  # Orochimaru theme
            event_type='play',
            listened_duration=180.5
        ))
        events.append(ListeningEvent(
            user_id=2,
            track_id=6,
            event_type='like',
            listened_duration=0.0
        ))
        
        # User 3 (charlie) - varied listening
        for track_id in [2, 3, 4]:
            events.append(ListeningEvent(
                user_id=3,
                track_id=track_id,
                event_type='play',
                listened_duration=random.uniform(60, 180)
            ))
        
        # Add some skips
        events.append(ListeningEvent(
            user_id=1,
            track_id=2,
            event_type='skip',
            listened_duration=15.0
        ))
        
        db.add_all(events)
        db.commit()
        
        print(f"✓ Added {len(events)} listening events")
        print("=" * 50)
        print("✓ Analytics data ready!")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_sample_events()
