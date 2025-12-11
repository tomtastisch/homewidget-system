import {expect, Page} from '@playwright/test';

/**
 * Auth-Helfer für Playwright E2E-Tests mit Expo-Web-Frontend.
 * 
 * Diese Helfer verwenden die tatsächlichen Routen und testIDs aus der Mobile-App.
 */

const routes = {
	login: '/', // Expo-Web startet normalerweise auf Home, aber unauthed sollte auf Login redirecten
	home: '/', // Nach Login: Home-Screen
	register: '/register', // Falls Register-Screen existiert (noch zu prüfen)
};

const testIds = {
	loginEmail: 'login.email',
	loginPassword: 'login.password',
	loginSubmit: 'login.submit',
};

/**
 * Führt einen Login über die Expo-Web-UI durch.
 * 
 * @param page - Playwright Page-Objekt
 * @param email - E-Mail-Adresse
 * @param password - Passwort
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
	// Navigate to app root (should redirect to login if not authenticated)
	await page.goto('/');
	
	// Wait for login form to be visible
	await page.getByTestId(testIds.loginEmail).waitFor({state: 'visible'});
	
	// Fill in credentials
	await page.getByTestId(testIds.loginEmail).fill(email);
	await page.getByTestId(testIds.loginPassword).fill(password);
	
	// Submit login
	await page.getByTestId(testIds.loginSubmit).click();
	
	// Wait for navigation to home screen (assuming successful login redirects)
	// Note: Expo-Web Navigation might not change URL in single-page apps,
	// so we check for absence of login form instead
	await page.getByTestId(testIds.loginEmail).waitFor({state: 'hidden', timeout: 10_000});
}

/**
 * Führt einen Logout durch und wartet auf Redirect zum Login-Screen.
 * 
 * @param page - Playwright Page-Objekt
 */
export async function logout(page: Page): Promise<void> {
	// TODO: Implement logout based on actual UI
	// For now, clear tokens via storage
	await page.evaluate(() => {
		// React Native Web uses AsyncStorage which is backed by localStorage
		localStorage.clear();
	});
	
	// Reload to trigger auth check
	await page.reload();
	
	// Wait for login form to appear
	await page.getByTestId(testIds.loginEmail).waitFor({state: 'visible'});
}

/**
 * Holt das gespeicherte Access-Token aus dem LocalStorage.
 * 
 * @param page - Playwright Page-Objekt
 * @returns Access-Token oder null
 */
export async function getStoredToken(page: Page): Promise<string | null> {
	return page.evaluate(() => {
		// Check various possible storage keys used by the mobile app
		return localStorage.getItem('access_token') || 
		       localStorage.getItem('refreshToken') ||
		       null;
	});
}

/**
 * Setzt ein Access-Token im LocalStorage (z.B. für Test-Setup).
 * 
 * @param page - Playwright Page-Objekt
 * @param token - Access-Token
 */
export async function setStoredToken(page: Page, token: string): Promise<void> {
	await page.addInitScript((t: string) => {
		localStorage.setItem('access_token', t);
	}, token);
}

export const AuthSelectors = {routes, testIds} as const;
