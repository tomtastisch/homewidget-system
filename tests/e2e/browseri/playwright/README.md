# Browser E2E (Playwright)

Diese Tests laufen gegen das Expo-Web-Frontend (Ordner `mobile/`) und ein FastAPI‑Backend im E2E‑Modus. Sie decken drei
Ebenen ab: `@minimal`, `@standard`, `@advanced`.

## Schnellstart

- Voraussetzungen: Node 20+, Python 3.11+, Playwright-Browser
- Abhängigkeiten installieren:
    - `cd mobile && npm ci`
    - `cd tests/e2e/browseri/playwright && npm ci && npx playwright install --with-deps chromium`

### Backend im E2E‑Modus starten

- Automatisch: Der Web‑Client wird vom Playwright `webServer` gestartet. Das Backend sollte separat laufen.
- Manuell (empfohlen lokal):
  ```bash
  backend/tools/start_test_backend_e2e.sh
  ```
  Läuft auf `http://127.0.0.1:8100` und initialisiert eine frische SQLite‑DB in `/tmp/`.

### Tests ausführen

- Standard (enthält `@minimal` + `@standard`):
  ```bash
  cd tests/e2e/browseri/playwright
  npm run test:standard
  ```
- Nur Minimal:
  ```bash
  npm run test:minimal
  ```
- Alle inkl. Advanced:
  ```bash
  npm run test:advanced
  ```

## Wichtige Umgebungsvariablen

- `PLAYWRIGHT_WEB_BASE_URL` – URL des Expo‑Web‑Frontends. Fallback: `http://localhost:19006`.
- `E2E_API_BASE_URL` – URL des Backends im E2E‑Modus. Fallback: `http://127.0.0.1:8100`.
- `PLAYWRIGHT_NO_AUTO_START` – `true` deaktiviert Auto‑Start des Expo‑Servers (wenn du ihn manuell startest).

> Der `webServer` setzt für Expo automatisch `EXPO_PUBLIC_API_BASE_URL`, damit das Frontend das Backend findet.

## Häufige Stolperfallen

- Port belegt (`127.0.0.1:8100 already in use`):
    - Beende alte Backend‑Prozesse oder wähle einen anderen Port via `E2E_API_BASE_URL`.
- Leere/alte Testdaten:
    - Der E2E‑Startskript initialisiert die Datenbank frisch. Stelle sicher, dass du das Script vor dem Lauf gestartet
      hast, wenn `PLAYWRIGHT_NO_AUTO_START=true` gesetzt ist.
- Flaky Text‑Matcher:
    - Bevorzugt `getByTestId` – Premium‑Sektion im Account hat dafür `account.premium.*` TestIDs.

## Nützliche Helfer

- `helpers/testdata.ts`:
    - `uniqueEmail(prefix?)` – erzeugt eindeutige E‑Mails für parallele Läufe
    - `DEFAULT_PASSWORD` – einheitliches Passwort für Tests

- `helpers/api.ts`, `helpers/auth.ts` – API‑ und Auth‑Hilfsfunktionen für Nutzer‑Flows.

## Artefakte

Playwright erstellt Traces/Screenshots nur im Fehlerfall. Der Konsolen‑Output eines Laufs wird zusätzlich in
`.output.txt` gespiegelt (siehe CI‑Jobs).
