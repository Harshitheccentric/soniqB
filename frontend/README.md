# SoniqB Music Player - Phase 2 Frontend

**Educational AIML Lab Project**

React frontend for the music player backend, designed to support future machine-learning–based personalization.

⚠️ **Note: ML is not implemented in Phase 2 frontend.**

## Technology Stack

- **React** - UI library
- **Vite** - Build tool and dev server
- **Axios** - HTTP client for API calls
- **Recharts** - Simple charting library

## Project Structure

```
frontend/
├── src/
│   ├── App.jsx                 # Main application
│   ├── main.jsx                # Entry point
│   ├── App.css                 # Styles
│   ├── api/
│   │   └── musicApi.js         # Backend API service
│   └── components/
│       ├── UserSelector.jsx    # User selection screen
│       ├── PlayerView.jsx      # Music player
│       ├── PlaylistView.jsx    # Playlist display
│       └── ListeningSummary.jsx # Dashboard
├── index.html
├── package.json
└── vite.config.js
```

## Features

### 1. User Selection
- Simple dropdown to select user profile
- No authentication (educational project)

### 2. Music Player
- HTML5 audio playback
- Play/pause/skip controls
- Like button
- Track metadata display
- **Complete event logging** for all interactions

### 3. Playlists
- View user playlists
- Manual playlists supported
- Auto-playlist placeholder for future phases

### 4. Listening Summary Dashboard
- Total plays count
- Average listening duration
- Like/skip counts
- Genre distribution chart

## Event Logging

Every user interaction is logged to the backend:

| Action | Event Type | Logged Data |
|--------|-----------|-------------|
| Play | `play` | user_id, track_id, listened_duration |
| Pause | `pause` | user_id, track_id, listened_duration |
| Skip | `skip` | user_id, track_id, listened_duration |
| Like | `like` | user_id, track_id, listened_duration: 0 |

**Critical:** If an interaction is not logged, it does not exist.

## Installation & Setup

### Prerequisites
- Node.js 16+
- Backend server running on port 8000

### Install Dependencies
```bash
cd frontend
npm install
```

### Start Development Server
```bash
npm run dev
```

Frontend will run on: `http://localhost:5173`

## Usage

1. **Start Backend**
   ```bash
   cd /home/fate/prj/soniqB
   ./venv/bin/uvicorn backend.main:app --reload
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open Browser**
   Navigate to `http://localhost:5173`

4. **Select User**
   Choose a user from the dropdown

5. **Play Music**
   - Click play to start audio
   - Use controls to interact
   - All actions are logged automatically

6. **View Dashboard**
   Click "Summary" to see listening statistics

## API Integration

All backend calls are centralized in `src/api/musicApi.js`:

```javascript
// User APIs
getUsers()           // GET /users
getUser(id)          // GET /users/{id}

// Track APIs
getTracks()          // GET /tracks
getTrack(id)         // GET /tracks/{id}
getAudioUrl(id)      // GET /audio/{id}

// Event APIs
logEvent(data)       // POST /events
getEvents(userId)    // GET /events?user_id={id}

// Playlist APIs
getPlaylists(userId) // GET /playlists/{user_id}
```

## Important Notes

### What This Frontend Does
✅ Consumes backend REST APIs
✅ Plays audio using HTML5
✅ Logs all user interactions
✅ Displays listening statistics
✅ Shows playlists

### What This Frontend Does NOT Do
❌ ML recommendations
❌ Genre prediction
❌ Track clustering
❌ Local event storage
❌ Real-time personalization
❌ Complex state management

## Educational Purpose

This frontend is designed for an AIML lab project. Key educational aspects:

1. **Explicit Event Logging**: Every interaction is logged for future ML analysis
2. **Clear Data Flow**: Backend → Frontend (no local inference)
3. **Explainability**: UI labels explain what data is collected and why
4. **Scope Discipline**: No ML logic in frontend (reserved for future phases)

## Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Phase 2 Scope

This is Phase 2 of the project, focusing ONLY on the frontend:
- ✅ React UI implementation
- ✅ Backend API consumption
- ✅ Event logging integration
- ✅ Dashboard visualization

Future phases will add:
- ML-based recommendations
- Auto-playlist generation
- Genre prediction
- Personalized ranking
