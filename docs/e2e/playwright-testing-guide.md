# Playwright E2E Testing Guide

**Zielgruppe:** Test-Entwickler  
**Zweck:** Best Practices, Patterns und Richtlinien für Playwright-Tests

---

## Übersicht

Browser-E2E-Tests mit Playwright in drei Testebenen:
- **@minimum**: Kritische Basis-Szenarien (10 Tests)
- **@standard**: Erweiterte Fehlerbehandlung (26 Tests)
- **@advanced**: Edge-Cases und komplexe Szenarien (60 Tests)

**Architektur:**
- Frontend: Expo-Web (React Native Web, Port 19006)
- Backend: E2E-Modus (Port 8100)
- Test-Framework: Playwright

---

## Verzeichnisstruktur

```
tests/e2e/browseri/playwright/
├── specs/              # Test-Spezifikationen nach Kategorie
│   ├── auth.*.spec.ts
│   ├── widgets.*.spec.ts
│   ├── feed.spec.ts
│   ├── roles.spec.ts
│   ├── infra.*.spec.ts
│   ├── security.advanced.spec.ts
│   └── browser.spec.ts
├── helpers/            # Wiederverwendbare Test-Helfer
│   ├── auth.ts        # Login, Logout, Rollen-Handling
│   ├── widgets.ts     # Widget-CRUD-Operationen
│   ├── waits.ts       # State-based Wait-Helpers
│   ├── api.ts         # API-Context, Mocking
│   └── security.ts    # XSS-Checks, CSP-Tests
└── playwright.config.ts
```

---

## Tests schreiben

### 1. Test-Ebenen und Tagging

**Jeder Test muss getaggt sein:**

```typescript
// Minimum: Kritische Basis-Funktionalität
test('@minimum AUTH-01: Login mit gültigen Daten', async ({page}) => {
    // ...
});

// Standard: Erweiterte Fehlerbehandlung
test('@standard AUTH-04: Login mit falschem Passwort', async ({page}) => {
    // ...
});

// Advanced: Edge-Cases, komplexe Szenarien
test('@advanced AUTH-09: Token-Refresh während paralleler Requests', async ({page}) => {
    // ...
});
```

**Projekt-Ausführung:**
```bash
npx playwright test --project=minimum   # Nur @minimum
npx playwright test --project=standard  # @minimum + @standard
npx playwright test --project=advanced  # Alle Tests
```

### 2. State-based Waiting (WICHTIG!)

**❌ NICHT verwenden:**
```typescript
await page.reload();
await page.waitForTimeout(2000); // Willkürliche Timeouts!
```

**✅ VERWENDEN:**
```typescript
import {waitAfterReload, waitForNetworkIdle, waitForApiCall} from '../helpers/waits';

await page.reload();
await waitAfterReload(page); // Wartet auf DOM + Network Idle

// Oder spezifischer:
await waitForApiCall(page, '/api/widgets/');
await waitForNetworkIdle(page);
```

**Verfügbare Wait-Helpers:**
- `waitForNetworkIdle(page, timeout?)` - Wartet auf Network Idle
- `waitForApiCall(page, urlPattern, timeout?)` - Wartet auf spezifischen API-Call
- `waitForDOMReady(page, timeout?)` - Wartet auf DOM Ready
- `waitForElement(page, testId, timeout?)` - Wartet auf Element attached
- `waitAfterReload(page, timeout?)` - DOM + Network Idle nach Reload
- `waitForNavigation(page, timeout?)` - Navigation + Idle
- `waitForAnimation(page, reason, ms)` - Für UI-Animationen (max 1s, mit Logging)

**Warum?** State-based waits sind deterministisch und vermeiden Flakiness.

### 3. Test-Struktur

**Standard-Pattern:**

```typescript
test('@standard FEATURE-XX: Beschreibung', async ({page}) => {
    // 1. Setup: Test-Daten erstellen (via API)
    const api = await newApiRequestContext();
    const user = await createUserWithRole(api, 'demo', 'featurexx');
    const widget = await createWidget(api, 'Test Widget', '{}', user.access_token);
    
    // 2. Action: UI-Interaktion
    await loginAsRole(page, 'demo', 'featurexx-ui');
    await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
    
    // 3. Assertion: Backend-Validierung (immer!)
    const widgets = await listWidgets(api, user.access_token);
    expect(widgets.length).toBeGreaterThanOrEqual(1);
    
    // 4. Assertion: UI-Validierung (wenn Feature vorhanden)
    await expect(page.getByText('Test Widget')).toBeVisible();
    
    // 5. Screenshot (für visuelle Verifikation)
    await page.screenshot({path: 'test-results/feature-xx.png'});
    
    // 6. Cleanup
    await deleteWidgetById(api, widget.id, user.access_token);
});
```

### 4. Helper-Nutzung

**Auth-Helper:**
```typescript
import {loginAs, loginAsRole, logout, createUserWithRole} from '../helpers/auth';

// Einfacher Login
await loginAs(page, 'user@example.com', 'password');

// Login mit vordefinierter Rolle
await loginAsRole(page, 'demo', 'uniqueId'); // Erstellt User automatisch

// Logout
await logout(page);

// User mit spezifischer Rolle erstellen
const user = await createUserWithRole(api, 'premium', 'testId');
```

**Widget-Helper:**
```typescript
import {createWidget, listWidgets, deleteWidgetById} from '../helpers/widgets';

// Widget erstellen
const widget = await createWidget(api, 'Name', '{}', accessToken);

// Widgets auflisten
const widgets = await listWidgets(api, accessToken);

// Widget löschen
await deleteWidgetById(api, widget.id, accessToken);
```

### 5. TODO-Policy (WICHTIG!)

**Jedes TODO muss folgendes Format haben:**

```typescript
// TODO(ISSUE-ID): Beschreibung des fehlenden Features.
//   Exit: Konkretes Kriterium zum Entfernen.
//   Target: Spezifische Assertion, die aktiviert werden soll.
//   Owner: Team/Person (optional).

// Beispiel:
// TODO(FRONTEND-101): Widget-Namen sind im Feed-UI nicht sichtbar.
//   Exit: Widget-Namen-Anzeige in Feed-Komponente implementiert.
//   Target: await expect(page.getByText('Test Widget')).toBeVisible();
//   Owner: Frontend-Team
// await expect(page.getByText('Test Widget')).toBeVisible();
```

**Warum?**
- Nachverfolgbarkeit (Issue-ID)
- Klarer Exit-Pfad (wann entfernen?)
- Konkrete Assertion (was testen?)

**Anti-Patterns:**
```typescript
// ❌ Vage TODOs
// TODO: Implementiere Widget-Test
// TODO: Prüfe später

// ❌ TODOs ohne Issue-ID
// TODO: Widget-Namen prüfen

// ❌ TODOs ohne Exit-Kriterium
// TODO(FRONTEND-123): Widget-Namen fehlen
```

### 6. UI-blockierte Tests (Quarantäne)

**Wenn UI-Feature fehlt, aber Backend funktioniert:**

```typescript
test('@standard FEED-01: Home-Feed zeigt eigene Widgets', async ({page}) => {
    // Skip nur in CI, lokal lauffähig
    test.skip(process.env.CI === 'true', 
        'BLOCKED-UI: Widget-Namen nicht sichtbar. Entfernen sobald Widget-Namen-Anzeige implementiert ist.');
    
    const api = await newApiRequestContext();
    const user = await createUserWithRole(api, 'demo', 'feed01');
    const widget = await createWidget(api, 'Test Widget', '{}', user.access_token);
    
    await loginAsRole(page, 'demo', 'feed01-ui');
    
    // ✅ Backend-Validierung läuft (nicht geskippt!)
    const widgets = await listWidgets(api, user.access_token);
    expect(widgets.some(w => w.name === 'Test Widget')).toBeTruthy();
    
    // ❌ UI-Validierung blockiert (TODO)
    // TODO(FRONTEND-101): Widget-Namen sind im Feed-UI nicht sichtbar.
    //   Exit: Widget-Namen-Anzeige implementiert.
    //   Target: await expect(page.getByText('Test Widget')).toBeVisible();
    // await expect(page.getByText('Test Widget')).toBeVisible();
    
    await page.screenshot({path: 'test-results/feed-01.png'});
    
    await deleteWidgetById(api, widget.id, user.access_token);
});
```

**Wichtig:**
- Skip nur in CI (`process.env.CI === 'true'`)
- Backend-Validierung trotzdem durchführen
- TODO mit Exit-Kriterium dokumentieren
- Screenshot für visuelles Feedback

---

## Best Practices

### 1. Kleine, fokussierte Tests
- Ein Test pro Szenario
- Keine Test-"Geschichten" (mehrere Szenarien in einem Test)
- Klare Test-IDs (z.B. AUTH-01, FEED-02)

### 2. Deterministisches Setup
- Unique User-IDs (z.B. mit Timestamp)
- Cleanup nach jedem Test
- Keine Abhängigkeiten zwischen Tests

### 3. API-First, UI-Second
- Backend-Funktionalität immer via API validieren
- UI-Validierung zusätzlich (wenn Feature vorhanden)
- Bei UI-Blockierung: Backend-Test läuft trotzdem

### 4. Explizite Waits
- Keine `waitForTimeout()` ohne triftigen Grund
- State-based waits aus `helpers/waits.ts`
- Für UI-Animationen: `waitForAnimation()` mit Grund (max 1s)

### 5. Screenshots für Debugging
- Am Ende jedes Tests (auch bei Skip)
- Bei Failures automatisch (via Playwright-Config)
- Pfad: `test-results/<test-id>.png`

### 6. Cleanup
- Erstellte Test-Daten löschen
- User nicht löschen (Backend kümmert sich)
- Widgets explizit löschen

---

## Lokale Entwicklung

### Setup
```bash
cd tests/e2e/browseri/playwright
npm install
npx playwright install --with-deps chromium
```

### Backend starten (E2E-Modus)
```bash
backend/tools/start_test_backend_e2e.sh &
```

### Tests ausführen
```bash
# Alle Standard-Tests (empfohlen)
npm test

# Nur Minimum-Tests
npm run test:minimum

# Alle Tests (inkl. Advanced)
npm run test:all

# Mit sichtbarem Browser
npm run test:headed

# Einzelner Test
npx playwright test --grep "AUTH-01"

# CI-Modus simulieren (mit Skips)
CI=true npm test
```

### Debugging
```bash
# UI-Modus (interaktiv)
npx playwright test --ui

# Headed-Modus
npx playwright test --headed

# Traces ansehen (nach Failure)
npx playwright show-trace test-results/<test-name>/trace.zip

# Code-Generierung
npx playwright codegen http://localhost:19006
```

---

## CI-Integration

**GitHub Actions:**
- `e2e-core-minimal`: Nur @minimum (schnell, bei jedem Push)
- `e2e-core-standard`: @minimum + @standard (Feature-Branches)
- `e2e-core-advanced`: Alle Tests (Nightly, Release)

**Umgebungsvariablen:**
- `PLAYWRIGHT_WEB_BASE_URL`: Expo-Web-Frontend (http://localhost:19006)
- `E2E_API_BASE_URL`: Backend-API (http://127.0.0.1:8100)
- `CI`: Wenn gesetzt, werden UI-blockierte Tests geskippt

---

## Wartung

### TODOs verwalten
```bash
# TODO-Report generieren
bash tools/dev/pipeline/todo_report.sh
```

### Skips verwalten
```bash
# Skip-Report generieren (existierend)
bash tools/dev/pipeline/quarantine_report.sh

# Skip→TODO Mapping (für UI-Release)
bash tools/dev/pipeline/ui_release_todo_mapping.sh
```

### Test-Updates nach Frontend-Änderung
1. Skip-Zeile entfernen
2. TODO-Assertions aktivieren
3. testIds anpassen (falls nötig)
4. Test lokal ausführen
5. Bei Erfolg: Commit

---

## Troubleshooting

### Test ist flaky
- Prüfe auf `waitForTimeout()` → Ersetze durch state-based wait
- Prüfe auf Race-Conditions → Nutze `waitForApiCall()`
- Prüfe Timeouts → Erhöhe spezifisch, nicht global

### Test findet Element nicht
- Prüfe testId existiert (in mobile/src)
- Warte auf Element: `await page.getByTestId('id').waitFor({state: 'visible'})`
- Screenshot machen: `await page.screenshot()`

### API-Call schlägt fehl
- Prüfe Backend läuft (Port 8100)
- Prüfe CORS-Konfiguration
- Prüfe Token gültig: `console.log(accessToken)`

### Test läuft lokal, aber nicht in CI
- Simuliere CI: `CI=true npm test`
- Prüfe auf UI-Blockierung → Skip hinzufügen
- Prüfe Timing-Issues → State-based waits

---

## Ressourcen

- **Playwright-Docs:** https://playwright.dev
- **helpers/waits.ts:** State-based Wait-API
- **helpers/auth.ts:** Auth-Helper-API
- **helpers/widgets.ts:** Widget-Helper-API

---

**Letzte Aktualisierung:** 2025-12-12
