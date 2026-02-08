"""Track and audio streaming routes with Range request support for seeking."""
import os
import re
import random
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse, Response
from sqlalchemy.orm import Session
from typing import List
from backend.db import get_db
from backend.models import Track, User, Playlist, PlaylistTrack, ListeningEvent
from backend.schemas import TrackResponse
from backend.auth import get_current_user

router = APIRouter(tags=["tracks"])



@router.get("/tracks", response_model=List[TrackResponse])
def get_tracks(db: Session = Depends(get_db)):
    """Get all tracks."""
    tracks = db.query(Track).all()
    return tracks


@router.get("/tracks/{track_id}", response_model=TrackResponse)
def get_track(track_id: int, db: Session = Depends(get_db)):
    """Get track by ID."""
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return track


@router.get("/audio/{track_id}")
def stream_audio(track_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Stream audio file with Range request support for seeking.
    This enables the browser to seek within the audio file.
    """
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Check if audio file exists
    if not os.path.exists(track.audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    # Get file info
    file_path = track.audio_path
    file_size = os.path.getsize(file_path)
    
    # Determine media type based on file extension
    ext = os.path.splitext(file_path)[1].lower()
    media_type_map = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.flac': 'audio/flac'
    }
    media_type = media_type_map.get(ext, 'audio/mpeg')
    
    # Handle Range requests for seeking
    range_header = request.headers.get("range")
    
    if range_header:
        # Parse Range header (e.g., "bytes=12345-")
        try:
            range_spec = range_header.replace("bytes=", "")
            parts = range_spec.split("-")
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if parts[1] else file_size - 1
            
            # Validate range
            if start >= file_size:
                raise HTTPException(status_code=416, detail="Range not satisfiable")
            
            end = min(end, file_size - 1)
            content_length = end - start + 1
            
            def iter_file():
                with open(file_path, "rb") as f:
                    f.seek(start)
                    remaining = content_length
                    chunk_size = 8192
                    while remaining > 0:
                        read_size = min(chunk_size, remaining)
                        data = f.read(read_size)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data
            
            return StreamingResponse(
                iter_file(),
                status_code=206,
                media_type=media_type,
                headers={
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(content_length),
                }
            )
        except (ValueError, IndexError):
            pass  # Fall through to regular response
    
    # No Range header - return full file with Accept-Ranges header
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=os.path.basename(file_path),
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
        }
    )


@router.get("/tracks/{track_id}/art")
def get_track_art(track_id: int, db: Session = Depends(get_db)):
    """Get album art for a track."""
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    if not os.path.exists(track.audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
        
    # Look for image files in the same directory
    track_dir = os.path.dirname(track.audio_path)
    
    # Common cover filenames
    cover_names = ["cover.jpg", "cover.png", "cover.jpeg", "folder.jpg", "folder.png", "front.jpg"]
    
    # First check for specific filenames
    for name in cover_names:
        art_path = os.path.join(track_dir, name)
        if os.path.exists(art_path):
            return FileResponse(art_path)
            
    # Fallback: check any image file
    valid_exts = {'.jpg', '.jpeg', '.png', '.webp'}
    try:
        for file in os.listdir(track_dir):
            if os.path.splitext(file)[1].lower() in valid_exts:
                # Avoid returning the placeholder itself if it somehow got there
                return FileResponse(os.path.join(track_dir, file))
    except OSError:
        pass
        
    raise HTTPException(status_code=404, detail="Album art not found")


@router.post("/tracks/scan")
def scan_library(db: Session = Depends(get_db)):
    """
    Scan audio directory for new files and add them to database.
    Does not delete missing files to preserve history.
    """
    audio_dir = "backend/storage/tracks"
    if not os.path.exists(audio_dir):
        # Fallback to creating it
        try:
            os.makedirs(audio_dir)
        except OSError:
            return {"scanned": 0, "added": 0, "error": "Audio directory not found"}
        
    added = 0
    scanned = 0
    
    # Supported extensions
    valid_exts = {'.mp3', '.wav', '.ogg', '.m4a', '.flac', '.opus'}
    
    for root, _, files in os.walk(audio_dir):
        # Infer genre from folder name
        # root is like "backend/storage/tracks/Rock" -> genre="Rock"
        rel_path = os.path.relpath(root, audio_dir)
        
        # If file is in root "tracks/" folder, genre is None
        # If file is in "tracks/uploads/...", we might skip or mark Unknown (user instruction focused on genre folders)
        # For now, let's treat any immediate subdirectory as a potential genre
        current_genre = None
        genre_confidence = None
        
        if rel_path != ".":
            # Taking the top-level folder as genre
            # e.g. "Rock/Subfolder" -> "Rock"
            top_folder = rel_path.split(os.sep)[0]
            
            # Skip "uploads" as it's a staging area
            if top_folder != "uploads" and top_folder != "audio":
                 current_genre = top_folder.lower()
                 # User request: Random confidence between 80-95% for seeded tracks
                 genre_confidence = random.uniform(0.8, 0.95)

        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in valid_exts:
                continue
                
            scanned += 1
            full_path = os.path.join(root, file)
            
            # Check if exists in DB (by path)
            exists = db.query(Track).filter(Track.audio_path == full_path).first()
            if exists:
                # OPTIONAL: Update genre if it's missing but we found it in a folder?
                # The user said "take at face value". So maybe we SHOULD update it.
                if current_genre:
                    # Always update if we find it in a genre folder, per user request
                    exists.predicted_genre = current_genre
                    exists.genre_confidence = random.uniform(0.8, 0.95)
                    added += 1 # Counting updates as activity
                continue
                
            # Parse metadata from filename
            # Expected format: "Artist - Title.ext" or just "Title.ext"
            basename = os.path.splitext(file)[0]
            if " - " in basename:
                parts = basename.split(" - ", 1)
                artist = parts[0]
                title = parts[1]
            else:
                artist = "Unknown Artist"
                title = basename
                
            # Remove [ID] tags common in youtube-dl files if present
            # e.g. "Title [b-sX0EqZZZI]" -> "Title"
            import re
            title = re.sub(r'\s*\[.*?\]', '', title).strip()
            
            new_track = Track(
                title=title,
                artist=artist,
                audio_path=full_path,
                predicted_genre=current_genre,
                genre_confidence=genre_confidence
            )
            db.add(new_track)
            added += 1
            
    db.commit()
    return {
        "scanned": scanned,
        "added": added,
        "message": f"Scanned {scanned} files, added {added} new tracks."
    }


@router.post("/tracks/upload", response_model=TrackResponse)
async def upload_track(
    file: UploadFile = File(...),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Upload a new track. The track will be:
    1. Validated for file type
    2. Saved to user's upload directory
    3. Classified for genre using ML
    4. Added to user's "Songs Uploaded" playlist
    5. Artist name set to username
    
    Note: Uses user_id form parameter for identity-anchoring (no JWT required)
    """
    # Get user from database
    current_user = db.query(User).filter(User.id == user_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate file extension
    valid_extensions = {'.mp3', '.wav', '.ogg', '.m4a', '.flac', '.opus'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in valid_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Supported: {', '.join(valid_extensions)}"
        )
    
    # Create user upload directory
    upload_dir = Path(f"backend/storage/audio/uploads/{current_user.id}")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate safe filename
    safe_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', file.filename)
    file_path = upload_dir / safe_filename
    
    # Check if file already exists
    counter = 1
    original_path = file_path
    while file_path.exists():
        stem = original_path.stem
        file_path = upload_dir / f"{stem}_{counter}{file_ext}"
        counter += 1
    
    # Save file
    try:
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Extract title from filename
    title = os.path.splitext(safe_filename)[0]
    # Remove common patterns like [ID] tags
    title = re.sub(r'\s*\[.*?\]', '', title).strip()
    title = title.replace('_', ' ')
    
    # Classify genre using ML
    genre = "Unknown"
    confidence = 0.0
    try:
        from backend.ml.genre_classifier import get_genre_classifier
        classifier = get_genre_classifier()
        # This might fail if model is missing
        pred_genre, pred_conf = classifier.classify_audio_file(str(file_path))
        if pred_genre:
            genre = pred_genre
            # User request: Random confidence between 65-90% with mode at 75%
            confidence = random.triangular(0.65, 0.90, 0.75)
    except Exception as e:
        print(f"Warning: Genre classification failed: {e}")
        # Fallback to Unknown
    
    # Move file to genre folder (Unknown or classified)
    try:
        genre_dir = Path("backend/storage/tracks") / genre
        genre_dir.mkdir(parents=True, exist_ok=True)
        
        new_path = genre_dir / file_path.name
        
        # handle duplicates in genre folder
        counter = 1
        while new_path.exists():
            stem = file_path.stem
            new_path = genre_dir / f"{stem}_{counter}{file_ext}"
            counter += 1
            
        # Move file
        import shutil
        shutil.move(str(file_path), str(new_path))
        file_path = new_path
        
    except Exception as e:
        print(f"Warning: Failed to move file to genre folder: {e}")
        # If move fails, we keep the file in uploads dir, but we still have a DB record.
        # Ideally we might want to fail the upload, but for now we proceed.
    
    # Create track record
    new_track = Track(
        title=title,
        artist=current_user.username,  # User is the artist
        audio_path=str(file_path),
        predicted_genre=genre,
        genre_confidence=confidence,
        uploaded_by_user_id=current_user.id
    )
    db.add(new_track)
    db.flush()  # Get the track ID
    
    # Get or create "Songs Uploaded" playlist
    uploaded_playlist = db.query(Playlist).filter(
        Playlist.user_id == current_user.id,
        Playlist.type == "uploaded_songs"
    ).first()
    
    if not uploaded_playlist:
        uploaded_playlist = Playlist(
            user_id=current_user.id,
            name="Songs Uploaded",
            type="uploaded_songs"
        )
        db.add(uploaded_playlist)
        db.flush()
    
    # Add track to playlist
    # Get next position
    max_position = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == uploaded_playlist.id
    ).count()
    
    playlist_track = PlaylistTrack(
        playlist_id=uploaded_playlist.id,
        track_id=new_track.id,
        position=max_position
    )
    db.add(playlist_track)
    
    db.commit()
    db.refresh(new_track)
    
    return new_track


@router.delete("/tracks/{track_id}")
def delete_track(track_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Delete a track.
    Only allows deletion if the track was uploaded by the current user.
    """
    try:
        track = db.query(Track).filter(Track.id == track_id).first()
        if not track:
            raise HTTPException(status_code=404, detail="Track not found")
            
        # Permission check
        # We check if the track has an uploaded_by_user_id and if it matches
        if not track.uploaded_by_user_id or track.uploaded_by_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only delete tracks you uploaded")
            
        # Delete audio file
        if track.audio_path and os.path.exists(track.audio_path):
            try:
                os.remove(track.audio_path)
            except OSError as e:
                print(f"Error deleting file {track.audio_path}: {e}")
                # Continue
                
        # Remove from playlists
        db.query(PlaylistTrack).filter(PlaylistTrack.track_id == track_id).delete()

        # Remove listening events (FK constraint)
        db.query(ListeningEvent).filter(ListeningEvent.track_id == track_id).delete()
        
        # Delete from DB
        db.delete(track)
        db.commit()
        
        return {"message": "Track deleted successfully"}
    except Exception as e:
        print(f"Delete failed: {e}") # Debug log
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete track: {str(e)}")

