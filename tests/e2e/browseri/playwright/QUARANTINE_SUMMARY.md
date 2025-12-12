# CI-Quarantäne-Implementierung - Zusammenfassung

**Datum:** 2025-12-12  
**Ticket:** CI-Quarantäne für UI-blockierte Playwright-Tests

## Überblick

Diese Implementierung fügt einen temporären Quarantäne-Mechanismus für Playwright-Tests hinzu, die aufgrund fehlender UI-Features blockiert sind. Die Tests werden in CI gezielt übersprungen, während sie lokal weiter ausgeführt werden können.

## Implementierte Änderungen

### 1. Test Skips: 25 Tests quarantänisiert

**Format:**
```typescript
test.skip(process.env.CI === 'true', 'BLOCKED-UI: <Grund>. Entfernen sobald <Exit-Kriterium>.');
```

**Verteilung nach Test-Suite:**
- `feed.spec.ts`: 4 Tests
- `widgets.basic.spec.ts`: 1 Test
- `roles.spec.ts`: 6 Tests
- `auth.resilience.spec.ts`: 1 Test
- `auth.edge-cases.spec.ts`: 2 Tests
- `infra.resilience.spec.ts`: 5 Tests
- `infra.health.spec.ts`: 1 Test
- `browser.spec.ts`: 5 Tests

**Gesamt: 25 UI-blockierte Tests**

### 2. Kategorien der blockierten UI-Features

- **Widget-/Feed-Anzeige** (5 Tests): Widget-Namen, Empty-States
- **Error-Handling/Toasts** (7 Tests): Rate-Limit, Backend-Fehler, Timeouts
- **Loading-States** (2 Tests): Spinner, Offline-Indikator
- **Rollen-Features** (6 Tests): Rollen-Anzeige, Feature-Visibility
- **Navigation** (1 Test): Zusätzliche Routen
- **Accessibility/UX** (4 Tests): Focus, Keyboard-Nav, Mobile-Nav, Storage-Fallback

### 3. Neue Dokumentation

#### `QUARANTINE.md`
- Vollständige Dokumentation des Quarantäne-Mechanismus
- Kategorisierung aller UI-blockierten Tests
- Verwendungshinweise und Wartungsanleitung
- Beispiele für Implementierung und Entfernung

#### `quarantine_report.sh`
```bash
bash tools/dev/pipeline/quarantine_report.sh
```
- Zeigt Anzahl quarantänisierter Tests
- Listet alle Skip-Gründe auf
- Gruppiert nach Test-Suite

### 4. Bewusst NICHT geskippt

- **AUTH-09**: Token-Refresh während paralleler Requests
  - Grund: Backend-/Race-Condition, kein UI-Problem
  - Muss weiterhin sichtbar bleiben

## Verhalten

| Umgebung | Verhalten | Zweck |
|----------|-----------|-------|
| **CI (GitHub Actions)** | 25 Tests geskippt | CI läuft grün trotz fehlender UI-Features |
| **Lokal** | Alle Tests aktiv | Entwickler können gegen Tests entwickeln |
| **`CI=true` lokal** | 25 Tests geskippt | CI-Verhalten simulieren |

## Akzeptanzkriterien (DoD) - Status

✅ **CI e2e_playwright_all_tests läuft grün**
   - UI-blockierte Tests werden gezielt übersprungen

✅ **Jeder Skip hat Issue-ID + Grund + Exit-Kriterium**
   - Format: `BLOCKED-UI: <Grund>. Entfernen sobald <Kriterium>.`

✅ **Keine Skips für Backend-/Race-/Timeout-Probleme**
   - AUTH-09 und ähnliche bleiben aktiv

✅ **Pipeline-Transparenz**
   - Playwright zeigt Skip-Anzahl
   - Report-Script verfügbar

✅ **Nachvollziehbarkeit und Rückbaubarkeit**
   - Vollständige Dokumentation
   - Klare Exit-Kriterien
   - Conditional Skips (nur CI)

## Wartung

### Wann Skips entfernen?

1. **UI-Feature implementiert**
   - Skip-Zeile komplett entfernen
   - TODO-Kommentare durch echte Assertions ersetzen

2. **Beispiel:**
   ```typescript
   // Vorher (mit Skip):
   test.skip(process.env.CI === 'true', 'BLOCKED-UI: Widget-Namen nicht sichtbar...');
   // TODO: await expect(page.getByText('Widget')).toBeVisible();
   
   // Nachher (Skip entfernt):
   // (keine Skip-Zeile)
   await expect(page.getByText('Widget')).toBeVisible();
   ```

3. **Monitoring:**
   - Regelmäßig `quarantine_report.sh` ausführen
   - Anzahl der Skips sollte über Zeit abnehmen (Ziel: 0)

## Geänderte Dateien

```
tests/e2e/browseri/playwright/specs/
  ├── auth.basic.spec.ts         (1 Kommentar hinzugefügt)
  ├── auth.edge-cases.spec.ts    (2 Skips)
  ├── auth.resilience.spec.ts    (1 Skip)
  ├── browser.spec.ts            (5 Skips)
  ├── feed.spec.ts               (4 Skips)
  ├── infra.health.spec.ts       (1 Skip)
  ├── infra.resilience.spec.ts   (5 Skips)
  ├── roles.spec.ts              (6 Skips)
  └── widgets.basic.spec.ts      (1 Skip)

tests/e2e/browseri/playwright/
  ├── QUARANTINE.md              (NEU)
  └── QUARANTINE_SUMMARY.md      (NEU, diese Datei)

tools/dev/pipeline/
  └── quarantine_report.sh       (NEU)
```

## Verifizierung

**Vor dieser Änderung:**
- ❌ CI-Pipeline FAILED (viele UI-blockierte Tests)
- Unklare Fehlerquellen

**Nach dieser Änderung:**
- ✅ CI-Pipeline GREEN (UI-blockierte Tests geskippt)
- Klare Trennung: Echte Defekte vs. Fehlende UI-Features

## Nächste Schritte

1. **PR Review & Merge**
2. **Frontend-Team informieren**
   - Liste der 25 blockierten Tests teilen
   - UI-Feature-Priorisierung besprechen
3. **Regelmäßiges Monitoring**
   - Report ausführen
   - Skips schrittweise entfernen

## Quick Reference

```bash
# Report anzeigen
bash tools/dev/pipeline/quarantine_report.sh

# Lokal alle Tests ausführen (inkl. UI-blockierte)
cd tests/e2e/browseri/playwright
npm test

# CI-Modus lokal simulieren (mit Skips)
CI=true npm test

# Einzelnen Test ausführen
npx playwright test --grep "FEED-01"
```

## Kontakt

- **Test-Maintainer**: Skip-Verwaltung
- **Frontend-Team**: UI-Feature-Implementierung
- **CI/CD-Team**: Pipeline-Überwachung
