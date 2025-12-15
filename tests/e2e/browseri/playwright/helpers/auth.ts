import {APIRequestContext, expect, Page} from '@playwright/test';
import {getApiBaseUrl, newApiRequestContext} from './api';
import {DEFAULT_PASSWORD, uniqueEmail} from './testdata';

/**
 * Auth-Helfer für Playwright E2E-Tests mit Expo-Web-Frontend.
 * 
 * Diese Helfer verwenden die tatsächlichen Routen und testIDs aus der Mobile-App
 * und bilden echte Nutzerflüsse über die UI ab.
 */

const routes = {
	home: '/', // Expo-Web startet auf Home-Screen (auch für unauthentifizierte Nutzer im Demo-Modus)
	// Hinweis: Expo-Web verwendet keine dedizierte '/login' oder '/register' URL-Route.
	// Navigation erfolgt über React Navigation State, nicht über URL-Pfade.
};

const testIds = {
	// Home-Screen (für unauthentifizierte Nutzer)
	homeLoginLink: 'home.loginLink',
	// Login-Screen
	loginEmail: 'login.email',
	loginPassword: 'login.password',
	loginSubmit: 'login.submit',
};

/**
 * Führt einen vollständigen Login-Flow über die Expo-Web-UI durch.
 * 
 * Flow:
 * 1. Navigate zu Home (zeigt sich für unauthentifizierte Nutzer im Demo-Modus)
 * 2. Klick auf Login-Link
 * 3. Login-Formular ausfüllen und absenden
 * 4. Warten bis Login erfolgreich (Login-Formular verschwindet)
 * 
 * @param page - Playwright Page-Objekt
 * @param email - E-Mail-Adresse
 * @param password - Passwort
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
	// Navigate to app root (Home-Screen, auch für unauthentifizierte Nutzer)
	await page.goto('/');
	
	// Warte auf Home-Screen und klicke auf Login-Link
	const loginLink = page.getByTestId(testIds.homeLoginLink);
	await loginLink.waitFor({state: 'visible', timeout: 15_000});
	await loginLink.click();
	
	// Warte auf Login-Form
	await page.getByTestId(testIds.loginEmail).waitFor({state: 'visible', timeout: 10_000});
	
	// Fill in credentials
	await page.getByTestId(testIds.loginEmail).fill(email);
	await page.getByTestId(testIds.loginPassword).fill(password);
	
	// Submit login
	await page.getByTestId(testIds.loginSubmit).click();
	
	// Warte auf erfolgreichen Login (Login-Formular verschwindet)
	await page.getByTestId(testIds.loginEmail).waitFor({state: 'hidden', timeout: 10_000});
	
	// Zusätzliche Verifikation: Nutzer ist wirklich eingeloggt
	// 1) Der Login-Link auf dem Homescreen sollte nicht mehr sichtbar sein
	await expect(page.getByTestId(testIds.homeLoginLink)).toBeHidden({timeout: 10_000});
	// 2) Ein Refresh-Token sollte im Storage vorhanden sein (Web: localStorage)
	await expect
		.poll(
			async () => page.evaluate(() => Boolean(localStorage.getItem('hw_refresh_token'))),
			{timeout: 10_000},
		)
		.toBe(true);
}

/**
 * Führt einen Logout durch die UI (falls Logout-Button vorhanden).
 * 
 * Hinweis: Die App hat möglicherweise keinen expliziten Logout-Button in der aktuellen Version.
 * Als Fallback wird localStorage geleert und die Seite neu geladen.
 * 
 * @param page - Playwright Page-Objekt
 */
export async function logout(page: Page): Promise<void> {
	// Versuche Logout über UI (falls Account-Screen mit Logout-Button existiert)
	// TODO: Sobald Account-Screen mit Logout-Button existiert, hier implementieren
	
	// Fallback: Token-Storage löschen (funktioniert mit plattformabhängiger Storage-Implementierung)
	await page.evaluate(() => {
		// Lösche das aktuelle Refresh-Token (Key: 'hw_refresh_token', verwendet von mobile/src/storage/tokens.ts)
		localStorage.removeItem('hw_refresh_token');
	});
	
	// Reload um Auth-State zu triggern
	await page.reload();
	
	// Warte darauf, dass Login-Link wieder sichtbar ist (= unauthentifiziert)
	await page.getByTestId(testIds.homeLoginLink).waitFor({state: 'visible', timeout: 10_000});
}

/**
 * Holt das gespeicherte Refresh-Token aus dem LocalStorage.
 * 
 * @param page - Playwright Page-Objekt
 * @returns Refresh-Token oder null
 */
export async function getStoredToken(page: Page): Promise<string | null> {
	return page.evaluate(() => {
		// Prüfe den Key, der von mobile/src/storage/tokens.ts verwendet wird
		return localStorage.getItem('hw_refresh_token');
	});
}

/**
 * Setzt ein Refresh-Token im LocalStorage (z.B. für Test-Setup).
 * 
 * @param page - Playwright Page-Objekt
 * @param token - Refresh-Token
 */
export async function setStoredToken(page: Page, token: string): Promise<void> {
	await page.addInitScript((t: string) => {
		// Verwende denselben Key wie mobile/src/storage/tokens.ts
		localStorage.setItem('hw_refresh_token', t);
	}, token);
}

/**
 * Führt einen Login direkt über die Backend-API durch und gibt das Access-Token zurück.
 * 
 * Dies ist nützlich für Tests, die ein Access-Token benötigen, ohne die UI durchlaufen zu müssen.
 * 
 * @param api - Playwright APIRequestContext
 * @param email - E-Mail-Adresse
 * @param password - Passwort
 * @returns Access-Token
 */
export async function loginViaApi(
	api: APIRequestContext,
	email: string,
	password: string
): Promise<string> {
	const baseUrl = getApiBaseUrl();
	const res = await api.post(`${baseUrl}/api/auth/login`, {
		form: {
			username: email,  // OAuth2PasswordRequestForm erwartet 'username'
			password: password,
		},
	});
	
	if (!res.ok()) {
		throw new Error(`API Login fehlgeschlagen: ${res.status()} ${await res.text()}`);
	}
	
	const json = await res.json();
	return json.access_token;
}

/**
 * Typen für User-Rollen (synchron mit backend/app/models/user.py UserRole)
 */
export type UserRole = 'demo' | 'common' | 'premium';

/**
 * Erstellt einen Testbenutzer mit spezifischer Rolle über die Backend-API.
 * 
 * @param api - Playwright APIRequestContext
 * @param role - Gewünschte Rolle (demo, common, premium)
 * @param emailPrefix - Optionaler E-Mail-Präfix (default: role)
 * @returns Object mit email, password und access_token
 */
export async function createUserWithRole(
	api: APIRequestContext,
	role: UserRole = 'demo',
	emailPrefix?: string
): Promise<{email: string; password: string; access_token: string}> {
	const baseUrl = getApiBaseUrl();
	const email = uniqueEmail(emailPrefix || role);
	const password = DEFAULT_PASSWORD;
	
	// Register user
	const registerRes = await api.post(`${baseUrl}/api/auth/register`, {
		data: {email, password, role},
	});
	
	if (!registerRes.ok()) {
		throw new Error(`API Registration fehlgeschlagen: ${registerRes.status()} ${await registerRes.text()}`);
	}
	
	// Login to get access token
	const access_token = await loginViaApi(api, email, password);
	
	return {email, password, access_token};
}

/**
 * Führt einen vollständigen Login-Flow über die Expo-Web-UI für einen Benutzer mit spezifischer Rolle durch.
 * 
 * Erstellt automatisch einen Testbenutzer mit der angegebenen Rolle und führt den Login aus.
 * 
 * @param page - Playwright Page-Objekt
 * @param role - Gewünschte Rolle (demo, common, premium)
 * @param emailPrefix - Optionaler E-Mail-Präfix
 * @returns Benutzer-Credentials und Access-Token
 */
export async function loginAsRole(
	page: Page,
	role: UserRole = 'demo',
	emailPrefix?: string
): Promise<{email: string; password: string; access_token: string}> {
	const api = await newApiRequestContext();
	const user = await createUserWithRole(api, role, emailPrefix);
	
	// Login über UI
	await loginAs(page, user.email, user.password);
	
	return user;
}

export const AuthSelectors = {routes, testIds} as const;
