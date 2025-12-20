# Dependency Governance

## Baseline (Phase 0)

- **JS/TS**:
  - `mobile/package.json` nutzt `npm` (implisziert durch `package-lock.json`).
  - Kein Root `package.json` oder Workspace-Definition vorhanden.
  - Root `package-lock.json` ist leer/Platzhalter.
- **Python**:
  - `backend/pyproject.toml` vorhanden.
  - Installation aktuell via `pip` (CI nutzt `setup-python` mit `pip` Cache).
  - Kein `uv.lock` vorhanden.
  - Root `pyproject.toml` enthält nur Ruff-Konfiguration.
- **CI**:
  - Ein zentraler Job `build-and-check` in `.github/workflows/ci.yml`.
  - Nutzt `tools/dev/pipeline/ci_steps.sh` für die Ausführung der Schritte.
