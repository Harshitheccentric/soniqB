import os
import shutil

STORAGE_ROOT = "backend/storage/tracks"
GENRES = [
    "Electronic", "Experimental", "Folk", "Hip-Hop", 
    "Instrumental", "International", "Pop", "Rock"
]

def consolidate_genres():
    if not os.path.exists(STORAGE_ROOT):
        print(f"Storage root {STORAGE_ROOT} does not exist.")
        return

    for genre in GENRES:
        cap_path = os.path.join(STORAGE_ROOT, genre)
        lower_path = os.path.join(STORAGE_ROOT, genre.lower())

        # Ensure lowercase path exists
        if not os.path.exists(lower_path):
            os.makedirs(lower_path)
            print(f"Created {lower_path}")

        # Move files from capitalized to lowercase
        if os.path.exists(cap_path):
            print(f"Processing {genre}...")
            for filename in os.listdir(cap_path):
                src = os.path.join(cap_path, filename)
                dst = os.path.join(lower_path, filename)
                
                if os.path.isfile(src):
                    # Handle duplicate filenames
                    if os.path.exists(dst):
                        base, ext = os.path.splitext(filename)
                        dst = os.path.join(lower_path, f"{base}_dupe{ext}")
                    
                    shutil.move(src, dst)
                    print(f"  Moved {filename} -> {lower_path}")
            
            # Remove capitalized directory if empty
            try:
                os.rmdir(cap_path)
                print(f"  Removed {cap_path}")
            except OSError:
                print(f"  Could not remove {cap_path} (not empty?)")

if __name__ == "__main__":
    consolidate_genres()
