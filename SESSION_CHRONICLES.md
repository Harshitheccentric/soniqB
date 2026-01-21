# SoniqB: The Intelligence Upgrade 🚀
**Development Journal & Setup Guide**

This document serves as the "source of truth" for the advanced recommendation and analytics features implemented during this session. It bridges the gap between basic playback and a production-grade, explainable AI music experience.

---

## 🛠 Getting "Up and Going"

If you are just landing on this project, follow these steps to see the intelligence features in action.

### 1. Prerequisites
- **Python 3.10+** (Required for some ML library compatibility)
- **Node.js 18+**
- **FFmpeg** (Optional, but recommended for audio processing)

### 2. Backend Setup
```bash
# From the project root
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# CRITICAL: Populate the database with AI-ready data
# This generates simulated genres, embeddings, and a year's worth of training events
python seed_data.py 

# Start the server
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
# From the project root
cd frontend
npm install
npm run dev
```

### 4. Viewing the Magic
1.  Open `http://localhost:5173`.
2.  Login as any user (e.g., Alice).
3.  Go to the **Intelligence Dashboard** (Compass Icon 🧭 in the sidebar).
4.  **Explore the Galaxy**: You'll see a 2D map of your library. Click any star to play!
5.  **Understand your DNA**: The "User Personality" card now explains *why* you are classified as an "Explorer" or "Enthusiast" using Z-score attribution.

---

## 📜 Session Chronicles (What we built)

### Phase 3: The Brain 🧠
We successfully transitioned the app from a simple CRUD player to an ML-powered discovery engine.
-   **Audio Embeddings**: Integrated **MusicFM**-style 1024-dimensional vector extraction.
-   **Content Discovery**: Implemented a KNN-based recommender that finds sonically similar tracks.
-   **Psychographic Scaling**: Built a user clustering system that analyzes listening habits (genre entropy, skip rates, etc.).

### Phase 3.5: The Intelligence Upgrade ⚡
We pushed the "Smart" features to a production-grade level:
-   **Exploration vs. Exploitation**: Added a 20% probabilistic reranking algorithm. The engine now occasionally "takes a risk" to break your echo chamber.
-   **Skip Signal Penalties**: If you skip a song early (< 30s), the system dynamically penalizes that sonic cluster for the rest of your session.
-   **Z-Score Feature Attribution**: Analytics are no longer a "black box." The app now shows you specific reasons for your archetype (e.g., "High Discovery Rate").
-   **Cold Start Strategy**: New users are no longer greeted with silence. We implemented a "centroid-sampling" strategy to seed their tastes immediately.

### Architectural Hardening 🏗️
-   **Vite HMR Fix**: Resolved a critical "Incompatible Export" error by decoupling React Context from Hooks in the frontend.
-   **Auth Integration**: Unified the `X-User-ID` header across all analytics and ML routes for seamless security.
-   **Interactive map**: Transformed the PCA visualization into a functional "Click-to-play" interface.

---

## 📂 Key Files to Reference

| Component | File Path | Responsible For |
| :--- | :--- | :--- |
| **Rec Engine** | `backend/ml/recommender.py` | KNN logic, Reranking, Skip Penalties. |
| **Archetypes** | `backend/ml/user_clustering.py` | K-Means clustering & Z-Score attribution. |
| **Galaxy Map** | `backend/routes/analytics.py` | 2D track projection logic. |
| **UI Brain** | `frontend/src/pages/Analysis.tsx` | Visualizing the "Why" and the Galaxy. |
| **Audio Core**| `frontend/src/context/AudioPlayerContext.tsx` | Global state, skip detection, and auto-play. |

---

## 🧪 Verification Plan
Run the following to ensure everything is humming:
1.  **Skip Test**: Play a song, skip it under 10 seconds. Check console logs for `Logged Skip Signal`.
2.  **Galaxy Test**: Navigate to Analysis. Verify stars correspond to track genres (colors) and are clickable.
3.  **Stability Test**: Edit a frontend file; verify the page hot-reloads without an "Incompatible Export" error.

---
*Built with ❤️ for the SoniqB AIML Lab*
