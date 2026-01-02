"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db import init_db
from backend.routes import users, tracks, events, playlists

# Create FastAPI app
app = FastAPI(
    title="SoniqB Music Player Backend",
    description="Phase 1: Clean backend for music player with event logging (No ML)",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Initialize database on startup."""
    init_db()


# Register routers
app.include_router(users.router)
app.include_router(tracks.router)
app.include_router(events.router)
app.include_router(playlists.router)


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "SoniqB Music Player Backend - Phase 1",
        "note": "ML is not implemented in Phase 1",
        "docs": "/docs"
    }
