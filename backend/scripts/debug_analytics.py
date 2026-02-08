import sys
import os
import numpy as np

# Add backend to path
sys.path.append(os.getcwd())

from backend.db import SessionLocal
from backend.models import Track

def test_analytics_logic():
    print("--- DEBUGGING ANALYTICS LOGIC ---")
    
    # 1. Check Files
    emb_path = "backend/ml/data/track_embeddings.npy"
    id_path = "backend/ml/data/track_ids.npy"
    
    print(f"Checking {emb_path}: {'EXISTS' if os.path.exists(emb_path) else 'MISSING'}")
    print(f"Checking {id_path}: {'EXISTS' if os.path.exists(id_path) else 'MISSING'}")
    
    if not os.path.exists(emb_path):
        return

    # 2. Try Loading
    try:
        embeddings = np.load(emb_path)
        track_ids = np.load(id_path)
        print(f"Loaded Embeddings: {embeddings.shape}")
        print(f"Loaded IDs: {track_ids.shape}")
        print(f"First 5 IDs: {track_ids[:5]}")
    except Exception as e:
        print(f"FATAL: Failed to load numpy files: {e}")
        return

    # 3. Check DB Match
    db = SessionLocal()
    db_tracks = db.query(Track).all()
    db_ids = [t.id for t in db_tracks]
    print(f"DB Total Tracks: {len(db_tracks)}")
    print(f"DB First 5 IDs: {db_ids[:5]}")
    
    common = set(db_ids).intersection(set(track_ids))
    print(f"Matching IDs (DB <-> NPY): {len(common)}")
    
    if len(common) == 0:
        print("CRITICAL: No matching IDs found! This causes fallback to simulation.")

    # 4. Try PCA (Check dependencies)
    try:
        from sklearn.decomposition import PCA
        print("Scikit-learn PCA imported successfully.")
        
        pca = PCA(n_components=2)
        coords = pca.fit_transform(embeddings)
        print(f"PCA Result Shape: {coords.shape}")
        print(f"First Coord: {coords[0]}")
        
    except ImportError:
        print("CRITICAL: sklearn import function failed.")
    except Exception as e:
        print(f"CRITICAL: PCA execution failed: {e}")

if __name__ == "__main__":
    test_analytics_logic()
