# 🛠️ Tools & CLI – Homewidget System

Überblick über die wichtigsten Entwicklungs- und Orchestrierungs-Tools.

Status: Draft – Inhalte werden aus `tools/` nach und nach konsolidiert.

---

## Quick-Commands

    # Gesamtsystem lokal starten (Backend, Frontend, DB, Mocks)
    bash tools/dev/orchestration/start.sh

    # Services stoppen/aufräumen
    bash tools/dev/orchestration/finalize_all.sh

Weitere Details siehe die READMEs in `tools/`:

- `tools/README.md` – Übersicht
- `tools/dev/README.md` – Dev-spezifische Tools
- `tools/dev/orchestration/README.md` – Orchestrierung (Start/Stop)
- `tools/dev/reports/README.md` – Reports & Artefakte
- `tools/dev/pipeline/README.md` – CI-nahe Schritte lokal

---

## Häufige Workflows

- Lint/Typecheck/Tests lokal ausführen (siehe entsprechende Make-/Shell-Skripte in `tools/dev/`)
- E2E-Tests starten: `cd tests/e2e/browseri && npx playwright test`
- Logs/Services prüfen: Skripte unter `tools/dev/lib/`

---

## Struktur (aus `tools/`)

    tools/
    ├── README.md
    └── dev/
        ├── README.md
        ├── orchestration/
        │   ├── README.md
        │   ├── start.sh
        │   └── finalize_all.sh
        ├── pipeline/
        │   └── README.md
        ├── reports/
        │   └── README.md
        └── lib/
            ├── checks.sh
            ├── logging.sh
            └── services.sh

---

Zuletzt aktualisiert: Dezember 2025
