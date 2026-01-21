"""Listening event logging routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from backend.db import get_db
from backend.models import ListeningEvent, User, Track, Playlist, PlaylistTrack
from backend.schemas import EventCreate, EventResponse
from backend.auth import get_current_user

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=List[EventResponse])
def get_events(
    user_id: Optional[int] = Query(None, description="Filter events by user ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get listening events for the authenticated user.
    """
    # Users can only view their own events
    if user_id is not None and user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only view your own events"
        )
    
    # Default to current user's events
    target_user_id = user_id if user_id is not None else current_user.id
    
    events = db.query(ListeningEvent).filter(
        ListeningEvent.user_id == target_user_id
    ).all()
    return events


@router.post("", response_model=EventResponse, status_code=201)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db)
):
    """
    Log a listening event (identity-anchoring - no JWT required).
    Uses user_id from request body directly.
    """
    # Validate user exists
    user = db.query(User).filter(User.id == event.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate track exists
    track = db.query(Track).filter(Track.id == event.track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Create event (append-only)
    db_event = ListeningEvent(
        user_id=event.user_id,
        track_id=event.track_id,
        event_type=event.event_type.value,
        listened_duration=event.listened_duration
    )
    db.add(db_event)
    
    # If it's a like event, add to Liked Songs playlist
    if event.event_type.value == "like":
        # Get or create Liked Songs playlist
        liked_playlist = db.query(Playlist).filter(
            Playlist.user_id == event.user_id,
            Playlist.type == "liked_songs"
        ).first()
        
        if not liked_playlist:
            liked_playlist = Playlist(
                user_id=event.user_id,
                name="Liked Songs",
                type="liked_songs"
            )
            db.add(liked_playlist)
            db.flush()
        
        # Check if track is already in the playlist
        existing = db.query(PlaylistTrack).filter(
            PlaylistTrack.playlist_id == liked_playlist.id,
            PlaylistTrack.track_id == event.track_id
        ).first()
        
        if not existing:
            max_position = db.query(PlaylistTrack).filter(
                PlaylistTrack.playlist_id == liked_playlist.id
            ).count()
            
            playlist_track = PlaylistTrack(
                playlist_id=liked_playlist.id,
                track_id=event.track_id,
                position=max_position
            )
            db.add(playlist_track)
    
    db.commit()
    db.refresh(db_event)
    return db_event

