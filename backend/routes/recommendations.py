"""
Recommendation Routes
API endpoints for personalized music discovery.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from backend.db import get_db
from backend.models import Track, ListeningEvent, User, Playlist, PlaylistTrack
from backend.auth import get_current_user
from backend.ml.recommender import get_recommender
from backend.schemas import TrackResponse

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.on_event("startup")
def load_recommender():
    """Ensure recommender is initialized on app startup."""
    db = next(get_db())
    recommender = get_recommender()
    recommender.fit(db)

@router.get("/next", response_model=TrackResponse)
def get_next_track(
    current_track_id: int,
    history_limit: int = 50,
    skipped_track_ids: Optional[List[int]] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get the next recommended track based on the currently playing track
    and the user's recent listening history.
    """
    recommender = get_recommender()
    
    # Get recent history IDs to avoid repeating songs
    recent_events = db.query(ListeningEvent)\
        .filter(ListeningEvent.user_id == user.id)\
        .filter(ListeningEvent.event_type == 'play')\
        .order_by(ListeningEvent.timestamp.desc())\
        .limit(history_limit)\
        .all()
        
    history_ids = {e.track_id for e in recent_events}
    history_ids.add(current_track_id) # Don't replay current immediately
    
    # Get recommendation
    next_id = recommender.recommend_next_track(
        current_track_id=current_track_id,
        history_ids=list(history_ids)
        # Note: skipped_ids not yet fully used in recommender signature in current iteration
        # but passed here for future proofing / if we update signature
    )
    
    # Fallback if next_id is None
    if next_id:
        track = db.query(Track).filter(Track.id == next_id).first()
        if track:
            return track
            
    # Fallback: Random track from same genre if Rec fails
    current_track = db.query(Track).filter(Track.id == current_track_id).first()
    if current_track and current_track.predicted_genre:
        fallback = db.query(Track)\
            .filter(Track.predicted_genre == current_track.predicted_genre)\
            .filter(Track.id.notin_(history_ids))\
            .first()
        if fallback:
            return fallback
            
    # Fallback: Random track not in history
    import random
    all_ids = [t.id for t in db.query(Track.id).all()]
    available = list(set(all_ids) - history_ids)
    
    if available:
        rand_id = random.choice(available)
        return db.query(Track).filter(Track.id == rand_id).first()
        
    raise HTTPException(status_code=404, detail="No suitable tracks found")

@router.post("/playlist/generate")
def generate_playlist(
    name: str = Body(..., embed=True),
    seed_track_ids: List[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Generate a new playlist based on seed tracks."""
    recommender = get_recommender()
    
    # Generate IDs
    recs = recommender.generate_playlist(seed_track_ids=seed_track_ids, n_tracks=15)
    
    if not recs:
        raise HTTPException(status_code=400, detail="Could not generate playlist from seeds")
        
    # Create Playlist
    playlist = Playlist(user_id=user.id, name=name, type="manual")
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    
    # Add tracks
    for idx, tid in enumerate(recs):
        pt = PlaylistTrack(playlist_id=playlist.id, track_id=tid, position=idx)
        db.add(pt)
        
    db.commit()
    
    return {"id": playlist.id, "name": playlist.name, "track_count": len(recs)}
