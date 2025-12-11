import {expect, test} from '@playwright/test';
import {newApiRequestContext} from '../helpers/api';

/**
 * EXPO-WEB-SMOKE: Minimaler Test zur Verifizierung der Expo-Web-Integration
 * 
 * Dieser Test prüft, ob:
 * 1. Das Backend E2E-Modus erreichbar ist
 * 2. Expo-Web startet und die App lädt
 * 3. Der Login-Screen angezeigt wird (für unauthenticated users)
 */

test.describe('Expo-Web Integration Smoke Tests', () => {
	
	test('Backend Health Check über API', async () => {
		const api = await newApiRequestContext();
		const res = await api.get('/health');
		expect(res.ok()).toBeTruthy();
		const data = await res.json();
		expect(data.status).toBe('ok');
	});
	
	test('Expo-Web lädt und zeigt Login-Screen', async ({page}) => {
		// Navigate to Expo-Web root
		await page.goto('/');
		
		// Wait for the app to load (check for any visible content)
		await page.waitForLoadState('networkidle');
		
		// Check that the login form is visible (for unauthenticated users)
		const emailInput = page.getByTestId('login.email');
		await expect(emailInput).toBeVisible({timeout: 15_000});
		
		// Verify we can interact with the form
		await emailInput.fill('test@example.com');
		await expect(emailInput).toHaveValue('test@example.com');
		
		// Take a screenshot for visual verification
		await page.screenshot({path: 'test-results/expo-web-smoke.png'});
	});
});
