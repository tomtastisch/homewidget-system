# CI Terminal Tools

Diese Tools ermöglichen es, den Status der CI-Pipeline und Fehlermeldungen direkt über das Terminal abzufragen, ohne die GitHub-Weboberfläche nutzen zu müssen.

## Voraussetzungen

1. **GitHub CLI (gh)** muss installiert sein.
   - macOS: `brew install gh`
   - Linux: [gh installation guide](https://github.com/cli/cli#installation)
2. **Authentifizierung**:
   - Führe einmalig `gh auth login` aus.

## Schnellbefehle

Alle Skripte befinden sich unter `tools/ci/`.

| Befehl | Beschreibung |
|--------|--------------|
| `./tools/ci/ci-pr-checks.sh` | Zeigt alle Checks für den aktuellen PR. |
| `./tools/ci/ci-last-run.sh` | Status des letzten Workflow-Runs (Branch-basiert). |
| `./tools/ci/ci-watch-last-run.sh` | Wartet (live), bis der aktuelle Run fertig ist. |
| `./tools/ci/ci-last-failed-log.sh` | Lädt Logs der fehlgeschlagenen Schritte (.artifacts/ci/). |
| `./tools/ci/ci-download-artifacts-last-run.sh` | Lädt alle Artefakte des letzten Runs herunter. |

## Arbeiten als Assistent (Junie) / Entwickler (Tom)

Wenn die CI rot wird:
1. Prüfe den Status: `./tools/ci/ci-last-run.sh`
2. Hole die Logs der fehlgeschlagenen Schritte: `./tools/ci/ci-last-failed-log.sh`
3. Analysiere das `ci-failure-logs` Artefakt: `./tools/ci/ci-download-artifacts-last-run.sh`

Das Artefakt enthält ein Bundle (`ci_failure_bundle/`) mit:
- `meta.txt`: Run-Metadaten
- `js_context.txt` / `py_context.txt`: Versions- und Umgebungsinfos
- `git_diffs/`: Diffs von Lockfiles (falls vorhanden)
- `hint.txt`: Hilfe zur Terminal-Abfrage

## Best Practices
- Nutze `ci-watch-last-run.sh` nach einem Push, um sofort Feedback zu erhalten.
- Nutze `ci-last-failed-log.sh`, um schnell die Ursache für einen Abbruch zu sehen, ohne durch 10.000 Zeilen Log zu scrollen.
