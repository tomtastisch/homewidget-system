Ziel

- Abarbeiten aller aktuell offenen TODOs in den E2E-Tests (Playwright/Contracts/Detox) und Entfernen konzeptioneller
  Platzhalter.

Umfang

- TODOs in Test-Specs eliminieren, indem:
    - Assertions/Checks auf tatsächlich vorhandene UI-Elemente und testIds umgestellt werden
    - fehlende/inkonsistente Testlogik korrigiert wird (z. B. falscher User-Kontext, Token-Nutzung)
    - nicht verfügbare UI-Features nicht “vorgegaukelt”, sondern als deterministische API-/Resilience-Checks umgesetzt
      werden
    - Cleanup/Isolation (Testdaten entfernen, idempotent) sichergestellt wird
- Playwright-Artefakte (z. B. .last-run.json, test-results) nicht versionieren (.gitignore + ggf. rm --cached)

Akzeptanzkriterien

- Alle TODO-Markierungen im Repo sind entfernt (todo_report.sh liefert 0 Treffer).
- Alle betroffenen E2E-Tests laufen lokal durch (inkl. minimal + standard, soweit im Projekt vorgesehen).
- Keine neuen Flaky-Waits: nur klare Zustände (testIds/Spinner/Response-Checks), keine Sleep-Workarounds.
- Kein Commit von generierten Artefakten (test-results/, playwright-report/, .last-run.json).

Hinweise

- Änderungen erfolgen testgetrieben und möglichst minimal-invasiv.
- Falls ein TODO nur durch ein echtes Feature implementierbar wäre, wird stattdessen ein separates Feature-Ticket
  erforderlich (nicht Teil dieses Branches).
