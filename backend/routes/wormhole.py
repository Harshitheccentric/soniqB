from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import Track
from backend.ml.recommender import get_recommender
from typing import List, Dict, Any

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("/wormhole")
def create_wormhole(
    start_track_id: int, 
    end_track_id: int, 
    steps: int = Query(8, ge=2, le=20),
    db: Session = Depends(get_db)
):
    """
    Generate a sonic wormhole (path) between two tracks.
    Returns a list of tracks that morph from start to end.
    """
    recommender = get_recommender()
    
    # Check if fitted
    if not recommender._is_fitted:
        # If no ML model, fallback to just returning start/end or random path?
        # For now error out or trigger fit?
        # Trigger minimal fit
        recommender.fit(db)
    
    # Get Path
    path_ids = recommender.get_path_between_tracks(start_track_id, end_track_id, steps)
    
    if not path_ids:
        raise HTTPException(status_code=400, detail="Could not generate path (invalid IDs or insufficient data)")
        
    # Fetch full track objects
    # Preserve order!
    tracks = db.query(Track).filter(Track.id.in_(path_ids)).all()
    track_map = {t.id: t for t in tracks}
    
    ordered_tracks = []
    for tid in path_ids:
        if tid in track_map:
            ordered_tracks.append(track_map[tid])
            
    return ordered_tracks
