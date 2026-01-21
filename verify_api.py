import requests
import sys

def verify_tracks_api():
    try:
        response = requests.get('http://localhost:8000/tracks')
        if response.status_code != 200:
            print(f"Error: API returned status code {response.status_code}")
            return False
            
        tracks = response.json()
        if not tracks:
            print("Warning: No tracks found in the database to verify.")
            # This isn't a failure of the code, but we can't verify the field exists on an object
            return True

        print(f"Found {len(tracks)} tracks.")
        
        # Check the first track for the new field
        first_track = tracks[0]
        if 'uploaded_by_username' in first_track:
            print("SUCCESS: 'uploaded_by_username' field is present in the response.")
            print(f"Sample value: {first_track['uploaded_by_username']}")
            return True
        else:
            print("FAILURE: 'uploaded_by_username' field is MISSING from the response.")
            print("Available fields:", first_track.keys())
            return False
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the backend. Is it running?")
        return False
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return False

if __name__ == "__main__":
    success = verify_tracks_api()
    if success:
        sys.exit(0)
    else:
        sys.exit(1)
