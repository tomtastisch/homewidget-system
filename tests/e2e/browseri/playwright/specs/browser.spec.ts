import {expect, test} from '@playwright/test';
import {loginAsRole, createUserWithRole} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';

/**
 * Browser-UX-Tests: Bestenfalls-Ebene
 * 
 * Tests für Browser-spezifische Features wie Session-Persistence, Storage-Fallbacks.
 */

test.describe('@bestenfalls Browser & UX', () => {
	// BROWSER-01 – Session-Persistence über Reload
	test('@bestenfalls BROWSER-01: Session bleibt nach Reload erhalten', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'browser01');
		
		// Login
		await loginAsRole(page, 'demo', 'browser01-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Hole Token vor Reload
		const tokenBefore = await page.evaluate(() => localStorage.getItem('hw_refresh_token'));
		expect(tokenBefore).not.toBeNull();
		
		// Reload
		await page.reload();
		await page.waitForTimeout(2000);
		
		// Verifiziere, dass User noch eingeloggt ist
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible({timeout: 10_000});
		
		// Token sollte noch vorhanden sein
		const tokenAfter = await page.evaluate(() => localStorage.getItem('hw_refresh_token'));
		expect(tokenAfter).toBe(tokenBefore);
		
		await page.screenshot({path: 'test-results/browser-01-reload-persist.png'});
	});
	
	test('@bestenfalls BROWSER-01: Session bleibt nach Navigation erhalten', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'browser01-nav');
		
		// Login
		await loginAsRole(page, 'demo', 'browser01-nav-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Navigiere zu verschiedenen Routen (falls vorhanden)
		// TODO: Sobald mehrere Routen existieren (z.B. /account, /settings):
		// await page.goto('/account');
		// await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		// await page.goto('/');
		// await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		await page.screenshot({path: 'test-results/browser-01-navigation-persist.png'});
	});
	
	// BROWSER-02 – Fallback bei eingeschränktem Storage (sofern relevant)
	test('@bestenfalls BROWSER-02: App funktioniert mit deaktiviertem LocalStorage', async ({page, context}) => {
		// Hinweis: Expo-Web auf Browser benötigt localStorage für Token-Speicherung.
		// Dieser Test dokumentiert das erwartete Verhalten bei Storage-Einschränkungen.
		
		// Versuche, LocalStorage zu deaktivieren
		await page.addInitScript(() => {
			// Mock localStorage als read-only/disabled
			Object.defineProperty(window, 'localStorage', {
				value: {
					getItem: () => null,
					setItem: () => {
						throw new Error('LocalStorage is disabled');
					},
					removeItem: () => {},
					clear: () => {},
					key: () => null,
					length: 0,
				},
				writable: false,
			});
		});
		
		await page.goto('/');
		
		// TODO: Sobald Fallback-Mechanismus implementiert ist:
		// - App sollte Warnung anzeigen oder In-Memory-Storage nutzen
		// - await expect(page.getByText(/LocalStorage nicht verfügbar/i)).toBeVisible();
		
		// Für jetzt: Dokumentiere, dass ohne LocalStorage kein persistenter Login möglich ist
		await page.screenshot({path: 'test-results/browser-02-no-storage.png'});
	});
	
	test('@bestenfalls BROWSER-02: App degradiert gracefully bei Storage-Quota-Überschreitung', async ({page}) => {
		await page.goto('/');
		
		// Versuche, LocalStorage zu füllen bis Quota überschritten
		const quotaExceeded = await page.evaluate(() => {
			try {
				const largeData = 'x'.repeat(1024 * 1024); // 1MB
				for (let i = 0; i < 10; i++) {
					localStorage.setItem(`test_${i}`, largeData);
				}
				return false;
			} catch (e) {
				return e instanceof DOMException && e.name === 'QuotaExceededError';
			} finally {
				// Cleanup
				for (let i = 0; i < 10; i++) {
					localStorage.removeItem(`test_${i}`);
				}
			}
		});
		
		// TODO: Sobald Error-Handling für Storage-Quota implementiert:
		// - App sollte graceful degradieren oder Warnung anzeigen
		
		await page.screenshot({path: 'test-results/browser-02-quota.png'});
	});
	
	// BROWSER-03 – Back-Button-Navigation
	test('@bestenfalls BROWSER-03: Browser Back-Button funktioniert korrekt', async ({page}) => {
		await page.goto('/');
		
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
	test('@bestenfalls BROWSER-04: Fokus wird korrekt gesetzt nach Navigation', async ({page}) => {
		await page.goto('/');
		
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
	test('@bestenfalls BROWSER-05: Keyboard-Navigation funktioniert', async ({page}) => {
		await page.goto('/');
		
		// Nutze Tab-Taste für Navigation
		await page.keyboard.press('Tab');
		
		// TODO: Verifiziere, dass fokussierte Elemente korrekt highlightet werden
		// und alle interaktiven Elemente via Keyboard erreichbar sind
		
		await page.screenshot({path: 'test-results/browser-05-keyboard-nav.png'});
	});
	
	// BROWSER-06 – Responsive Design / Mobile Viewport
	test('@bestenfalls BROWSER-06: App funktioniert auf Mobile-Viewport', async ({page}) => {
		// Setze Mobile-Viewport
		await page.setViewportSize({width: 375, height: 667}); // iPhone SE
		
		await page.goto('/');
		
		// Verifiziere, dass wichtige Elemente sichtbar sind
		await expect(page.getByTestId('home.loginLink')).toBeVisible();
		
		// TODO: Prüfe, dass Mobile-Navigation funktioniert (Hamburger-Menu, etc.)
		
		await page.screenshot({path: 'test-results/browser-06-mobile.png'});
	});
	
	test('@bestenfalls BROWSER-06: App funktioniert auf Tablet-Viewport', async ({page}) => {
		// Setze Tablet-Viewport
		await page.setViewportSize({width: 768, height: 1024}); // iPad
		
		await page.goto('/');
		
		await expect(page.getByTestId('home.loginLink')).toBeVisible();
		
		await page.screenshot({path: 'test-results/browser-06-tablet.png'});
	});
});
