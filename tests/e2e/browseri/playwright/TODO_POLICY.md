# TODO-Policy für Playwright E2E Tests

## Zweck

Diese Policy stellt sicher, dass TODOs in E2E-Tests nicht „verwildern", sondern klar dokumentiert und nachverfolgbar bleiben. Jedes TODO muss einen konkreten Exit-Pfad haben.

## Struktur eines gültigen TODO

### Format

```typescript
// TODO(ISSUE-ID): Beschreibung des fehlenden Features.
//   Exit: Konkretes Kriterium, wann dieser TODO entfernt werden kann.
//   Target: Spezifische Assertion, die aktiviert werden soll.
//   Owner: Team/Person verantwortlich für Implementierung (optional).
```

### Beispiele

#### ✅ Gültiges TODO (vollständig dokumentiert)

```typescript
// TODO(FRONTEND-123): Widget-Namen sind im Feed-UI nicht sichtbar.
//   Exit: Widget-Namen-Anzeige in Feed-Komponente implementiert.
//   Target: await expect(page.getByText('Test Widget')).toBeVisible();
//   Owner: Frontend-Team
// await expect(page.getByText('Test Widget')).toBeVisible();
```

#### ✅ Gültiges TODO (minimal)

```typescript
// TODO(BACKEND-456): Rate-Limiting im Login-Endpoint fehlt.
//   Exit: Rate-Limiter aktiviert (>5 Requests/Minute → 429).
//   Target: await expect(page.getByText(/Rate limit/i)).toBeVisible();
await page.screenshot({path: 'test-results/auth-rate-limit.png'});
```

#### ❌ Ungültiges TODO (keine Issue-Referenz)

```typescript
// TODO: Prüfe Widget-Namen im UI
// await expect(page.getByText('Widget')).toBeVisible();
```

#### ❌ Ungültiges TODO (kein Exit-Kriterium)

```typescript
// TODO(FRONTEND-789): Implementiere Error-Toast
// await expect(page.getByTestId('error.toast')).toBeVisible();
```

## Kategorien von TODOs

### 1. UI-Feature-blockiert (BLOCKED-UI)

**Verwendung:** UI-Feature ist noch nicht implementiert, Test kann daher nicht vollständig validiert werden.

**Kombination mit Skip:**
```typescript
test('@standard FEED-01: Home-Feed zeigt eigene Widgets', async ({page}) => {
    test.skip(process.env.CI === 'true', 'BLOCKED-UI: Widget-Namen nicht sichtbar. Entfernen sobald Widget-Namen-Anzeige implementiert ist.');
    
    // Test-Setup (läuft)
    const widget = await createWidget(api, 'Test Widget', '{}', user.access_token);
    await loginAsRole(page, 'demo', 'feed01');
    
    // API-Validierung (läuft)
    const widgets = await listWidgets(api, user.access_token);
    expect(widgets.some(w => w.name === 'Test Widget')).toBeTruthy();
    
    // TODO(FRONTEND-101): Widget-Namen sind im Feed-UI nicht sichtbar.
    //   Exit: Feed-Komponente zeigt Widget-Namen an.
    //   Target: await expect(page.getByText('Test Widget')).toBeVisible();
    // await expect(page.getByText('Test Widget')).toBeVisible();
});
```

**Regel:** Wenn Test geskippt ist (`test.skip`), muss der Skip-Grund mit dem TODO konsistent sein.

### 2. Backend-Feature fehlt

**Verwendung:** Backend-Feature noch nicht implementiert, aber Test-Infrastruktur vorhanden.

```typescript
test('@standard FEED-02: Feed-Caching verhindert redundante API-Calls', async ({page}) => {
    // Test läuft, aber ohne echtes Caching-Verhalten zu prüfen
    
    await page.reload();
    await waitForNetworkIdle(page);
    
    // TODO(BACKEND-202): Feed-Caching (30s) im Backend fehlt.
    //   Exit: Cache-Header gesetzt, redundante Calls vermieden.
    //   Target: expect(apiCallsAfterReload).toBe(apiCallsInitial);
    // const apiCallsAfterReload = apiCalls.length;
    // expect(apiCallsAfterReload).toBe(apiCallsInitial); // Kein neuer Call wegen Cache
});
```

**Regel:** Test läuft grün, auch wenn Backend-Feature fehlt. TODO dokumentiert fehlende Verifikation.

### 3. Testinfra/Tooling-Verbesserung

**Verwendung:** Test funktioniert, aber könnte robuster/schneller sein.

```typescript
// TODO(TEST-INFRA-42): Wiederholbare Helper für Error-Mocking extrahieren.
//   Exit: Generic error-mocking Helper in helpers/api.ts.
//   Target: Refactoring zu mockBackendError(page, '/api/widgets/', 500)
await page.route('**/api/widgets/**', async (route) => {
    await route.fulfill({status: 500, body: '{}'});
});
```

**Regel:** Diese TODOs blockieren keine Tests, sondern sind Wartungs-/Qualitäts-TODOs.

## TODO-Tracking und Reporting

### Lokal: TODOs finden

```bash
# Alle TODOs in E2E-Tests auflisten
grep -rn "TODO(" tests/e2e/browseri/playwright/specs/

# TODOs ohne Issue-ID finden (ungültig)
grep -rn "TODO:" tests/e2e/browseri/playwright/specs/ | grep -v "TODO("
```

### CI: TODO-Report generieren

Ein separates Script (optional implementierbar) kann TODOs in CI sichtbar machen:

```bash
bash tools/dev/pipeline/todo_report.sh
```

**Ausgabe:**
```
=== E2E TODO Report ===
Total TODOs: 12

UI-blockierte Features:
  - FRONTEND-101: Widget-Namen im Feed (feed.spec.ts:35)
  - FRONTEND-123: Error-Toast für Rate-Limit (feed.spec.ts:117)
  - FRONTEND-200: Rollen-Anzeige (roles.spec.ts:22)

Backend-Features:
  - BACKEND-202: Feed-Caching (feed.spec.ts:78)
  - BACKEND-456: Rate-Limiter für Login (auth.resilience.spec.ts:166)

Test-Infra:
  - TEST-INFRA-42: Error-Mocking-Helper (infra.resilience.spec.ts:180)
```

**Implementierung:** Siehe `tools/dev/pipeline/todo_report.sh` (zu erstellen).

## Wartung und Lifecycle

### Wann TODOs entfernen?

1. **Feature implementiert:**
   - Issue-ID geschlossen (z.B. FRONTEND-123 → merged)
   - Exit-Kriterium erfüllt (z.B. Widget-Namen sichtbar)
   
   **Aktion:**
   - TODO-Kommentar entfernen
   - Assertion aktivieren (auskommentieren)
   - Wenn Test geskippt war: Skip-Zeile ebenfalls entfernen

2. **Feature nicht mehr benötigt:**
   - Architektur geändert, Feature obsolet
   
   **Aktion:**
   - TODO-Kommentar und zugehörige Assertion komplett entfernen
   - Dokumentiere Grund im Commit-Message

3. **TODO veraltet/falsch:**
   - Feature wurde anders implementiert als erwartet
   
   **Aktion:**
   - TODO aktualisieren (neue Issue-ID, neues Exit-Kriterium)
   - Oder komplett entfernen, falls nicht mehr relevant

### ⚠️ Spezialfall: TODO-Abbau nach Ticket C (UI-Signale)

**Nach Merge von Ticket C (UI-Signale):**

1. **Core-Standard:** ALLE TODOs müssen entfernt werden
   - Entweder durch Aktivierung der Assertions
   - Oder durch Entfernen (falls obsolet)
   - **Ziel: 0 TODOs in Core-Standard**

2. **Core-Advanced:** Nur TODOs für echte neue Features erlaubt
   - Keine „Reste" aus Ticket C
   - Jedes verbleibende TODO braucht Issue-Referenz für zukünftiges Feature

3. **Timeline:** Innerhalb 1 Woche nach Merge von Ticket C

**Prozess:** Siehe `UI_RELEASE_CHECKLIST.md` für detaillierten Ablaufplan.

### Review-Prozess

- **Quartal-Review:** Alle TODOs durchgehen, veraltete entfernen/aktualisieren
- **PR-Review:** Neue TODOs müssen Policy-konform sein (Issue-ID + Exit + Target)
- **CI-Integration (optional):** TODOs ohne Issue-ID → Warning (aber kein Fail)

## Unterschied: TODO vs. Skip

| Aspekt | TODO | test.skip |
|--------|------|-----------|
| **Zweck** | Dokumentiert fehlende Assertion | Verhindert Test-Execution in CI |
| **Verwendung** | Innerhalb des Tests | Am Anfang des Tests |
| **Bedingung** | Immer vorhanden | Nur wenn `process.env.CI === 'true'` |
| **Exit** | Feature implementiert → TODO entfernen | Feature implementiert → Skip + TODO entfernen |
| **Logging** | Nicht in CI sichtbar (außer via Report) | In Playwright-Output sichtbar |

**Regel:** Ein geskippter Test sollte immer mindestens ein TODO haben, das erklärt, welche Assertions blockiert sind.

## Anti-Patterns (zu vermeiden)

### ❌ Vage TODOs
```typescript
// TODO: Verbessern
// TODO: Später prüfen
// TODO: Fix this
```

**Problem:** Keine Nachverfolgbarkeit, unklar wann/wie zu entfernen.

### ❌ Mehrere TODOs für dasselbe Feature
```typescript
// TODO(FRONTEND-101): Widget-Namen fehlen
// ...
// TODO(FRONTEND-101): Widget-Namen fehlen
// ...
// TODO(FRONTEND-101): Widget-Namen fehlen
```

**Problem:** Redundanz. **Lösung:** Ein Issue pro Feature, mehrere Assertions unter einem TODO gruppieren.

### ❌ TODOs ohne Assertion
```typescript
// TODO(BACKEND-999): Caching implementieren
await page.screenshot({path: 'test.png'});
```

**Problem:** Unklar, was getestet werden soll. **Lösung:** Mindestens kommentierte Assertion als Target angeben.

### ❌ TODOs in Produktionscode
```typescript
// In mobile/src/screens/FeedScreen.tsx:
// TODO: Widget-Namen anzeigen
```

**Problem:** TODOs in Production-Code sind ein anderes Thema. Diese Policy gilt nur für Tests.

## Integration mit CI

### Optional: TODO-Count-Tracking

Man kann die Anzahl der TODOs über die Zeit tracken (z.B. in GitHub Issues):

```bash
# In CI-Pipeline:
TODO_COUNT=$(grep -r "TODO(" tests/e2e/browseri/playwright/specs/ | wc -l)
echo "::notice::E2E TODOs: $TODO_COUNT"

# Optional: Als Kommentar in PR posten
```

**Ziel:** TODO-Count sollte über Zeit sinken (Feature-Implementierung), nicht steigen.

### TODO-Validierung (optional)

Ein Linter könnte prüfen:
- Jedes TODO hat Format `TODO(ISSUE-ID):`
- Jedes TODO hat `Exit:` und `Target:` Zeilen
- Issue-IDs existieren (via GitHub API)

**Implementierung:** Könnte als Pre-Commit-Hook oder CI-Step hinzugefügt werden.

## Zusammenfassung

1. **Jedes TODO muss eine Issue-ID haben** (z.B. `FRONTEND-123`, `BACKEND-456`)
2. **Jedes TODO muss Exit-Kriterium und Target-Assertion haben**
3. **UI-blockierte Tests:** TODO + Skip kombinieren
4. **Backend-Feature fehlt:** TODO ohne Skip (Test läuft trotzdem)
5. **Regelmäßiges Review:** Veraltete TODOs entfernen/aktualisieren
6. **Optional:** CI-Reporter für TODO-Sichtbarkeit implementieren

**Ziel:** TODOs sind kein „Müllhalde", sondern nachverfolgbare Tech-Debt mit klarem Exit-Pfad.
