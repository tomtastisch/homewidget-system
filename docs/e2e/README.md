# E2E Testing Documentation

**Zentrale Dokumentation für Browser-E2E-Tests mit Playwright**

---

## Dokumentations-Übersicht

| Dokument | Zielgruppe | Zweck |
|----------|------------|-------|
| **[playwright-testing-guide.md](playwright-testing-guide.md)** | Test-Entwickler | Best Practices, Patterns, Richtlinien für Test-Implementierung |
| **[ci-quarantine-management.md](ci-quarantine-management.md)** | CI/CD-Team, Test-Maintainer | Verwaltung von UI-blockierten Tests, Quarantäne-Mechanismus |
| **[ui-release-guide.md](ui-release-guide.md)** | Frontend + Test-Team | Systematischer TODO-Abbau nach UI-Freigabe (Ticket C) |

---

## Schnellstart

### Für Test-Entwickler

**Neue Tests schreiben:**
```bash
# Lese zuerst:
cat docs/e2e/playwright-testing-guide.md

# Tests ausführen:
cd tests/e2e/browseri/playwright
npm test
```

**Wichtigste Regeln:**
- State-based waits statt `waitForTimeout()`
- TODOs mit Issue-ID: `TODO(FRONTEND-123): ...`
- UI-blockiert? Skip + TODO kombinieren
- Backend immer via API validieren

### Für CI/CD-Team

**Quarantäne überwachen:**
```bash
# Skip-Count prüfen:
bash tools/dev/pipeline/quarantine_report.sh

# TODO-Count prüfen:
bash tools/dev/pipeline/todo_report.sh
```

**Wichtigste Metriken:**
- BLOCKED-UI Skips: 25 (Ziel: 0 nach Ticket C)
- TODOs: 39 (Ziel: 0 in Core-Standard nach Ticket C)

**Details:** [ci-quarantine-management.md](ci-quarantine-management.md)

### Für Frontend-Team

**Nach Merge von Ticket C:**
```bash
# UI-Release-Guide lesen:
cat docs/e2e/ui-release-guide.md

# Mapping-Tool ausführen:
bash tools/dev/pipeline/ui_release_todo_mapping.sh
```

**Erwartung:**
- Alle 25 Skips entfernen
- Alle TODOs aktivieren
- Timeline: 1 Woche

**Details:** [ui-release-guide.md](ui-release-guide.md)

---

## Architektur

```
┌─────────────────────────────────────────────────────────┐
│                   Browser (Playwright)                   │
│                                                          │
│  ┌────────────────┐         ┌──────────────────────┐   │
│  │  Expo-Web      │────────>│  Backend API         │   │
│  │  (Port 19006)  │  HTTP   │  (Port 8100)         │   │
│  │  React Native  │         │  FastAPI E2E-Modus   │   │
│  └────────────────┘         └──────────────────────┘   │
│                                                          │
│  Tests validieren:                                       │
│  - UI (DOM, testIds)                                     │
│  - API (HTTP, JSON)                                      │
│  - Integration (UI + Backend)                            │
└─────────────────────────────────────────────────────────┘
```

**Test-Ebenen:**
- **@minimum** (10 Tests): Kritische Basis-Funktionalität
- **@standard** (26 Tests): Erweiterte Fehlerbehandlung
- **@advanced** (60 Tests): Edge-Cases, komplexe Szenarien

---

## Status (Stand: 2025-12-12)

### Aktuelle Metriken

| Metrik | Wert | Ziel |
|--------|------|------|
| Gesamt-Tests | 60 | 60 |
| Aktive Tests (grün) | 35 | 60 |
| UI-blockierte Tests (Skip) | 25 | 0 |
| TODOs (gesamt) | 39 | 5* |
| Backend-Coverage | ✅ 100% | ✅ 100% |
| UI-Coverage | ⚠️ 58% | ✅ 100% |

\* Nach Ticket C: 0 in Core-Standard, <5 in Advanced

### Ticket 15-2-A: Abgeschlossen ✅

**Test-Layer-Maßnahmen implementiert:**
- [x] State-based Wait-Helpers
- [x] TODO-Policy mit Issue-Tracking
- [x] BLOCKED-UI Audit (alle Skips korrekt)
- [x] CI-Reporter (TODO + Quarantine)
- [x] UI-Release-Vorbereitung

**Nächster Schritt:** Warten auf Ticket C (UI-Signale)

---

## Tools & Scripts

### Reporting-Tools

```bash
# TODO-Report (Policy-Compliance)
bash tools/dev/pipeline/todo_report.sh

# Quarantäne-Report (Skip-Count)
bash tools/dev/pipeline/quarantine_report.sh

# UI-Release-Mapping (Skip→TODO)
bash tools/dev/pipeline/ui_release_todo_mapping.sh
```

### Test-Ausführung

```bash
cd tests/e2e/browseri/playwright

# Standard (empfohlen für lokale Entwicklung)
npm test

# Nur Minimum (schnell)
npm run test:minimum

# Alle Tests (inkl. Advanced)
npm run test:all

# Mit sichtbarem Browser
npm run test:headed

# CI-Modus simulieren
CI=true npm test
```

---

## FAQ

### Warum sind Tests geskippt?

**Antwort:** UI-Features fehlen noch. Backend funktioniert und wird validiert, aber UI kann nicht getestet werden.

**Details:** [ci-quarantine-management.md](ci-quarantine-management.md)

### Wann werden Skips entfernt?

**Antwort:** Nach Merge von Ticket C (UI-Signale). Prozess dauert ca. 1 Woche.

**Details:** [ui-release-guide.md](ui-release-guide.md)

### Wie schreibe ich neue Tests?

**Antwort:** Siehe [playwright-testing-guide.md](playwright-testing-guide.md)

**Wichtigste Regeln:**
1. State-based waits (keine `waitForTimeout()`)
2. TODOs mit Issue-ID
3. Backend via API validieren
4. UI-blockiert → Skip + TODO

### Wie ersetze ich waitForTimeout?

**Antwort:** Nutze `helpers/waits.ts`:

```typescript
import {waitAfterReload, waitForNetworkIdle} from '../helpers/waits';

// ❌ Statt:
await page.reload();
await page.waitForTimeout(2000);

// ✅ Nutze:
await page.reload();
await waitAfterReload(page);
```

**Details:** [playwright-testing-guide.md](playwright-testing-guide.md#2-state-based-waiting-wichtig)

---

## Kontakte

| Rolle | Verantwortung |
|-------|---------------|
| **Test-Maintainer** | Test-Implementierung, Skip-Verwaltung |
| **Frontend-Team** | UI-Features (Ticket C), TODO-Abbau-Support |
| **CI/CD-Team** | Pipeline-Überwachung, Metriken |

---

## Weiterführende Dokumentation

### Playwright
- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)

### Projekt-spezifisch
- Test-Specs: `tests/e2e/browseri/playwright/specs/`
- Helper-API: `tests/e2e/browseri/playwright/helpers/`
- Config: `tests/e2e/browseri/playwright/playwright.config.ts`

---

**Letzte Aktualisierung:** 2025-12-12  
**Ticket-Status:** 15-2-A abgeschlossen, wartet auf Ticket C
