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
