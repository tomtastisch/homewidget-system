import {expect, test} from '@playwright/test';
import {loginAs, logout} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';

/**
 * Auth-Tests: UI-basierte End-to-End-Tests über Expo-Web (Minimum-Ebene)
 * 
 * Diese Tests verwenden die echte UI und bilden Nutzerflüsse ab.
 * Tag: @minimal
 */

test.describe('@minimal Auth Basic', () => {
	// AUTH-01 – Login mit gültigen Daten (Happy Path) über UI
	test('@minimal AUTH-01: Login mit gültigen Daten über UI', async ({page}) => {
	// Erstelle Testbenutzer über API (Setup)
	const api = await newApiRequestContext();
	const email = `auth01+${Date.now()}@example.com`;
	const password = 'Secret1234!';
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
	const email = `auth02+${Date.now()}@example.com`;
	const password = 'Secret1234!';
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
		// Note: login.error testId exists and shows, but actual error text content is not yet assertable
		// This test currently only verifies that error display appears, not its content
		
	// Navigiere zu Home und öffne Login
	await page.goto('/');
	const loginLink = page.getByTestId('home.loginLink');
	await loginLink.waitFor({state: 'visible'});
	await loginLink.click();
	
	// Warte auf Login-Form
	await page.getByTestId('login.email').waitFor({state: 'visible'});
	
	// Falsche Credentials eingeben
	await page.getByTestId('login.email').fill('nonexistent@example.com');
	await page.getByTestId('login.password').fill('wrongpassword');
	await page.getByTestId('login.submit').click();
	
	// Warte auf Fehlermeldung nach fehlerhaftem Login
	await page.getByTestId('login.error').waitFor({state: 'visible'});
	
	// Verifiziere: Login-Form noch sichtbar (Login fehlgeschlagen)
	await expect(page.getByTestId('login.email')).toBeVisible();
	
		// TODO: Prüfe auf Fehlermeldung in UI (sobald Error-State-Handling implementiert)
		// Erwarte einen Text wie "Invalid credentials" oder ähnlich
		
		// Screenshot
		await page.screenshot({path: 'test-results/auth-03-login-error.png'});
	});
});
