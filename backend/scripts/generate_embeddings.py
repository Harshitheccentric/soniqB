
import os
import sys
import numpy as np
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from collections import defaultdict

# Add parent dir to path to import backend modules
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from backend.models import Track
from backend.ml.service import get_musicfm_service
from backend.ml.genre_classifier import get_genre_classifier
from backend.routes.tracks import scan_library

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database Setup
# Use absolute path to ensure we hit the right DB (Project Root)
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../soniq.db'))
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def generate_embeddings():
    """
    Scan all tracks in DB.
    1. Scan filesystem to update DB (and trusted genres).
    2. Generate Embeddings using MusicFM.
    3. Save track_embeddings.npy and track_ids.npy
    4. Update Genre Classification Centroids based on folder-ground-truth.
    """
    logger.info("Starting Embedding Generation Script...")

    session = SessionLocal()
    
    # 1. Scan Library First
    logger.info("Scanning library for new tracks and genre folders...")
    try:
        scan_library(db=session)
        logger.info("Library scan complete.")
    except Exception as e:
        logger.error(f"Library scan failed: {e}")
        # Continue anyway, maybe there are existing tracks

    tracks = session.query(Track).all()
    
    if not tracks:
        logger.info("No tracks found in database.")
        return

    logger.info(f"Found {len(tracks)} tracks in database.")

    # Initialize Service
    service = get_musicfm_service()
    service.ensure_loaded()
    
    track_ids = []
    embeddings = []
    
    # For updating centroids
    genre_embeddings = defaultdict(list)

    count = 0
    errors = 0

    for track in tracks:
        if not os.path.exists(track.audio_path):
            logger.warning(f"File not found: {track.audio_path}")
            continue
            
        try:
            # Generate Embedding
            emb = service.get_embedding(track.audio_path)
            
            # Add to list
            track_ids.append(track.id)
            embeddings.append(emb)
            
            # If track has a trusted genre (from folder scan), collect for centroid update
            if track.predicted_genre and track.genre_confidence >= 1.0:
                genre_embeddings[track.predicted_genre].append(emb)
                
            count += 1
            if count % 10 == 0:
                logger.info(f"Processed {count}/{len(tracks)} tracks...")
                
        except Exception as e:
            logger.error(f"Failed to process {track.id} ({track.title}): {e}")
            errors += 1

    if not embeddings:
        logger.warning("No embeddings generated.")
        return

    # Convert to Numpy
    emb_array = np.array(embeddings)
    id_array = np.array(track_ids)
    
    # Save Cache
    cache_dir = "backend/ml/data"
    os.makedirs(cache_dir, exist_ok=True)
    
    np.save(os.path.join(cache_dir, "track_embeddings.npy"), emb_array)
    np.save(os.path.join(cache_dir, "track_ids.npy"), id_array)
    
    logger.info(f"Saved {len(embeddings)} embeddings to {cache_dir}")
    
    # Update Centroids
    logger.info("Updating Genre Centroids...")
    classifier = get_genre_classifier()
    
    updated_genres = 0
    for genre, embs in genre_embeddings.items():
        if not embs:
            continue
            
        # Calculate mean
        embs_np = np.array(embs)
        centroid = np.mean(embs_np, axis=0)
        
        # Normalize (Centroids are typically unit vectors for cosine sim, but let's keep it raw if classifier handles it)
        # Actually classifier uses cosine_similarity which normalizes, but K-means usually expects Euclidean.
        # Let's normalize to be safe.
        norm = np.linalg.norm(centroid)
        if norm > 0:
            centroid = centroid / norm
            
        classifier.add_centroid(genre, centroid)
        updated_genres += 1
        
    logger.info(f"Updated centroids for {updated_genres} genres.")
    logger.info("Process Complete.")

if __name__ == "__main__":
    generate_embeddings()
