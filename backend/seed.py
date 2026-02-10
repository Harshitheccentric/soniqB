# Ensure backend module can be imported
try:
    from backend.db import seed_database, init_db
except ImportError:
    from .db import seed_database, init_db


def main():
    print("Running Enhanced SoniqB Database Seeder...")
    init_db()
    seed_database()


if __name__ == "__main__":
    main()
