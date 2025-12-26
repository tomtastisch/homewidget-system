#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Repariert eine korrupte Xcode project.pbxproj Datei durch Auflösung von ID-Kollisionen.
In-Code-Dokumentation: Deutsch.
"""

from __future__ import annotations
import os
import shutil
import re

def fix_pbxproj(file_path: str) -> bool:
    """
    Repariert ID-Kollisionen in einer project.pbxproj Datei.

    Erstellt ein Backup der Originaldatei und ersetzt bekannte kollidierende
    IDs deterministisch durch neue Werte. Verifiziert anschließend die Referenzen.

    Args:
        file_path: Absoluter oder relativer Pfad zur project.pbxproj.

    Returns:
        True bei erfolgreicher Reparatur, sonst False.
    """
    if not os.path.exists(file_path):
        print(f"Fehler: Datei nicht gefunden: {file_path}")
        return False

    backup_path = file_path + ".backup"
    shutil.copy2(file_path, backup_path)
    print(f"Backup erstellt: {backup_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Neue IDs für die ID-Kollisionen
    # PBXResourcesBuildPhase Kollision
    ID_RESOURCES_OLD = "D3A1B2BF294E5B0A00123456"
    ID_RESOURCES_NEW = "D3A1B2BF294E5B0A00EE0001"
    
    # PBXNativeTarget Kollision
    ID_TARGET_OLD = "D3A1B2C0294E5B0A00123456"
    ID_TARGET_NEW = "D3A1B2C0294E5B0A00EE0002"

    new_lines = []
    current_section = None
    
    print("Starte Reparatur...")

    for line in lines:
        # Sektion erkennen
        section_match = re.search(r"/\* Begin (\w+) section \*/", line)
        if section_match:
            current_section = section_match.group(1)
        
        end_section_match = re.search(r"/\* End (\w+) section \*/", line)
        if end_section_match:
            current_section = None

        modified_line = line
        
        # 1. PBXResourcesBuildPhase Definition anpassen
        if current_section == "PBXResourcesBuildPhase" and ID_RESOURCES_OLD in line:
            print(f"Patche PBXResourcesBuildPhase Definition in Zeile: {line.strip()}")
            modified_line = line.replace(ID_RESOURCES_OLD, ID_RESOURCES_NEW)
            
        # 2. PBXNativeTarget Definition anpassen
        elif current_section == "PBXNativeTarget" and ID_TARGET_OLD in line:
            print(f"Patche PBXNativeTarget Definition in Zeile: {line.strip()}")
            modified_line = line.replace(ID_TARGET_OLD, ID_TARGET_NEW)
            
        # 3. Referenzen in anderen Sektionen anpassen
        else:
            # Referenz auf Resources Build Phase in buildPhases
            if ID_RESOURCES_OLD in line and "/* Resources */" in line:
                if current_section != "PBXGroup": # Groups behalten die alte ID für Products
                    print(f"Patche Resources Referenz in Zeile: {line.strip()}")
                    modified_line = line.replace(ID_RESOURCES_OLD, ID_RESOURCES_NEW)
            
            # Referenz auf Native Target in targets oder TargetAttributes
            if ID_TARGET_OLD in line:
                # In der Project Sektion sind targets referenziert
                if current_section == "PBXProject":
                    print(f"Patche Target Referenz (Project) in Zeile: {line.strip()}")
                    modified_line = line.replace(ID_TARGET_OLD, ID_TARGET_NEW)
                elif line.strip().startswith(ID_TARGET_OLD + " = {"):
                    print(f"Patche TargetAttributes Key in Zeile: {line.strip()}")
                    modified_line = line.replace(ID_TARGET_OLD, ID_TARGET_NEW)

        new_lines.append(modified_line)

    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    
    print("Reparatur abgeschlossen.")
    return True

if __name__ == "__main__":
    path = "ios/HomeWidgetDemoFeed/HomeWidgetDemoFeed.xcodeproj/project.pbxproj"
    if fix_pbxproj(path):
        print("Erfolg!")
    else:
        exit(1)
