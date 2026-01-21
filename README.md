# SoniqB Music Player - AIML Lab Project

**Educational Project for College AIML Lab**

A music player application designed to support future machine-learning–based personalization. This is an educational, explainable, ML-aligned application featuring a built-in recommendation engine and listening intelligence dashboard.

---

## Project Phases

### ✅ Phase 1: Backend (Complete)
Clean FastAPI backend with explicit event logging.

### ✅ Phase 2: Frontend (Complete)
React UI that consumes backend APIs and logs user interactions.

### ✅ Phase 3: ML Integration & Recommendations (Complete)
Implemented audio embedding extraction (MusicFM), genre classification, user clustering, and a recommendation engine.

---

## Core Features

### 1. Recommendation Engine (`backend/ml/recommender.py`)
- **Next Song**: Multi-stage recommendation using KNN (Cosine Similarity) on MusicFM embeddings (1024-dim).
- **Diversity Control**: Automatic filtering of recent history and genre-weighted sampling to prevent "filter bubbles."
- **Playlist Generation**: Seed-based generation using cluster mean vector analysis.

### 2. Listening Intelligence (Analysis)
An advanced psychological profiling system that transforms raw playback events into high-level archetypes:

- **Archetype Profiling**: Categorizes users as *Explorer*, *Deep Diver*, *Enthusiast*, or *Casual* based on genre entropy, skip rates, and session frequency.
- **Library Galaxy**: A 2D spatial visualization (simulated PCA/UMAP) of the user's music library, clustered by sonic similarity and genre.

---

## Technical Implementation Breakdown

### 1. Data Processing Layer (`backend/ml/user_clustering.py`)
The `UserClusterAnalyzer` performs feature engineering on the `listening_events` table:
- **Genre Diversity**: Calculated as the entropy of the user's genre distribution (using Shannon Entropy). 
- **User Vector**: Aggregates total plays, average duration, like/skip ratios, and session frequency.

### 2. Machine Learning Layer
- **Embeddings**: Utilizes the **MusicFM foundation model** for extracting semantic audio features.
- **Classification**: Tracks are automatically assigned genres via a linear probe on top of frozen embeddings.

### 3. API Architecture (`backend/routes/`)
- `GET /analytics/profile`: Authenticated endpoint returning user archetype and trait stats.
- `GET /analytics/map`: Generates 2D coordinates for library visualization.
- `GET /recommendations/next`: Fetches the most sonically relevant next track.

---

## Project Structure

```
soniqB/
├── backend/              # FastAPI backend
│   ├── main.py          # Application entry point
│   ├── ml/              # Machine Learning modules
│   │   ├── recommender.py     # KNN Recommendation Engine
│   │   ├── user_clustering.py # Feature engineering & archetypes
│   │   ├── service.py         # MusicFM embedding service
│   │   └── genre_classifier.py # Genre prediction logic
│   ├── routes/          # API endpoints
│   │   ├── analytics.py      # Dashboard data
│   │   ├── recommendations.py # Rec engine endpoints
│   │   └── ...
│   └── storage/audio/   # Local audio files
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Analysis.tsx  # Intelligence Dashboard
│   │   │   └── Home.tsx      # Main Player UI
│   │   └── components/       
│   └── vite.config.ts    # API Proxy configuration
```

---

## Quick Start

### 1. Start Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed_data.py  # Seeds dummy history for analytics
uvicorn backend.main:app --reload
```

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Development Status
**Current Status:** Phases 1, 2, & 3 Complete  
**Last Updated:** January 2026
