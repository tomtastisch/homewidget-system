# UI-Release-Checklist: TODO-Abbau nach Ticket C (UI-Signale)

**Ziel:** Nach Merge von Ticket C (UI-Signale) alle BLOCKED-UI Skips entfernen und TODOs abbauen.  
**Target:** 0 TODOs in core-standard, core-advanced nur für zusätzliche Coverage.

---

## Voraussetzung: Ticket C (UI-Signale) gemerged

**Ticket C muss folgende UI-Features liefern:**

### Kritische UI-Signale (Minimum/Standard)
- ✅ Widget-Namen im Feed-UI sichtbar (`testId: 'feed.widget.name'`)
- ✅ Error-Toast-Komponente für Backend-Fehler (`testId: 'error.toast'`)
- ✅ Rate-Limit-Fehlermeldung im Login (`testId: 'login.error.rateLimit'`)
- ✅ Empty-State für leeren Feed (`testId: 'feed.empty'`)
- ✅ Loading-Indicator/Spinner (`testId: 'loading.spinner'`)

### Erweiterte UI-Signale (Standard/Advanced)
- ✅ Rollen-Anzeige in Account-Screen (`testId: 'account.role'`)
- ✅ Rollenspezifische Feature-Visibility (z.B. `testId: 'premium.feature'`)
- ✅ Offline-Indikator (`testId: 'status.offline'`)
- ✅ Backend-Error-States (500, 503, Timeout) (`testId: 'error.backend'`)
- ✅ Zusätzliche Routen (`/account`, `/settings`)

### Nice-to-Have (Advanced)
- ✅ Focus-Management (Auto-Focus auf Inputs)
- ✅ Keyboard-Navigation-Highlighting
- ✅ Mobile-Navigation (Hamburger-Menu)
- ✅ Storage-Quota-Error-Handling

**Verifikation:** Ticket C liefert PR mit allen testIds und UI-Komponenten.

---

## Phase 1: Vorbereitung (vor Merge von Ticket C)

### 1.1 Inventory: Alle BLOCKED-UI Skips identifizieren

```bash
cd /home/runner/work/homewidget-system/homewidget-system/tests/e2e/browseri/playwright
grep -rn "test.skip.*BLOCKED-UI" specs/
```

**Erwartetes Ergebnis:** 25 Skips gefunden (aktueller Stand).

### 1.2 TODO-Mapping erstellen

Für jeden Skip: Welche TODOs müssen aktiviert werden?

**Beispiel:**
```
Skip: FEED-01 (feed.spec.ts:15)
  → TODO: await expect(page.getByText('Test Widget')).toBeVisible();
  
Skip: FEED-03 (feed.spec.ts:91)
  → TODO: await expect(page.getByTestId('feed.error')).toBeVisible();
  → TODO: await expect(page.getByText(/Rate limit/i)).toBeVisible();
```

**Tool:** Nutze `tools/dev/pipeline/ui_release_todo_mapping.sh` (siehe unten).

### 1.3 Testplan: Welche Tests in welcher Phase?

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

## Phase 2: Sofort nach Merge von Ticket C

### 2.1 Branch erstellen

```bash
git checkout main
git pull
git checkout -b feature/remove-blocked-ui-skips
```

### 2.2 Skips entfernen (Core-Standard)

**Für jeden Skip in Core-Standard:**

1. **Entferne Skip-Zeile:**
   ```diff
   - test.skip(process.env.CI === 'true', 'BLOCKED-UI: ...');
   ```

2. **Aktiviere TODO-Assertions:**
   ```diff
   - // TODO(FRONTEND-101): Widget-Namen sind im Feed-UI nicht sichtbar.
   - //   Exit: Widget-Namen-Anzeige implementiert.
   - //   Target: await expect(page.getByText('Test Widget')).toBeVisible();
   - // await expect(page.getByText('Test Widget')).toBeVisible();
   + await expect(page.getByText('Test Widget')).toBeVisible();
   ```

3. **Passe testIds an (wenn nötig):**
   ```typescript
   // Falls Ticket C andere testIds liefert:
   - await expect(page.getByText('Test Widget')).toBeVisible();
   + await expect(page.getByTestId('feed.widget.name')).toHaveText('Test Widget');
   ```

4. **Test lokal ausführen:**
   ```bash
   npx playwright test --grep "FEED-01"
   ```

5. **Bei Failure:** Test anpassen, nicht überspringen!

**Dateiliste Core-Standard:**
- `specs/feed.spec.ts` (FEED-01, FEED-03, FEED-04, FEED-05)
- `specs/widgets.basic.spec.ts` (WIDGET-02)
- `specs/auth.resilience.spec.ts` (AUTH-08)
- `specs/infra.health.spec.ts` (INFRA-02)
- `specs/infra.resilience.spec.ts` (INFRA-03, INFRA-05)

### 2.3 Skips entfernen (Core-Advanced)

**Für jeden Skip in Core-Advanced:**

Gleicher Prozess wie 2.2, aber für Advanced-Tests.

**Dateiliste Core-Advanced:**
- `specs/roles.spec.ts` (ROLE-01, ROLE-02)
- `specs/infra.resilience.spec.ts` (INFRA-06, INFRA-07, INFRA-08)
- `specs/browser.spec.ts` (BROWSER-01, BROWSER-02, BROWSER-04, BROWSER-05, BROWSER-06)

### 2.4 Lokale Validierung

**Alle Core-Standard-Tests:**
```bash
cd tests/e2e/browseri/playwright
npx playwright test --project=standard
```

**Erwartetes Ergebnis:** Alle Tests grün, 0 Skips.

**Alle Core-Advanced-Tests:**
```bash
npx playwright test --project=advanced
```

**Erwartetes Ergebnis:** Alle Tests grün, 0 Skips.

### 2.5 CI-Validierung

```bash
# Simuliere CI-Umgebung
CI=true npx playwright test --project=standard
```

**Erwartetes Ergebnis:** Alle Tests grün, 0 Skips.

---

## Phase 3: Quality Gates

### 3.1 TODO-Count: Muss 0 sein (Core-Standard)

```bash
# Zähle verbleibende TODOs in Standard-Tests
grep -r "TODO" specs/feed.spec.ts specs/widgets.basic.spec.ts specs/auth.resilience.spec.ts specs/infra.*.spec.ts | grep -v "TODO(" | wc -l
```

**Erwartetes Ergebnis:** 0

**Falls nicht 0:** Alle TODOs müssen entweder:
- Aktiviert werden (Assertions implementieren)
- Entfernt werden (obsolet)
- Nach Advanced verschoben werden (falls nicht core-kritisch)

### 3.2 Skip-Count: Muss 0 sein (Core-Standard + Core-Advanced)

```bash
# Zähle verbleibende BLOCKED-UI Skips
grep -r "test.skip.*BLOCKED-UI" specs/ | wc -l
```

**Erwartetes Ergebnis:** 0

**Falls nicht 0:** Fehlende UI-Features identifizieren und Ticket C nachfordern.

### 3.3 Test-Coverage: Keine Regression

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

## Phase 4: Dokumentation aktualisieren

### 4.1 QUARANTINE.md aktualisieren

```diff
- ## Kategorien von UI-blockierten Tests
- 
- ### Widget-/Feed-Anzeige
- - **FEED-01**: Widget-Namen nicht im Feed-UI sichtbar
- ...
+ ## Status: ALLE SKIPS ENTFERNT (Stand: YYYY-MM-DD)
+ 
+ Nach Merge von Ticket C (UI-Signale) wurden alle BLOCKED-UI Skips entfernt.
+ Alle UI-Features sind nun implementiert und testbar.
```

### 4.2 QUARANTINE_SUMMARY.md aktualisieren

```diff
- **Gesamt: 25 UI-blockierte Tests**
+ **Gesamt: 0 UI-blockierte Tests** (alle entfernt nach Ticket C)
```

### 4.3 TODO_POLICY.md aktualisieren

Füge "Success Story" hinzu:

```markdown
## Success Story: TODO-Abbau nach Ticket C

**Vorher (vor Ticket C):**
- 25 BLOCKED-UI Skips
- 39 TODOs in Core-Standard/Advanced

**Nachher (nach Ticket C):**
- 0 BLOCKED-UI Skips ✅
- 0 TODOs in Core-Standard ✅
- Advanced: TODOs nur für echte neue Features, nicht für Reste
```

---

## Phase 5: PR & Review

### 5.1 PR erstellen

**Titel:** `fix(e2e): Remove all BLOCKED-UI skips after Ticket C (UI signals)`

**Beschreibung:**
```markdown
## Zusammenfassung

Entfernt alle 25 BLOCKED-UI Skips nach Implementierung der UI-Signale in Ticket C.

## Änderungen

- ✅ Alle `test.skip(process.env.CI === 'true', 'BLOCKED-UI: ...')` entfernt
- ✅ Alle TODO-Assertions aktiviert und implementiert
- ✅ testIds angepasst (falls nötig)
- ✅ Dokumentation aktualisiert (QUARANTINE.md, TODO_POLICY.md)

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

### 5.2 Review-Checkliste

**Reviewer prüft:**
- [ ] Alle Skips entfernt?
- [ ] Alle TODOs in Core-Standard entfernt/aktiviert?
- [ ] Tests laufen grün in CI?
- [ ] Dokumentation aktualisiert?
- [ ] Keine neuen `waitForTimeout()` eingeführt? (sollten state-based waits sein)

---

## Automatisierung: Helper-Script

### `tools/dev/pipeline/ui_release_todo_mapping.sh`

Erstelle Script, das Skip → TODO Mapping generiert:

```bash
#!/usr/bin/env bash
# Generiert TODO-Mapping für UI-Release

set -euo pipefail

SPECS_DIR="${PROJECT_ROOT}/tests/e2e/browseri/playwright/specs"

echo "=== UI-Release TODO-Mapping ==="
echo ""

# Finde alle Skips
while IFS=: read -r file line skip_reason; do
    echo "Skip: ${file}:${line}"
    echo "  Grund: ${skip_reason}"
    
    # Suche TODOs in der Nähe (±20 Zeilen)
    start_line=$((line - 5))
    end_line=$((line + 20))
    
    todos=$(sed -n "${start_line},${end_line}p" "${file}" | grep -n "TODO" || true)
    if [[ -n "${todos}" ]]; then
        echo "  TODOs:"
        echo "${todos}" | while read -r todo; do
            echo "    - ${todo}"
        done
    else
        echo "  TODOs: (keine gefunden)"
    fi
    echo ""
done < <(grep -rn "test.skip.*BLOCKED-UI" "${SPECS_DIR}" | cut -d: -f1,2,3)
```

---

## Monitoring nach Release

### Wöchentlicher Check (erste 4 Wochen)

```bash
# Prüfe: Keine neuen Skips hinzugefügt?
grep -r "test.skip.*BLOCKED-UI" specs/ | wc -l
# Erwartung: 0

# Prüfe: Keine neuen TODOs hinzugefügt?
bash tools/dev/pipeline/todo_report.sh
# Erwartung: Core-Standard hat 0 TODOs
```

### Regression-Prevention

**Pre-Commit-Hook (optional):**
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Verhindere neue BLOCKED-UI Skips
if git diff --cached | grep -q "test.skip.*BLOCKED-UI"; then
    echo "ERROR: Neue BLOCKED-UI Skips sind nicht erlaubt nach Ticket C."
    echo "Bitte implementiere UI-Feature statt Skip hinzuzufügen."
    exit 1
fi
```

---

## Rollback-Plan

**Falls Ticket C unvollständig ist:**

1. **Identifiziere fehlende UI-Features:**
   ```bash
   # Führe Tests aus, sammle Failures
   npx playwright test --project=standard --reporter=list | grep "failed"
   ```

2. **Erstelle Ticket C.1 (Nachbesserung):**
   - Liste fehlender testIds/UI-Komponenten
   - Priorisiere nach Test-Level (Minimum > Standard > Advanced)

3. **Temporärer Skip (nur wenn kritisch):**
   ```typescript
   // Nur wenn Test CI komplett blockiert:
   test.skip(process.env.CI === 'true', 'BLOCKED-UI: Feature XYZ fehlt noch (Ticket C.1).');
   ```

4. **Kommunikation:**
   - Frontend-Team informieren
   - Neue Deadline für C.1 vereinbaren

---

## Success Metrics

| Metrik | Vor Ticket C | Nach Ticket C | Ziel |
|--------|--------------|---------------|------|
| BLOCKED-UI Skips | 25 | 0 | ✅ 0 |
| TODOs (Core-Standard) | 15+ | 0 | ✅ 0 |
| TODOs (Core-Advanced) | 24+ | 0-5* | ✅ <5 |
| Test-Pass-Rate (Standard) | 50% (15/30) | 100% (30/30) | ✅ 100% |
| Test-Pass-Rate (Advanced) | 75% (30/40) | 100% (40/40) | ✅ 100% |

\* Advanced darf TODOs für zukünftige Features haben, aber nicht für "Reste" aus Ticket C.

---

## Kontakt & Ownership

- **Ticket-Owner:** Test-Maintainer
- **Dependency:** Frontend-Team (Ticket C)
- **Review:** CI/CD-Team + Frontend-Team
- **Timeline:** Innerhalb 1 Woche nach Merge von Ticket C

---

**Checklist abgeschlossen?** ✅ Alle Skips entfernt, alle TODOs abgebaut, CI grün → **FERTIG!**
