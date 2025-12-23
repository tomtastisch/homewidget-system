#!/usr/bin/env python3
import re
import sys
import os
import shutil
import hashlib
from datetime import datetime

def generate_new_id(old_id, salt):
    """Generiert eine neue 24-stellige Hex-ID basierend auf der alten und einem Salt."""
    hash_object = hashlib.sha1((old_id + salt).encode())
    return hash_object.hexdigest()[:24].upper()

def fix_pbxproj(file_path):
    print(f"Repariere {file_path}...")
    
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    # Backup erstellen
    backup_path = f"{file_path}.bak.{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    print(f"Backup erstellt unter: {backup_path}")
    
    # 1. Alle Definitionen finden
    # Muster: ID /* Name */ = {
    def_pattern = re.compile(r'^\s*([0-9A-F]{24}) /\* (.*?) \*/ = \{')
    
    definitions = {} # ID -> list of (line_index, name)
    for i, line in enumerate(lines):
        match = def_pattern.match(line.strip())
        if match:
            obj_id = match.group(1)
            name = match.group(2)
            if obj_id not in definitions:
                definitions[obj_id] = []
            definitions[obj_id].append((i, name))
    
    # 2. Duplikate identifizieren und Reparaturplan erstellen
    fixes = [] # list of (line_index, old_id, new_id, name)
    
    for obj_id, occurrences in definitions.items():
        if len(occurrences) > 1:
            print(f"ID {obj_id} ist {len(occurrences)} mal definiert.")
            # Die erste lassen wir, die anderen ändern wir
            for i in range(1, len(occurrences)):
                line_idx, name = occurrences[i]
                new_id = generate_new_id(obj_id, name + str(i))
                fixes.append((line_idx, obj_id, new_id, name))
                print(f"  -> Ändere Definition in Zeile {line_idx+1} ({name}) zu {new_id}")
    
    if not fixes:
        print("Keine Korruption gefunden, die repariert werden muss.")
        return True

    # 3. Änderungen anwenden
    # Wir müssen sowohl die Definition als auch ALLE Referenzen ändern.
    # Eine Referenz sieht meist so aus: ID /* Name */
    
    new_content = "".join(lines)
    for line_idx, old_id, new_id, name in fixes:
        # Ersetze die Definition spezifisch in dieser Zeile (um andere nicht zu korrumpieren)
        # Da wir aber den ganzen Content als String haben und die Zeilen-Indizes sich ändern könnten 
        # wenn wir naiv ersetzen, arbeiten wir lieber zeilenweise oder mit sehr spezifischen Regex.
        
        # Sicherer Weg: Ersetze nur, wenn ID UND Name übereinstimmen.
        # Aber Achtung: Es könnte mehrere Referenzen auf das gleiche (jetzt neue) Objekt geben.
        
        pattern = re.compile(re.escape(old_id) + r' /\* ' + re.escape(name) + r' \*/')
        new_content = pattern.sub(new_id, new_content)
    
    with open(file_path, 'w') as f:
        f.write(new_content)
    
    print(f"Reparatur abgeschlossen. {len(fixes)} IDs ersetzt.")
    
    # Verifikation
    return verify_no_dupes(file_path)

def verify_no_dupes(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    ids = re.findall(r'([0-9A-F]{24})', content)
    from collections import Counter
    counts = Counter(ids)
    
    def_pattern = re.compile(r'([0-9A-F]{24}) /\*.*?\*/ = \{')
    definitions = def_pattern.findall(content)
    def_counts = Counter(definitions)
    
    duplicates = [id for id, count in def_counts.items() if count > 1]
    if duplicates:
        print(f"FEHLER: Immer noch {len(duplicates)} doppelte Definitionen vorhanden!")
        return False
    else:
        print("Verifikation erfolgreich: Keine doppelten Definitionen mehr.")
        return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Verwendung: python ios_fix_pbxproj.py <pfad_zu_pbxproj>")
        sys.exit(1)
    
    success = fix_pbxproj(sys.argv[1])
    if not success:
        sys.exit(1)
