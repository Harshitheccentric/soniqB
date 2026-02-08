"""
ML API Routes for SoniqB - Phase 3
Provides endpoints for genre classification and user clustering.
"""
import os
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.db import get_db
from backend.models import Track, User, ListeningEvent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ml", tags=["machine-learning"])


# Response schemas
class GenreClassificationResult(BaseModel):
    track_id: int
    genre: str
    confidence: float


class UserClusterResult(BaseModel):
    user_id: int
    cluster_label: str
    description: str
    features: dict


class ClassifyAllResponse(BaseModel):
    total_tracks: int
    classified: int
    skipped: int
    results: List[GenreClassificationResult]


# Lazy load ML services to avoid slow startup
_musicfm_service = None
_genre_classifier = None
_user_analyzer = None
_recurrent_service = None


class CompareResult(BaseModel):
    """Result from comparing both models on a track."""
    track_id: int
    musicfm: dict
    recurrent: dict


def get_musicfm_service():
    """Lazy load MusicFM service."""
    global _musicfm_service
    if _musicfm_service is None:
        from backend.ml.service import get_musicfm_service as get_service
        _musicfm_service = get_service()
    return _musicfm_service


def get_genre_classifier():
    """Lazy load genre classifier."""
    global _genre_classifier
    if _genre_classifier is None:
        from backend.ml.genre_classifier import get_genre_classifier as get_clf
        _genre_classifier = get_clf()
    return _genre_classifier


def get_user_analyzer():
    """Lazy load user cluster analyzer."""
    global _user_analyzer
    if _user_analyzer is None:
        from backend.ml.user_clustering import get_user_cluster_analyzer
        _user_analyzer = get_user_cluster_analyzer()
    return _user_analyzer


def get_recurrent_service():
    """Lazy load recurrent classifier service."""
    global _recurrent_service
    if _recurrent_service is None:
        from backend.ml.recurrent_model import get_recurrent_classifier_service
        _recurrent_service = get_recurrent_classifier_service()
    return _recurrent_service


@router.get("/status")
def ml_status():
    """Check ML service status."""
    try:
        service = get_musicfm_service()
        
        # User requested: Check if model exists physically, don't force load
        # If files exist, report "ready" (it will lazy load on first use)
        is_available = service.is_ready() or os.path.exists(service.model_path)
        
        return {
            "status": "ready" if is_available else "not_loaded",
            "device": service.device,
            "model_path": service.model_path
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


@router.post("/load")
def load_ml_models():
    """Explicitly load ML models into memory."""
    try:
        service = get_musicfm_service()
        service.ensure_loaded()
        return {
            "status": "loaded",
            "device": service.device
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")


@router.post("/classify/{track_id}", response_model=GenreClassificationResult)
def classify_track(track_id: int, db: Session = Depends(get_db)):
    """
    Classify a single track's genre.
    
    Extracts audio embedding and predicts genre.
    Updates the track's predicted_genre in the database.
    """
    # Get track
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")
    
    # Check audio file exists
    if not os.path.exists(track.audio_path):
        raise HTTPException(
            status_code=400, 
            detail=f"Audio file not found: {track.audio_path}"
        )
    
    try:
        # Get classifier
        classifier = get_genre_classifier()
        
        # Classify
        genre, confidence = classifier.classify_audio_file(track.audio_path)
        
        # Update track in database
        track.predicted_genre = genre
        db.commit()
        
        logger.info(f"Classified track {track_id}: {genre} ({confidence:.2f})")
        
        return GenreClassificationResult(
            track_id=track_id,
            genre=genre,
            confidence=confidence
        )
        
    except Exception as e:
        logger.error(f"Classification failed for track {track_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classify-all", response_model=ClassifyAllResponse)
def classify_all_tracks(db: Session = Depends(get_db)):
    """
    Classify all tracks that have audio files.
    
    If no genre centroids exist, this will perform UNSUPERVISED clustering
    on all available tracks to discover genres automatically.
    """
    tracks = db.query(Track).all()
    classifier = get_genre_classifier()
    service = get_musicfm_service()
    
    # buffers and results
    valid_tracks = []
    embeddings = []
    results = []
    skipped = 0
    
    logger.info(f"Starting batch classification for {len(tracks)} tracks")
    
    # 1. First pass: Collect embeddings for all valid tracks
    for track in tracks:
        if not os.path.exists(track.audio_path):
            skipped += 1
            continue
            
        try:
            # Check if we already have a manual label (confidence=1.0)
            # If so, we should add it as a centroid to help the clustering
            if track.genre_confidence == 1.0 and track.predicted_genre:
                embedding = service.get_embedding(track.audio_path)
                classifier.add_centroid(track.predicted_genre, embedding)
                
            # Extract embedding for clustering
            embedding = service.get_embedding(track.audio_path)
            valid_tracks.append(track)
            embeddings.append(embedding)
            
        except Exception as e:
            logger.error(f"Failed to extract embedding for track {track.id}: {e}")
            skipped += 1

    # 2. Check if we need to fit clusters (Unsupervised Mode)
    # We fit if we have enough data (at least 1 track) and no existing centroids
    import numpy as np
    if len(embeddings) >= 1 and classifier._centroids is None:
        logger.info("No centroids found. Running UNSUPERVISED K-Means clustering...")
        # Fit clusters to the data we just collected
        # Limit clusters to actual number of samples if small
        n_clusters = min(classifier.n_clusters, len(embeddings))
        
        # Temporarily update classifier n_clusters if needed
        original_n = classifier.n_clusters
        classifier.n_clusters = n_clusters
        
        try:
            classifier.fit_clusters(np.array(embeddings))
            logger.info("Unsupervised learning complete.")
        finally:
            classifier.n_clusters = original_n

    # 3. Second pass: Classify everything using the (possibly just fitted) classifier
    classified_count = 0
    
    for i, track in enumerate(valid_tracks):
        try:
            # Use the pre-computed embedding
            embedding = embeddings[i]
            
            # Predict
            genre, confidence = classifier.classify_embedding(embedding)
            
            # Update DB (don't overwrite manual labels)
            if track.genre_confidence != 1.0:
                track.predicted_genre = genre
                track.genre_confidence = confidence
                
            results.append(GenreClassificationResult(
                track_id=track.id,
                genre=track.predicted_genre,
                confidence=track.genre_confidence or confidence
            ))
            classified_count += 1
            
        except Exception as e:
            logger.error(f"Classification failed for {track.id}: {e}")
            skipped += 1

    db.commit()
    
    return ClassifyAllResponse(
        total_tracks=len(tracks),
        classified=classified_count,
        skipped=skipped,
        results=results
    )


@router.get("/user-cluster/{user_id}", response_model=UserClusterResult)
def get_user_cluster(user_id: int, db: Session = Depends(get_db)):
    """
    Get listening category/cluster for a user.
    
    Analyzes user's listening events to determine their listener archetype.
    """
    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    # Get user's events
    events = db.query(ListeningEvent).filter(
        ListeningEvent.user_id == user_id
    ).all()
    
    # Get tracks for genre info
    tracks = db.query(Track).all()
    
    # Convert to dicts
    events_data = [
        {
            "event_type": e.event_type,
            "track_id": e.track_id,
            "listened_duration": e.listened_duration,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None
        }
        for e in events
    ]
    
    tracks_data = [
        {
            "id": t.id,
            "predicted_genre": t.predicted_genre
        }
        for t in tracks
    ]
    
    try:
        # Get analyzer
        analyzer = get_user_analyzer()
        
        # Build feature vector
        user_vector = analyzer.build_user_vector(events_data, tracks_data)
        
        # Predict cluster
        label, info = analyzer.predict(user_vector)
        
        return UserClusterResult(
            user_id=user_id,
            cluster_label=label,
            description=info.get("description", ""),
            features=info.get("features", {})
        )
        
    except Exception as e:
        logger.error(f"User clustering failed for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calibrate/{track_id}")
def calibrate_track(track_id: int, genre: str, db: Session = Depends(get_db)):
    """
    Calibrate the genre classifier by labeling a track.
    
    This saves the track's embedding as a reference centroid for the given genre.
    """
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")
    
    if not os.path.exists(track.audio_path):
        raise HTTPException(status_code=400, detail="Audio file not found")
        
    try:
        service = get_musicfm_service()
        classifier = get_genre_classifier()
        
        # Extract embedding
        embedding = service.get_embedding(track.audio_path)
        
        # Add as centroid
        classifier.add_centroid(genre, embedding)
        
        # Update track
        track.predicted_genre = genre
        track.genre_confidence = 1.0  # Manual label is 100% confident
        db.commit()
        
        return {
            "status": "calibrated",
            "track_id": track_id,
            "genre": genre,
            "message": f"Successfully learned '{genre}' from track {track_id}"
        }
        
    except Exception as e:
        logger.error(f"Calibration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/embedding/{track_id}")
def get_track_embedding(track_id: int, db: Session = Depends(get_db)):
    """
    Get the raw embedding vector for a track.
    
    Useful for debugging and advanced analysis.
    """
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")
    
    if not os.path.exists(track.audio_path):
        raise HTTPException(
            status_code=400,
            detail=f"Audio file not found: {track.audio_path}"
        )
    
    try:
        service = get_musicfm_service()
        embedding = service.get_embedding(track.audio_path)
        
        return {
            "track_id": track_id,
            "embedding_dim": len(embedding),
            "embedding": embedding.tolist()[:20],  # First 20 dims for preview
            "note": "Full embedding truncated for display"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recurrent/classify/{track_id}")
def classify_with_recurrent(track_id: int, db: Session = Depends(get_db)):
    """
    Classify a track using the Combined Recurrent Model.
    
    This is your custom CNN+LSTM model trained on FMA.
    It outputs direct genre predictions (8 classes).
    """
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")
    
    if not os.path.exists(track.audio_path):
        raise HTTPException(status_code=400, detail=f"Audio file not found: {track.audio_path}")
    
    try:
        service = get_recurrent_service()
        genre, confidence, all_probs = service.classify(track.audio_path)
        
        return {
            "track_id": track_id,
            "model": "CombinedRecurrent",
            "genre": genre,
            "confidence": confidence,
            "all_probabilities": all_probs
        }
        
    except Exception as e:
        logger.error(f"Recurrent classification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare/{track_id}", response_model=CompareResult)
def compare_models(track_id: int, db: Session = Depends(get_db)):
    """
    Compare genre predictions from BOTH models on the same track.
    
    Returns side-by-side results from:
    1. MusicFM (foundation model + unsupervised clustering)
    2. Combined Recurrent (direct classifier)
    """
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")
    
    if not os.path.exists(track.audio_path):
        raise HTTPException(status_code=400, detail=f"Audio file not found: {track.audio_path}")
    
    results = {"track_id": track_id, "musicfm": {}, "recurrent": {}}
    
    # MusicFM prediction
    try:
        classifier = get_genre_classifier()
        genre, confidence = classifier.classify_audio_file(track.audio_path)
        results["musicfm"] = {
            "genre": genre,
            "confidence": confidence,
            "model_type": "foundation_model_clustering"
        }
    except Exception as e:
        results["musicfm"] = {"error": str(e)}
    
    # Recurrent model prediction
    try:
        recurrent = get_recurrent_service()
        genre, confidence, all_probs = recurrent.classify(track.audio_path)
        results["recurrent"] = {
            "genre": genre,
            "confidence": confidence,
            "model_type": "direct_classifier",
            "all_probabilities": all_probs
        }
    except Exception as e:
        results["recurrent"] = {"error": str(e)}
    
    return results
