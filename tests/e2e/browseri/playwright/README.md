Playwright – Vorbereitung (Browser-E2E)

Dieses Verzeichnis dient als Vorbereitung für zukünftige Web-UI-E2E-Tests mit Playwright.

Ziel/Scope (Ticket 12):

- Nur Struktur und kurze Beschreibung.
- Kein vollständiges Playwright-Setup in diesem Ticket.

Bezug Backend-E2E-Profil:

- Backend im E2E-Modus starten (eigene Test-DB, Seeds):
  backend/tools/start_test_backend_e2e.sh &
  E2E_API_BASE_URL=http://127.0.0.1:8100

Specs/Struktur:

- example.spec.ts ist eine leere Beispiel-Datei als Platzhalter.
- Spätere Tickets richten eine vollständige playwright.config.ts ein und verweisen auf E2E_API_BASE_URL.

Run (zukünftig):

- npx playwright test (nachdem Konfiguration und Tests ergänzt wurden).
