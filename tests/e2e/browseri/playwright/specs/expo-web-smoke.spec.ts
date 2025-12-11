import {expect, test} from '@playwright/test';
import {newApiRequestContext} from '../helpers/api';

/**
 * EXPO-WEB-SMOKE: Minimaler Test zur Verifizierung der Expo-Web-Integration
 * 
 * Dieser Test prüft, ob:
 * 1. Das Backend E2E-Modus erreichbar ist
 * 2. Expo-Web startet und die App lädt
 * 3. Der Home-Screen im Demo-Modus angezeigt wird (für unauthentifizierte Nutzer)
 */

test.describe('Expo-Web Integration Smoke Tests', () => {
	
	test('Backend Health Check über API', async () => {
		const api = await newApiRequestContext();
		const res = await api.get('/health');
		expect(res.ok()).toBeTruthy();
		const data = await res.json();
		expect(data.status).toBe('ok');
	});
	
	test('Expo-Web lädt und zeigt Home-Screen im Demo-Modus', async ({page}) => {
		// Navigate to Expo-Web root
		await page.goto('/');
		
		// Wait for the app to load (check for any visible content)
		await page.waitForLoadState('networkidle');
		
		// Wait for React hydration
		await page.waitForTimeout(3000);
		
		// Prüfe, dass Home-Screen im Demo-Modus sichtbar ist
		// Unauthentifizierte Nutzer sehen den Home-Screen mit Login-Link
		const loginLink = page.getByTestId('home.loginLink');
		await expect(loginLink).toBeVisible({timeout: 15_000});
		
		// Verify we can interact with the link
		await expect(loginLink).toBeEnabled();
		
		// Take a screenshot for visual verification
		await page.screenshot({path: 'test-results/expo-web-smoke-home.png'});
	});
});
