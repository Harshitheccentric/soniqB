#!/usr/bin/env python3
"""
Evaluate both models on FMA dataset with ground truth labels.
"""
import os
import sys
import random
from pathlib import Path
from collections import defaultdict
from tqdm import tqdm

import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.ml.genre_classifier import get_genre_classifier
from backend.ml.recurrent_model import get_recurrent_classifier_service


def load_fma_metadata(metadata_dir: str) -> pd.DataFrame:
    """Load FMA track metadata with genre labels."""
    tracks_path = os.path.join(metadata_dir, "tracks.csv")
    tracks = pd.read_csv(tracks_path, index_col=0, header=[0, 1])
    
    subset = tracks[('set', 'subset')]
    genre_top = tracks[('track', 'genre_top')]
    
    df = pd.DataFrame({
        'track_id': tracks.index,
        'subset': subset,
        'genre_top': genre_top
    })
    
    df = df[df['subset'] == 'small'].copy()
    df = df.dropna(subset=['genre_top'])
    
    return df


def get_audio_path(track_id: int, audio_dir: str) -> str:
    tid_str = f"{track_id:06d}"
    folder = tid_str[:3]
    filename = f"{tid_str}.mp3"
    return os.path.join(audio_dir, folder, filename)


def evaluate_models(
    df: pd.DataFrame,
    audio_dir: str,
    n_samples: int = 200
):
    """Evaluate both models on a random sample of FMA tracks."""
    
    # Sample tracks
    sampled = df.sample(n=min(n_samples, len(df)), random_state=42)
    
    # Get classifiers
    musicfm_clf = get_genre_classifier()
    recurrent_svc = get_recurrent_classifier_service()
    
    results = {
        'musicfm': {'correct': 0, 'total': 0, 'by_genre': defaultdict(lambda: {'correct': 0, 'total': 0})},
        'recurrent': {'correct': 0, 'total': 0, 'by_genre': defaultdict(lambda: {'correct': 0, 'total': 0})}
    }
    
    print(f"\nEvaluating on {len(sampled)} FMA tracks...")
    
    for idx, row in tqdm(sampled.iterrows(), total=len(sampled), desc="Evaluating"):
        track_id = row['track_id']
        true_genre = row['genre_top']
        
        audio_path = get_audio_path(track_id, audio_dir)
        if not os.path.exists(audio_path):
            continue
        
        # MusicFM prediction
        try:
            mfm_genre, mfm_conf = musicfm_clf.classify_audio_file(audio_path)
            results['musicfm']['total'] += 1
            results['musicfm']['by_genre'][true_genre]['total'] += 1
            if mfm_genre == true_genre:
                results['musicfm']['correct'] += 1
                results['musicfm']['by_genre'][true_genre]['correct'] += 1
        except Exception as e:
            pass
        
        # Recurrent prediction
        try:
            rec_genre, rec_conf, _ = recurrent_svc.classify(audio_path)
            results['recurrent']['total'] += 1
            results['recurrent']['by_genre'][true_genre]['total'] += 1
            if rec_genre == true_genre:
                results['recurrent']['correct'] += 1
                results['recurrent']['by_genre'][true_genre]['correct'] += 1
        except Exception as e:
            pass
    
    return results


def print_results(results):
    """Print evaluation results."""
    print("\n" + "="*60)
    print("MODEL COMPARISON RESULTS (FMA Ground Truth)")
    print("="*60)
    
    for model in ['musicfm', 'recurrent']:
        r = results[model]
        acc = 100 * r['correct'] / r['total'] if r['total'] > 0 else 0
        print(f"\n{model.upper()} Probe:")
        print(f"  Overall Accuracy: {r['correct']}/{r['total']} = {acc:.2f}%")
        print(f"  Per-Genre Breakdown:")
        for genre, stats in sorted(r['by_genre'].items()):
            g_acc = 100 * stats['correct'] / stats['total'] if stats['total'] > 0 else 0
            print(f"    {genre:15s}: {stats['correct']:3d}/{stats['total']:3d} = {g_acc:5.1f}%")
    
    # Winner
    mfm_acc = results['musicfm']['correct'] / results['musicfm']['total'] if results['musicfm']['total'] else 0
    rec_acc = results['recurrent']['correct'] / results['recurrent']['total'] if results['recurrent']['total'] else 0
    
    print("\n" + "="*60)
    if mfm_acc > rec_acc:
        print(f"🏆 WINNER: MusicFM ({mfm_acc*100:.1f}% vs {rec_acc*100:.1f}%)")
    elif rec_acc > mfm_acc:
        print(f"🏆 WINNER: Recurrent ({rec_acc*100:.1f}% vs {mfm_acc*100:.1f}%)")
    else:
        print(f"🤝 TIE: Both models at {mfm_acc*100:.1f}%")
    print("="*60)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Evaluate models on FMA")
    parser.add_argument("--metadata-dir", default="backend/fma/fma_metadata")
    parser.add_argument("--audio-dir", default="backend/fma/fma_small")
    parser.add_argument("--n-samples", type=int, default=200)
    args = parser.parse_args()
    
    print("Loading FMA metadata...")
    df = load_fma_metadata(args.metadata_dir)
    print(f"Found {len(df)} tracks in FMA small")
    
    results = evaluate_models(df, args.audio_dir, args.n_samples)
    print_results(results)
