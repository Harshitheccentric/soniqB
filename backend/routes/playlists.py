"""Playlist management routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.db import get_db
from backend.models import Playlist, PlaylistTrack, User, Track
from backend.schemas import PlaylistCreate, PlaylistResponse
from backend.auth import get_current_user

router = APIRouter(prefix="/playlists", tags=["playlists"])


@router.post("/manual", response_model=PlaylistResponse, status_code=201)
def create_manual_playlist(
    playlist: PlaylistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a manual playlist for the authenticated user.
    """
    # Verify the user is creating a playlist for themselves
    if playlist.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only create playlists for yourself"
        )
    
    # Create playlist
    db_playlist = Playlist(
        user_id=playlist.user_id,
        name=playlist.name,
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
def get_user_playlists(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get all playlists for a user (identity-anchoring - no JWT required)."""
    playlists = db.query(Playlist).filter(Playlist.user_id == user_id).all()
    return playlists


@router.get("/detail/{playlist_id}")
def get_playlist_with_tracks(
    playlist_id: int,
    db: Session = Depends(get_db)
):
    """Get a playlist with all its tracks (identity-anchoring - no JWT required)."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Get tracks in playlist with position order
    playlist_tracks = db.query(PlaylistTrack, Track).join(
        Track, PlaylistTrack.track_id == Track.id
    ).filter(
        PlaylistTrack.playlist_id == playlist_id
    ).order_by(PlaylistTrack.position).all()
    
    tracks_data = [
        {
            "position": pt.position,
            "track": {
                "id": track.id,
                "title": track.title,
                "artist": track.artist,
                "audio_path": track.audio_path,
                "predicted_genre": track.predicted_genre,
                "genre_confidence": track.genre_confidence
            }
        }
        for pt, track in playlist_tracks
    ]
    
    return {
        "id": playlist.id,
        "user_id": playlist.user_id,
        "name": playlist.name,
        "type": playlist.type,
        "created_at": playlist.created_at.isoformat(),
        "tracks": tracks_data
    }


@router.get("/liked_songs/track_ids", response_model=List[int])
def get_liked_track_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get just the track IDs from user's Liked Songs playlist for efficient checking."""
    # Find the liked_songs playlist
    liked_playlist = db.query(Playlist).filter(
        Playlist.user_id == current_user.id,
        Playlist.type == "liked_songs"
    ).first()
    
    if not liked_playlist:
        return []
    
    # Get only track IDs
    track_ids = db.query(PlaylistTrack.track_id).filter(
        PlaylistTrack.playlist_id == liked_playlist.id
    ).all()
    
    return [track_id[0] for track_id in track_ids]


@router.delete("/{playlist_id}/tracks/{track_id}", status_code=204)
def remove_track_from_playlist(
    playlist_id: int,
    track_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a track from a playlist (unlike functionality)."""
    # Verify playlist exists and user owns it
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    if playlist.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only modify your own playlists"
        )
    
    # Find and delete the playlist track entry
    playlist_track = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id,
        PlaylistTrack.track_id == track_id
    ).first()
    
    if not playlist_track:
        raise HTTPException(
            status_code=404,
            detail="Track not found in playlist"
        )
    
    db.delete(playlist_track)
    db.commit()
    
    return None


@router.post("/simple", status_code=201)
def create_simple_playlist(
    user_id: int,
    name: str,
    db: Session = Depends(get_db)
):
    """Create a manual playlist (identity-anchoring - no JWT)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    playlist = Playlist(
        user_id=user_id,
        name=name,
        type="manual"
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return {"id": playlist.id, "name": playlist.name, "type": playlist.type, "user_id": playlist.user_id}


@router.post("/{playlist_id}/add-track", status_code=201)
def add_track_to_playlist(
    playlist_id: int,
    track_id: int,
    db: Session = Depends(get_db)
):
    """Add track to playlist (identity-anchoring - no JWT)."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Check if already in playlist
    existing = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id,
        PlaylistTrack.track_id == track_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Track already in playlist")
    
    max_position = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id
    ).count()
    
    playlist_track = PlaylistTrack(
        playlist_id=playlist_id,
        track_id=track_id,
        position=max_position
    )
    db.add(playlist_track)
    db.commit()
    
    return {"message": "Track added to playlist"}


@router.delete("/{playlist_id}", status_code=204)
def delete_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a playlist."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own playlists")
        
    # Delete associated entries
    db.query(PlaylistTrack).filter(PlaylistTrack.playlist_id == playlist_id).delete()
    db.delete(playlist)
    db.commit()
    return None


@router.put("/{playlist_id}", response_model=PlaylistResponse)
def update_playlist(
    playlist_id: int,
    playlist_update: PlaylistCreate, # Reusing schema for name
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rename a playlist."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only rename your own playlists")
        
    playlist.name = playlist_update.name
    db.commit()
    db.refresh(playlist)
    return playlist
