# SoniqB Music Player - AIML Lab Project

**Educational Project for College AIML Lab**

A music player application designed to support future machine-learning–based personalization. This is NOT a production system - it's an educational, explainable, ML-aligned application.

⚠️ **Note: ML is not implemented in Phases 1 & 2.**

---

## Project Phases

### ✅ Phase 1: Backend (Complete)
Clean FastAPI backend with explicit event logging and zero ML logic.

**Technology:** Python, FastAPI, SQLAlchemy, SQLite

**Features:**
- REST API for users, tracks, playlists
- Audio streaming from local filesystem
- Append-only event logging
- Database schema designed for future ML

[Backend Documentation](backend/README.md)

---

### ✅ Phase 2: Frontend (Complete)
Simple React UI that consumes backend APIs and logs user interactions.

**Technology:** React, Vite, Axios, Recharts

**Features:**
- Music player with audio controls
- User selection (no authentication)
- Playlist display
- Listening summary dashboard
- Complete event logging

[Frontend Documentation](frontend/README.md)

---

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+

### 1. Start Backend
```bash
cd /home/fate/prj/soniqB
python3 -m venv venv
./venv/bin/pip install -r backend/requirements.txt
./venv/bin/python seed_data.py  # Optional: seed sample data
./venv/bin/uvicorn backend.main:app --reload
```
Backend runs on: `http://localhost:8000`

### 2. Start Frontend
```bash
cd /home/fate/prj/soniqB/frontend
npm install
npm run dev
```
Frontend runs on: `http://localhost:5173`

### 3. Access Application
Open browser to: `http://localhost:5173`

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

---

## Project Structure

```
soniqB/
├── backend/              # Phase 1: FastAPI backend
│   ├── main.py          # FastAPI application
│   ├── db.py            # Database configuration
│   ├── models.py        # SQLAlchemy ORM models
│   ├── schemas.py       # Pydantic schemas
│   ├── routes/          # API endpoints
│   │   ├── users.py
│   │   ├── tracks.py
│   │   ├── events.py
│   │   └── playlists.py
│   └── storage/audio/   # Local audio files
│
├── frontend/            # Phase 2: React frontend
│   ├── src/
│   │   ├── App.jsx      # Main application
│   │   ├── components/  # React components
│   │   │   ├── UserSelector.jsx
│   │   │   ├── PlayerView.jsx
│   │   │   ├── PlaylistView.jsx
│   │   │   └── ListeningSummary.jsx
│   │   └── api/
│   │       └── musicApi.js  # Backend API service
│   └── package.json
│
├── soniq.db             # SQLite database
├── seed_data.py         # Database seeding script
├── README.md            # This file
└── QUICKSTART.md        # Quick start guide
```

---

## Database Schema

### Tables

- **User**: id, username, created_at
- **Track**: id, title, artist, audio_path, predicted_genre (nullable)
- **ListeningEvent**: id, user_id, track_id, event_type, listened_duration, timestamp
- **Playlist**: id, user_id, type (manual/auto), created_at
- **PlaylistTrack**: playlist_id, track_id, position

---

## API Endpoints

### Users
- `GET /users` - List all users
- `POST /users` - Create a new user
- `GET /users/{id}` - Get user by ID

### Tracks
- `GET /tracks` - List all tracks
- `GET /tracks/{id}` - Get track by ID
- `GET /audio/{track_id}` - Stream audio file

### Events
- `GET /events?user_id={id}` - Get user's listening events
- `POST /events` - Log listening event (play, pause, skip, like)

### Playlists
- `GET /playlists/{user_id}` - Get user's playlists
- `POST /playlists/manual` - Create manual playlist

**API Documentation:** `http://localhost:8000/docs` (Swagger UI)

---

## Event Logging

Every user interaction is logged to the database:

| Action | Event Type | Data Logged |
|--------|-----------|-------------|
| Play | `play` | user_id, track_id, listened_duration |
| Pause | `pause` | user_id, track_id, listened_duration |
| Skip | `skip` | user_id, track_id, listened_duration |
| Like | `like` | user_id, track_id, listened_duration: 0 |

**Critical Rule:** Events are append-only. If an interaction is not logged, it does not exist.

---

## Frontend Features

### 1. User Selection
- Dropdown to select user profile
- No authentication (educational project)

### 2. Music Player
- HTML5 audio playback
- Play/pause/skip controls
- Like button
- Track metadata display
- **Automatic event logging**

### 3. Playlists
- View user playlists
- Manual playlists supported
- Auto-playlist placeholder

### 4. Listening Summary Dashboard
- Total plays count
- Average listening duration
- Like/skip counts
- Genre distribution chart

---

## Technology Stack

### Backend
- **Python** - Language
- **FastAPI** - Web framework
- **SQLAlchemy** - ORM
- **SQLite** - Database
- **Pydantic** - Data validation

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **Axios** - HTTP client
- **Recharts** - Charting library

---

## Key Design Decisions

### 1. Separation of Concerns
- Backend handles data and business logic
- Frontend handles UI and user interactions
- Clear API contract between layers

### 2. Append-Only Event Logging
Events are **never modified or deleted** - only appended. This preserves complete user interaction history for future ML analysis.

### 3. Filesystem Audio Storage
Audio files stored locally with only paths in database. This keeps the database lightweight and allows efficient streaming.

### 4. No ML Logic (Phases 1 & 2)
- `predicted_genre` field exists but remains `null`
- No clustering, recommendations, or inference
- Data collection only - analysis reserved for future phases

### 5. Educational Focus
- Clear code structure
- Explicit event logging
- Explanatory UI labels
- Academic defensibility

---

## Explicit Prohibitions (Phases 1 & 2)

The following are **NOT implemented** and reserved for future phases:

❌ ML-based recommendations  
❌ Genre prediction/clustering  
❌ Auto-playlist generation  
❌ User authentication  
❌ Caching layers  
❌ Background task queues  
❌ WebSocket connections  
❌ Real-time personalization  

---

## Future Phases (Not Implemented)

### Phase 3: ML Integration (Planned)
- Genre prediction using clustering
- Track similarity analysis
- User preference modeling

### Phase 4: Recommendations (Planned)
- Collaborative filtering
- Content-based recommendations
- Auto-playlist generation

### Phase 5: Advanced Features (Planned)
- Real-time personalization
- A/B testing framework
- Explainable AI dashboard

---

## Evaluation Criteria

### Phase 1 (Backend)
✅ Schema correctness  
✅ Separation of concerns  
✅ Explicit event logging  
✅ Code readability  
✅ Academic defensibility  

### Phase 2 (Frontend)
✅ Correct API usage  
✅ Complete event logging  
✅ Clean component separation  
✅ AIML explainability  
✅ Scope discipline  

---

## Development

### Backend Development
```bash
cd backend
# Make changes to routes, models, etc.
# Server auto-reloads with --reload flag
```

### Frontend Development
```bash
cd frontend
npm run dev
# Vite provides hot module replacement
```

### Database Management
```bash
# Seed database
./venv/bin/python seed_data.py

# Reset database (delete soniq.db and restart backend)
rm soniq.db
./venv/bin/uvicorn backend.main:app --reload
```

---

## Troubleshooting

### Backend Issues
- **Port 8000 in use:** Change port with `--port 8001`
- **Database errors:** Delete `soniq.db` and restart
- **Import errors:** Ensure virtual environment is activated

### Frontend Issues
- **CORS errors:** Backend has CORS enabled, check both servers are running
- **API connection failed:** Verify backend is running on port 8000
- **No audio playing:** Add .mp3 files to `backend/storage/audio/`

---

## Educational Purpose

This project demonstrates:

1. **Full-stack development** - Backend + Frontend integration
2. **RESTful API design** - Clean, documented endpoints
3. **Event-driven architecture** - Explicit user interaction logging
4. **ML-ready data collection** - Schema designed for future ML phases
5. **Scope discipline** - Clear phase boundaries, no premature optimization

---

## License

Educational project for college AIML lab. Not for production use.

---

## Acknowledgments

Built as a college AIML lab project to demonstrate:
- Clean backend architecture
- Explicit event logging
- ML-aligned data collection
- Educational best practices

**Current Status:** Phases 1 & 2 Complete  
**ML Implementation:** Reserved for Future Phases
