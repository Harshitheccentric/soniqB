# Quick Start Guide - Phase 2

## Running the Complete Application

### Prerequisites
- Python 3.8+ with virtual environment
- Node.js 16+
- Backend already set up from Phase 1

### Step 1: Start Backend Server

```bash
cd /home/fate/prj/soniqB
./venv/bin/uvicorn backend.main:app --reload
```

Backend runs on: `http://localhost:8000`

### Step 2: Start Frontend Server

```bash
cd /home/fate/prj/soniqB/frontend
npm run dev
```

Frontend runs on: `http://localhost:5173`

### Step 3: Access the Application

Open your browser to: `http://localhost:5173`

---

## Using the Application

### 1. Select a User
- Choose a user from the dropdown (alice, bob, or charlie)
- Click "Start Listening"

### 2. Play Music
- Click the **Play** button to start audio
- Use the seek bar to navigate
- Click **Pause** to pause playback
- Click **Like** to mark track as liked
- Click **Skip** to go to next track

**All interactions are automatically logged to the backend!**

### 3. View Playlists
- Click the **Playlists** tab
- See your manual playlists
- Auto-playlist section shows placeholder

### 4. View Listening Summary
- Click the **Summary** tab
- See statistics:
  - Total plays
  - Average listening duration
  - Like count
  - Skip count
- View genre distribution chart

---

## Verifying Event Logging

### Check Console Logs
Open browser DevTools (F12) and watch for:
```
✓ Play event logged
✓ Pause event logged
✓ Skip event logged
✓ Like event logged
```

### Check Backend Logs
In the backend terminal, you'll see:
```
INFO: 127.0.0.1:xxxxx - "POST /events HTTP/1.1" 201 Created
```

### Query Database
```bash
cd /home/fate/prj/soniqB
./venv/bin/python -c "
from backend.db import SessionLocal
from backend.models import ListeningEvent
db = SessionLocal()
events = db.query(ListeningEvent).all()
for e in events:
    print(f'{e.event_type}: user={e.user_id}, track={e.track_id}, duration={e.listened_duration}')
"
```

---

## Testing API Endpoints

### Get All Users
```bash
curl http://localhost:8000/users
```

### Get User Events
```bash
curl "http://localhost:8000/events?user_id=2"
```

### Get Tracks
```bash
curl http://localhost:8000/tracks
```

### Get User Playlists
```bash
curl http://localhost:8000/playlists/2
```

---

## Project Structure

```
soniqB/
├── backend/              # Phase 1: FastAPI backend
│   ├── main.py
│   ├── models.py
│   ├── routes/
│   └── storage/audio/
├── frontend/             # Phase 2: React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   └── api/
│   └── package.json
├── soniq.db             # SQLite database
└── README.md
```

---

## Important Notes

### Phase 2 Frontend
✅ React UI with 4 screens
✅ Complete event logging
✅ Backend API consumption
✅ Listening dashboard
❌ **No ML logic**

### What Gets Logged
Every interaction creates a database entry:
- Play → `event_type: "play"`
- Pause → `event_type: "pause"`
- Skip → `event_type: "skip"`
- Like → `event_type: "like"`

### Educational Purpose
This is an AIML lab project. The frontend:
- Logs data explicitly for future ML analysis
- Does NOT perform ML inference
- Does NOT make recommendations
- Does NOT cluster or rank tracks

---

## Troubleshooting

### Backend not starting?
```bash
# Make sure you're in the virtual environment
cd /home/fate/prj/soniqB
./venv/bin/uvicorn backend.main:app --reload
```

### Frontend not loading?
```bash
# Check if dependencies are installed
cd frontend
npm install
npm run dev
```

### CORS errors?
The backend already has CORS enabled for all origins. If you still see errors, check that both servers are running.

### No audio playing?
Audio files need to exist in `backend/storage/audio/`. The current implementation references sample files that may not exist. You can:
1. Add your own .mp3 files to that directory
2. Update track records in the database to point to real files

---

## Next Steps

After verifying the application works:

1. **Test all features** - User selection, player, playlists, dashboard
2. **Verify event logging** - Check database for logged events
3. **Review code** - Understand component structure
4. **Prepare for demo** - Practice explaining the data flow

This completes Phase 2 of the AIML lab project!
