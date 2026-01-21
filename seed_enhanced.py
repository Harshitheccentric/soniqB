import sys
import os

# Ensure backend module can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.db import seed_database, init_db

if __name__ == "__main__":
    print("Running Enhanced SoniqB Database Seeder...")
    init_db()
    seed_database()
