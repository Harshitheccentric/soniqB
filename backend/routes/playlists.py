"""Playlist management routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.db import get_db
from backend.models import Playlist, PlaylistTrack, User, Track
from backend.schemas import PlaylistCreate, PlaylistResponse

router = APIRouter(prefix="/playlists", tags=["playlists"])


@router.post("/manual", response_model=PlaylistResponse, status_code=201)
def create_manual_playlist(playlist: PlaylistCreate, db: Session = Depends(get_db)):
    """
    Create a manual playlist.
    No auto-playlist generation logic in Phase 1.
    """
    # Validate user exists
    user = db.query(User).filter(User.id == playlist.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create playlist
    db_playlist = Playlist(
        user_id=playlist.user_id,
        type="manual"
    )
    db.add(db_playlist)
    db.commit()
    db.refresh(db_playlist)
    
    # Add tracks to playlist
    for track_item in playlist.tracks:
        # Validate track exists
        track = db.query(Track).filter(Track.id == track_item.track_id).first()
        if not track:
            raise HTTPException(
                status_code=404, 
                detail=f"Track {track_item.track_id} not found"
            )
        
        playlist_track = PlaylistTrack(
            playlist_id=db_playlist.id,
            track_id=track_item.track_id,
            position=track_item.position
        )
        db.add(playlist_track)
    
    db.commit()
    return db_playlist


@router.get("/{user_id}", response_model=List[PlaylistResponse])
def get_user_playlists(user_id: int, db: Session = Depends(get_db)):
    """Get all playlists for a user."""
    # Validate user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    playlists = db.query(Playlist).filter(Playlist.user_id == user_id).all()
    return playlists
