# Playwright Test Quarantine (UI-Blocked Tests)

> **⚠️ HINWEIS:** Diese Dokumentation wurde nach `docs/e2e/ci-quarantine-management.md` verschoben.
> 
> **Für vollständige Dokumentation siehe:** [docs/e2e/ci-quarantine-management.md](../../../../docs/e2e/ci-quarantine-management.md)

## Übersicht

Dieses Dokument beschreibt den Mechanismus zur temporären Quarantäne von Playwright-E2E-Tests, die aufgrund fehlender UI-Features blockiert sind.

## Zweck

Tests werden in der CI-Pipeline gezielt übersprungen, wenn sie ausschließlich durch "noch nicht implementierte UI-Features" blockiert sind. Dies verhindert, dass die CI-Pipeline aufgrund fehlender Frontend-Implementierungen fehlschlägt, während echte Defekte weiterhin sichtbar bleiben.

## Skip-Format

Alle quarantänisierten Tests verwenden folgendes Format:

```typescript
test('@level TEST-ID: Testbeschreibung', async ({page}) => {
    test.skip(process.env.CI === 'true', 'BLOCKED-UI: <Grund>. Entfernen sobald <Exit-Kriterium>.');
    
    // Testcode...
});
```

### Bestandteile

1. **Conditional Skip**: `test.skip(process.env.CI === 'true', '...')` 
   - Überspringt den Test nur in der CI-Umgebung
   - Test läuft weiterhin lokal (ermöglicht kontinuierliches Testen während der Entwicklung)

2. **BLOCKED-UI Prefix**: Einheitliches Prefix für einfache Identifikation in Logs/Reports

3. **Grund**: Kurze Beschreibung des fehlenden UI-Features
   - Beispiel: "Widget-Namen sind im Feed-UI nicht sichtbar"
   - Beispiel: "Error-Toast für Rate-Limit fehlt im Login"

4. **Exit-Kriterium**: Wann der Skip entfernt werden muss
   - Beispiel: "Entfernen sobald Widget-Namen-Anzeige implementiert ist"
   - Beispiel: "Entfernen sobald Feed-Error-Handling implementiert ist"

## Kategorien von UI-blockierten Tests

### Widget-/Feed-Anzeige
- **FEED-01**: Widget-Namen nicht im Feed-UI sichtbar
- **FEED-04**: Widget-Namen für XSS-Validierung nicht im DOM sichtbar
- **FEED-05**: Empty-State-Anzeige für leeren Feed fehlt
- **WIDGET-02**: Widget-Details nicht in Feed-UI sichtbar

### Error-Handling / Toasts
- **FEED-03**: Error-Toast/Fehlermeldung für Rate-Limit fehlt
- **AUTH-08**: Rate-Limit-spezifische Fehlermeldung im Login fehlt
- **INFRA-02**: Generic Error-Toast/Fehlerseite für 500-Fehler fehlt
- **INFRA-03**: Error-State für Backend-Unavailable fehlt
- **INFRA-07**: Timeout-Error-Handling fehlt
- **INFRA-08**: Error-Recovery-Anzeige fehlt

### Loading-States / Indicators
- **INFRA-05**: Loading-Indicator/Spinner fehlt
- **INFRA-06**: Offline-Indikator fehlt

### Rollen- und Feature-Visibility
- **ROLE-01** (3 Tests): Rollen-Anzeige im UI (Demo/Common/Premium)
- **ROLE-02** (3 Tests): Rollenspezifische Features und Widget-Erstellung UI

### Navigation / Routen
- **BROWSER-01**: Mehrere App-Routen (/account, /settings) existieren nicht

### Accessibility / UX
- **BROWSER-02**: Storage-Quota-Error-Handling fehlt
- **BROWSER-04**: Auto-Fokus auf erstem Input-Feld fehlt
- **BROWSER-05**: Keyboard-Navigation-Highlighting fehlt
- **BROWSER-06**: Mobile-spezifische Navigation (Hamburger-Menu) fehlt

### Backend-Features (nicht UI-blockiert)
- **AUTH-10**: Console-Error-Tracking als testbares Feature
- **AUTH-12**: Token-Binding (Device-ID, IP-Check) im Backend

## Nicht quarantänisierte Tests

Folgende Test-Kategorien werden **NICHT** geskippt:

- **Backend-/Race-Conditions**: z.B. AUTH-09 (Token-Refresh während paralleler Requests)
- **Timeout-Probleme**: Tests, die aufgrund von Timing-Issues fehlschlagen
- **Instabilitäten**: Flaky Tests ohne klare UI-Blockierung

## Verwendung

### Lokal testen (Skips werden ignoriert)
```bash
cd tests/e2e/browseri/playwright
npm test
```

### CI-Test simulieren (mit Skips)
```bash
cd tests/e2e/browseri/playwright
CI=true npm test
```

### Einzelnen Test lokal ausführen
```bash
npx playwright test --grep "FEED-01"
```

## Wartung

### Wann Skips entfernen?

1. **Sofort entfernen**, wenn:
   - Das UI-Feature implementiert wurde
   - Der Test ohne Skip erfolgreich durchläuft

2. **TODO-Kommentare durch echte Assertions ersetzen**:
   ```typescript
   // Vorher:
   // TODO: Sobald Widget-Namen in UI sichtbar sind, prüfe direkt im DOM
   // await expect(page.getByText('Widget Name')).toBeVisible();
   
   // Nachher:
   await expect(page.getByText('Widget Name')).toBeVisible();
   ```

3. **Skip-Zeile entfernen**:
   ```typescript
   // Entferne diese Zeile komplett:
   test.skip(process.env.CI === 'true', 'BLOCKED-UI: ...');
   ```

### Monitoring

- **CI-Reports**: Playwright zeigt Anzahl der übersprungenen Tests in der Ausgabe
- **GitHub Actions**: In den Logs nach "skipped" suchen
- **Regelmäßiges Review**: Prüfen, welche Skips noch benötigt werden

## Beispiele

### Vollständiges Beispiel (Feed-Test)

```typescript
test('@standard FEED-01: Home-Feed zeigt eigene Widgets', async ({page}) => {
    test.skip(process.env.CI === 'true', 'BLOCKED-UI: Widget-Namen sind im Feed-UI nicht sichtbar. Entfernen sobald Widget-Namen-Anzeige implementiert ist.');
    
    const api = await newApiRequestContext();
    const user = await createUserWithRole(api, 'demo', 'feed01');
    
    // Test-Setup und API-Validierung (funktioniert)
    const widget = await createWidget(api, 'Test Widget', '{}', user.access_token);
    await loginAsRole(page, 'demo', 'feed01');
    
    // UI-Validierung (blockiert durch fehlendes Feature)
    // TODO: Sobald Widget-Namen in UI sichtbar sind, prüfe direkt im DOM
    // await expect(page.getByText('Test Widget')).toBeVisible();
});
```

### Nach Implementierung des Features

```typescript
test('@standard FEED-01: Home-Feed zeigt eigene Widgets', async ({page}) => {
    // Skip entfernt ✅
    
    const api = await newApiRequestContext();
    const user = await createUserWithRole(api, 'demo', 'feed01');
    
    const widget = await createWidget(api, 'Test Widget', '{}', user.access_token);
    await loginAsRole(page, 'demo', 'feed01');
    
    // TODO entfernt, echte Assertion aktiviert ✅
    await expect(page.getByText('Test Widget')).toBeVisible();
});
```

## Verantwortlichkeiten

- **Frontend-Entwickler**: Skips entfernen, sobald UI-Feature implementiert ist
- **Test-Maintainer**: Regelmäßiges Review der quarantänisierten Tests
- **CI/CD-Team**: Überwachung der Skip-Anzahl in der Pipeline

## Hinweise

- Skips sind **temporäre Quarantäne-Maßnahmen**, keine Dauerlösungen
- Jeder Skip muss ein klares Exit-Kriterium haben
- Bei Unsicherheit: Lieber nicht skippen und Fehler in der CI sichtbar lassen
- Backend-/Race-Conditions-Tests dürfen **niemals** geskippt werden
