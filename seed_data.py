"""
Database seeding script to populate test data directly.
This script adds sample tracks and demonstrates the database schema.
"""
from sqlalchemy.orm import Session
from backend.db import SessionLocal, init_db
from backend.models import User, Track, ListeningEvent, Playlist, PlaylistTrack
import os

def seed_database():
    """Seed the database with sample data."""
    
    # Initialize database
    init_db()
    
    # Create session
    db = SessionLocal()
    
    try:
        print("Seeding database with sample data...")
        print("=" * 50)
        
        # Create sample users
        print("\n1. Creating users...")
        users = [
            User(username="alice"),
            User(username="bob"),
            User(username="charlie")
        ]
        db.add_all(users)
        db.commit()
        for user in users:
            db.refresh(user)
            print(f"   ✓ Created user: {user.username} (ID: {user.id})")
        
        # Create sample tracks
        print("\n2. Creating tracks...")
        
        # Create storage directory if it doesn't exist
        os.makedirs("backend/storage/audio", exist_ok=True)
        
        tracks = [
            Track(
                title="VRIGGER - EFN",
                artist="Unknown Artist",
                audio_path="backend/storage/audio/VRIGGER - EFN [b-sX0EqZZZI].opus",
                predicted_genre=None  # No ML in Phase 1
            ),
            Track(
                title="Night Drive",
                artist="The Midnight Crew",
                audio_path="backend/storage/audio/sample2.mp3",
                predicted_genre=None
            ),
            Track(
                title="Morning Coffee",
                artist="Jazz Collective",
                audio_path="backend/storage/audio/sample3.mp3",
                predicted_genre=None
            ),
            Track(
                title="Workout Energy",
                artist="Beat Masters",
                audio_path="backend/storage/audio/sample4.mp3",
                predicted_genre=None
            )
        ]
        db.add_all(tracks)
        db.commit()
        for track in tracks:
            db.refresh(track)
            print(f"   ✓ Created track: '{track.title}' by {track.artist} (ID: {track.id})")
        
        # Create sample listening events
        print("\n3. Creating listening events...")
        events = [
            ListeningEvent(
                user_id=users[0].id,
                track_id=tracks[0].id,
                event_type="play",
                listened_duration=180.5
            ),
            ListeningEvent(
                user_id=users[0].id,
                track_id=tracks[0].id,
                event_type="like",
                listened_duration=0.0
            ),
            ListeningEvent(
                user_id=users[1].id,
                track_id=tracks[1].id,
                event_type="play",
                listened_duration=45.2
            ),
            ListeningEvent(
                user_id=users[1].id,
                track_id=tracks[1].id,
                event_type="skip",
                listened_duration=45.2
            ),
            ListeningEvent(
                user_id=users[2].id,
                track_id=tracks[2].id,
                event_type="play",
                listened_duration=210.0
            ),
            ListeningEvent(
                user_id=users[0].id,
                track_id=tracks[3].id,
                event_type="play",
                listened_duration=120.0
            )
        ]
        db.add_all(events)
        db.commit()
        print(f"   ✓ Created {len(events)} listening events")
        
        # Create sample playlists
        print("\n4. Creating playlists...")
        playlist1 = Playlist(
            user_id=users[0].id,
            name="My Favorites",
            type="manual"
        )
        db.add(playlist1)
        db.commit()
        db.refresh(playlist1)
        
        # Add tracks to playlist
        playlist_tracks = [
            PlaylistTrack(playlist_id=playlist1.id, track_id=tracks[0].id, position=1),
            PlaylistTrack(playlist_id=playlist1.id, track_id=tracks[2].id, position=2),
            PlaylistTrack(playlist_id=playlist1.id, track_id=tracks[3].id, position=3)
        ]
        db.add_all(playlist_tracks)
        db.commit()
        print(f"   ✓ Created playlist for {users[0].username} with {len(playlist_tracks)} tracks")
        
        print("\n" + "=" * 50)
        print("✓ Database seeding complete!")
        print("\nSummary:")
        print(f"  - {len(users)} users")
        print(f"  - {len(tracks)} tracks")
        print(f"  - {len(events)} listening events")
        print(f"  - 1 playlist with {len(playlist_tracks)} tracks")
        print("\nNote: Audio files are referenced but not created.")
        print("      Add actual .mp3 files to backend/storage/audio/ for streaming.")
        
    except Exception as e:
        print(f"\n✗ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("SoniqB Database Seeder - Phase 1")
    print("Educational AIML Lab Project")
    print()
    seed_database()
