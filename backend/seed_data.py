"""
Script to seed the database with dummy data for Analytics and Recommendations.
- Ensures all tracks have simulated genres.
- Creates dummy listening history for the test user 'test_user'.
"""
import sys
import os
import random
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.db import SessionLocal, init_db
from backend.models import User, Track, ListeningEvent
from backend.auth import get_password_hash

def seed_data():
    db = SessionLocal()
    
    try:
        # 1. Create Test User if not exists
        test_user = db.query(User).filter(User.username == "test_user").first()
        if not test_user:
            print("Creating test_user...")
            test_user = User(
                username="test_user",
                password_hash=get_password_hash("password123")
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
        else:
            print(f"Using existing user: {test_user.username}")

        # 2. Assign Genres to Tracks (Simulation)
        print("Checking/Updating tracks...")
        tracks = db.query(Track).all()
        if not tracks:
            print("No tracks found! Please upload some tracks first.")
            return

        genres = ["Pop", "Rock", "Hip-Hop", "Electronic", "Classical", "Jazz", "Metal", "Country"]
        
        for track in tracks:
            if not track.predicted_genre:
                # Assign a deterministic genre based on ID to be consistent across runs
                simulated_genre = genres[track.id % len(genres)]
                track.predicted_genre = simulated_genre
                track.genre_confidence = 0.8 + (random.random() * 0.15)
                print(f"Assigning {simulated_genre} to track {track.title}")
        
        db.commit()

        # 3. Create Listening History (If empty)
        print("Checking listening history...")
        history_count = db.query(ListeningEvent).filter(ListeningEvent.user_id == test_user.id).count()
        
        if history_count < 10:
            print("Seeding listening history...")
            
            # Create a pattern for an "Explorer" or "Enthusiast"
            # Listen to a lot of tracks, mostly full listens
            
            start_date = datetime.now() - timedelta(days=30)
            
            for i in range(50):
                track = random.choice(tracks)
                event_type = random.choice(["play", "play", "play", "play", "skip"]) # Mostly plays
                
                duration = 180.0
                if event_type == "skip":
                    duration = random.uniform(5.0, 30.0)
                
                event = ListeningEvent(
                    user_id=test_user.id,
                    track_id=track.id,
                    event_type=event_type,
                    listened_duration=duration,
                    timestamp=start_date + timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
                )
                db.add(event)
            
            db.commit()
            print("Added 50 listening events.")
        else:
            print(f"User already has {history_count} listening events.")
            
        print("Seeding complete! Restart the backend to see analytics.")

    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    seed_data()
