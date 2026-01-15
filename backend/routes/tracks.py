"""Track and audio streaming routes."""
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from backend.db import get_db
from backend.models import Track
from backend.schemas import TrackResponse

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
def stream_audio(track_id: int, db: Session = Depends(get_db)):
    """
    Stream audio file for a track.
    Database stores only file paths, not audio content.
    """
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Check if audio file exists
    if not os.path.exists(track.audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    # Determine media type based on file extension
    ext = os.path.splitext(track.audio_path)[1].lower()
    media_type_map = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.flac': 'audio/flac'
    }
    media_type = media_type_map.get(ext, 'audio/mpeg')
    
    return FileResponse(
        track.audio_path,
        media_type=media_type,
        filename=os.path.basename(track.audio_path)
    )


@router.post("/tracks/scan")
def scan_library(db: Session = Depends(get_db)):
    """
    Scan audio directory for new files and add them to database.
    Does not delete missing files to preserve history.
    """
    audio_dir = "backend/storage/audio"
    if not os.path.exists(audio_dir):
        return {"scanned": 0, "added": 0, "error": "Audio directory not found"}
        
    added = 0
    scanned = 0
    
    # Supported extensions
    valid_exts = {'.mp3', '.wav', '.ogg', '.m4a', '.flac', '.opus'}
    
    for root, _, files in os.walk(audio_dir):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in valid_exts:
                continue
                
            scanned += 1
            full_path = os.path.join(root, file)
            
            # Check if exists in DB (by path)
            exists = db.query(Track).filter(Track.audio_path == full_path).first()
            if exists:
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
                predicted_genre=None
            )
            db.add(new_track)
            added += 1
            
    db.commit()
    return {
        "scanned": scanned,
        "added": added,
        "message": f"Scanned {scanned} files, added {added} new tracks."
    }

