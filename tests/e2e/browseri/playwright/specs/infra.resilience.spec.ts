import {expect, test} from '@playwright/test';
import {newApiRequestContext} from '../helpers/api';
import {createUserWithRole, loginAs, loginAsRole} from '../helpers/auth';
import {waitAfterReload, waitForNetworkIdle} from '../helpers/waits';
import {budgets, timeouts} from '../helpers/timing';

/**
 * Infrastruktur-Resilience-Tests: Standard- und Advanced-Ebene
 * 
 * Tests für Infrastruktur-Fehlerbehandlung, CORS, Netzwerk-Probleme.
 */

test.describe('@standard Infrastructure Resilience', () => {
	// INFRA-03 – Backend nicht erreichbar → „Server nicht verfügbar"
	test('@standard INFRA-03: Backend nicht erreichbar zeigt Fehler', async ({page}) => {
		// Erst einen User erstellen und einloggen, damit Feed-API genutzt wird
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'infra03');
		
		await loginAs(page, user.email, user.password);
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Jetzt Backend-Failure für Feed-Endpoint simulieren (nicht für Auth, da Login bereits erfolgt)
		// Wir simulieren komplettes Backend-Down für alle API-Calls NACH Login
		await page.route('**/api/**', async (route) => {
			await route.abort('failed');
		});
		
		// Trigger Feed-Reload (um Backend-Call auszulösen)
		await page.reload();
		
		// Warte auf Error-Anzeige (state-based statt hartem Sleep)
		await waitForNetworkIdle(page, timeouts.uiDefaultMs);
		
		// UI-Validierung: Error-Toast oder Error-Box wird angezeigt
		// Da Backend komplett down ist, sollte entweder Toast oder die ErrorBox im HomeScreen erscheinen
		const hasErrorToast = await page.getByTestId('error.toast').isVisible().catch(() => false);
		const bodyText = await page.textContent('body');
		const hasErrorText = bodyText && /fehler|error|nicht verfügbar|unavailable|laden/i.test(bodyText);
		
		// Erwarte mindestens eine Form von Error-Anzeige (Toast bevorzugt, aber Error-Box akzeptabel)
		expect(hasErrorToast || hasErrorText).toBeTruthy();
		
		await page.screenshot({path: 'test-results/infra-03-backend-down.png'});
	});
	
	// INFRA-04 – CORS-Header korrekt (kein CORS-Error im Browser)
	test('@standard INFRA-04: CORS-Header sind korrekt gesetzt', async ({page}) => {
		await createUserWithRole(await newApiRequestContext(), 'demo', 'infra04');
		
		// Console-Errors tracken
		const consoleErrors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		});
		
		// Login über UI (macht mehrere API-Calls)
		await loginAsRole(page, 'demo', 'infra04-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Führe expliziten API-Call aus über fetch
		await page.evaluate(async (baseUrl) => {
			const response = await fetch(`${baseUrl}/api/widgets/`, {
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('hw_refresh_token')}`,
				},
			});
			return response.status;
		}, process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8100');
		
		// Verifiziere, dass keine CORS-Fehler in der Console aufgetreten sind
		const corsErrors = consoleErrors.filter(err =>
			err.toLowerCase().includes('cors') ||
			err.toLowerCase().includes('cross-origin')
		);
		expect(corsErrors.length).toBe(0);
		
		await page.screenshot({path: 'test-results/infra-04-cors-ok.png'});
	});
});

test.describe('@advanced Infrastructure - Performance & Network', () => {
	// INFRA-05 – langsame Netzwerke simulieren, Loading-States
	test('@advanced INFRA-05: Langsames Netzwerk zeigt Loading-States', async ({page, context}) => {
		await createUserWithRole(await newApiRequestContext(), 'demo', 'infra05');
		
		// Simuliere langsames Netzwerk durch Verzögerung aller API-Calls
		await page.route('**/api/**', async (route) => {
			// Verzögere Response um 3 Sekunden
			await new Promise(resolve => setTimeout(resolve, 3000));
			await route.continue();
		});
		
		// Navigiere zur App
		await page.goto('/');
		
		// UI-Validierung: Loading-Indicator wird angezeigt (testID: loading.spinner)
		await expect(page.getByTestId('loading.spinner')).toBeVisible();
		
		// Warte auf vollständiges Laden
		await waitForNetworkIdle(page, timeouts.slowUiMs);
		
		// UI-Validierung: Loading-Indicator verschwindet nach erfolgreichem Load
		await expect(page.getByTestId('loading.spinner')).not.toBeVisible();
		
		await page.screenshot({path: 'test-results/infra-05-slow-network.png'});
	});
	
	// INFRA-06 – Offline-Modus und Reconnect
	test('@advanced INFRA-06: Offline-Modus wird erkannt', async ({page, context}) => {
		await createUserWithRole(await newApiRequestContext(), 'demo', 'infra06');
		
		// Login zunächst mit funktionierendem Netzwerk
		await loginAsRole(page, 'demo', 'infra06-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Simuliere Offline-Modus
		await context.setOffline(true);
		
		// Versuche, Feed zu reloaden
		await page.reload();
		await waitAfterReload(page, budgets.navigationMs);
		
		// UI-Validierung: Offline-Indikator wird angezeigt (testID: status.offline)
		await expect(page.getByTestId('status.offline')).toBeVisible();
		await expect(page.getByText(/Offline/i)).toBeVisible();
		
		await page.screenshot({path: 'test-results/infra-06-offline.png'});
		
		// Reaktiviere Netzwerk
		await context.setOffline(false);
		
		// Reload sollte wieder funktionieren
		await page.reload();
		await waitAfterReload(page, budgets.navigationMs);
		
		// UI-Validierung: Offline-Indikator verschwindet
		await expect(page.getByTestId('status.offline')).not.toBeVisible();
		
		await page.screenshot({path: 'test-results/infra-06-online-again.png'});
	});
	
	// INFRA-07 – Timeout-Handling bei langsamen Responses
	test('@advanced INFRA-07: Request-Timeouts werden korrekt behandelt', async ({page}) => {
		// Mock sehr langsamen Backend-Response (Timeout simulieren durch abort)
		await page.route('**/api/widgets/**', async (route) => {
			if (route.request().method() === 'GET') {
				// Breche Request gezielt mit Timeout-Fehler ab (simuliert Timeout)
				await route.abort('timedout');
			} else {
				await route.continue();
			}
		});
		
		// Login (sollte noch funktionieren, da /widgets nicht betroffen)
		await loginAsRole(page, 'demo', 'infra07-ui');
		
		// Versuche Feed zu laden (sollte nach Timeout abbrechen)
		await page.reload();
		
		// Warte auf Fehlerbehandlung (UI stabil)
		await waitForNetworkIdle(page, timeouts.uiDefaultMs);
		
		// UI-Validierung: Timeout-Error wird angezeigt (testID: error.toast)
		await expect(page.getByTestId('error.toast')).toBeVisible();
		await expect(page.getByText(/Zeitüberschreitung/i)).toBeVisible();
		
		await page.screenshot({path: 'test-results/infra-07-timeout.png'});
	});
});

test.describe('@advanced Infrastructure - Error Recovery', () => {
	// INFRA-08 – Backend-Recovery nach temporärem Ausfall
	test('@advanced INFRA-08: App erholt sich nach Backend-Wiederherstellung', async ({page}) => {
		await createUserWithRole(await newApiRequestContext(), 'demo', 'infra08');
		
		let failureMode = true;
		
		// Mock temporären Backend-Ausfall
		await page.route('**/api/**', async (route) => {
			if (failureMode && route.request().url().includes('/widgets')) {
				await route.fulfill({
					status: 503,
					contentType: 'application/json',
					body: JSON.stringify({detail: 'Service temporarily unavailable'}),
				});
			} else {
				await route.continue();
			}
		});
		
		// Login
		await loginAsRole(page, 'demo', 'infra08-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Reload während Ausfall (sollte Fehler zeigen)
		await page.reload();
		await waitAfterReload(page, budgets.navigationMs);
		
		// UI-Validierung: Error-Toast wird angezeigt (testID: error.toast)
		await expect(page.getByTestId('error.toast')).toBeVisible();
		
		await page.screenshot({path: 'test-results/infra-08-backend-down.png'});
		
		// "Repariere" Backend
		failureMode = false;
		
		// Reload sollte jetzt wieder funktionieren
		await page.reload();
		await waitAfterReload(page, budgets.navigationMs);
		
		// UI-Validierung: App funktioniert wieder normal
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		await page.screenshot({path: 'test-results/infra-08-backend-recovered.png'});
	});
});
