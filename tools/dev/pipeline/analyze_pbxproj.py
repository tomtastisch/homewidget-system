from __future__ import annotations

import re
import sys
from collections import Counter
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

def find_duplicate_ids(file_path: str) -> None:
    """
    Analysiert eine project.pbxproj Datei auf doppelte Object-IDs.
    
    Args:
        file_path: Pfad zur project.pbxproj Datei
    """
    path = Path(file_path)
    if not path.exists():
        logger.error(f"Datei nicht gefunden: {file_path}")
        return

    with path.open("r", encoding="utf-8") as f:
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
                    # enumerate() zählt ab 0, aber Zeilennummern in Editoren starten bei 1
                    line_number = i + 1
                    logger.warning(f"  Zeile {line_number}: {line.strip()}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Analysiert eine Xcode project.pbxproj Datei auf doppelte Object-IDs"
    )
    parser.add_argument(
        "file_path",
        nargs="?",
        default="ios/HomeWidgetDemoFeed/HomeWidgetDemoFeed.xcodeproj/project.pbxproj",
        help="Pfad zur project.pbxproj Datei (Standard: ios/HomeWidgetDemoFeed/HomeWidgetDemoFeed.xcodeproj/project.pbxproj)"
    )
    
    args = parser.parse_args()
    find_duplicate_ids(args.file_path)
