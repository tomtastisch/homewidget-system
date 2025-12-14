# 🧪 E2E-Tests mit Playwright – Guide & Best Practices

Vollständige Dokumentation für Browser-E2E-Tests mit Playwright im Homewidget System.

---

## 📋 Überblick

### Was ist getestet?

- ✅ Authentication (Login, Register, Logout, Token-Refresh)
- ✅ Widget-Rendering und Interaktionen
- ✅ Rollen-basierte Zugriffskontrolle (Demo, Common, Premium)
- ✅ Freemium-Upselling-Flow
- ✅ API-Integration und Error Handling
- ✅ Security-Szenarien (CSRF, XSS, Token-Manipulation)
- ✅ Infrastruktur-Resilience

### Test-Ebenen

- **@minimal** (10 Tests): Kritische Basis-Szenarien
- **@standard** (26 Tests): Minimum + erweiterte Fehlerbehandlung
- **@advanced** (60 Tests): Alle Tests inkl. Edge-Cases und Security

---

## 🚀 Schnelleinstieg

### Tests ausführen

```bash
cd tests/e2e/browseri/playwright

# Alle Tests (visueller Debugger)
npx playwright test --ui

# Nur Minimal-Tests (schnell)
npx playwright test --grep @minimal

# Nur Standard-Tests
npx playwright test --grep @standard

# Spezifische Datei
npx playwright test specs/auth.basic.spec.ts

# Mit Debug-Output
npx playwright test --debug
```

### Test-Datei schreiben

```typescript
import {test, expect} from '@playwright/test';
import {LoginHelper} from '../helpers/auth';

test.describe('Feature XYZ', () => {
	test('@minimal TEST-XYZ: Basis-Szenario', async ({page}) => {
		// Arrange
		const helper = new LoginHelper(page);
		await helper.loginAsCommon();
		
		// Act
		await page.goto('/path/to/feature');
		
		// Assert
		await expect(page.locator('text=Success')).toBeVisible();
	});
	
	test('@standard TEST-XYZ-EX: Edge Case', async ({page}) => {
		test.skip(process.env.CI === 'true', 'BLOCKED-UI: Feature nicht implementiert. TODO(TICKET-123)');
		
		// Test-Code...
	});
});
```

---

## 🏗️ Verzeichnisstruktur

```
tests/e2e/browseri/playwright/
├── specs/                          # Test-Spezifikationen
│   ├── auth.basic.spec.ts          # Login, Register, Logout
│   ├── auth.resilience.spec.ts     # Error Handling, Edge Cases
│   ├── auth.edge-cases.spec.ts     # Advanced Auth-Szenarien
│   ├── widgets.basic.spec.ts       # Widget-Rendering
│   ├── widgets.resilience.spec.ts  # Widget Error Handling
│   ├── widgets.security.spec.ts    # Security-Tests
│   ├── feed.spec.ts                # Home-Feed Szenarien
│   ├── freemium.spec.ts            # Rollen & Upselling
│   ├── roles.spec.ts               # Role-Based Access Control
│   ├── infra.health.spec.ts        # Infrastruktur Health-Checks
│   ├── infra.resilience.spec.ts    # Fehlertoleranz
│   ├── security.advanced.spec.ts   # Erweiterte Security
│   └── browser.spec.ts             # Browser UX & Session
│
├── helpers/                        # Wiederverwendbare Helper
│   ├── auth.ts                     # Login, Logout, User-Creation
│   ├── api.ts                      # Backend-API Calls
│   └── ...
│
├── playwright.config.ts            # Playwright-Konfiguration
├── package.json                    # Dependencies
└── README.md                       # Dieser Guide
```

---

## 📖 Detailed Guide

### 1. Test-Ebenen verstehen

#### @minimal (10 Tests)

Kritische Basis-Szenarien, die **immer** funktionieren müssen:

```typescript
test('@minimal AUTH-01: Login mit gültigen Credentials', async ({page}) => {
	// Nur Happy-Path, keine Edge-Cases
	// Keine TODO-Assertions
	// Assertiert nur kritische Funktionalität
});
```

**Wann nutzen**: Happy-Path, kritische User-Journeys

#### @standard (26 Tests)

Minimum + erweiterte Fehlerbehandlung:

```typescript
test('@standard AUTH-02: Login mit falscher E-Mail', async ({page}) => {
	// Fehlerfall
	// Alternative Szenarien
	// Aber keine Edge-Cases
});
```

**Wann nutzen**: Fehlerbehandlung, Alternative Flows

#### @advanced (60 Tests)

Alle Tests inkl. Edge-Cases und komplexe Szenarien:

```typescript
test('@advanced AUTH-03: Login mit SQL-Injection-Versuch', async ({page}) => {
	// Edge-Cases
	// Security-Tests
	// Komplexe Szenarien
});
```

**Wann nutzen**: Edge-Cases, Security, erweiterte Coverage

---

### 2. Skip & TODO Pattern (für blockierte Features)

Falls ein Test durch fehlende UI-Features blockiert ist:

```typescript
test('@standard TEST-ID: Blockiertes Feature testen', async ({page}) => {
	// ⚠️ Nutze Skip + TODO kombiniert!
	test.skip(
		process.env.CI === 'true',
		'BLOCKED-UI: Widget-Konfiguration ist nicht implementiert. Entfernen sobald TICKET-456 merged.'
	);
	
	// Test-Code (läuft lokal, wird in CI übersprungen)
	await page.goto('/widgets');
	// ... Test wird übersprungen in CI
});
```

**Wichtig:**

- `BLOCKED-UI:` Präfix verwenden
- **Grund angeben** (was ist nicht implementiert?)
- **Exit-Kriterium** (welches Ticket/PR?)
- Test läuft **lokal**, wird in CI **übersprungen**

---

### 3. Helper-Funktionen nutzen

#### LoginHelper

```typescript
import {LoginHelper} from '../helpers/auth';

const helper = new LoginHelper(page);

// Rolle-basiertes Login
await helper.loginAsDemo();        // Demo-User (unauthentifiziert)
await helper.loginAsCommon();      // Common-User
await helper.loginAsPremium();     // Premium-User
await helper.loginAsRole('premium'); // Mit Rolle

// Custom User
await helper.createUserWithRole('custom@example.com', 'password123', 'premium');
```

#### API-Helper

```typescript
import {ApiHelper} from '../helpers/api';

const api = new ApiHelper(page);

// Backend-API Calls
const widgets = await api.getWidgets();
const user = await api.createUser('email@example.com', 'password');
await api.logout();
```

---

### 4. Best Practices

#### ✅ State-based Waits

```typescript
// ✅ BESSER: Warte auf stabilen Zustand
await expect(page.locator('text=Widget loaded')).toBeVisible();
await page.waitForLoadState('networkidle');

// ❌ VERMEIDEN: Hard-coded Waits
await page.waitForTimeout(1000);
```

#### ✅ Backend-Validierung

```typescript
// ✅ BESSER: Validiere über API, nicht nur UI
const user = await api.getUserProfile();
expect(user.role).toBe('premium');

// ❌ VERMEIDEN: Nur UI-Text prüfen
await expect(page.locator('text=Premium')).toBeVisible();
```

#### ✅ Klare Assertions

```typescript
// ✅ BESSER: Aussagekräftig
await expect(page.locator('[data-testid=logout-btn]')).toBeVisible();

// ❌ VERMEIDEN: Mehrdeutig
await expect(page.locator('button').nth(5)).toBeVisible();
```

#### ✅ Daten isolieren

```typescript
// ✅ BESSER: Einmalige User pro Test
const email = `test-${Date.now()}@example.com`;
const user = await api.createUser(email, 'password');

// ❌ VERMEIDEN: Geteilte Test-Daten
const email = 'test@example.com'; // Könnte Conflicts geben
```

---

## 🎯 Freemium-System Tests

Tests für das 3-Rollen-Freemium-Modell:

### FREEMIUM-01: Demo-Widgets sichtbar

**Rolle:** Demo (unauthentifiziert)
**Szenario:** User sieht Demo-Widgets mit Rabattpreisen
**Tag:** @minimal

```typescript
test('@minimal FREEMIUM-01: Demo-Widgets sichtbar', async ({page}) => {
	// Keine Authentifizierung
	await page.goto('http://localhost:19006');
	
	// Widgets sollten angezeigt werden
	await expect(page.locator('text=Demo Widget 1')).toBeVisible();
});
```

### FREEMIUM-02: Nach Registrierung → Common-Rolle

**Flow:** Registrierung → Login → Rolle Check
**Szenario:** Neu registrierter User hat `common` Rolle
**Tag:** @minimal

```typescript
test('@minimal FREEMIUM-02: Registrierung → Common', async ({page}) => {
	const helper = new LoginHelper(page);
	const email = `test-${Date.now()}@example.com`;
	
	// Registrieren
	await helper.register(email, 'password123');
	
	// Role sollte 'common' sein
	const user = await helper.getUserProfile();
	expect(user.role).toBe('common');
});
```

### FREEMIUM-03: Premium-Button nur für Common

**Rolle:** Common
**Szenario:** "Zu Premium upgraden" Button sichtbar
**Tag:** @minimal

```typescript
test('@minimal FREEMIUM-03: Premium-Button sichtbar', async ({page}) => {
	const helper = new LoginHelper(page);
	await helper.loginAsCommon();
	
	// Premium-Button sollte sichtbar sein
	await expect(page.locator('text=Zu Premium upgraden')).toBeVisible();
});
```

### Weitere Freemium-Tests

- FREEMIUM-04: Premium-Widgets nur für Premium-User
- FREEMIUM-05: Rabatt-Berechnung nach Rolle
- FREEMIUM-06: Feature-Gating nach Rolle
- etc.

---

## 🔧 Playwright-Konfiguration

**Datei:** `playwright.config.ts`

```typescript
export default defineConfig({
	testDir: './specs',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	
	use: {
		baseURL: 'http://localhost:19006',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	
	webServer: {
		command: 'npm start', // Expo Start
		url: 'http://localhost:19006',
		reuseExistingServer: !process.env.CI,
	},
});
```

---

## 📊 Test-Coverage

| Kategorie          | Tests  | Level                          |
|--------------------|--------|--------------------------------|
| **Auth**           | 15     | @minimal, @standard, @advanced |
| **Widgets**        | 20     | @minimal, @standard, @advanced |
| **Rollen**         | 12     | @minimal, @standard            |
| **Feed**           | 8      | @standard, @advanced           |
| **Freemium**       | 10     | @minimal, @standard, @advanced |
| **Infrastructure** | 15     | @standard, @advanced           |
| **Security**       | 10     | @advanced                      |
| **Browser/UX**     | 8      | @standard, @advanced           |
| **TOTAL**          | **96** | -                              |

---

## 🐛 Debugging

### Visual Studio Code Extension

1. Installiere "Playwright Test for VSCode"
2. Klick auf "Run" neben Test-Definitionen

### CLI Debug-Modus

```bash
npx playwright test --debug

# Oder mit Inspector
PWDEBUG=1 npx playwright test
```

### Screenshot bei Fehler

```typescript
test('my test', async ({page}) => {
	// Test-Code
	await page.screenshot({path: 'test-failure.png'});
});
```

---

## 📚 Weiterführende Ressourcen

- **Playwright Docs**: https://playwright.dev/
- **Best Practices**: https://playwright.dev/docs/best-practices
- **API Reference**: https://playwright.dev/docs/api/class-page
- **Homewidget ARCHITECTURE**: [../../ARCHITECTURE.md](../../ARCHITECTURE.md)

---

## 🎓 Checkliste für neue E2E-Tests

- [ ] Test in richtige `spec.ts`-Datei (auth, widgets, etc.)
- [ ] Richtige Tag: @minimal, @standard oder @advanced
- [ ] TEST-ID in Test-Name: `TEST-XXX: Beschreibung`
- [ ] Helper-Funktionen nutzen statt duplizierter Code
- [ ] Backend-Validierung (nicht nur UI)
- [ ] Daten isolieren (unique Emails, etc.)
- [ ] State-based waits, keine hard-coded Delays
- [ ] Falls blockiert: `BLOCKED-UI` Skip mit Exit-Kriterium
- [ ] Lokal testen: `npm test`
- [ ] Auf Fehler überprüfen: `npm test -- --grep @minimal`

---

*Zuletzt aktualisiert: Dezember 14, 2025*

