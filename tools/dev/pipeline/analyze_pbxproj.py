from __future__ import annotations

import re
from collections import Counter
import os
import sys
from pathlib import Path

# Ermöglicht sowohl Modul- als auch Skript-Ausführung
# Bei direkter Ausführung: Repo-Root zum Path hinzufügen
try:
    from tools.core.logging_setup import get_logger
except ModuleNotFoundError:
    repo_root = Path(__file__).parent.parent.parent.parent
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    from tools.core.logging_setup import get_logger

# Modul-spezifischer Logger für bessere Log-Kategorisierung
logger = get_logger(__name__)

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
