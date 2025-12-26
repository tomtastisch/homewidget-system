# iOS HomeWidget Demo Feed

Dieses Verzeichnis enthält das iOS-Modul für das HomeWidget-System.

## CI & Pipeline

Die iOS-Pipeline ist in `tools/dev/pipeline/ci_steps.sh` implementiert und wird über die GitHub Actions CI gesteuert.

### Lokale Sanity-Prüfung

Um das Xcode-Projekt auf Korruption zu prüfen (z. B. doppelte Objekt-IDs), kann folgender Befehl verwendet werden:

```bash
bash tools/dev/pipeline/ci_steps.sh ios_project_sanity
```

*Erfordert installierte Xcode Command Line Tools.*

### Build

Der Build kann lokal (auf macOS) wie folgt angestoßen werden:

```bash
bash tools/dev/pipeline/ci_steps.sh ios_build
```

### Tests

Die Tests (Skeleton) können wie folgt aufgelistet werden:

```bash
bash tools/dev/pipeline/ci_steps.sh ios_tests
```

## Reparatur von Projekt-Korruption

Falls die CI den Fehler "Xcode project file damaged" meldet, kann das Reparatur-Skript verwendet werden:

```bash
python3 tools/dev/pipeline/ios_fix_pbxproj.py
```

Das Skript löst bekannte ID-Kollisionen deterministisch auf.
