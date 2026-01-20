"""Track and audio streaming routes with Range request support for seeking."""
import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse, Response
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
