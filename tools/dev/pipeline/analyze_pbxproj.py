from __future__ import annotations

import re
from collections import Counter
import os
import sys

# Ermöglicht sowohl Modul- als auch Script-Ausführung
if __name__ == "__main__":
    # Bei direkter Ausführung: tools-Root zum Path hinzufügen
    script_dir = os.path.dirname(os.path.abspath(__file__))
    tools_root = os.path.abspath(os.path.join(script_dir, "..", "..", ".."))
    if tools_root not in sys.path:
        sys.path.insert(0, tools_root)

from tools.core.logging_setup import logger

def find_duplicate_ids(file_path):
    if not os.path.exists(file_path):
        logger.error(f"Datei nicht gefunden: {file_path}")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # IDs sind 24-stellige Hex-Werte. Wir suchen sie am Zeilenanfang im "objects" Bereich.
    # Normalerweise: <TAB><TAB>ID /* ... */ = { ... };
    ids = re.findall(r"^\t\t([0-9A-F]{24})", content, re.MULTILINE)
    counts = Counter(ids)
    
    duplicates = {id_val: count for id_val, count in counts.items() if count > 1}
    
    if not duplicates:
        logger.info("Keine doppelten IDs gefunden.")
    else:
        # Bereits eingelesenen Dateiinhalt verwenden, um ein zweites Öffnen der Datei zu vermeiden.
        lines = content.splitlines()
        for id_val, count in duplicates.items():
            logger.warning(f"Doppelte ID: {id_val} (Vorkommen: {count})")
            for i, line in enumerate(lines):
                if line.strip().startswith(id_val):
                    logger.warning(f"  Zeile {i+1}: {line.strip()}")

if __name__ == "__main__":
    find_duplicate_ids("ios/HomeWidgetDemoFeed/HomeWidgetDemoFeed.xcodeproj/project.pbxproj")
