import re
from collections import Counter
import os

def find_duplicate_ids(file_path):
    if not os.path.exists(file_path):
        print(f"Datei nicht gefunden: {file_path}")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # IDs sind 24-stellige Hex-Werte. Wir suchen sie am Zeilenanfang im "objects" Bereich.
    # Normalerweise: <TAB><TAB>ID /* ... */ = { ... };
    ids = re.findall(r"^\t\t([0-9A-F]{24})", content, re.MULTILINE)
    counts = Counter(ids)
    
    duplicates = {id_val: count for id_val, count in counts.items() if count > 1}
    
    if not duplicates:
        print("Keine doppelten IDs gefunden.")
    else:
        # Bereits eingelesenen Dateiinhalt verwenden, um ein zweites Öffnen der Datei zu vermeiden.
        lines = content.splitlines()
        for id_val, count in duplicates.items():
            print(f"Doppelte ID: {id_val} (Vorkommen: {count})")
            for i, line in enumerate(lines):
                if line.strip().startswith(id_val):
                    print(f"  Zeile {i+1}: {line.strip()}")

if __name__ == "__main__":
    find_duplicate_ids("ios/HomeWidgetDemoFeed/HomeWidgetDemoFeed.xcodeproj/project.pbxproj")
