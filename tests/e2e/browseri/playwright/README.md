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
    - E2E_API_BASE_URL=http://127.0.0.1:8100 (Standard-Wert, kann für abweichende Backend-URLs gesetzt werden)

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

- **WICHTIG**: Diese Tests laufen derzeit **NICHT gegen eine Web-UI**, sondern direkt gegen das Backend-API.
- Die Tests nutzen primär `APIRequestContext` für API-Aufrufe (Login, CRUD, etc.).
- Einige Tests verwenden `page.evaluate()` für minimale Browser-Interaktionen (z.B. Fetch-Calls mit Mocking).
- **Kein Web-Frontend erforderlich**: Die baseURL zeigt auf das Backend (http://127.0.0.1:8100).
- UI-spezifische Helper (auth.ts, security.ts) sind für **zukünftige** Web-Frontend-Tests vorbereitet und mit TODOs
  markiert.
- Konfiguration: siehe playwright.config.ts (baseURL=E2E_API_BASE_URL, kein webServer-Block).

Zukünftige Web-Frontend-Integration

Wenn ein dediziertes Web-Frontend existiert:

1. playwright.config.ts: webServer-Block aktivieren und auf Web-Client zeigen
2. baseURL auf Web-Client-URL ändern (z.B. http://localhost:3000)
3. Tests erweitern um echte UI-Interaktionen (Selektoren, Navigation, etc.)
4. Helper aus auth.ts und security.ts nutzen für Login-Forms, XSS-Tests, etc.
