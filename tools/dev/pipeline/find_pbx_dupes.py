import re
import sys
from collections import Counter

def find_duplicates(file_path):
    print(f"Analysiere {file_path}...")
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Xcode IDs sind 24-stellige Hex-Codes
    # Sie erscheinen oft am Anfang einer Zeile: \t\tID /* ... */ = {
    # Oder als Referenz in children: \t\t\t\tID /* ... */,
    
    # Wir suchen nach allen 24-stelligen Hex-Codes
    ids = re.findall(r'([0-9A-F]{24})', content)
    
    counts = Counter(ids)
    duplicates = {id: count for id, count in counts.items() if count > 1}
    
    if not duplicates:
        print("Keine Duplikate gefunden.")
        return
    
    print(f"{len(duplicates)} doppelte IDs gefunden:")
    for id, count in duplicates.items():
        # Wir wollen wissen, wo diese IDs als Definition vorkommen
        # Eine Definition sieht meist so aus: ID /* ... */ = {
        definitions = re.findall(r'(' + id + r' /\*.*?\*/ = \{)', content)
        if len(definitions) > 1:
            print(f"ID {id} ist {len(definitions)} mal definiert!")
            for def_line in definitions:
                print(f"  Gefunden: {def_line}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Verwendung: python find_pbx_dupes.py <pfad_zu_pbxproj>")
        sys.exit(1)
    find_duplicates(sys.argv[1])
