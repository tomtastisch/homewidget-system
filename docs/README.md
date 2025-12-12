# Projekt-Dokumentation

**Zentrale Dokumentation für das homewidget-system Projekt**

---

## Struktur

```
docs/
├── README.md              # Dieser Index
├── auth.md                # Authentifizierung & Autorisierung
├── ci-cd.md               # CI/CD-Pipeline
├── dev/                   # Entwickler-Dokumentation
└── e2e/                   # E2E-Testing-Dokumentation
    ├── README.md                      # E2E-Übersicht
    ├── playwright-testing-guide.md    # Test-Entwickler-Guide
    ├── ci-quarantine-management.md    # CI-Quarantäne-Management
    └── ui-release-guide.md            # UI-Release-Prozess
```

---

## Dokumentations-Übersicht

### Authentifizierung & Autorisierung
**Datei:** [auth.md](auth.md)  
**Zielgruppe:** Backend-Entwickler  
**Inhalt:** JWT-Token-Handling, Rollen, Sessions

### CI/CD-Pipeline
**Datei:** [ci-cd.md](ci-cd.md)  
**Zielgruppe:** DevOps, CI/CD-Team  
**Inhalt:** GitHub Actions Workflows, Pipeline-Struktur

### Entwickler-Dokumentation
**Verzeichnis:** [dev/](dev/)  
**Zielgruppe:** Alle Entwickler  
**Inhalt:** Setup, Entwicklungs-Workflows, Best Practices

### E2E-Testing (Playwright)
**Verzeichnis:** [e2e/](e2e/)  
**Zielgruppe:** Test-Entwickler, Frontend-Team, CI/CD-Team

**Dokumente:**
- **[README.md](e2e/README.md)** - E2E-Übersicht & Schnellstart
- **[playwright-testing-guide.md](e2e/playwright-testing-guide.md)** - Test-Entwicklung
- **[ci-quarantine-management.md](e2e/ci-quarantine-management.md)** - Quarantäne-Management
- **[ui-release-guide.md](e2e/ui-release-guide.md)** - UI-Release-Prozess

---

## Schnellzugriff für häufige Aufgaben

### Neue E2E-Tests schreiben
```bash
# Lese Guide:
cat docs/e2e/playwright-testing-guide.md

# Tests ausführen:
cd tests/e2e/browseri/playwright
npm test
```

### CI-Pipeline debuggen
```bash
# Lese CI-Dokumentation:
cat docs/ci-cd.md

# Pipeline lokal simulieren:
bash tools/dev/pipeline/ci_steps.sh backend_quality
```

### Quarantänisierte Tests verwalten
```bash
# Lese Quarantäne-Guide:
cat docs/e2e/ci-quarantine-management.md

# Reports generieren:
bash tools/dev/pipeline/quarantine_report.sh
bash tools/dev/pipeline/todo_report.sh
```

### UI-Release durchführen (nach Ticket C)
```bash
# Lese UI-Release-Guide:
cat docs/e2e/ui-release-guide.md

# Mapping generieren:
bash tools/dev/pipeline/ui_release_todo_mapping.sh
```

---

## Dokumentations-Prinzipien

### Sprache
- **Kommentare/Docstrings:** Deutsch
- **Code/APIs:** Englisch
- **Dokumentation:** Deutsch
- **Ausnahme:** Externe APIs/Spezifikationen (Englisch)

### Struktur
- **Ein Dokument pro Thema/Zuständigkeit**
- **Keine Duplikate** - Verweis auf zentrale Dokumentation
- **Versionierung** - Letzte Aktualisierung dokumentieren
- **Zielgruppe klar benennen**

### Wartung
- Dokumentation parallel zu Code-Änderungen aktualisieren
- Veraltete Dokumente markieren oder entfernen
- Links überprüfen (interne Verweise)

---

## Beiträge

### Neue Dokumentation hinzufügen
1. Prüfe ob Thema bereits dokumentiert ist
2. Wähle passendes Verzeichnis (e2e/, dev/, etc.)
3. Klare Zielgruppe definieren
4. Inhaltsverzeichnis in diesem README aktualisieren
5. Verweise aus alten Dokumenten hinzufügen

### Bestehende Dokumentation aktualisieren
1. Datum "Letzte Aktualisierung" setzen
2. Changelog-Sektion ergänzen (bei größeren Änderungen)
3. Interne Links überprüfen
4. Review durch relevante Zielgruppe

---

## Kontakte

| Team | Zuständigkeit | Dokumente |
|------|---------------|-----------|
| **Backend-Team** | Backend, Auth, API | auth.md |
| **Frontend-Team** | UI, Mobile, Expo-Web | - |
| **Test-Team** | E2E, Testing, Qualität | e2e/ |
| **DevOps/CI-CD** | Pipeline, Infrastruktur | ci-cd.md, e2e/ci-quarantine-management.md |

---

**Letzte Aktualisierung:** 2025-12-12  
**Version:** 1.0 (nach Ticket 15-2-A)
