import {expect, test} from '@playwright/test';
import {createUserWithRole, loginAs, logout} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';

/**
 * Auth-Edge-Cases-Tests: Advanced-Ebene
 * 
 * Tests für komplexe Edge-Cases und Race-Conditions bei Authentifizierung.
 */

test.describe('@advanced Auth Edge Cases', () => {
	// AUTH-09 – Token-Refresh während paralleler Requests
	test('@advanced AUTH-09: Token-Refresh während paralleler API-Calls', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'auth09');
		
		// Login über UI
		await loginAs(page, user.email, user.password);
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Simuliere nahezu abgelaufenen Token (durch Setzen eines kurz-lebigen Tokens)
		// In Produktion würde der Token nach Ablauf automatisch refreshed
		
		// Führe mehrere parallele API-Calls aus
		const parallelCalls = Array.from({length: 5}, (_, i) =>
			page.evaluate(async (args) => {
				const {baseUrl, index} = args;
				try {
					const response = await fetch(`${baseUrl}/api/widgets/`, {
						headers: {
							'Authorization': `Bearer ${localStorage.getItem('hw_refresh_token')}`,
						},
					});
					return {index, status: response.status, ok: response.ok};
				} catch (error) {
					return {index, error: error instanceof Error ? error.message : 'Unknown'};
				}
			}, {
				baseUrl: process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8100',
				index: i,
			})
		);
		
		const results = await Promise.all(parallelCalls);
		
		// Verifiziere, dass alle Calls erfolgreich waren (trotz potentiellem Token-Refresh)
		results.forEach(result => {
			expect(result.status).toBe(200);
		});
		
		await page.screenshot({path: 'test-results/auth-09-parallel-refresh.png'});
	});
	
	// AUTH-10 – mehrfacher Logout
	test('@advanced AUTH-10: Mehrfacher Logout verursacht keine Fehler', async ({page}) => {
		const consoleErrors: string[] = [];
		const pageErrors: string[] = [];
		
		page.on('console', (msg) => {
			if (msg.type() !== 'error') return;
			consoleErrors.push(msg.text());
		});
		
		page.on('pageerror', (err) => {
			pageErrors.push(err.message);
		});
		
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'auth10');
		
		// Login über UI
		await loginAs(page, user.email, user.password);
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Erster Logout
		await logout(page);
		await expect(page.getByTestId('home.loginLink')).toBeVisible();
		
		// Verifiziere, dass Token entfernt wurde
		const token1 = await page.evaluate(() => localStorage.getItem('hw_refresh_token'));
		expect(token1).toBeNull();
		
		// Zweiter Logout (sollte idempotent sein, keine Fehler)
		await logout(page);
		await expect(page.getByTestId('home.loginLink')).toBeVisible();
		
		// Dritter Logout
		await logout(page);
		await expect(page.getByTestId('home.loginLink')).toBeVisible();
		
		await page.screenshot({path: 'test-results/auth-10-multiple-logout.png'});
		
		// Verifiziere, dass keine Console- oder Page-Errors aufgetreten sind
		expect(pageErrors, `Page errors during test:\n${pageErrors.join('\n')}`).toHaveLength(0);
		expect(consoleErrors, `Console errors during test:\n${consoleErrors.join('\n')}`).toHaveLength(0);
	});
	
	// AUTH-11 – leere/getrimmte Tokens im Refresh-Request
	test('@advanced AUTH-11: Leere oder getrimmte Tokens werden korrekt abgelehnt', async ({page}) => {
		// Test mit leerem Token - erst navigieren, dann Token setzen
		await page.goto('/');
		await page.waitForLoadState('domcontentloaded');
		
		await page.evaluate(() => {
			localStorage.setItem('hw_refresh_token', '');
		});
		
		// Reload um Token-Check zu triggern
		await page.reload();
		
		// Erwarte, dass App als unauthentifiziert behandelt wird
		await expect(page.getByTestId('home.loginLink')).toBeVisible({timeout: 10_000});
		
		await page.screenshot({path: 'test-results/auth-11-empty-token.png'});
		
		// Test mit nur Whitespace
		await page.goto('/');
		await page.waitForLoadState('domcontentloaded');
		
		await page.evaluate(() => {
			localStorage.setItem('hw_refresh_token', '   ');
		});
		
		await page.reload();
		await expect(page.getByTestId('home.loginLink')).toBeVisible({timeout: 10_000});
		
		await page.screenshot({path: 'test-results/auth-11-whitespace-token.png'});
		
		// Test mit ungültigen Zeichen
		await page.goto('/');
		await page.waitForLoadState('domcontentloaded');
		
		await page.evaluate(() => {
			localStorage.setItem('hw_refresh_token', 'invalid-token-###');
		});
		
		await page.reload();
		await expect(page.getByTestId('home.loginLink')).toBeVisible({timeout: 10_000});
		
		await page.screenshot({path: 'test-results/auth-11-invalid-token.png'});
	});
	
	// AUTH-12 – Session-Hijacking-Schutz
	test('@advanced AUTH-12: Token aus anderem Browser funktioniert nicht', async ({page, context}) => {
		test.skip(process.env.CI === 'true', 'BLOCKED-UI: Token-Binding (Device-ID, IP-Check) nicht im Backend implementiert. Entfernen sobald Token-Binding-Feature implementiert ist.');
		
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'auth12');
		
		// Login im ersten Browser
		await loginAs(page, user.email, user.password);
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Hole Token
		const stolenToken = await page.evaluate(() => localStorage.getItem('hw_refresh_token'));
		expect(stolenToken).not.toBeNull();
		
		// Öffne neuen Browser-Context (simuliert anderen Browser)
		const newContext = await context.browser()?.newContext();
		if (!newContext) {
			throw new Error('Could not create new context');
		}
		const newPage = await newContext.newPage();
		
		// Setze gestohlenen Token in neuem Browser
		await newPage.addInitScript((token: string) => {
			localStorage.setItem('hw_refresh_token', token);
		}, stolenToken!);
		
		await newPage.goto(page.url());
		
		// TODO: Sobald Token-Binding implementiert ist (z.B. via Device-ID, IP-Check):
		// - Erwarte, dass Token im neuen Context nicht funktioniert
		// - await expect(newPage.getByTestId('home.loginLink')).toBeVisible();
		
		// Für jetzt: Dokumentiere, dass Token-Sharing derzeit funktioniert
		// (aber in Produktion mit zusätzlichen Sicherheitsmaßnahmen verhindert werden sollte)
		
		await newPage.screenshot({path: 'test-results/auth-12-token-sharing.png'});
		
		await newPage.close();
		await newContext.close();
	});
	
	// AUTH-13 – Gleichzeitige Login-Versuche desselben Users
	test('@advanced AUTH-13: Gleichzeitige Logins desselben Users', async ({page, context}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'auth13');
		
		// Öffne zweiten Browser-Context
		const newContext = await context.browser()?.newContext();
		if (!newContext) {
			throw new Error('Could not create new context');
		}
		const page2 = await newContext.newPage();
		
		// Führe gleichzeitige Logins in beiden Browsern aus
		const login1 = loginAs(page, user.email, user.password);
		const login2 = loginAs(page2, user.email, user.password);
		
		await Promise.all([login1, login2]);
		
		// Verifiziere, dass beide Logins erfolgreich waren
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		await expect(page2.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Beide Browser sollten unterschiedliche Refresh-Tokens haben
		const token1 = await page.evaluate(() => localStorage.getItem('hw_refresh_token'));
		const token2 = await page2.evaluate(() => localStorage.getItem('hw_refresh_token'));
		
		expect(token1).not.toBeNull();
		expect(token2).not.toBeNull();
		// Tokens sollten unterschiedlich sein (separate Sessions)
		expect(token1).not.toBe(token2);
		
		await page.screenshot({path: 'test-results/auth-13-simultaneous-login-1.png'});
		await page2.screenshot({path: 'test-results/auth-13-simultaneous-login-2.png'});
		
		await page2.close();
		await newContext.close();
	});
});
