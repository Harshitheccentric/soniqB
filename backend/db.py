"""Database configuration and session management."""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./soniq.db"

# Create SQLAlchemy engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

# Create SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()


def get_db():
    """
    Dependency function to get database session.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    from backend import models  # Import models to register them
    Base.metadata.create_all(bind=engine)


def seed_database():
    """
    Seed database with comprehensive realistic dummy data.
    Includes users, tracks with FMA genres, playlists, and listening events.
    """
    from backend.models import User, Track, ListeningEvent, Playlist, PlaylistTrack
    from datetime import datetime, timedelta
    import random
    
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("SoniqB Database Seeding - Enhanced Version")
        print("=" * 60)
        
        # Clear existing data (optional - comment out to preserve)
        print("\n🗑️  Clearing existing data...")
        db.query(PlaylistTrack).delete()
        db.query(Playlist).delete()
        db.query(ListeningEvent).delete()
        db.query(Track).delete()
        db.query(User).delete()
        db.commit()
        
        # 1. Create Users
        print("\n👥 Creating users...")
        users_data = ["alice", "bob", "charlie", "diana", "evan"]
        users = []
        
        # Hash a default password for all users
        from backend.auth import get_password_hash
        default_password_hash = get_password_hash("password123")
        
        for username in users_data:
            user = User(username=username, password_hash=default_password_hash)
            db.add(user)
            users.append(user)
        db.commit()
        for user in users:
            db.refresh(user)
            print(f"   ✓ {user.username} (ID: {user.id})")

        
        # 2. Create Tracks with FMA Genres
        print("\n🎵 Creating tracks with FMA genres...")
        
        # FMA Genres
        fma_genres = [
            "Electronic", "Experimental", "Folk", "Hip-Hop",
            "Instrumental", "International", "Pop", "Rock"
        ]
        
        tracks_data = [
            ("Midnight Dreams", "The Weeknd", "Pop"),
            ("Electric Pulse", "Daft Punk", "Electronic"),
            ("Mountain Folk", "Bon Iver", "Folk"),
            ("Urban Rhythm", "Kendrick Lamar", "Hip-Hop"),
            ("Classical Vibes", "Ludovico Einaudi", "Instrumental"),
            ("Global Beats", "Bombino", "International"),
            ("Summer Nights", "Dua Lipa", "Pop"),
            ("Rock Anthem", "Foo Fighters", "Rock"),
            ("Experimental Sound", "Aphex Twin", "Experimental"),
            ("Jazz Fusion", "Snarky Puppy", "Instrumental"),
            ("Indie Folk", "Fleet Foxes", "Folk"),
            ("Synth Wave", "M83", "Electronic"),
            ("Hip Hop Classic", "A Tribe Called Quest", "Hip-Hop"),
            ("World Music", "Tinariwen", "International"),
            ("Pop Ballad", "Adele", "Pop"),
            ("Hard Rock", "Royal Blood", "Rock"),
            ("Ambient Dreams", "Brian Eno", "Experimental"),
            ("Acoustic Session", "José González", "Folk")
        ]
        
        tracks = []
        for i, (title, artist, genre) in enumerate(tracks_data, 1):
            # Generate realistic confidence scores
            confidence = random.uniform(0.75, 0.95)
            
            track = Track(
                title=title,
                artist=artist,
                audio_path=f"backend/storage/audio/track_{i:02d}.mp3",
                predicted_genre=genre,
                genre_confidence=round(confidence, 2)
            )
            db.add(track)
            tracks.append(track)
        
        db.commit()
        for track in tracks:
            db.refresh(track)
            print(f"   ✓ '{track.title}' by {track.artist} [{track.predicted_genre}, {track.genre_confidence:.2f}]")
        
        # 3. Create Playlists (1-2 per user)
        print("\n📋 Creating playlists...")
        
        playlists_config = [
            # (user_index, name, type)
            (0, "Liked Songs", "liked_songs"),
            (0, "Workout Mix", "manual"),
            (1, "Liked Songs", "liked_songs"),
            (1, "Chill Vibes", "manual"),
            (2, "Liked Songs", "liked_songs"),
            (3, "Liked Songs", "liked_songs"),
            (3, "Study Session", "manual"),
            (4, "Liked Songs", "liked_songs"),
        ]
        
        playlists = []
        for user_idx, name, ptype in playlists_config:
            playlist = Playlist(
                user_id=users[user_idx].id,
                name=name,
                type=ptype
            )
            db.add(playlist)
            playlists.append((playlist, user_idx, ptype))
        
        db.commit()
        
        # Add tracks to playlists
        for playlist, user_idx, ptype in playlists:
            db.refresh(playlist)
            
            if ptype == "liked_songs":
                # Add 3-8 random tracks to liked songs
                num_tracks = random.randint(3, 8)
                selected_tracks = random.sample(tracks, num_tracks)
            else:
                # Manual playlists: 4-10 tracks
                num_tracks = random.randint(4, 10)
                selected_tracks = random.sample(tracks, num_tracks)
            
            for pos, track in enumerate(selected_tracks):
                pt = PlaylistTrack(
                    playlist_id=playlist.id,
                    track_id=track.id,
                    position=pos
                )
                db.add(pt)
            
            print(f"   ✓ {users[user_idx].username}'s '{playlist.name}' ({ptype}) - {len(selected_tracks)} tracks")
        
        db.commit()
        
        # 4. Create Realistic Listening Events
        print("\n🎧 Creating listening events...")
        
        # Generate events over the past 10 days
        base_time = datetime.now() - timedelta(days=10)
        events = []
        
        # Define listening patterns for each user
        user_patterns = [
            # alice: Heavy listener, morning and evening
            {"user_idx": 0, "sessions_per_day": 2, "tracks_per_session": 4, "like_rate": 0.3, "skip_rate": 0.2},
            # bob: Moderate listener, afternoon
            {"user_idx": 1, "sessions_per_day": 1, "tracks_per_session": 5, "like_rate": 0.2, "skip_rate": 0.3},
            # charlie: Light listener, evening
            {"user_idx": 2, "sessions_per_day": 1, "tracks_per_session": 3, "like_rate": 0.4, "skip_rate": 0.1},
            # diana: Heavy listener, all day
            {"user_idx": 3, "sessions_per_day": 3, "tracks_per_session": 3, "like_rate": 0.25, "skip_rate": 0.25},
            # evan: Light listener, random
            {"user_idx": 4, "sessions_per_day": 1, "tracks_per_session": 2, "like_rate": 0.15, "skip_rate": 0.4},
        ]
        
        # Time slots for sessions
        time_slots = {
            "morning": (7, 9),
            "afternoon": (14, 16),
            "evening": (19, 22)
        }
        
        for day in range(10):
            current_date = base_time + timedelta(days=day)
            
            for pattern in user_patterns:
                user = users[pattern["user_idx"]]
                
                # Some days users don't listen (80% chance they do)
                if random.random() > 0.8:
                    continue
                
                for session in range(pattern["sessions_per_day"]):
                    # Pick random time slot
                    slot_name = random.choice(list(time_slots.keys()))
                    start_hour, end_hour = time_slots[slot_name]
                    
                    session_time = current_date.replace(
                        hour=random.randint(start_hour, end_hour),
                        minute=random.randint(0, 59),
                        second=random.randint(0, 59)
                    )
                    
                    # Listen to tracks in this session
                    session_tracks = random.sample(tracks, pattern["tracks_per_session"])
                    
                    for track in session_tracks:
                        # Play event
                        listened_duration = random.uniform(30, 240)  # 30s to 4min
                        
                        play_event = ListeningEvent(
                            user_id=user.id,
                            track_id=track.id,
                            event_type="play",
                            listened_duration=round(listened_duration, 1),
                            timestamp=session_time
                        )
                        events.append(play_event)
                        db.add(play_event)
                        
                        # Maybe skip
                        if random.random() < pattern["skip_rate"]:
                            skip_event = ListeningEvent(
                                user_id=user.id,
                                track_id=track.id,
                                event_type="skip",
                                listened_duration=round(listened_duration, 1),
                                timestamp=session_time + timedelta(seconds=1)
                            )
                            events.append(skip_event)
                            db.add(skip_event)
                        else:
                            # Pause event (if not skipped)
                            pause_event = ListeningEvent(
                                user_id=user.id,
                                track_id=track.id,
                                event_type="pause",
                                listened_duration=round(listened_duration, 1),
                                timestamp=session_time + timedelta(seconds=int(listened_duration))
                            )
                            events.append(pause_event)
                            db.add(pause_event)
                        
                        # Maybe like
                        if random.random() < pattern["like_rate"]:
                            like_event = ListeningEvent(
                                user_id=user.id,
                                track_id=track.id,
                                event_type="like",
                                listened_duration=0.0,
                                timestamp=session_time + timedelta(seconds=2)
                            )
                            events.append(like_event)
                            db.add(like_event)
                        
                        # Advance time for next track
                        session_time += timedelta(seconds=int(listened_duration) + random.randint(5, 15))
        
        db.commit()
        print(f"   ✓ Created {len(events)} listening events across 10 days")
        
        # Summary
        print("\n" + "=" * 60)
        print("✅ Database seeding complete!")
        print("=" * 60)
        print(f"\n📊 Summary:")
        print(f"   • Users: {len(users)}")
        print(f"   • Tracks: {len(tracks)} (with FMA genres)")
        print(f"   • Playlists: {len(playlists)}")
        print(f"   • Listening Events: {len(events)}")
        print(f"   • Time Range: Past 10 days")
        print(f"\n💡 Note: Audio files are referenced but not created.")
        print(f"   Add actual audio files to backend/storage/audio/ for playback.")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

