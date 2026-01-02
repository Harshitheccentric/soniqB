"""Listening event logging routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from backend.db import get_db
from backend.models import ListeningEvent, User, Track
from backend.schemas import EventCreate, EventResponse

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=List[EventResponse])
def get_events(
    user_id: Optional[int] = Query(None, description="Filter events by user ID"),
    db: Session = Depends(get_db)
):
    """
    Get listening events.
    Optionally filter by user_id for dashboard statistics.
    """
    query = db.query(ListeningEvent)
    
    if user_id is not None:
        # Validate user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        query = query.filter(ListeningEvent.user_id == user_id)
    
    events = query.all()
    return events


@router.post("", response_model=EventResponse, status_code=201)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    """
    Log a listening event.
    Events are append-only - never modified or aggregated.
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
    db.commit()
    db.refresh(db_event)
    return db_event
