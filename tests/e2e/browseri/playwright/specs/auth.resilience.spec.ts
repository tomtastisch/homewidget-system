import {expect, test} from '@playwright/test';
import {loginAs, createUserWithRole} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';

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
		const email = `auth04+${Date.now()}@example.com`;
		const password = 'CorrectPassword123!';
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
		await page.getByTestId('login.password').fill('WrongPassword999!');
		await page.getByTestId('login.submit').click();
		
		// Warte auf Fehlermeldung
		await page.getByTestId('login.error').waitFor({state: 'visible', timeout: 10_000});
		
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
		await page.getByTestId('login.email').fill('invalid-email-format');
		await page.getByTestId('login.password').fill('SomePassword123!');
		await page.getByTestId('login.submit').click();
		
		// Erwarte Fehler (entweder UI-Validierung oder Backend-Fehler)
		// UI-Validierung würde Submit verhindern, Backend würde 422 zurückgeben
		await page.waitForTimeout(2000); // Kurz warten für Validierung/Fehler
		
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
		await expect(page.getByTestId('home.loginLink')).toBeVisible({timeout: 10_000});
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
		await expect(page.getByTestId('home.loginLink')).toBeVisible({timeout: 10_000});
	});
	
	// AUTH-08 – Rate-Limit beim Login (429) → klare Fehleranzeige
	test('@standard AUTH-08: Rate-Limit beim Login wird angezeigt', async ({page}) => {
		// Hinweis: Dieser Test setzt voraus, dass das Backend Rate-Limiting implementiert hat.
		// Falls nicht, wird dieser Test als "konzeptionell" markiert und kann später aktiviert werden.
		
		const email = `auth08+${Date.now()}@example.com`;
		const password = 'TestPassword123!';
		
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
			await page.getByTestId('login.password').fill('WrongPassword!');
			await page.getByTestId('login.submit').click();
			
			// Warte kurz zwischen Versuchen
			await page.waitForTimeout(500);
			
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
		await page.waitForTimeout(3000);
		await expect(page.getByTestId('login.error.rateLimit')).toBeVisible();
		
		// Für jetzt: Verifiziere, dass Login nicht erfolgreich war
		// (entweder wegen Rate-Limit oder weil Backend noch kein Rate-Limiting hat)
	});
});
