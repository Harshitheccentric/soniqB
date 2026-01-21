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
    import os
    
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

        
        # 2. Create Tracks from Real Files
        print("\n🎵 Scanning backend/storage/tracks/ for audio files...")
        
        storage_root = "backend/storage/tracks"
        tracks = []
        
        if os.path.exists(storage_root):
            # Supported extensions
            valid_exts = {'.mp3', '.wav', '.ogg', '.m4a', '.flac'}
            
            for root, dirs, files in os.walk(storage_root):
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext not in valid_exts:
                        continue
                        
                    # Determine genre from folder name
                    # root = .../tracks/pop -> genre = Pop
                    folder_name = os.path.basename(root)
                    if folder_name.lower() == "tracks":
                        genre = "Unknown"
                    else:
                        genre = folder_name.capitalize()
                        
                    full_path = os.path.join(root, file)
                    
                    # Parse filename "Artist - Title.mp3"
                    basename = os.path.splitext(file)[0]
                    if " - " in basename:
                        parts = basename.split(" - ", 1)
                        artist = parts[0].strip()
                        title = parts[1].strip()
                    else:
                        artist = "Unknown Artist"
                        title = basename.strip()
                        
                    # Remove [ID] tags common in youtube-dl
                    import re
                    title = re.sub(r'\s*\[.*?\]', '', title).strip()
                    
                    # Create track
                    # STRICT GENRE MODE: Confidence is simulated between 80-95%
                    confidence = random.uniform(0.80, 0.95)
                    
                    track = Track(
                        title=title,
                        artist=artist,
                        audio_path=full_path,
                        predicted_genre=genre,
                        genre_confidence=round(confidence, 2)
                    )
                    db.add(track)
                    tracks.append(track)
        
        db.commit()
        if not tracks:
            print("❌ No tracks found! Please ensure backend/storage/tracks/{genre} has files.")
            # Create at least one dummy track to prevent crashes if folder empty
            dummy = Track(title="No Tracks Found", artist="System", audio_path="none", predicted_genre="None")
            db.add(dummy)
            tracks.append(dummy)
            db.commit()
            
        print(f"   ✓ Found and seeded {len(tracks)} tracks from storage")
        
        # 3. Create Playlists
        print("\n📋 Creating playlists...")
        
        playlists_config = [
            (0, "Alice's Pop Mix", "manual"), # Alice loves Pop
            (1, "Bob's Rock & Hip-Hop", "manual"), # Bob loves Rock/Hip-Hop
            (2, "Charlie's Study Mode", "manual"), # Charlie loves Instrumental
        ]
        
        playlists = []
        for user_idx, name, ptype in playlists_config:
            playlist = Playlist(
                user_id=users[user_idx].id,
                name=name,
                type=ptype
            )
            db.add(playlist)
            playlists.append((playlist, user_idx))
            
            # Create "Liked Songs" for everyone
            liked = Playlist(user_id=users[user_idx].id, name="Liked Songs", type="liked_songs")
            db.add(liked)
            playlists.append((liked, user_idx))
        
        # Add remaining users' liked songs
        for i in range(3, len(users)):
            liked = Playlist(user_id=users[i].id, name="Liked Songs", type="liked_songs")
            db.add(liked)
            playlists.append((liked, i))

        db.commit()
        
        # Add tracks to playlists based on preferences
        for playlist, user_idx in playlists:
            db.refresh(playlist)
            user = users[user_idx]
            username = user.username
            
            selected_tracks = []
            
            # Helper to get tracks from specific genres
            def get_genre_mix(target_genres):
                matches = [t for t in tracks if t.predicted_genre in target_genres]
                return matches
            
            # STRICT PLAYLIST GENERATION BASED ON NAME/USER
            if playlist.name == "Alice's Pop Mix":
                selected_tracks = get_genre_mix(["Pop"])
            elif playlist.name == "Bob's Rock & Hip-Hop":
                selected_tracks = get_genre_mix(["Rock", "Hip-Hop"])
            elif playlist.name == "Charlie's Study Mode":
                selected_tracks = get_genre_mix(["Instrumental", "Electronic"])
            elif playlist.type == "liked_songs":
                # For Liked Songs, keep the mixed taste profile
                if username == "alice":
                    selected_tracks = get_genre_mix(["Pop", "Electronic", "International"])
                elif username == "bob":
                    selected_tracks = get_genre_mix(["Rock", "Hip-Hop", "Experimental"])
                elif username == "charlie":
                    selected_tracks = get_genre_mix(["Instrumental", "Folk", "Pop"])
                elif username == "diana":
                    selected_tracks = get_genre_mix(["Rock", "Electronic", "Hip-Hop"])
                else:
                    selected_tracks = get_genre_mix(["International", "Folk", "Experimental"])
            
            # Take a subset if we have tracks
            if selected_tracks:
                # Ensure we don't try to take more than we have or min 2
                count = len(selected_tracks)
                if count <= 2:
                    subset = selected_tracks
                else:
                    # Take up to 15 tracks max for variety
                    subset_size = random.randint(2, min(count, 15))
                    subset = random.sample(selected_tracks, subset_size)
                
                for pos, track in enumerate(subset):
                    pt = PlaylistTrack(
                        playlist_id=playlist.id,
                        track_id=track.id,
                        position=pos
                    )
                    db.add(pt)
                print(f"   ✓ Added {len(subset)} tracks to {username}'s '{playlist.name}'")
            
        db.commit()
        
        # 4. Create Realistic Listening Events (Distinct Patterns with Genre Mixes)
        print("\n🎧 Creating listening events with mixed genre patterns...")
        
        base_time = datetime.now() - timedelta(days=10)
        events = []
        
        for day in range(10):
            current_date = base_time + timedelta(days=day)
            
            # Helper to generate session for a user with specific genre preferences
            def create_session(user_id, genres, count_range=(3, 8)):
                session_tracks = [t for t in tracks if t.predicted_genre in genres]
                
                # If no tracks match preference, pick randoms (exploration)
                if not session_tracks and tracks:
                    session_tracks = random.sample(tracks, min(5, len(tracks)))
                
                if not session_tracks: return
                
                num_tracks = random.randint(*count_range)
                for _ in range(num_tracks):
                    t = random.choice(session_tracks)
                    
                    # Play event
                    events.append(ListeningEvent(
                        user_id=user_id, 
                        track_id=t.id, 
                        event_type="play", 
                        listened_duration=random.uniform(60, 240), 
                        timestamp=current_date
                    ))
                    
                    # Chance to like (higher for preferred genres)
                    if random.random() > 0.4: 
                        events.append(ListeningEvent(
                            user_id=user_id, 
                            track_id=t.id, 
                            event_type="like", 
                            listened_duration=0, 
                            timestamp=current_date
                        ))
                    
                    # Advance time
                    current_date_ref = current_date  # just keeping timestamp same for batch simplicity or could increment if needed
            
            # Alice (Pop/Electronic/International)
            if random.random() > 0.1:
                create_session(users[0].id, ["Pop", "Electronic", "International"])

            # Bob (Rock/Hip-Hop/Experimental)
            if random.random() > 0.2:
                create_session(users[1].id, ["Rock", "Hip-Hop", "Experimental"])

            # Charlie (Instrumental/Folk/Pop) - Study/Chill
            if random.random() > 0.1:
                create_session(users[2].id, ["Instrumental", "Folk", "Pop"])
                
            # Diana (Rock/Electronic/Hip-Hop)
            if random.random() > 0.3:
                 create_session(users[3].id, ["Rock", "Electronic", "Hip-Hop"])

        db.add_all(events)
        db.commit()
        print(f"   ✓ Created {len(events)} listening events matching user archetypes")
        
        print("\n" + "=" * 60)
        print("✅ Database seeding complete!")
        print("=" * 60)
        print(f"\n📊 Summary:")
        print(f"   • Users: {len(users)}")
        print(f"   • Tracks: {len(tracks)} (categorized in backend/storage/tracks/)")
        print(f"   • Playlists: {len(playlists)}")
        print(f"   • Listening Events: {len(events)}")
        print(f"\n💡 Note: Directory structure created at backend/storage/tracks/{{genre}}/")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

