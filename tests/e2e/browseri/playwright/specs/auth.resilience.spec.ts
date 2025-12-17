import {expect, test} from '@playwright/test';
import {createUserWithRole, loginAs} from '../helpers/auth';
import {waitForNetworkIdle} from '../helpers/waits';
import {budgets, timeouts} from '../helpers/timing';
import {newApiRequestContext} from '../helpers/api';
import {DEFAULT_PASSWORD, INVALID_EMAIL, uniqueEmail, WRONG_PASSWORD} from '../helpers/testdata';
import {TRACKING} from '../helpers/tracking';

/**
 * Auth-Resilience-Tests: Standard-Ebene
 * 
 * Tests für Fehlerbehandlung und Resilienz bei Authentifizierung.
 * Tag: @standard
 */

test.describe('@standard Auth Resilience', () => {
	// AUTH-04 – Login mit falschem Passwort → saubere Fehlermeldung
	test('@standard AUTH-04: Login mit falschem Passwort zeigt Fehler', async ({page}) => {
		const api = await newApiRequestContext();
		const email = uniqueEmail('auth04');
		const password = DEFAULT_PASSWORD;
		await api.post('/api/auth/register', {data: {email, password}});
		
		// Navigiere zu Home und öffne Login
		await page.goto('/');
		const loginLink = page.getByTestId('home.loginLink');
		await loginLink.waitFor({state: 'visible'});
		await loginLink.click();
		
		// Warte auf Login-Form
		await page.getByTestId('login.email').waitFor({state: 'visible'});
		
		// Login mit falschem Passwort
		await page.getByTestId('login.email').fill(email);
		await page.getByTestId('login.password').fill(WRONG_PASSWORD);
		await page.getByTestId('login.submit').click();
		
		// Warte auf Fehlermeldung
		await page.getByTestId('login.error').waitFor({state: 'visible', timeout: budgets.loginMs});
		
		// Verifiziere: Login-Form noch sichtbar (Login fehlgeschlagen)
		await expect(page.getByTestId('login.email')).toBeVisible();
		
		// Verifiziere: Kein Token im Storage
		const token = await page.evaluate(() => localStorage.getItem('hw_refresh_token'));
		expect(token).toBeNull();
	});
	
	// AUTH-05 – ungültige E-Mail → UI-Validierung / Backend-Fehler
	test('@standard AUTH-05: Login mit ungültiger E-Mail-Adresse', async ({page}) => {
		await page.goto('/');
		const loginLink = page.getByTestId('home.loginLink');
		await loginLink.waitFor({state: 'visible'});
		await loginLink.click();
		
		await page.getByTestId('login.email').waitFor({state: 'visible'});
		
		// Versuche Login mit ungültiger E-Mail-Adresse (kein @)
		await page.getByTestId('login.email').fill(INVALID_EMAIL);
		await page.getByTestId('login.password').fill(DEFAULT_PASSWORD);
		await page.getByTestId('login.submit').click();
		
		// Erwarte Fehler (entweder UI-Validierung oder Backend-Fehler)
		// Warte deterministisch auf Ruhe im Netzwerk/DOM statt hartem Sleep
		await waitForNetworkIdle(page, timeouts.uiDefaultMs);
		
		// Verifiziere: Login-Form noch sichtbar
		await expect(page.getByTestId('login.email')).toBeVisible();
		
		// Verifiziere: Kein Token im Storage
		const token = await page.evaluate(() => localStorage.getItem('hw_refresh_token'));
		expect(token).toBeNull();
	});
	
	// AUTH-06 – abgelaufener Refresh-Token → Re-Login
	test('@standard AUTH-06: Abgelaufener Refresh-Token führt zu Re-Login', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'auth06');
		
		// Login über UI
		await loginAs(page, user.email, user.password);
		
		// Verifiziere erfolgreichen Login
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Simuliere abgelaufenen Token durch Setzen eines ungültigen Tokens
		await page.evaluate(() => {
			localStorage.setItem('hw_refresh_token', 'expired_or_invalid_token');
		});
		
		// Reload der Seite triggert Token-Refresh-Versuch
		await page.reload();
		
		// Erwarte, dass der Nutzer wieder ausgeloggt ist (Token ungültig)
		// und der Login-Link wieder sichtbar ist
		await expect(page.getByTestId('home.loginLink')).toBeVisible({timeout: budgets.loginMs});
	});
	
	// AUTH-07 – manipuliertes JWT → 401, Re-Login
	test('@standard AUTH-07: Manipuliertes JWT führt zu 401', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'auth07');
		
		// Login über UI
		await loginAs(page, user.email, user.password);
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Manipuliere das Refresh-Token
		await page.evaluate(() => {
			const token = localStorage.getItem('hw_refresh_token');
			if (token) {
				// Ändere letztes Zeichen um Token zu invaliden
				const manipulated = token.slice(0, -1) + 'X';
				localStorage.setItem('hw_refresh_token', manipulated);
			}
		});
		
		// Reload triggert Token-Refresh-Versuch mit manipuliertem Token
		await page.reload();
		
		// Erwarte, dass der Nutzer ausgeloggt wurde (401 bei Token-Refresh)
		await expect(page.getByTestId('home.loginLink')).toBeVisible({timeout: budgets.loginMs});
	});
	
	// AUTH-08 – Rate-Limit beim Login (429) → klare Fehleranzeige
	test('@standard AUTH-08: Rate-Limit beim Login wird angezeigt', async ({page}) => {
		test.skip(true, TRACKING.BACKEND_RATE_LIMIT + ' | UI-Handling vorhanden (testID: login.error.rateLimit)');
		
		// Hinweis: UI ist bereit (siehe LoginScreen.tsx:15,29-31,44)
		// - testID="login.error.rateLimit" wird bei status === 429 gesetzt
		// - Fehlermeldung: "Zu viele Anmeldeversuche. Bitte versuche es später erneut."
		// Backend muss Rate-Limiting für /api/auth/login implementieren
		
		const email = uniqueEmail('auth08');
		const password = DEFAULT_PASSWORD;
		
		// Registriere Nutzer
		const api = await newApiRequestContext();
		await api.post('/api/auth/register', {data: {email, password}});
		
		await page.goto('/');
		const loginLink = page.getByTestId('home.loginLink');
		await loginLink.waitFor({state: 'visible'});
		
		// Mehrfache fehlgeschlagene Login-Versuche um Rate-Limit zu triggern
		for (let i = 0; i < 6; i++) {
			await loginLink.click();
			await page.getByTestId('login.email').waitFor({state: 'visible'});
			await page.getByTestId('login.email').fill(email);
			await page.getByTestId('login.password').fill(WRONG_PASSWORD);
			await page.getByTestId('login.submit').click();
			
			// Warte deterministisch zwischen Versuchen
			await waitForNetworkIdle(page, timeouts.uiDefaultMs);
			
			// Zurück zum Home (falls noch im Login-Screen)
			if (await page.getByTestId('login.email').isVisible()) {
				await page.goto('/');
			}
		}
		
		// Nächster Login-Versuch sollte Rate-Limit triggern
		await page.goto('/');
		await loginLink.click();
		await page.getByTestId('login.email').waitFor({state: 'visible'});
		await page.getByTestId('login.email').fill(email);
		await page.getByTestId('login.password').fill(password); // Diesmal korrektes Passwort
		await page.getByTestId('login.submit').click();
		
		// UI-Validierung: Rate-Limit-Fehlermeldung wird angezeigt (testID: login.error.rateLimit)
		await waitForNetworkIdle(page, budgets.apiCallMs);
		await expect(page.getByTestId('login.error.rateLimit')).toBeVisible();
		
		// Verifiziere, dass Login nicht erfolgreich war
		await expect(page.getByTestId('home.loginLink')).toBeVisible();
	});
});
