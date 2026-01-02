"""SQLAlchemy ORM models for the music player backend."""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db import Base


class User(Base):
    """User model."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    listening_events = relationship("ListeningEvent", back_populates="user")
    playlists = relationship("Playlist", back_populates="user")


class Track(Base):
    """Track model."""
    __tablename__ = "tracks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    artist = Column(String, nullable=False)
    audio_path = Column(String, nullable=False)
    predicted_genre = Column(String, nullable=True)  # Nullable, no inference in Phase 1
    
    # Relationships
    listening_events = relationship("ListeningEvent", back_populates="track")
    playlist_tracks = relationship("PlaylistTrack", back_populates="track")


class ListeningEvent(Base):
    """Listening event model - append-only event log."""
    __tablename__ = "listening_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=False)
    event_type = Column(String, nullable=False)  # play, pause, skip, like
    listened_duration = Column(Float, nullable=False)  # seconds
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="listening_events")
    track = relationship("Track", back_populates="listening_events")


class Playlist(Base):
    """Playlist model."""
    __tablename__ = "playlists"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # manual or auto
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="playlists")
    playlist_tracks = relationship("PlaylistTrack", back_populates="playlist")


class PlaylistTrack(Base):
    """Association table for playlist tracks with position."""
    __tablename__ = "playlist_tracks"
    
    playlist_id = Column(Integer, ForeignKey("playlists.id"), primary_key=True)
    track_id = Column(Integer, ForeignKey("tracks.id"), primary_key=True)
    position = Column(Integer, nullable=False)
    
    # Relationships
    playlist = relationship("Playlist", back_populates="playlist_tracks")
    track = relationship("Track", back_populates="playlist_tracks")
