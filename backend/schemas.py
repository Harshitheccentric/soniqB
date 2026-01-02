"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class EventType(str, Enum):
    """Allowed event types."""
    PLAY = "play"
    PAUSE = "pause"
    SKIP = "skip"
    LIKE = "like"


# User schemas
class UserCreate(BaseModel):
    """Schema for creating a new user."""
    username: str


class UserResponse(BaseModel):
    """Schema for user response."""
    id: int
    username: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Track schemas
class TrackResponse(BaseModel):
    """Schema for track response."""
    id: int
    title: str
    artist: str
    audio_path: str
    predicted_genre: Optional[str] = None
    
    class Config:
        from_attributes = True


# Event schemas
class EventCreate(BaseModel):
    """Schema for creating a listening event."""
    user_id: int
    track_id: int
    event_type: EventType
    listened_duration: float = Field(..., ge=0, description="Duration in seconds")


class EventResponse(BaseModel):
    """Schema for event response."""
    id: int
    user_id: int
    track_id: int
    event_type: str
    listened_duration: float
    timestamp: datetime
    
    class Config:
        from_attributes = True


# Playlist schemas
class PlaylistTrackItem(BaseModel):
    """Schema for a track in a playlist."""
    track_id: int
    position: int


class PlaylistCreate(BaseModel):
    """Schema for creating a manual playlist."""
    user_id: int
    tracks: List[PlaylistTrackItem] = []


class PlaylistResponse(BaseModel):
    """Schema for playlist response."""
    id: int
    user_id: int
    type: str
    created_at: datetime
    
    class Config:
        from_attributes = True
