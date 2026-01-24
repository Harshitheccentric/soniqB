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


@router.post("/playlist/personalized")
def generate_personalized_playlist(
    playlist_name: Optional[str] = Body(None),
    n_tracks: int = Body(20),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Generate a personalized playlist for the user based on their listening history.
    
    Algorithm:
    1. Analyze user's top played/liked tracks
    2. Select diverse seed tracks from user's favorites
    3. Use recommender to expand into full playlist
    4. Filter out recently played tracks
    5. Create playlist with auto-generated name
    """
    # Get user's listening events
    events = db.query(ListeningEvent)\
        .filter(ListeningEvent.user_id == user.id)\
        .all()
    
    if not events:
        raise HTTPException(
            status_code=400, 
            detail="No listening history found. Play some tracks first!"
        )
    
    # Find liked tracks
    liked_track_ids = [e.track_id for e in events if e.event_type == 'like']
    
    # Count play events per track
    play_counts = {}
    for e in events:
        if e.event_type == 'play':
            play_counts[e.track_id] = play_counts.get(e.track_id, 0) + 1
    
    # Get top played tracks
    top_played = sorted(play_counts.items(), key=lambda x: x[1], reverse=True)
    top_played_ids = [tid for tid, _ in top_played[:10]]
    
    # Combine liked and top played for seed selection
    seed_candidates = set(liked_track_ids + top_played_ids)
    
    # Select up to 5 diverse seeds
    seed_tracks = list(seed_candidates)[:5]
    
    if not seed_tracks:
        # Fallback: use random tracks from library
        random_tracks = db.query(Track).limit(5).all()
        seed_tracks = [t.id for t in random_tracks]
    
    # Generate playlist using recommender
    recommender = get_recommender()
    
    # Get recently played tracks to exclude
    recent_events = db.query(ListeningEvent)\
        .filter(ListeningEvent.user_id == user.id)\
        .filter(ListeningEvent.event_type == 'play')\
        .order_by(ListeningEvent.timestamp.desc())\
        .limit(20)\
        .all()
    recent_ids = [e.track_id for e in recent_events]
    
    # Generate recommendations
    recommended_ids = recommender.generate_playlist(
        seed_track_ids=seed_tracks,
        n_tracks=n_tracks,
        exclude_ids=recent_ids
    )
    
    # Fallback if recommender is not fitted or returns empty
    if not recommended_ids:
        # Use genre-based fallback
        # Get genres from seed tracks
        seed_track_objs = db.query(Track).filter(Track.id.in_(seed_tracks)).all()
        seed_genres = [t.predicted_genre for t in seed_track_objs if t.predicted_genre]
        
        if seed_genres:
            # Find tracks with similar genres
            recommended_ids = []
            for genre in set(seed_genres):
                similar_tracks = db.query(Track)\
                    .filter(Track.predicted_genre == genre)\
                    .filter(Track.id.notin_(seed_tracks + recent_ids))\
                    .limit(n_tracks // len(set(seed_genres)) + 1)\
                    .all()
                recommended_ids.extend([t.id for t in similar_tracks])
            
            # Trim to requested size
            recommended_ids = recommended_ids[:n_tracks]
        
        # If still empty, just use random tracks
        if not recommended_ids:
            all_tracks = db.query(Track)\
                .filter(Track.id.notin_(seed_tracks + recent_ids))\
                .limit(n_tracks)\
                .all()
            recommended_ids = [t.id for t in all_tracks]
    
    if not recommended_ids:
        raise HTTPException(
            status_code=400, 
            detail="Could not generate playlist. Try playing more tracks to build your profile."
        )
    
    # Create playlist name if not provided
    if not playlist_name:
        from datetime import datetime
        playlist_name = f"My Mix - {datetime.now().strftime('%b %d')}"
    
    # Create playlist in database
    playlist = Playlist(
        user_id=user.id,
        name=playlist_name,
        type="auto_generated"
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    
    # Add tracks to playlist
    for idx, track_id in enumerate(recommended_ids):
        pt = PlaylistTrack(
            playlist_id=playlist.id,
            track_id=track_id,
            position=idx
        )
        db.add(pt)
    
    db.commit()
    
    return {
        "id": playlist.id,
        "name": playlist.name,
        "type": "auto_generated",
        "track_count": len(recommended_ids),
        "seed_tracks": seed_tracks
    }
