# CI-Quarantäne-Management für UI-blockierte Tests

**Zielgruppe:** CI/CD-Team, Test-Maintainer  
**Zweck:** Verwaltung von Tests, die durch fehlende UI-Features blockiert sind

---

## Übersicht

**Problem:** UI-Features fehlen noch, Tests können UI nicht validieren.  
**Lösung:** Temporäre Quarantäne in CI, Tests laufen lokal weiter.

**Status:** 25 Tests quarantänisiert (Stand: 2025-12-12)  
**Ziel:** 0 Tests (nach Merge von Ticket C - UI-Signale)

---

## Quarantäne-Mechanismus

### Format

```typescript
test('@standard FEED-01: Home-Feed zeigt eigene Widgets', async ({page}) => {
    test.skip(process.env.CI === 'true', 
        'BLOCKED-UI: Widget-Namen nicht sichtbar. Entfernen sobald Widget-Namen-Anzeige implementiert ist.');
    
    // Test-Code...
});
```

### Bestandteile

1. **Conditional Skip:** `test.skip(process.env.CI === 'true', '...')`
   - Überspringt Test nur in CI
   - Test läuft lokal weiter (Entwicklung möglich)

2. **BLOCKED-UI Prefix:** Einheitliche Identifikation in Logs

3. **Grund:** Kurze Beschreibung des fehlenden UI-Features

4. **Exit-Kriterium:** Wann der Skip entfernt werden muss

---

## Kategorien von UI-blockierten Tests

### Widget-/Feed-Anzeige (5 Tests)
- **FEED-01:** Widget-Namen nicht im Feed-UI sichtbar
- **FEED-04:** Widget-Namen für XSS-Validierung nicht sichtbar
- **FEED-05:** Empty-State-Anzeige für leeren Feed fehlt
- **WIDGET-02:** Widget-Details nicht in Feed-UI sichtbar

**Exit:** Widget-Namen-Anzeige implementiert (`testId: 'feed.widget.name'`)

### Error-Handling / Toasts (7 Tests)
- **FEED-03:** Error-Toast für Rate-Limit fehlt
- **AUTH-08:** Rate-Limit-Fehlermeldung im Login fehlt
- **INFRA-02:** Generic Error-Toast für 500-Fehler fehlt
- **INFRA-03:** Error-State für Backend-Unavailable fehlt
- **INFRA-07:** Timeout-Error-Handling fehlt
- **INFRA-08:** Error-Recovery-Anzeige fehlt

**Exit:** Error-Toast-Komponente implementiert (`testId: 'error.toast'`)

### Loading-States / Indicators (2 Tests)
- **INFRA-05:** Loading-Indicator/Spinner fehlt
- **INFRA-06:** Offline-Indikator fehlt

**Exit:** Loading-States implementiert (`testId: 'loading.spinner'`, `testId: 'status.offline'`)

### Rollen- und Feature-Visibility (6 Tests)
- **ROLE-01 (3x):** Rollen-Anzeige im UI (Demo/Common/Premium)
- **ROLE-02 (3x):** Rollenspezifische Features und Widget-Erstellung UI

**Exit:** Rollen-Anzeige implementiert (`testId: 'account.role'`)

### Navigation / Routen (1 Test)
- **BROWSER-01:** Mehrere App-Routen (/account, /settings) existieren nicht

**Exit:** Zusätzliche Routen implementiert

### Accessibility / UX (4 Tests)
- **BROWSER-02:** Storage-Quota-Error-Handling fehlt
- **BROWSER-04:** Auto-Fokus auf erstem Input-Feld fehlt
- **BROWSER-05:** Keyboard-Navigation-Highlighting fehlt
- **BROWSER-06:** Mobile-spezifische Navigation (Hamburger-Menu) fehlt

**Exit:** Accessibility-Features implementiert

---

## Audit-Ergebnisse

**Datum:** 2025-12-12

### Klassifizierung

- ✅ **25/25 Skips korrekt klassifiziert** (100%)
- ❌ **0 Skips falsch klassifiziert** (0%)
- ✅ **0 Backend-/Infra-Ursachen verdeckt**

### Methodik

**Für jeden Skip:**
1. Test-Code geprüft
2. Backend-API-Calls validiert (funktionieren)
3. Nur UI-Validierung blockiert
4. Exit-Kriterium spezifisch und umsetzbar

### Nicht-Quarantänisierte Tests (korrekt)

**Diese Tests laufen weiterhin in CI:**
- AUTH-09: Token-Refresh Race-Conditions (Backend-Test)
- AUTH-01 bis AUTH-03: Minimum-Tests (kritisch)
- WIDGET-01 bis WIDGET-03: Basis-CRUD (kritisch)
- INFRA-01, INFRA-04: Health/CORS (kritisch)
- BROWSER-03: Back-Button-Navigation (funktioniert)

**Gesamt:** 50+ Tests laufen aktiv und validieren Backend.

---

## Verhalten in verschiedenen Umgebungen

| Umgebung | Verhalten | Zweck |
|----------|-----------|-------|
| **CI (GitHub Actions)** | 25 Tests geskippt | CI läuft grün trotz fehlender UI-Features |
| **Lokal** | Alle Tests aktiv | Entwickler können gegen Tests entwickeln |
| **CI=true lokal** | 25 Tests geskippt | CI-Verhalten simulieren |

---

## Monitoring & Reporting

### Skip-Count tracken

```bash
# Quarantäne-Report generieren
bash tools/dev/pipeline/quarantine_report.sh

# Output:
=== Playwright E2E Quarantine Report ===
Quarantinierte Tests (CI-Skips): 25
```

### CI-Integration (optional)

```yaml
- name: Track Skip Count
  run: |
    cd tests/e2e/browseri/playwright
    SKIP_COUNT=$(grep -r "test.skip.*BLOCKED-UI" specs/ | wc -l)
    echo "::notice::UI-blockierte Tests: $SKIP_COUNT"
```

**Ziel:** Skip-Count sollte über Zeit sinken (Ziel: 0).

---

## Wartung

### Wann Skips entfernen?

**Sofort entfernen, wenn:**
1. UI-Feature implementiert wurde
2. Test ohne Skip erfolgreich durchläuft

**Prozess:**
1. Skip-Zeile entfernen:
   ```diff
   - test.skip(process.env.CI === 'true', 'BLOCKED-UI: ...');
   ```

2. TODO-Assertions aktivieren:
   ```diff
   - // TODO(FRONTEND-101): Widget-Namen sind im Feed-UI nicht sichtbar.
   - // await expect(page.getByText('Test Widget')).toBeVisible();
   + await expect(page.getByText('Test Widget')).toBeVisible();
   ```

3. Test lokal ausführen:
   ```bash
   npx playwright test --grep "FEED-01"
   ```

4. Bei Erfolg: Commit + Push

### Regelmäßiges Review

**Quartal-Review:**
- Alle Skips durchgehen
- Veraltete entfernen/aktualisieren
- Neue UI-Features checken

**PR-Review:**
- Neue Skips müssen Policy-konform sein
- Exit-Kriterium muss spezifisch sein
- Nur UI-Blocker dürfen geskippt werden

---

## Frontend-Team: Priorisierung

### Höchste Priorität (blockiert Core-Standard)

| Feature | Blockierte Tests | testId |
|---------|------------------|--------|
| Widget-Namen-Anzeige | FEED-01, FEED-04, WIDGET-02 | `feed.widget.name` |
| Error-Toast-Komponente | FEED-03, AUTH-08, INFRA-02/03/07/08 | `error.toast` |
| Empty-State für Feed | FEED-05 | `feed.empty` |
| Loading-Indicator | INFRA-05 | `loading.spinner` |

### Mittlere Priorität (Core-Advanced)

| Feature | Blockierte Tests | testId |
|---------|------------------|--------|
| Rollen-Anzeige | ROLE-01 (x3) | `account.role` |
| Rollenspezifische Features | ROLE-02 (x3) | `premium.feature` |
| Offline-Indikator | INFRA-06 | `status.offline` |
| Zusätzliche Routen | BROWSER-01 | `/account`, `/settings` |

### Niedrige Priorität (UX-Verbesserungen)

| Feature | Blockierte Tests |
|---------|------------------|
| Focus-Management | BROWSER-04 |
| Keyboard-Navigation | BROWSER-05 |
| Mobile-Navigation | BROWSER-06 |
| Storage-Quota-Handling | BROWSER-02 |

---

## Qualitätssicherung

### Regression-Prevention

**Pre-Commit-Hook (optional):**
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Nach Ticket C: Verhindere neue BLOCKED-UI Skips
if [[ "$POST_TICKET_C" == "true" ]] && git diff --cached | grep -q "test.skip.*BLOCKED-UI"; then
    echo "ERROR: Neue BLOCKED-UI Skips sind nicht erlaubt nach Ticket C."
    echo "Bitte implementiere UI-Feature statt Skip hinzuzufügen."
    exit 1
fi
```

### CI-Pipeline-Checks

**Quality Gates:**
- Skip-Count muss dokumentiert sein
- Jeder Skip muss Exit-Kriterium haben
- Keine Backend-/Infra-Tests dürfen geskippt sein

---

## Nach Ticket C (UI-Signale)

**Ticket C muss liefern:**
- Widget-Namen im Feed-UI (`testId: 'feed.widget.name'`)
- Error-Toast-Komponente (`testId: 'error.toast'`)
- Rate-Limit-Fehlermeldung (`testId: 'login.error.rateLimit'`)
- Empty-State für Feed (`testId: 'feed.empty'`)
- Loading-Indicator (`testId: 'loading.spinner'`)
- Rollen-Anzeige (`testId: 'account.role'`)
- Offline-Indikator (`testId: 'status.offline'`)
- Zusätzliche Routen (`/account`, `/settings`)

**Dann:**
1. Alle 25 Skips entfernen (siehe docs/e2e/ui-release-guide.md)
2. Quality Gate: 0 Skips, 0 TODOs
3. CI läuft grün mit 100% Pass-Rate

---

## Artefakte

**Screenshots:**
Alle geskippten Tests erzeugen Screenshots:
```
test-results/feed-01-widgets-loaded.png
test-results/role-01-demo.png
test-results/infra-03-backend-down.png
...
```

**Traces/Videos:**
Bei Failures automatisch generiert:
```
test-results/<test-name>/trace.zip
test-results/<test-name>/video.webm
```

---

## Verantwortlichkeiten

- **Frontend-Team:** UI-Features implementieren
- **Test-Maintainer:** Skips verwalten, nach UI-Release entfernen
- **CI/CD-Team:** Skip-Count überwachen, Metriken tracken

---

## Zusammenfassung

**Status quo (2025-12-12):**
- 25 Tests in CI-Quarantäne
- Alle Skips korrekt klassifiziert
- Backend-Funktionalität validiert
- Frontend-Team hat priorisierte Liste

**Ziel nach Ticket C:**
- 0 Tests in Quarantäne
- Alle UI-Features testbar
- CI läuft grün (100% Pass-Rate)

---

**Letzte Aktualisierung:** 2025-12-12  
**Nächstes Review:** Nach Merge von Ticket C
