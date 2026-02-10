# SoniqB Music Player - AIML Lab Project

**Educational Project for College AIML Lab**

A music player application designed to support future machine-learning–based personalization. This is an educational, explainable, ML-aligned application featuring a built-in recommendation engine and listening intelligence dashboard.

---

## Core Features

### 1. AI-Powered Recommendation Engine
The project features a multi-stage recommendation system that moves beyond simple metadata matching to deep sonic analysis.
- **MusicFM Embeddings**: Every track is processed by a **MusicFM foundation model** to extract 1024-dimensional semantic audio embeddings, capturing rhythm, timbre, and mood.
- **Sonic Similarity (KNN)**: Uses K-Nearest Neighbors (Cosine Similarity) to find the most sonically relevant next track in the high-dimensional vector space.
- **Intelligent Diversity Control**: Prevents "filter bubbles" by incorporating a diversity shuffle. It automatically filters recent listening history and uses genre-weighted sampling to ensure a fresh experience.
- **Personalized Mix Generation**: Leverages user preference vectors to generate cohesive playlists that bridge diverse genres smoothly.

### 2. Listening Intelligence (Psychological Profiling)
Transforming raw data into meaningful human insights through advanced analytics:
- **Archetype Profiling**: Uses **K-Means Clustering** to categorize listeners into four psychological archetypes:
    - **Explorer**: High genre diversity, frequent skips, and broad discovery.
    - **Enthusiast**: Heavy engagement, high like-ratio, and long session durations.
    - **Niche Fan**: Focused preferences with deep loyalty to specific genres.
    - **Casual Listener**: Low-frequency, relaxed listening habits.
- **Explainable Analytics**: The system uses Z-score attribution to explain *why* a user is assigned a specific archetype (e.g., "High Genre Diversity -> Eclectic Taste").
- **Library Galaxy**: A spatial 2D map of your music library. Using **Principal Component Analysis (PCA)**, the system reduces high-dimensional audio embeddings into a navigable star-map where similar-sounding songs cluster together.

### 3. Real-Time ML Labeling
- **Automated Genre Tagging**: Every uploaded track is instantly analyzed using a trained **Linear Probe** on top of frozen MusicFM embeddings, providing high-precision genre predictions without manual metadata.
- **Library Integrity**: Deep-scans the local storage to index and classify existing tracks, creating a unified sonic database.

---

## Setup Instructions

### Prerequisites
- **Python 3.11** (Required)
- **Node.js** (v18+)
- **FFmpeg** (For audio processing)

### 1. Model Data Setup
Download the `data` folder from the link below and place it inside `backend/ml/`:
- **Data Folder**: [Google Drive Link](https://drive.google.com/drive/folders/1tsjBzZWrRj-w6MZuf1g2QKUBZnbZ6ZUf?usp=sharing)
- *The final path should be `backend/ml/data/` containing the `.pt` and `.json` files.*

### 2. Audio Storage Setup
Download the `storage` folder from the link below and place it inside the `backend/` directory:
- **Storage Folder**: [Google Drive Link](https://drive.google.com/drive/folders/1fKa6H0t23bDW7qhOvUUXZWim9EJmeXVK?usp=sharing)
- *The final path should be `backend/storage/tracks/` containing genre subfolders.*

### 3. Start Backend
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..
python seed_enhanced.py  # Initialize database and seed library
uvicorn backend.main:app --reload --port 8000
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
