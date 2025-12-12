# Ticket 15-2-A Quick Reference

**Status:** ✅ Abgeschlossen (Test-Layer-Maßnahmen)  
**Nächster Schritt:** TODO-Abbau nach Ticket C (UI-Signale)

---

## Was wurde gemacht?

### 1. State-based Wait-Helpers (`helpers/waits.ts`)

**Problem:** Willkürliche `waitForTimeout()` führten zu Flakiness.

**Lösung:** 
```typescript
import {waitAfterReload, waitForNetworkIdle, waitForApiCall} from '../helpers/waits';

// Statt:
await page.reload();
await page.waitForTimeout(2000); // ❌ Willkürlich

// Nutze:
await page.reload();
await waitAfterReload(page); // ✅ State-based
```

**Verfügbare Helfer:**
- `waitForNetworkIdle(page)` - Wartet auf Network Idle
- `waitForApiCall(page, urlPattern)` - Wartet auf API-Response
- `waitAfterReload(page)` - Nach Reload (DOM + Network)
- `waitForNavigation(page)` - Nach Navigation
- `waitForAnimation(page, reason, ms)` - Für UI-Transitions (max 1s)

---

### 2. TODO-Policy (`TODO_POLICY.md`)

**Regel:** Jedes TODO braucht Issue-ID, Exit-Kriterium und Target-Assertion.

**Format:**
```typescript
// TODO(FRONTEND-101): Widget-Namen sind im Feed-UI nicht sichtbar.
//   Exit: Widget-Namen-Anzeige in Feed-Komponente implementiert.
//   Target: await expect(page.getByText('Test Widget')).toBeVisible();
// await expect(page.getByText('Test Widget')).toBeVisible();
```

**CI-Tracking:**
```bash
bash tools/dev/pipeline/todo_report.sh
```

---

### 3. BLOCKED-UI Audit (`BLOCKED_UI_AUDIT.md`)

**Ergebnis:** 
- ✅ 25/25 Skips korrekt klassifiziert
- ✅ 0 Backend-/Infra-Fehler maskiert

**Skip-Format:**
```typescript
test.skip(process.env.CI === 'true', 
  'BLOCKED-UI: <Grund>. Entfernen sobald <Exit-Kriterium>.');
```

---

### 4. UI-Release-Vorbereitung

**Nach Merge von Ticket C (UI-Signale):**

1. **Checklist:** `UI_RELEASE_CHECKLIST.md`
   - Phase 1-5: Von Vorbereitung bis PR
   - Quality Gates: 0 Skips, 0 TODOs

2. **Mapping-Tool:** 
   ```bash
   bash tools/dev/pipeline/ui_release_todo_mapping.sh
   ```
   - Zeigt alle Skips mit zugehörigen TODOs
   - Priorisiert nach Test-Level

3. **Ziel:**
   - Core-Standard: 0 TODOs, 0 Skips
   - Core-Advanced: Nur TODOs für neue Features

---

## Schnellstart-Commands

### Tests ausführen
```bash
cd tests/e2e/browseri/playwright

# Lokal (inkl. geskippte Tests)
npx playwright test --project=standard

# CI-Modus simulieren (mit Skips)
CI=true npx playwright test --project=standard
```

### Reports generieren
```bash
# TODO-Report
bash tools/dev/pipeline/todo_report.sh

# Skip→TODO Mapping
bash tools/dev/pipeline/ui_release_todo_mapping.sh

# Quarantäne-Report (existierend)
bash tools/dev/pipeline/quarantine_report.sh
```

---

## Dokumentations-Übersicht

| Dokument | Zweck | Wann lesen? |
|----------|-------|-------------|
| **TICKET_15_2_A_RESULTS.md** | Vollständige Ergebnisdoku | Abschluss-Review |
| **TODO_POLICY.md** | TODO-Richtlinien | Vor neuen TODOs |
| **BLOCKED_UI_AUDIT.md** | Skip-Klassifizierung | Bei Skip-Fragen |
| **UI_RELEASE_CHECKLIST.md** | Ablauf nach Ticket C | Nach Ticket C Merge |
| **QUARANTINE.md** | Quarantäne-Mechanismus | Bei Skip-Verwaltung |
| **helpers/waits.ts** | Wait-Helper-API | Bei Test-Implementierung |

---

## Nächste Schritte

### Aktuell: Warten auf Ticket C

**Ticket C muss liefern:**
- Widget-Namen im Feed-UI (`testId: 'feed.widget.name'`)
- Error-Toast-Komponente (`testId: 'error.toast'`)
- Rate-Limit-Fehlermeldung (`testId: 'login.error.rateLimit'`)
- Empty-State für Feed (`testId: 'feed.empty'`)
- Loading-Indicator (`testId: 'loading.spinner'`)
- Rollen-Anzeige (`testId: 'account.role'`)
- ... (siehe `UI_RELEASE_CHECKLIST.md` für vollständige Liste)

### Nach Ticket C: TODO-Abbau (1 Woche)

1. Branch erstellen: `feature/remove-blocked-ui-skips`
2. `UI_RELEASE_CHECKLIST.md` abarbeiten
3. Alle 25 Skips entfernen
4. Alle TODOs aktivieren/entfernen
5. Quality Gates prüfen:
   - `grep -r "test.skip.*BLOCKED-UI" specs/ | wc -l` → Erwartung: 0
   - `bash tools/dev/pipeline/todo_report.sh` → Core-Standard: 0 TODOs
6. PR erstellen

---

## FAQs

### Warum sind Tests geskippt?
UI-Features fehlen noch. Backend funktioniert, UI kann aber nicht validiert werden. Siehe `BLOCKED_UI_AUDIT.md`.

### Wann werden Skips entfernt?
Nach Merge von Ticket C (UI-Signale). Prozess: `UI_RELEASE_CHECKLIST.md`.

### Wie schreibe ich neue TODOs?
Format: `TODO(ISSUE-ID): Beschreibung. Exit: Kriterium. Target: Assertion.`  
Details: `TODO_POLICY.md`.

### Wie ersetze ich waitForTimeout?
Nutze `helpers/waits.ts`:
- `waitForNetworkIdle()` statt `waitForTimeout(2000)`
- `waitForApiCall()` für spezifische API-Calls
- `waitAfterReload()` nach `page.reload()`

### Sind alle Skips korrekt?
Ja. Audit abgeschlossen: `BLOCKED_UI_AUDIT.md`. 25/25 Skips korrekt, 0 Backend-Fehler maskiert.

---

## Kontakte

- **Test-Layer (Ticket 15-2-A):** Test-Maintainer
- **UI-Signale (Ticket C):** Frontend-Team
- **TODO-Abbau (nach Ticket C):** Test-Maintainer + Frontend-Team

---

**Letzte Aktualisierung:** 2025-12-12  
**Ticket-Status:** ✅ Test-Layer abgeschlossen, ⏳ Warten auf Ticket C
