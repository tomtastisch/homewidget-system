# Ticket D - Validierungs- und Test-Anleitung

## Übersicht

Nach der Entfernung von 15 BLOCKED-UI Test-Skips müssen die aktivierten Tests validiert werden, um sicherzustellen, dass sie korrekt funktionieren.

---

## Voraussetzungen

### 1. Entwicklungsumgebung

Stelle sicher, dass folgende Komponenten installiert sind:
- Python 3.13
- Node.js 20.x
- npm
- Playwright Browser (Chromium)

### 2. Repository-Setup

```bash
# Backend-Setup
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]

# Mobile-Setup
cd ../mobile
npm install

# Playwright-Setup
cd ../tests/e2e/browseri/playwright
npm install
npx playwright install chromium
```

---

## Lokale Test-Ausführung

### Schritt 1: Backend starten (E2E-Modus)

```bash
# Terminal 1: Backend im E2E-Modus starten
cd /home/runner/work/homewidget-system/homewidget-system
bash tools/dev/pipeline/ci_steps.sh e2e_backend_start

# Oder direkt (falls ci_steps.sh-Script Probleme macht):
cd backend
source .venv/bin/activate
export ENV=e2e
export DATABASE_URL=sqlite:///./homewidget_e2e.db
uvicorn app.main:app --host 127.0.0.1 --port 8100 &
```

Warte, bis Backend bereit ist:
```bash
curl http://127.0.0.1:8100/health
# Erwartete Antwort: {"status":"ok"}
```

### Schritt 2: Expo-Web starten (E2E-Modus)

```bash
# Terminal 2: Expo-Web starten
cd /home/runner/work/homewidget-system/homewidget-system
export EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8100
bash tools/dev/pipeline/ci_steps.sh e2e_expo_web_start

# Oder direkt:
cd mobile
npm start -- --web --port 19006 &
```

Warte, bis Expo-Web bereit ist:
```bash
curl http://localhost:19006
# Sollte HTML-Seite zurückgeben
```

### Schritt 3: Playwright-Tests ausführen

```bash
# Terminal 3: Tests ausführen
cd /home/runner/work/homewidget-system/homewidget-system/tests/e2e/browseri/playwright

# Umgebungsvariablen setzen
export PLAYWRIGHT_WEB_BASE_URL=http://localhost:19006
export E2E_API_BASE_URL=http://127.0.0.1:8100

# Alle Tests ausführen (lokal, ohne CI-Skip)
npm test

# Nur core-standard Tests (minimum + standard)
npm test -- --project=standard

# Nur core-advanced Tests (alle)
npm test -- --project=advanced

# CI-Modus simulieren (mit Skips)
CI=true npm test
```

### Schritt 4: Spezifische Tests ausführen

```bash
# Einzelner Test
npx playwright test --grep "FEED-01"

# Alle Feed-Tests
npx playwright test specs/feed.spec.ts

# Alle core-standard Tests (unsere aktivierten)
npx playwright test specs/feed.spec.ts specs/widgets.basic.spec.ts specs/auth.resilience.spec.ts specs/infra.health.spec.ts specs/infra.resilience.spec.ts --grep "@standard|@minimum"
```

### Schritt 5: Tests mit sichtbarem Browser (Debugging)

```bash
# Headed-Modus (Browser wird angezeigt)
npx playwright test --headed

# UI-Modus (interaktives Debugging)
npx playwright test --ui

# Mit Screenshots
npx playwright test --screenshot=on

# Mit Traces (für Fehleranalyse)
npx playwright test --trace=on
```

---

## CI-Pipeline-Ausführung

Die CI führt Tests automatisch in GitHub Actions aus. Überwache die folgenden Jobs:

### Job: `e2e-core-minimal` (wird immer ausgeführt)

Läuft bei jedem Push. Führt nur `@minimum` Tests aus:
- WIDGET-01, WIDGET-02, WIDGET-03
- AUTH-01, AUTH-02, AUTH-03
- INFRA-01, INFRA-02
- Weitere Minimum-Tests

**Unsere aktivierten Tests betroffen:**
- WIDGET-02 (✅ aktiviert in Ticket D)
- INFRA-02 (✅ aktiviert in Ticket D)

### Job: `e2e-core-standard` (läuft auf Feature-Branches)

Führt `@minimum` + `@standard` Tests aus:
- Alle Minimum-Tests
- FEED-01 bis FEED-05
- AUTH-04 bis AUTH-08
- INFRA-03, INFRA-04
- Weitere Standard-Tests

**Unsere aktivierten Tests betroffen:**
- Alle 9 core-standard Tests (✅ alle aktiviert in Ticket D)

### Job: `e2e-extended` (manuell/nightly/auf develop)

Führt alle Tests aus (`@minimum` + `@standard` + `@advanced`):
- Alle Minimum- und Standard-Tests
- ROLE-01, ROLE-02 (teilweise aktiviert)
- INFRA-05 bis INFRA-08
- Weitere Advanced-Tests

**Unsere aktivierten Tests betroffen:**
- Alle 15 aktivierten Tests (9 core-standard + 6 core-advanced)

---

## Erwartete Ergebnisse

### ✅ Erfolgreiche Tests (sollten grün sein)

Diese Tests sollten nach Aktivierung erfolgreich durchlaufen:

**core-standard (9 Tests):**
1. FEED-01: Prüft Widget-Namen im Feed (`feed.widget.name`)
2. FEED-03: Prüft Error-Toast bei Rate-Limit (`error.toast`)
3. FEED-04: Prüft XSS-Schutz mit Widget-Namen (`feed.widget.name`)
4. FEED-05: Prüft Empty-State bei leerem Feed (`feed.empty`)
5. WIDGET-02: Prüft Widget-Anzeige nach Erstellung (`feed.widget.name`)
6. AUTH-08: Prüft Rate-Limit-Fehlermeldung (`login.error.rateLimit`)
7. INFRA-02: Prüft 500-Error-Handling (`error.toast`)
8. INFRA-03: Prüft Backend-Unavailable-Fehler (`error.toast`)
9. INFRA-05: Prüft Loading-Spinner (`loading.spinner`)

**core-advanced (6 Tests):**
1. ROLE-01a: Prüft Demo-Rollen-Anzeige (`account.role`)
2. ROLE-01b: Prüft Common-Rollen-Anzeige (`account.role`)
3. ROLE-01c: Prüft Premium-Rollen-Anzeige (`account.role`)
4. INFRA-06: Prüft Offline-Indikator (`status.offline`)
5. INFRA-07: Prüft Timeout-Fehlerbehandlung (`error.toast`)
6. INFRA-08: Prüft Backend-Recovery (`error.toast`)

### ⚠️ Mögliche Probleme und Lösungen

#### Problem: Tests finden testIDs nicht

**Ursache:** Frontend wurde noch nicht neu gebaut oder testIDs fehlen.

**Lösung:**
```bash
cd mobile
rm -rf .expo node_modules/.cache
npm start -- --web --clear
```

#### Problem: "Error: Toast" nicht sichtbar

**Ursache:** Error-Handling im Frontend funktioniert nicht wie erwartet.

**Lösung:**
1. Überprüfe HomeScreen.tsx: Error-State und Toast-Integration
2. Prüfe, ob ToastProvider in App.tsx korrekt eingebunden ist
3. Debugging-Modus: `npx playwright test --headed --debug`

#### Problem: "feed.empty" nicht gefunden

**Ursache:** ListEmptyComponent wird nicht gerendert.

**Lösung:**
1. Prüfe HomeScreen.tsx: `ListEmptyComponent` in FlatList
2. Verifiziere, dass User keine Widgets hat (Backend-Check)

#### Problem: "account.role" nicht gefunden

**Ursache:** AccountScreen existiert noch nicht oder Route fehlt.

**Lösung:**
1. Prüfe, ob AccountScreen.tsx existiert
2. Prüfe Navigation: Gibt es eine Route zu /account?
3. **Hinweis:** ROLE-01 Tests navigieren NICHT automatisch zu /account
   - Tests prüfen nur erfolgreichen Login
   - Screenshots zeigen Home-Screen (nicht Account-Screen)
   - Navigation zu Account-Screen muss manuell erfolgen

#### Problem: Rate-Limit-Test (AUTH-08) schlägt fehl

**Ursache:** Backend hat noch kein Rate-Limiting implementiert oder Schwellwert zu hoch.

**Lösung:**
1. Prüfe Backend: `backend/app/core/config.py` → `LOGIN_RATE_LIMIT`
2. Test erwartet 6 fehlerhafte Versuche + 1 erfolgreicher = Rate-Limit
3. Falls Backend kein Rate-Limiting hat: Test wird trotzdem durchlaufen (nur testID-Check schlägt fehl)

---

## Fehleranalyse

### Logs anschauen

```bash
# Test-Results-Verzeichnis
cd tests/e2e/browseri/playwright/test-results

# Traces anzeigen (nach Test-Failure)
npx playwright show-trace <test-name>/trace.zip

# Screenshots durchsehen
ls -la test-results/*.png
```

### CI-Logs anschauen

1. Gehe zu GitHub Actions: https://github.com/tomtastisch/homewidget-system/actions
2. Wähle den entsprechenden Workflow-Run
3. Klicke auf fehlgeschlagenen Job
4. Expandiere "E2E Browser Tests"-Step
5. Suche nach Fehler-Output

### Common Issues in CI

**Timing-Probleme:**
- Backend/Frontend nicht bereit vor Test-Start
- Lösung: State-based Waits aus `helpers/waits.ts` verwenden

**Port-Konflikte:**
- Port 8100 oder 19006 bereits belegt
- Lösung: CI-Pipeline terminiert alte Prozesse vor neuem Start

**testID nicht gefunden:**
- Frontend-Build ist veraltet
- Lösung: CI baut Frontend immer frisch (kein Cache)

---

## Validierungs-Checkliste

### Lokale Validierung

- [ ] Backend startet erfolgreich auf Port 8100
- [ ] Expo-Web startet erfolgreich auf Port 19006
- [ ] Playwright-Tests können ausgeführt werden
- [ ] Mindestens ein aktivierter Test läuft erfolgreich durch
- [ ] Alle 9 core-standard Tests sind grün
- [ ] Alle 6 aktivierten core-advanced Tests sind grün
- [ ] Screenshots zeigen erwartete UI-Zustände

### CI-Validierung

- [ ] Job `e2e-core-minimal` ist grün (enthält WIDGET-02, INFRA-02)
- [ ] Job `e2e-core-standard` ist grün (enthält alle 9 core-standard Tests)
- [ ] Job `e2e-extended` ist grün (optional, enthält alle 15 Tests)
- [ ] Keine neuen Test-Failures durch unsere Änderungen
- [ ] Test-Artefakte werden korrekt hochgeladen

### Code-Review-Checkliste

- [ ] Alle `test.skip(process.env.CI === 'true', 'BLOCKED-UI: ...')` entfernt
- [ ] Alle TODO-Assertions aktiviert (kommentiert → entkommentiert)
- [ ] testIDs werden korrekt verwendet (z.B. `page.getByTestId('feed.widget.name')`)
- [ ] Keine unerwünschten Änderungen in anderen Tests
- [ ] Dokumentation aktualisiert (ci-quarantine-management.md)

---

## Quality Gates

### Vor Merge müssen erfüllt sein:

1. **✅ Code-Qualität**
   - Alle Skips entfernt (außer ROLE-02)
   - Alle TODOs in core-standard aktiviert
   - testIDs korrekt verwendet

2. **⏳ Test-Ergebnisse** (muss noch validiert werden)
   - core-standard: 100% Pass-Rate
   - core-advanced: Alle aktivierten Tests grün
   - Keine Regressionen in anderen Tests

3. **✅ Dokumentation**
   - ci-quarantine-management.md aktualisiert
   - ticket-d-completion-report.md erstellt
   - Quality Gates dokumentiert

---

## Nächste Schritte nach erfolgreicher Validierung

1. **PR erstellen**
   - Branch: `copilot/remove-blocked-ui-skips`
   - Target: `main` oder `develop`
   - Referenz: Ticket D

2. **Code Review anfordern**
   - Review der Test-Änderungen
   - Bestätigung der CI-Ergebnisse

3. **Merge nach Approval**
   - Squash Merge empfohlen
   - Commit-Message: "Ticket D: Remove BLOCKED-UI test skips (15/18 tests activated)"

4. **Post-Merge-Monitoring**
   - Erste CI-Runs nach Merge überwachen
   - Bei Problemen: Hotfix oder Revert

---

## Support

Bei Problemen oder Fragen:
1. Logs überprüfen (lokal + CI)
2. Screenshots/Traces analysieren
3. Dokumentation konsultieren:
   - `docs/e2e/playwright-testing-guide.md`
   - `docs/e2e/ci-quarantine-management.md`
4. Issue erstellen mit:
   - Test-Name
   - Fehler-Output
   - Screenshots/Traces
   - Umgebungs-Info (lokal/CI)

---

**Letzte Aktualisierung:** 2025-12-12
