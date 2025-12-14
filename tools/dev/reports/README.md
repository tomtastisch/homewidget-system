# Reports: Test & Release Reports

Scripts zur Generierung von Berichten über Testabläufe, Qurantänen und Release-Planung.

## Verfügbare Reports

### `todo_report.sh`

Generiert einen Bericht aller offenen TODOs aus dem Codebase.

```bash
bash tools/dev/reports/todo_report.sh
```

### `quarantine_report.sh`

Generiert einen Bericht über unter Quarantäne stehende Tests (flaky oder deaktiviert).

```bash
bash tools/dev/reports/quarantine_report.sh
```

### `ui_release_todo_mapping.sh`

Generiert ein Mapping zwischen UI-Release-Anforderungen und TODOs/Tickets.

```bash
bash tools/dev/reports/ui_release_todo_mapping.sh
```

## Integration

Diese Reports werden typischerweise als Teil der CI/CD-Pipeline aufgerufen:

```bash
# Aus tools/dev/pipeline/ci_steps.sh
step_quarantine_report() {
    bash tools/dev/reports/quarantine_report.sh
}

step_todo_report() {
    bash tools/dev/reports/todo_report.sh
}
```

