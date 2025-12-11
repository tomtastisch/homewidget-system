Playwright – Browser-E2E (Minimum-Basis, Ticket 13)

Überblick

- Dieses Verzeichnis enthält die minimum Browser-E2E-Infrastruktur auf Basis von Playwright.
- Fokus: kritische Infra-/Security-Pfade (Login/Logout/Refresh, Widgets CRUD/Owner-Check, Health/Fehlerfälle).

Struktur

tests/
e2e/
browseri/
playwright/
playwright.config.ts
package.json
helpers/
auth.ts
widgets.ts
security.ts
api.ts
fixtures.ts
specs/
auth.basic.spec.ts
widgets.basic.spec.ts
widgets.security.spec.ts
infra.health.spec.ts
README.md

Voraussetzungen

- Backend im E2E-Modus gestartet (Port 8100):
  backend/tools/start_test_backend_e2e.sh &
- Env:
    - E2E_API_BASE_URL=http://127.0.0.1:8100 (Default, kann entfallen)
    - PLAYWRIGHT_BASE_URL / WEB_BASE_URL: Basis-URL für eine Web-UI (falls vorhanden). Aktuell Platzhalter.

Installieren & Ausführen (lokal)

1) In dieses Verzeichnis wechseln:
   cd tests/e2e/browseri/playwright
2) Abhängigkeiten installieren:
   npm install
3) Browser installieren:
   npx playwright install --with-deps chromium
4) Tests ausführen (Minimum-Suite):
   npx playwright test specs/auth.basic.spec.ts \
   specs/widgets.basic.spec.ts \
   specs/widgets.security.spec.ts \
   specs/infra.health.spec.ts

Hinweise

- Solange keine vollwertige Web-UI existiert, interagieren die Tests für Minimum-Pfade teils direkt per
  APIRequestContext
  mit dem Backend (Login/CRUD) und verifizieren Verhalten serverseitig. UI-spezifische Selektoren sind als TODOs
  markiert.
- Keine Verwendung von waitForTimeout – nur Playwright-übliche Waits/Assertions.
- Konfiguration: siehe playwright.config.ts (baseURL via Env, chromium-Projekt, Platzhalter webServer kommentiert).
