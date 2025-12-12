# UI-Release-Guide: TODO-Abbau nach Ticket C

**Zielgruppe:** Frontend-Team, Test-Maintainer  
**Zweck:** Systematischer Abbau von BLOCKED-UI Skips und TODOs nach UI-Freigabe  
**Voraussetzung:** Ticket C (UI-Signale) gemerged

---

## Ziel

Nach Merge von Ticket C (UI-Signale):
- ✅ Alle 25 BLOCKED-UI Skips entfernen
- ✅ Alle TODOs in Core-Standard aktivieren/entfernen
- ✅ Core-Advanced: TODOs nur für neue Features, nicht für Reste

**Quality Gates:**
- 0 BLOCKED-UI Skips (gesamt)
- 0 TODOs in Core-Standard
- 100% Pass-Rate in CI

**Timeline:** 1 Woche nach Merge von Ticket C

---

## Voraussetzung: Ticket C (UI-Signale) gemerged

### Kritische UI-Signale (Must-Have)

| Feature | testId | Beschreibung |
|---------|--------|--------------|
| Widget-Namen im Feed | `feed.widget.name` | Widget-Namen sichtbar im Feed |
| Error-Toast | `error.toast` | Generische Error-Toast-Komponente |
| Rate-Limit-Meldung | `login.error.rateLimit` | Spezifische Rate-Limit-Fehlermeldung |
| Empty-State | `feed.empty` | Anzeige für leeren Feed |
| Loading-Indicator | `loading.spinner` | Spinner/Loading-Indicator |
| Rollen-Anzeige | `account.role` | Rolle im Account-Screen |
| Offline-Indikator | `status.offline` | Offline-Status-Anzeige |

### Erweiterte UI-Signale (Should-Have)

| Feature | testId/Route | Beschreibung |
|---------|--------------|--------------|
| Backend-Error-States | `error.backend` | 500, 503, Timeout-Anzeigen |
| Rollenspezifische Features | `premium.feature` | Feature-Visibility nach Rolle |
| Zusätzliche Routen | `/account`, `/settings` | Navigation zu neuen Screens |

### Nice-to-Have (Optional)

- Focus-Management (Auto-Focus auf Inputs)
- Keyboard-Navigation-Highlighting
- Mobile-Navigation (Hamburger-Menu)
- Storage-Quota-Error-Handling

**Verifikation:** Ticket C liefert PR mit allen testIds und UI-Komponenten.

---

## Phase 1: Vorbereitung

### 1.1 Inventory erstellen

```bash
cd /home/runner/work/homewidget-system/homewidget-system/tests/e2e/browseri/playwright

# Alle BLOCKED-UI Skips identifizieren
grep -rn "test.skip.*BLOCKED-UI" specs/
```

**Erwartetes Ergebnis:** 25 Skips gefunden

### 1.2 TODO-Mapping generieren

```bash
# Mapping-Tool ausführen
bash ../../../tools/dev/pipeline/ui_release_todo_mapping.sh
```

**Output:** Skip → TODO Zuordnung mit:
- Test-ID
- Grund
- Exit-Kriterium
- Zugehörige TODOs
- Kommentierte Assertions

### 1.3 Testplan erstellen

**Core-Standard (Prio 1):**
- FEED-01, FEED-03, FEED-04, FEED-05
- WIDGET-02
- AUTH-08
- INFRA-02, INFRA-03, INFRA-05

**Core-Advanced (Prio 2):**
- ROLE-01 (3 Tests)
- ROLE-02 (3 Tests)
- INFRA-06, INFRA-07, INFRA-08
- BROWSER-01, BROWSER-02, BROWSER-04, BROWSER-05, BROWSER-06

---

## Phase 2: Skip-Entfernung

### 2.1 Branch erstellen

```bash
cd /home/runner/work/homewidget-system/homewidget-system
git checkout main
git pull
git checkout -b feature/remove-blocked-ui-skips
```

### 2.2 Skips entfernen (Core-Standard)

**Für jeden Skip:**

#### Schritt 1: Skip-Zeile entfernen

```diff
test('@standard FEED-01: Home-Feed zeigt eigene Widgets', async ({page}) => {
-   test.skip(process.env.CI === 'true', 'BLOCKED-UI: Widget-Namen nicht sichtbar. Entfernen sobald Widget-Namen-Anzeige implementiert ist.');
    
    // Test-Code...
});
```

#### Schritt 2: TODO-Assertions aktivieren

```diff
- // TODO(FRONTEND-101): Widget-Namen sind im Feed-UI nicht sichtbar.
- //   Exit: Widget-Namen-Anzeige implementiert.
- //   Target: await expect(page.getByText('Test Widget')).toBeVisible();
- // await expect(page.getByText('Test Widget')).toBeVisible();
+ await expect(page.getByText('Test Widget')).toBeVisible();
```

#### Schritt 3: testIds anpassen (falls nötig)

```typescript
// Falls Ticket C andere testIds liefert als erwartet:
- await expect(page.getByText('Test Widget')).toBeVisible();
+ await expect(page.getByTestId('feed.widget.name')).toHaveText('Test Widget');
```

#### Schritt 4: Test lokal ausführen

```bash
npx playwright test --grep "FEED-01"
```

#### Schritt 5: Bei Failure anpassen, nicht überspringen!

**Häufige Anpassungen:**
- testId anpassen
- Selector präzisieren
- Wait hinzufügen (state-based!)

### 2.3 Dateiliste Core-Standard

**Zu bearbeiten:**
- `specs/feed.spec.ts` (FEED-01, FEED-03, FEED-04, FEED-05)
- `specs/widgets.basic.spec.ts` (WIDGET-02)
- `specs/auth.resilience.spec.ts` (AUTH-08)
- `specs/infra.health.spec.ts` (INFRA-02)
- `specs/infra.resilience.spec.ts` (INFRA-03, INFRA-05)

### 2.4 Skips entfernen (Core-Advanced)

**Gleicher Prozess wie 2.2, aber für Advanced-Tests.**

**Zu bearbeiten:**
- `specs/roles.spec.ts` (ROLE-01, ROLE-02)
- `specs/infra.resilience.spec.ts` (INFRA-06, INFRA-07, INFRA-08)
- `specs/browser.spec.ts` (BROWSER-01, BROWSER-02, BROWSER-04, BROWSER-05, BROWSER-06)

---

## Phase 3: Validierung

### 3.1 Lokale Tests

**Core-Standard:**
```bash
cd tests/e2e/browseri/playwright
npx playwright test --project=standard
```

**Erwartetes Ergebnis:**
- Alle Tests grün
- 0 Skips
- ~30/30 passed

**Core-Advanced:**
```bash
npx playwright test --project=advanced
```

**Erwartetes Ergebnis:**
- Alle Tests grün
- 0 Skips
- ~40/40 passed

### 3.2 CI-Simulation

```bash
CI=true npx playwright test --project=standard
CI=true npx playwright test --project=advanced
```

**Erwartetes Ergebnis:** Identisch zu lokal (keine Skips mehr).

---

## Phase 4: Quality Gates

### 4.1 TODO-Count: Muss 0 sein (Core-Standard)

```bash
cd tests/e2e/browseri/playwright

# Zähle verbleibende TODOs in Standard-Tests
grep -r "TODO" specs/feed.spec.ts specs/widgets.basic.spec.ts specs/auth.resilience.spec.ts specs/infra.*.spec.ts | wc -l
```

**Erwartetes Ergebnis:** 0

**Falls nicht 0:**
- TODOs aktivieren (Assertions implementieren)
- TODOs entfernen (obsolet)
- TODOs nach Advanced verschieben (falls nicht core-kritisch)

### 4.2 Skip-Count: Muss 0 sein (Gesamt)

```bash
grep -r "test.skip.*BLOCKED-UI" specs/ | wc -l
```

**Erwartetes Ergebnis:** 0

**Falls nicht 0:** Fehlende UI-Features identifizieren, Ticket C nachfordern.

### 4.3 Test-Coverage: Keine Regression

**Vor Ticket C:**
```
Core-Standard: ~30 Tests (15 grün, 15 geskippt)
Core-Advanced: ~40 Tests (30 grün, 10 geskippt)
```

**Nach Ticket C:**
```
Core-Standard: ~30 Tests (30 grün, 0 geskippt) ✅
Core-Advanced: ~40 Tests (40 grün, 0 geskippt) ✅
```

**Validierung:**
```bash
npx playwright test --project=standard --reporter=list | grep "passed"
npx playwright test --project=advanced --reporter=list | grep "passed"
```

---

## Phase 5: Dokumentation

### 5.1 Quarantine-Docs aktualisieren

**Datei:** `docs/e2e/ci-quarantine-management.md`

```diff
- **Status:** 25 Tests quarantänisiert (Stand: 2025-12-12)
+ **Status:** 0 Tests quarantänisiert (Stand: YYYY-MM-DD)
+ 
+ Alle UI-Signale aus Ticket C implementiert.
+ Alle BLOCKED-UI Skips wurden entfernt.
```

### 5.2 Testing-Guide aktualisieren

**Datei:** `docs/e2e/playwright-testing-guide.md`

Füge "Success Story" hinzu:
```markdown
## Success Story: UI-Release nach Ticket C

**Vorher (vor Ticket C):**
- 25 BLOCKED-UI Skips
- 39 TODOs in Core-Standard/Advanced

**Nachher (nach Ticket C):**
- 0 BLOCKED-UI Skips ✅
- 0 TODOs in Core-Standard ✅
- Advanced: TODOs nur für echte neue Features
```

---

## Phase 6: PR & Review

### 6.1 PR erstellen

**Titel:** `fix(e2e): Remove all BLOCKED-UI skips after Ticket C (UI signals)`

**Beschreibung:**
```markdown
## Zusammenfassung

Entfernt alle 25 BLOCKED-UI Skips nach Implementierung der UI-Signale in Ticket C.

## Änderungen

- ✅ Alle `test.skip(process.env.CI === 'true', 'BLOCKED-UI: ...')` entfernt
- ✅ Alle TODO-Assertions aktiviert und implementiert
- ✅ testIds angepasst (wo nötig)
- ✅ Dokumentation aktualisiert

## Verifikation

- [x] Alle Core-Standard-Tests grün (lokal + CI)
- [x] Alle Core-Advanced-Tests grün (lokal + CI)
- [x] TODO-Count: 0 in Core-Standard
- [x] Skip-Count: 0 (gesamt)

## Test-Ergebnisse

Core-Standard: 30/30 passed, 0 skipped
Core-Advanced: 40/40 passed, 0 skipped

## Dependencies

- Requires: Ticket C (UI-Signale) merged
```

### 6.2 Review-Checkliste

**Reviewer prüft:**
- [ ] Alle Skips entfernt?
- [ ] Alle TODOs in Core-Standard entfernt/aktiviert?
- [ ] Tests laufen grün in CI?
- [ ] Dokumentation aktualisiert?
- [ ] Keine neuen `waitForTimeout()` eingeführt?
- [ ] testIds konsistent mit Ticket C?

---

## Rollback-Plan

**Falls Ticket C unvollständig ist:**

### 1. Identifiziere fehlende UI-Features

```bash
# Führe Tests aus, sammle Failures
npx playwright test --project=standard --reporter=list | grep "failed"
```

### 2. Erstelle Ticket C.1 (Nachbesserung)

- Liste fehlender testIds/UI-Komponenten
- Priorisiere nach Test-Level (Minimum > Standard > Advanced)

### 3. Temporärer Skip (nur wenn kritisch)

```typescript
// Nur wenn Test CI komplett blockiert:
test.skip(process.env.CI === 'true', 
    'BLOCKED-UI: Feature XYZ fehlt noch (Ticket C.1). Entfernen sobald Ticket C.1 gemerged ist.');
```

### 4. Kommunikation

- Frontend-Team informieren
- Neue Deadline für C.1 vereinbaren
- Skip-Count dokumentieren

---

## Monitoring nach Release

### Wöchentlicher Check (erste 4 Wochen)

```bash
cd tests/e2e/browseri/playwright

# Prüfe: Keine neuen Skips hinzugefügt?
grep -r "test.skip.*BLOCKED-UI" specs/ | wc -l
# Erwartung: 0

# Prüfe: Keine neuen TODOs in Core-Standard?
bash ../../../tools/dev/pipeline/todo_report.sh
# Erwartung: Core-Standard hat 0 TODOs
```

### Regression-Prevention

**Pre-Commit-Hook (optional):**
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Verhindere neue BLOCKED-UI Skips nach Ticket C
if git diff --cached | grep -q "test.skip.*BLOCKED-UI"; then
    echo "ERROR: Neue BLOCKED-UI Skips sind nicht erlaubt nach Ticket C."
    echo "Bitte implementiere UI-Feature statt Skip hinzuzufügen."
    exit 1
fi
```

---

## Tools & Commands

### Mapping-Tool

```bash
# Skip→TODO Mapping generieren
bash tools/dev/pipeline/ui_release_todo_mapping.sh
```

**Output:**
- Skip-Liste mit zugehörigen TODOs
- Test-IDs, Gründe, Exit-Kriterien
- Priorisierungs-Empfehlung

### TODO-Report

```bash
# TODO-Report generieren
bash tools/dev/pipeline/todo_report.sh
```

**Output:**
- Gesamt-TODOs
- Policy-konforme TODOs
- Nicht-konforme TODOs (Warnings)
- Kategorisierung (Frontend/Backend/Infra)

---

## Success Metrics

| Metrik | Vor Ticket C | Nach Ticket C | Status |
|--------|--------------|---------------|--------|
| BLOCKED-UI Skips | 25 | 0 | ✅ |
| TODOs (Core-Standard) | 15+ | 0 | ✅ |
| TODOs (Core-Advanced) | 24+ | 0-5* | ✅ |
| Test-Pass-Rate (Standard) | 50% | 100% | ✅ |
| Test-Pass-Rate (Advanced) | 75% | 100% | ✅ |

\* Advanced darf TODOs für zukünftige Features haben

---

## Kontakt & Ownership

- **Ticket-Owner:** Test-Maintainer
- **Dependency:** Frontend-Team (Ticket C)
- **Review:** CI/CD-Team + Frontend-Team
- **Timeline:** 1 Woche nach Merge von Ticket C

---

## Zusammenfassung

**Vor Ticket C:**
- 25 BLOCKED-UI Skips
- Tests validieren nur Backend
- UI-Features fehlen

**Nach Ticket C:**
- 0 BLOCKED-UI Skips ✅
- Tests validieren Backend + UI ✅
- 100% Pass-Rate ✅

**Prozess:**
1. Ticket C verifizieren (UI-Signale vorhanden)
2. Branch erstellen
3. Alle Skips entfernen
4. Alle TODOs aktivieren
5. Quality Gates prüfen
6. PR + Review
7. Merge

**Timeline:** 1 Woche

---

**Letzte Aktualisierung:** 2025-12-12  
**Status:** Wartet auf Ticket C
