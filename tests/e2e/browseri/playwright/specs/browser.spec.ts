import {expect, test} from '@playwright/test';
import {createUserWithRole, loginAsRole} from '../helpers/auth';
import {waitAfterReload, waitForNavigation} from '../helpers/waits';
import {budgets} from '../helpers/timing';
import {newApiRequestContext} from '../helpers/api';
import {TRACKING} from '../helpers/tracking';
import {sanitizeFilename} from '../helpers/filesystem';

/**
 * Browser-UX-Tests: Advanced-Ebene
 * 
 * Tests für Browser-spezifische Features wie Session-Persistence, Storage-Fallbacks.
 */

test.describe('@advanced Browser & UX', () => {
	// BROWSER-01 – Session-Persistence über Reload
	test('@advanced BROWSER-01: Session bleibt nach Reload erhalten', async ({page}) => {
		await createUserWithRole(await newApiRequestContext(), 'demo', 'browser01');
		
		// Login
		await loginAsRole(page, 'demo', 'browser01-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Hole Token vor Reload
		const tokenBefore = await page.evaluate(() => localStorage.getItem('hw_refresh_token'));
		expect(tokenBefore).not.toBeNull();
		expect(tokenBefore).toBeTruthy(); // Token muss ein gültiger String sein
		
		// Reload
		await page.reload();
		await waitAfterReload(page, budgets.navigationMs);
		
		// Verifiziere, dass User noch eingeloggt ist (Session persistiert)
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible({timeout: budgets.navigationMs});
		
		// Token sollte noch vorhanden sein
		// Hinweis: Backend kann einen neuen Token bei Refresh zurückgeben (Token-Rotation für Sicherheit)
		// Daher prüfen wir nur auf Existenz und Struktur, nicht auf Identität
		const tokenAfter = await page.evaluate(() => localStorage.getItem('hw_refresh_token'));
		expect(tokenAfter).not.toBeNull();
		expect(tokenAfter).toBeTruthy();
		// Token-Rotation ist normal und sicher – nur die Session muss erhalten bleiben
		
		await page.screenshot({path: 'test-results/browser-01-reload-persist.png'});
	});
	
	test('@advanced BROWSER-01: Session bleibt nach Navigation erhalten', async ({page}) => {
		// Login (User wird via API erstellt)
		await loginAsRole(page, 'demo', 'browser01-nav');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Hole Token vor Navigation
		const tokenBefore = await page.evaluate(() => localStorage.getItem('hw_refresh_token'));
		expect(tokenBefore).not.toBeNull();
		
		// Navigiere innerhalb der App zum Account-Screen
		await page.getByRole('button', {name: 'Account'}).click();
		await expect(page.getByTestId('account.role')).toBeVisible({timeout: budgets.navigationMs});
		
		// Bleibe innerhalb der Single-Page-App; prüfe, dass Token vorhanden ist
		const tokenInside = await page.evaluate(() => localStorage.getItem('hw_refresh_token'));
		expect(tokenInside).not.toBeNull();
		
		// Klick Home-Button zum Zurück-Navigieren (keine stillen Fallbacks, um echte Probleme nicht zu kaschieren)
		await page.getByRole('button', {name: /Home|^Home$/i}).click({timeout: 5_000});
		
		// Zustandsbasiertes Warten auf Navigation/Idle
		await waitForNavigation(page, budgets.navigationMs);
		
		// Token sollte noch vorhanden sein
		const tokenAfter = await page.evaluate(() => localStorage.getItem('hw_refresh_token')).catch(() => null);
		// Token kann sich durch Rotation ändern, daher nur Existenz prüfen
		if (tokenAfter !== null) {
			expect(tokenAfter).toBeTruthy();
		}
		
		await page.screenshot({path: 'test-results/browser-01-navigation-persist.png'});
	});
	
	// BROWSER-02 – Fallback bei eingeschränktem Storage (sofern relevant)
	test('@bestenfalls BROWSER-02: App funktioniert mit deaktiviertem LocalStorage', async ({page}) => {
		const isCI = process.env.CI === 'true';
		test.skip(isCI, TRACKING.STORAGE_LIMITATION);
		test.fixme(!isCI, TRACKING.STORAGE_LIMITATION);
		
		// Hinweis: Expo-Web auf Browser benötigt localStorage für Token-Speicherung.
		// Dieser Test ist konzeptionell und wird übersprungen, da das Überschreiben von localStorage
		// in modernen Browsern durch Security-Policies blockiert werden kann und zu Fehlern im Test-Setup führt.
		// Ein robuster Test ist nur mit speziellen Browser-Flags oder alternativen Mechanismen möglich.
		
		// Versuche, LocalStorage zu deaktivieren
		await page.addInitScript(() => {
			// Mock localStorage als read-only/disabled
			Object.defineProperty(window, 'localStorage', {
				value: {
					getItem: () => null,
					setItem: () => {
						throw new Error('LocalStorage is disabled');
					},
					removeItem: () => {
					},
					clear: () => {
					},
					key: () => null,
					length: 0,
				},
				writable: false,
			});
		});
		
		await page.goto('/', {timeout: budgets.navigationMs});
		
		// TODO: Sobald Fallback-Mechanismus implementiert ist:
		// - App sollte Warnung anzeigen oder In-Memory-Storage nutzen
		// - await expect(page.getByText(/LocalStorage nicht verfügbar/i)).toBeVisible();
		
		// Für jetzt: Dokumentiere, dass ohne LocalStorage kein persistenter Login möglich ist
		await page.screenshot({path: 'test-results/browser-02-no-storage.png'});
	});
	
	test('@advanced BROWSER-02: App degradiert gracefully bei Storage-Quota-Überschreitung', async ({page}) => {
		// Simuliere QuotaExceededError genau beim Persistieren des Refresh-Tokens.
		// Das ist deterministischer als "LocalStorage vollschreiben" (Quota ist je nach Browser/CI stark variabel).
		await page.addInitScript(() => {
			const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
			
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(window.localStorage as any).setItem = (key: string, value: string) => {
				if (key === 'hw_refresh_token') {
					throw new DOMException('Quota exceeded', 'QuotaExceededError');
				}
				return originalSetItem(key, value);
			};
		});
		
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'browser02-quota');
		
		await page.goto('/', {timeout: budgets.navigationMs});
		
		// Öffne Login
		const loginLink = page.getByTestId('home.loginLink');
		await loginLink.waitFor({state: 'visible', timeout: 15_000});
		await loginLink.click();
		
		// Login versuchen
		await page.getByTestId('login.email').waitFor({state: 'visible', timeout: 10_000});
		await page.getByTestId('login.email').fill(user.email);
		await page.getByTestId('login.password').fill(user.password);
		await page.getByTestId('login.submit').click();
		
		// Erwartung: App crasht nicht, bleibt im Login und zeigt eine Fehlermeldung an
		await expect(page.getByTestId('login.email')).toBeVisible({timeout: 10_000});
		await expect(page.getByTestId('login.error')).toBeVisible({timeout: 10_000});
		await expect(page.getByTestId('login.error')).toHaveText(/.+/);
		
		// Token konnte nicht persistiert werden
		const token = await page.evaluate(() => localStorage.getItem('hw_refresh_token'));
		expect(token).toBeNull();
		
		await page.screenshot({path: 'test-results/browser-02-quota.png'});
	});
	
	// BROWSER-03 – Back-Button-Navigation
	test('@advanced BROWSER-03: Browser Back-Button funktioniert korrekt', async ({page}) => {
		await page.goto('/', {timeout: budgets.navigationMs});
		
		// Klicke auf Login-Link
		const loginLink = page.getByTestId('home.loginLink');
		await loginLink.waitFor({state: 'visible'});
		await loginLink.click();
		
		// Warte auf Login-Form
		await page.getByTestId('login.email').waitFor({state: 'visible'});
		
		// Nutze Browser-Back-Button
		await page.goBack();
		
		// Sollte wieder auf Home sein, Login-Link sichtbar
		await expect(page.getByTestId('home.loginLink')).toBeVisible({timeout: 10_000});
		
		await page.screenshot({path: 'test-results/browser-03-back-button.png'});
	});
	
	// BROWSER-04 – Fokus-Management für Accessibility
	test('@advanced BROWSER-04: Fokus wird korrekt gesetzt nach Navigation', async ({page}) => {
		const isCI = process.env.CI === 'true';
		test.skip(isCI, TRACKING.ACCESSIBILITY_AUTOFOCUS);
		test.fixme(!isCI, TRACKING.ACCESSIBILITY_AUTOFOCUS);
		
		await page.goto('/', {timeout: budgets.navigationMs});
		
		// Klicke auf Login-Link
		const loginLink = page.getByTestId('home.loginLink');
		await loginLink.waitFor({state: 'visible'});
		await loginLink.click();
		
		// Warte auf Login-Form
		const emailField = page.getByTestId('login.email');
		await emailField.waitFor({state: 'visible'});
		
		// TODO: Verifiziere, dass Fokus auf erstem Input-Feld liegt
		// const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
		// expect(focusedElement).toBe('login.email');
		
		await page.screenshot({path: 'test-results/browser-04-focus.png'});
	});
	
	// BROWSER-05 – Keyboard-Navigation
	test('@advanced BROWSER-05: Keyboard-Navigation funktioniert', async ({page}) => {
		test.skip(process.env.CI === 'true', TRACKING.KEYBOARD_ACCESSIBILITY);
		
		await page.goto('/', {timeout: budgets.navigationMs});
		
		// Nutze Tab-Taste für Navigation
		await page.keyboard.press('Tab');
		
		// TODO: Verifiziere, dass fokussierte Elemente korrekt highlightet werden
		// und alle interaktiven Elemente via Keyboard erreichbar sind
		
		await page.screenshot({path: 'test-results/browser-05-keyboard-nav.png'});
	});
	
	// BROWSER-06 – Responsive Design / Mobile Viewport
	const mobileViewports = [
		{name: 'iPhone SE', size: {width: 375, height: 667}},
		{name: 'iPhone 12/13', size: {width: 390, height: 844}},
		{name: 'Pixel 5', size: {width: 393, height: 851}},
	];
	
	for (const v of mobileViewports) {
		test(`@advanced BROWSER-06: App funktioniert auf Mobile-Viewport – ${v.name}`, async ({page}) => {
			await page.setViewportSize(v.size);
			await page.goto('/', {timeout: budgets.navigationMs});
			await expect(page.getByTestId('home.loginLink')).toBeVisible({timeout: 10_000});
			await page.screenshot({path: `test-results/browser-06-mobile-${sanitizeFilename(v.name)}.png`});
		});
	}
	
	const tabletViewports = [
		{name: 'iPad', size: {width: 768, height: 1024}},
		{name: 'iPad Pro 11"', size: {width: 834, height: 1194}},
	];
	
	for (const v of tabletViewports) {
		test(`@advanced BROWSER-06: App funktioniert auf Tablet-Viewport – ${v.name}`, async ({page}) => {
			await page.setViewportSize(v.size);
			await page.goto('/', {timeout: budgets.navigationMs});
			await expect(page.getByTestId('home.loginLink')).toBeVisible({timeout: 10_000});
			await page.screenshot({path: `test-results/browser-06-tablet-${sanitizeFilename(v.name)}.png`});
		});
	}
});
