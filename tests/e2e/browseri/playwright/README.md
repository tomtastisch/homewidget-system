# Playwright – Browser-E2E (Minimal, Standard, Advanced)

> **📚 ZENTRALE DOKUMENTATION:** Alle E2E-Dokumentation wurde nach `docs/e2e/` verschoben.
> 
> **Siehe:** [docs/e2e/README.md](../../../../docs/e2e/README.md)

## Überblick

Dieses Verzeichnis enthält die Browser-E2E-Infrastruktur auf Basis von Playwright mit drei Testebenen:

- **Minimal**: Kritische Infra-/Security-Pfade (Login/Logout, Widgets CRUD, Health)
- **Standard**: Erweiterte Resilience, Fehlerbehandlung, Feed-Tests, CORS
- **Advanced**: Edge-Cases, komplexe Szenarien, Security-Advanced, Performance

Die Tests laufen gegen das **Expo-Web-Frontend** (React Native Web) und das **Backend im E2E-Modus**.

## Architektur

### Testebenen & Tagging

Alle Tests sind mit Tags versehen, die eine selektive Ausführung ermöglichen:

- `@minimal`: Kritische Basistests (müssen immer grün sein)
- `@standard`: Erweiterte Tests für robuste Fehlerbehandlung
- `@advanced`: Edge-Cases und fortgeschrittene Szenarien

### Struktur

```
tests/e2e/browseri/playwright/
├── playwright.config.ts     # Konfiguration mit Test-Projekten (minimum/standard/advanced)
├── package.json             # Dependencies und Test-Scripts
├── helpers/                 # Wiederverwendbare Test-Helfer
│   ├── auth.ts             # Login, Logout, Rollen-Handling
│   ├── widgets.ts          # Widget-CRUD-Operationen
│   ├── security.ts         # XSS-Checks, CSP-Tests
│   ├── api.ts              # API-Context, Mocking, Error-Simulation
│   └── fixtures.ts         # Custom Fixtures (authenticated page, etc.)
├── specs/                   # Test-Spezifikationen (nach Kategorie)
│   ├── auth.basic.spec.ts           # @minimum: Login, Logout (AUTH-01 bis AUTH-03)
│   ├── auth.resilience.spec.ts      # @standard: Fehlerbehandlung (AUTH-04 bis AUTH-08)
│   ├── auth.edge-cases.spec.ts      # @advanced: Token-Refresh, Race-Conditions (AUTH-09+)
│   ├── widgets.basic.spec.ts        # @minimum: CRUD (WIDGET-01 bis WIDGET-03)
│   ├── widgets.security.spec.ts     # @minimum: Owner-Check, XSS (WIDGET-04, WIDGET-06)
│   ├── widgets.resilience.spec.ts   # @standard/@advanced: Backend-Fehler, Edge-Cases
│   ├── feed.spec.ts                 # @standard: Feed-Laden, Caching, XSS (FEED-01 bis FEED-05)
│   ├── roles.spec.ts                # @standard/@advanced: Rollenbasierte Features
│   ├── infra.health.spec.ts         # @minimum: Health-Checks (INFRA-01, INFRA-02)
│   ├── infra.resilience.spec.ts     # @standard/@advanced: CORS, Network, Offline
│   ├── security.advanced.spec.ts    # @advanced: CSP, Payload-Validierung (SEC-01, SEC-02)
│   └── browser.spec.ts              # @advanced: Session-Persistence, Responsive, UX
└── README.md                # Diese Datei

```

## Voraussetzungen

1. **Backend im E2E-Modus** (Port 8100):
   ```bash
   backend/tools/start_test_backend_e2e.sh &
   ```

2. **Expo-Web im E2E-Modus** (Port 19006):
   - Wird automatisch von Playwright gestartet (siehe `playwright.config.ts`)
   - Oder manuell: `cd mobile && npm run web`

3. **Umgebungsvariablen**:
   - `PLAYWRIGHT_WEB_BASE_URL`: Expo-Web-Frontend (Standard: `http://localhost:19006`)
   - `E2E_API_BASE_URL`: Backend-API im E2E-Modus (Standard: `http://127.0.0.1:8100`)
   - `EXPO_PUBLIC_API_BASE_URL`: Backend-URL für Expo-Web (gesetzt von Playwright)

## Installation & Ausführung

### Lokal

1. **In dieses Verzeichnis wechseln**:
   ```bash
   cd tests/e2e/browseri/playwright
   ```

2. **Abhängigkeiten installieren**:
   ```bash
   npm install
   ```

3. **Browser installieren** (beim ersten Mal):
   ```bash
   npx playwright install --with-deps chromium
   ```

4. **Tests ausführen**:

   **Minimum-Tests** (schnellster Durchlauf, nur kritische Tests):
   ```bash
   npm run test:minimum
   # oder
   npx playwright test --project=minimum
   ```

   **Standard-Tests** (Minimum + Standard, empfohlen für lokale Entwicklung):
   ```bash
   npm run test:standard
   # oder
   npm test
   ```

   **Alle Tests** (inkl. Advanced, für vollständige Coverage):
   ```bash
   npm run test:all
   # oder
   npx playwright test --project=advanced
   ```

   **Mit UI** (Browser sichtbar für Debugging):
   ```bash
   npm run test:headed
   ```

### CI-Integration

In der CI-Pipeline (`.github/workflows/ci.yml`):

- **Standard-CI** (bei jedem Push): nur `@minimum`
  ```yaml
  - name: 🌐 E2E Browser Tests (Playwright – Minimum)
    run: bash tools/dev/pipeline/ci_steps.sh e2e_playwright_minimum_tests
  ```

- **Nightly/Feature-Branch**: `@minimum + @standard`
  ```yaml
  - name: 🌐 E2E Browser Tests (Playwright – Standard)
    run: bash tools/dev/pipeline/ci_steps.sh e2e_playwright_standard_tests
  ```

- **Manuell/Release**: alle Tests (inkl. `@advanced`)
  ```yaml
  - name: 🌐 E2E Browser Tests (Playwright – Alle)
    run: bash tools/dev/pipeline/ci_steps.sh e2e_playwright_all_tests
  ```

## Testmatrix: Matrix vs. Implementierung

| Szenario-ID       | Ebene    | Status          | Spec-Datei                 | Beschreibung                            |
|-------------------|----------|-----------------|----------------------------|-----------------------------------------|
| **Auth**          |          |                 |                            |                                         |
| AUTH-01           | Minimum  | ✅ Implementiert | auth.basic.spec.ts         | Login mit gültigen Daten                |
| AUTH-02           | Minimum  | ✅ Implementiert | auth.basic.spec.ts         | Logout                                  |
| AUTH-03           | Minimum  | ✅ Implementiert | auth.basic.spec.ts         | Login mit falschen Credentials          |
| AUTH-04           | Standard | ✅ Implementiert | auth.resilience.spec.ts    | Login mit falschem Passwort             |
| AUTH-05           | Standard | ✅ Implementiert | auth.resilience.spec.ts    | Ungültige E-Mail                        |
| AUTH-06           | Standard | ✅ Implementiert | auth.resilience.spec.ts    | Abgelaufener Refresh-Token              |
| AUTH-07           | Standard | ✅ Implementiert | auth.resilience.spec.ts    | Manipuliertes JWT                       |
| AUTH-08           | Standard | ✅ Implementiert | auth.resilience.spec.ts    | Rate-Limit beim Login                   |
| AUTH-09           | Advanced | ✅ Implementiert | auth.edge-cases.spec.ts    | Token-Refresh während parallel Requests |
| AUTH-10           | Advanced | ✅ Implementiert | auth.edge-cases.spec.ts    | Mehrfacher Logout                       |
| AUTH-11           | Advanced | ✅ Implementiert | auth.edge-cases.spec.ts    | Leere/getrimmte Tokens                  |
| AUTH-12           | Advanced | ✅ Implementiert | auth.edge-cases.spec.ts    | Session-Hijacking-Schutz                |
| AUTH-13           | Advanced | ✅ Implementiert | auth.edge-cases.spec.ts    | Gleichzeitige Logins                    |
| **Widgets**       |          |                 |                            |                                         |
| WIDGET-01         | Minimum  | ✅ Implementiert | widgets.basic.spec.ts      | Eigene Widgets anzeigen                 |
| WIDGET-02         | Minimum  | ✅ Implementiert | widgets.basic.spec.ts      | Widget erstellen                        |
| WIDGET-03         | Minimum  | ✅ Implementiert | widgets.basic.spec.ts      | Widget löschen                          |
| WIDGET-04         | Minimum  | ✅ Implementiert | widgets.security.spec.ts   | Fremdes Widget löschen → 404            |
| WIDGET-05         | Standard | ✅ Implementiert | widgets.resilience.spec.ts | Backend-Fehler bei Creation             |
| WIDGET-06         | Minimum  | ✅ Implementiert | widgets.security.spec.ts   | XSS in Widget-Name                      |
| WIDGET-07         | Advanced | ✅ Implementiert | widgets.resilience.spec.ts | Bereits gelöschtes Widget               |
| WIDGET-08         | Advanced | ✅ Implementiert | widgets.resilience.spec.ts | Viele Widgets gleichzeitig              |
| WIDGET-09         | Advanced | ✅ Implementiert | widgets.resilience.spec.ts | Konkurrierende Updates                  |
| **Feed**          |          |                 |                            |                                         |
| FEED-01           | Standard | ✅ Implementiert | feed.spec.ts               | Feed lädt User-Widgets                  |
| FEED-02           | Standard | ✅ Implementiert | feed.spec.ts               | Feed-Caching (30s)                      |
| FEED-03           | Standard | ✅ Implementiert | feed.spec.ts               | Rate-Limit → Fehler                     |
| FEED-04           | Standard | ✅ Implementiert | feed.spec.ts               | XSS-Inhalte escaped                     |
| FEED-05           | Standard | ✅ Implementiert | feed.spec.ts               | Leerer Feed                             |
| **Rollen**        |          |                 |                            |                                         |
| ROLE-01           | Standard | ✅ Implementiert | roles.spec.ts              | Rolle korrekt angezeigt                 |
| ROLE-02           | Advanced | ✅ Implementiert | roles.spec.ts              | Rollenspezifische Features              |
| **Infrastruktur** |          |                 |                            |                                         |
| INFRA-01          | Minimum  | ✅ Implementiert | infra.health.spec.ts       | /health erreichbar                      |
| INFRA-02          | Minimum  | ✅ Implementiert | infra.health.spec.ts       | 500-Fehler mocken                       |
| INFRA-03          | Standard | ✅ Implementiert | infra.resilience.spec.ts   | Backend nicht erreichbar                |
| INFRA-04          | Standard | ✅ Implementiert | infra.resilience.spec.ts   | CORS-Header korrekt                     |
| INFRA-05          | Advanced | ✅ Implementiert | infra.resilience.spec.ts   | Langsame Netzwerke                      |
| INFRA-06          | Advanced | ✅ Implementiert | infra.resilience.spec.ts   | Offline-Modus                           |
| INFRA-07          | Advanced | ✅ Implementiert | infra.resilience.spec.ts   | Request-Timeouts                        |
| INFRA-08          | Advanced | ✅ Implementiert | infra.resilience.spec.ts   | Backend-Recovery                        |
| **Security**      |          |                 |                            |                                         |
| SEC-01            | Advanced | ✅ Implementiert | security.advanced.spec.ts  | Manipulierte API-Payloads               |
| SEC-02            | Advanced | ✅ Implementiert | security.advanced.spec.ts  | CSP verhindert Inline-Scripts           |
| SEC-03            | Advanced | 📝 Geplant      | security.advanced.spec.ts  | HTTPS-Enforcement (Production)          |
| SEC-04            | Advanced | ✅ Implementiert | security.advanced.spec.ts  | Keine sensiblen Daten im Storage        |
| **Browser/UX**    |          |                 |                            |                                         |
| BROWSER-01        | Advanced | ✅ Implementiert | browser.spec.ts            | Session-Persistence über Reload         |
| BROWSER-02        | Advanced | ✅ Implementiert | browser.spec.ts            | Storage-Fallbacks                       |
| BROWSER-03        | Advanced | ✅ Implementiert | browser.spec.ts            | Back-Button-Navigation                  |
| BROWSER-04        | Advanced | ✅ Implementiert | browser.spec.ts            | Fokus-Management                        |
| BROWSER-05        | Advanced | ✅ Implementiert | browser.spec.ts            | Keyboard-Navigation                     |
| BROWSER-06        | Advanced | ✅ Implementiert | browser.spec.ts            | Responsive Design                       |

### Legende

- ✅ **Implementiert**: Test ist vollständig implementiert und läuft
- 📝 **Geplant**: Test ist konzeptionell beschrieben, aber noch nicht vollständig umgesetzt
- ⚠️ **Teilweise**: Test läuft, aber einige Assertions sind noch TODOs (abhängig von UI-Features)

### Offene TODOs

Die meisten Standard- und Advanced-Tests sind implementiert, haben aber TODOs für:
- **UI-spezifische Assertions**: Sobald Widget-Namen, Rolle, Error-Toasts im UI sichtbar sind
- **Backend-Features**: Rate-Limiting, Feed-Caching (Backend-seitig noch zu implementieren)
- **Production-Features**: HTTPS-Enforcement, CSP-Header (relevant für Production-Deployment)

Diese TODOs sind in den jeweiligen Spec-Dateien dokumentiert und können aktiviert werden, sobald die entsprechenden Features implementiert sind.

## Debugging

### UI-Modus (interaktiv)

```bash
npx playwright test --ui
```

### Headed-Modus (Browser sichtbar)

```bash
npm run test:headed
```

### Traces ansehen

Nach einem fehlgeschlagenen Test:
```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

### Code-Generierung

Für neue Tests:
```bash
npm run codegen
```

## Best Practices

1. **Kleine, fokussierte Tests**: Ein Test pro Szenario
2. **Klare Tags**: `@minimum`, `@standard`, `@advanced` konsequent nutzen
3. **Wiederverwendbare Helper**: Nutze `helpers/` für gemeinsame Logik
4. **TODOs dokumentieren**: Markiere UI-abhängige Assertions klar mit `// TODO:`
5. **Screenshots**: Immer am Ende eines Tests für visuelle Verifikation
6. **Cleanup**: Lösche erstellte Test-Daten (Widgets, User) am Ende des Tests

## Migration & Wartung

Bei Änderungen am Frontend oder Backend:
1. **Helper aktualisieren**: `helpers/auth.ts`, `helpers/widgets.ts` anpassen
2. **Selektoren aktualisieren**: `testIds` in Helper-Dateien synchron halten
3. **TODOs aktivieren**: Sobald UI-Features implementiert sind, entsprechende Assertions einkommentieren
4. **Tests ausführen**: Vollständigen Durchlauf mit `npm run test:all` validieren
