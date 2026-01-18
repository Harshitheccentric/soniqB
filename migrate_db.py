#!/usr/bin/env python3
"""
Database migration script for adding authentication.
Adds password_hash column to users table and makes username unique.

IMPORTANT: This will reset the database. Existing users will be deleted.
For production, you would want a proper migration tool like Alembic.
"""
import os
import sys

# Ensure backend module can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from backend.db import Base, SQLALCHEMY_DATABASE_URL
from backend.models import User, Track, ListeningEvent, Playlist, PlaylistTrack

def migrate():
    """Recreate database with new schema."""
    print("🔄 Starting database migration...")
    
    # Remove old database file
    db_file = "soniq.db"
    if os.path.exists(db_file):
        print(f"📦 Removing old database: {db_file}")
        os.remove(db_file)
    
    # Create new database with updated schema
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    print("🏗️  Creating tables with new schema...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ Database migration complete!")
    print("\n📝 Next steps:")
    print("   1. Run seed_data.py to populate with sample data (optional)")
    print("   2. Start the backend server")
    print("   3. Register new users via the frontend\n")

if __name__ == "__main__":
    migrate()
