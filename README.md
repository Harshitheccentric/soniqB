# SONIQ: The AI-Driven Music Intelligence Platform

> **"Bridging the Semantic Gap Between Signal and Perception"**

---
## Screen Recording (Demo Video)

<video src="https://github.com/user-attachments/assets/8160cd1f-dd12-4316-a5ab-323d59fb77e0" controls></video>

---

## 📜 Table of Contents
1.  [Abstract](#-abstract)
2.  [The Problem](#-the-problem)
3.  [The Solution](#-the-solution)
4.  [Architecture & Methodology](#-architecture--methodology)
    *   [Phase 1: Model Training (The Brain)](#phase-1-model-training)
    *   [Phase 2: Feature Extraction (The Ears)](#phase-2-feature-extraction)
    *   [Phase 3: Application (The Experience)](#phase-3-application)
5.  [Key Features](#-key-features-deep-dive)
6.  [Installation & Setup](#-installation--setup)
7.  [Project Structure](#-project-structure)
8.  [Technology Stack](#-technology-stack)
9.  [Future Roadmap](#-future-roadmap)

---

## 📄 Abstract

**SONIQ** is an end-to-end deep learning system designed to analyze, classify, and recommend music based on its **audio content**, rather than metadata or collaborative filtering. By leveraging a hybrid **Convolutional Recurrent Neural Network (CRNN)** and the **MusicFM foundation model**, SONIQ extracts high-dimensional latent representations of music tracks.

This allows the system to:
*   Identify genres with **90% accuracy** from raw audio.
*   Recommend songs based on acoustic similarity (timbre, tempo, mood).
*   Create smooth transitions between disparate tracks (**"The Wormhole"**).
*   Profile user personalities based on the **entropy** of their listening history.
*   Provide **Explainable AI (XAI)** reasoning for every recommendation.

---

## 🔻 The Problem

Traditional music streaming platforms (Spotify, Apple Music) suffer from critical limitations:

1.  **Cold Start Problem**: New songs with zero plays cannot be recommended because Collaborative Filtering (CF) relies on historical user interaction data.
2.  **Filter Bubbles**: CF algorithms tend to reinforce popularity bias, trapping users in loops of "more of the same."
3.  **Metadata Blindness**: Systems rely on text tags ("Rock", "Pop") which are subjective and fail to capture the actual *sonic texture* of a track.
4.  **Black Box AI**: Users receive recommendations without understanding *why*, leading to lack of trust and engagement.

---

## 💡 The Solution

**SONIQ** shifts the paradigm from **Behavioral Analysis** (Who listened to what?) to **Content Analysis** (What does it sound like?).

| Feature | Traditional Approach (Spotify) | SONIQ Approach |
| :--- | :--- | :--- |
| **Input Data** | User Click Logs | **Raw Audio Waveforms** |
| **New Music** | Ignored until popular | **Analyzed Instantly** |
| **Similarity** | User overlap | **Acoustic Vector Distance** |
| **Profiling** | Yearly Summary (Wrapped) | **Real-Time Archetypes** |
| **Explainability** | None | **Feature-Based Reasoning** |

---

## 🏗 Architecture & Methodology

The system is built as a three-stage pipeline, moving from offline training to real-time inference and user application.

### 🖼 System Diagram
<img width="1402" height="623" alt="image" src="https://github.com/user-attachments/assets/d2a936bd-13e4-45bf-b29f-aa8cd62a21fc" />


### Phase 1: Model Training
We trained a custom **CRNN** on the **FMA Small Dataset** (8,000 tracks, 30s clips, 8 balanced genres).

1.  **Preprocessing**:
    *   **Resampling**: 44.1kHz Mono.
    *   **Mel Spectrogram**: 128 Mel bands, FFT size 2048, Hop Length 512.
    *   **Normalization**: Z-Score scaling to center data (Mean=0, Std=1).

2.  **Model Architecture (CRNN)**:
    *   **Convolutional Blocks (4 Layers)**: Extract spatial features (edges, textures, instrument timbres) using 3x3 Kernels and Max Pooling.
    *   **Bidirectional LSTM (2 Layers)**: Capture temporal context (rhythm, beat drops, song structure) by scanning the sequence forwards and backwards.
    *   **Dense Layer**: Maps the final hidden state to 8 genre probabilities (Softmax).

<img width="1275" height="633" alt="image" src="https://github.com/user-attachments/assets/45438b3f-6a9e-4f7d-a578-ebc920c7b2a9" />

### Phase 2: Feature Extraction
To ensure robustness, we use a **Hybrid Feature Extraction** strategy:
*   **Semantic Vector**: We use the pre-trained **MusicFM** foundation model to extract a **1024-dimensional embedding**. This represents the "soul" of the track (mood, energy) and is used for mathematical similarity search.
*   **Genre Label**: We use our **Custom CRNN** to predict explicit genre tags (e.g., "85% Rock, 15% Metal"). This is used for filtering and explainability.

### Phase 3: Application
*   **KNN Recommender**: Uses **Cosine Similarity** on the 1024-dim vectors to find the nearest acoustic neighbors in the database.
*   **Wormhole**: Uses **SLERP (Spherical Linear Interpolation)** to generate a seamless playlist path between two disparate tracks.
*   **User Clustering**: Calculates the **Shannon Entropy** of the user's genre consumption to classify them into archetypes.

---

## 🌟 Key Features Deep Dive

### 🌀 The Wormhole
> *"Travel from Beethoven to Skrillex without the whiplash."*

Standard shuffles are random. The Wormhole allows you to pick a **Start Track** and an **End Track**. The system then calculates the shortest path along the high-dimensional manifold of the embedding space, picking intermediate tracks that serve as "sonic bridges."
*   **Math**: `SLERP(p0, p1, t) = (sin((1-t)Ω)/sin(Ω)) * p0 + (sin(tΩ)/sin(Ω)) * p1`

### 🎭 User Archetypes
We define your "Listener Persona" based on the diversity and depth of your listening habits:
*   **The Explorer (High Entropy)**: You listen to a wide variety of genres.
*   **The Niche Fan (Low Entropy)**: You stick deeply to one or two genres.
*   **The Casual**: Low interaction, high skip rate.
*   **The Enthusiast**: High interaction, low skip rate.

### 🔍 Explainable AI (XAI)
Every recommendation comes with a reason. We analyze the feature vector difference between the recommended track and your profile.
*   *Example Output*: **"Recommended because this track matches the high energy and fast tempo (170 BPM) of your recent Drum & Bass listening history."**

---

## 📦 Installation & Setup

### Prerequisites
*   Python 3.9+ (Recommended: 3.10)
*   Node.js 16+
*   FFmpeg installed and added to `PATH`.

### 1. Backend Setup (FastAPI)
```bash
cd soniqB/backend

# Create virtual environment
python -m venv venv
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download Pre-trained Models
# (Ensure 'best_model.pt' is placed in backend/models/)

# Run the Server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup (React + TypeScript)
```bash
cd soniqB/frontend

# Install node modules
npm install

# Start the dev server
npm start
```

Access the app at `http://localhost:3000`.

---

## 📂 Project Structure

```bash
soniqB/
├── backend/
│   ├── ml/
│   │   ├── crnn.py             # PyTorch Model Definition
│   │   ├── dataset.py          # Data Loading & Preprocessing
│   │   ├── recommender.py      # KNN & Wormhole Logic
│   │   └── user_clustering.py  # Archetype Logic
│   ├── routes/                 # API Endpoints (FastAPI)
│   ├── main.py                 # Server Entry Point
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PlayerView.tsx  # Main Player UI
│   │   │   ├── Galaxy.tsx      # 3D Library Visualization
│   │   │   └── Analysis.tsx    # User Stats Dashboard
│   │   ├── context/            # Global State (Context API)
│   │   └── App.tsx
│   └── package.json
│
└── NNDL_Project/               # Original Research Code (Jupyter Notebooks)
```

---

## 🛠 Technology Stack

### Core AI
*   **PyTorch**: Deep Learning Framework.
*   **Librosa**: Audio Signal Processing (STFT, Mel Spectrograms).
*   **Scikit-Learn**: KNN, PCA, and Clustering algorithms.
*   **NumPy/Pandas**: Data manipulation and Vector math.

### Full Stack
*   **FastAPI**: High-performance Async Python backend.
*   **SQLite**: Lightweight relational database.
*   **React (Vite)**: Frontend framework.
*   **TailwindCSS**: Styling engine.
*   **Framer Motion**: UI Animations.

---

## 🔮 Future Roadmap

1.  **Scalability**: Migrate from exact KNN (O(N)) to Approximate Nearest Neighbors (HNSW) using **Milvus** or **Pinecone** for million-scale datasets.
2.  **Lyrics Analysis**: Integrate NLP (BERT) not just for audio, but for lyrical content matching.
3.  **Real-Time Edge Inference**: Optimize the CRNN model (Quantization) to run directly in the browser (ONNX.js) for privacy-first analysis.
4.  **Collaborative-Content Hybrid**: Merge our content engine with collaborative data for the ultimate recommendation system.

---

