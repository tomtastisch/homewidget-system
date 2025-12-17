import {expect, test} from '@playwright/test';
import {loginAs, logout} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';
import {DEFAULT_PASSWORD, uniqueEmail, WRONG_PASSWORD} from '../helpers/testdata';

/**
 * Auth-Tests: UI-basierte End-to-End-Tests über Expo-Web (Minimal-Ebene)
 * 
 * Diese Tests verwenden die echte UI und bilden Nutzerflüsse ab.
 * Tag: @minimal
 */

test.describe('@minimal Auth Basic', () => {
	// AUTH-01 – Login mit gültigen Daten (Happy Path) über UI
	test('@minimal AUTH-01: Login mit gültigen Daten über UI', async ({page}) => {
	// Erstelle Testbenutzer über API (Setup)
		const api = await newApiRequestContext();
		const email = uniqueEmail('auth01');
		const password = DEFAULT_PASSWORD;
	await api.post('/api/auth/register', {data: {email, password}});
	
	// Login über UI
	await loginAs(page, email, password);
	
	// Verifiziere erfolgreichen Login: Home-Screen ohne Login-Link
	const loginLink = page.getByTestId('home.loginLink');
	await expect(loginLink).not.toBeVisible();
	
		// Screenshot für visuelle Verifikation
		await page.screenshot({path: 'test-results/auth-01-logged-in.png'});
	});

	// AUTH-02 – Logout über UI
	test('@minimal AUTH-02: Logout über UI', async ({page}) => {
	// Setup: Testbenutzer erstellen und einloggen
		const api = await newApiRequestContext();
		const email = uniqueEmail('auth02');
		const password = DEFAULT_PASSWORD;
	await api.post('/api/auth/register', {data: {email, password}});
	
	// Login über UI
	await loginAs(page, email, password);
	
	// Verifiziere Login erfolgreich
	await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
	
	// Logout über UI-Helper (löscht localStorage und reload)
	await logout(page);
	
	// Verifiziere Logout: Login-Link wieder sichtbar (unauthentifiziert)
	await expect(page.getByTestId('home.loginLink')).toBeVisible();
	
		// Screenshot
		await page.screenshot({path: 'test-results/auth-02-logged-out.png'});
	});

	// AUTH-03 – Login mit falschen Credentials zeigt Fehlermeldung
	test('@minimal AUTH-03: Login mit falschen Credentials zeigt Fehler', async ({page}) => {
		
	// Navigiere zu Home und öffne Login
	await page.goto('/');
	const loginLink = page.getByTestId('home.loginLink');
	await loginLink.waitFor({state: 'visible'});
	await loginLink.click();
	
	// Warte auf Login-Form
	await page.getByTestId('login.email').waitFor({state: 'visible'});
	
	// Falsche Credentials eingeben
		await page.getByTestId('login.email').fill('nonexistent@example.com');
		await page.getByTestId('login.password').fill(WRONG_PASSWORD);
	await page.getByTestId('login.submit').click();
	
	// Warte auf Fehlermeldung nach fehlerhaftem Login
	await page.getByTestId('login.error').waitFor({state: 'visible'});
	
	// Verifiziere: Login-Form noch sichtbar (Login fehlgeschlagen)
	await expect(page.getByTestId('login.email')).toBeVisible();
		
		// Verifiziere: Fehlermeldung ist sichtbar und enthält den erwarteten Backend-Detailtext
		await expect(page.getByTestId('login.error')).toHaveText('Invalid credentials');
		
		// Screenshot
		await page.screenshot({path: 'test-results/auth-03-login-error.png'});
	});
});
