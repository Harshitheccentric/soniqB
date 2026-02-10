# SoniqB: AI-Powered Music Intelligence

**A Research-Oriented Music Intelligence Platform for the AIML Lab**

SoniqB is more than just a music player; it is an explainable machine learning platform designed for the study of audio embeddings, user behavior clustering, and high-dimensional data visualization. Built with a "human-in-the-loop" philosophy, it transforms raw audio into semantic insights.

---

## 🚀 Core Features

### 1. Sonic Recommendation Engine
Move beyond basic metadata. SoniqB uses deep feature extraction to understand the *vibe* of your music.
- **Deep Audio Embeddings**: Powered by the **MusicFM Foundation Model**, extracting 1024-dimensional vectors that capture timbre, rhythm, and harmonic content.
- **Vector-Space Navigation**: Uses **K-Nearest Neighbors (KNN)** with Cosine Similarity for precise, sonically-aligned next-track selection.
- **Intelligent Exploration**: A multi-stage diversity algorithm prevents "filter bubbles" by balancing similarity with genre-weighted discovery and temporal filtering.

### 2. Psychographic Listener Profiling
Understand *how* you listen, not just what you listen to.
- **Archetype Clustering**: An unsupervised **K-Means** model analyzes listening entropy, skip rates, and engagement to categorize users into four archetypes:
    - 🧭 **Explorer**: High genre diversity and broad sonic discovery.
    - 🔥 **Enthusiast**: Deep engagement, heavy curator, and long sessions.
    - 🎯 **Niche Fan**: High loyalty to specific genres and styles.
    - 🛋️ **Casual Listener**: Relaxed, low-frequency listening habits.
- **Explainable AI (XAI)**: Every archetype assignment is backed by **Z-score attribution**, telling you exactly which behaviors (e.g., "Eclectic Taste") drove the classification.

### 3. The Library Galaxy
Visualize your entire collection as a cosmic map.
- **Dimensionality Reduction**: Uses **Principal Component Analysis (PCA)** to project 1024-dim sonic vectors into a navigable 2D "Galaxy."
- **Clustered Discovery**: Similar tracks physically cluster together, allowing users to discover sonic "nebulae" in their own library.

---

## 🛠️ Technology Stack
- **Backend**: FastAPI (Python 3.11)
- **Frontend**: React + Vite + Tailwind CSS
- **ML Frameworks**: PyTorch, Scikit-Learn, MusicFM
- **Package Manager**: [uv](https://github.com/astral-sh/uv) (Fast, deterministic Python builds)

---

## ⚡ Setup Instructions

### Prerequisites
- **Python 3.11** (Strictly required for ML compatibility)
- **Node.js** (v18+)
- **FFmpeg** (For real-time audio processing/transcoding)

### 1. Download Required Assets
Before starting, you must populate the data directories (excluded from Git due to size).

| Asset | Source | Destination |
| :--- | :--- | :--- |
| **ML Models & Weights** | [Google Drive](https://drive.google.com/drive/folders/1tsjBzZWrRj-w6MZuf1g2QKUBZnbZ6ZUf?usp=sharing) | `backend/ml/data/` |
| **Audio Storage** | [Google Drive](https://drive.google.com/drive/folders/1fKa6H0t23bDW7qhOvUUXZWim9EJmeXVK?usp=sharing) | `backend/storage/` |

> [!IMPORTANT]
> Ensure the `backend/ml/data/` folder contains `.pt` and `.json` files directly. The `backend/storage/` folder should contain the `tracks/` subdirectory.

### 2. Backend Initialization
The project uses `uv` for lightning-fast setup.
```bash
# 1. Install dependencies & create virtual environment
uv sync

# 2. Seed the database (Tracks, Users, and Intelligence Patterns)
uv run seed

# 3. Start the FastAPI server
uv run app
```

### 3. Frontend Initialization
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```

---

## 📊 Project Status
- **Current version**: 3.0.0 (Phase 3 "Intelligence" Release)
- **Last Updated**: February 2026
- **Lab Goal**: Implementation of explainable recommendation pipelines and sonic feature visualization.
