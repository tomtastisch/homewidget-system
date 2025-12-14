import {APIRequestContext, Page, request} from '@playwright/test';

/**
 * Gibt die Backend-API-Basis-URL für E2E-Tests zurück.
 * 
 * Verwendet E2E_API_BASE_URL aus der Umgebung oder den Standard-Port 8100.
 */
export function getApiBaseUrl(): string {
	return process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8100';
}

export async function mockBackendError(
	page: Page,
	endpointPattern: string | RegExp,
	statusCode: number,
	body: any = {detail: 'Simulated error'}
) {
	await page.route(endpointPattern, async (route: any) => {
		await route.fulfill({status: statusCode, json: body});
	});
}

export async function newApiRequestContext(): Promise<APIRequestContext> {
	return await request.newContext({baseURL: getApiBaseUrl()});
}

/**
 * Erstellt einen Test-User mit spezifischer Rolle.
 *
 * @param api API Request Context
 * @param role Gewünschte Rolle: 'demo', 'common', oder 'premium'
 * @param baseEmail Email-Adresse für den User
 * @returns User-Objekt mit email und role
 */
export async function createUserWithRole(
	api: APIRequestContext,
	role: 'demo' | 'common' | 'premium',
	baseEmail: string
): Promise<{ email: string; role: string }> {
	const password = 'DemoPass123!';
	
	// Registriere User (bekommt immer 'common')
	const registerRes = await api.post('/api/auth/register', {
		data: {email: baseEmail, password},
	});
	
	const user = await registerRes.json() as { email: string; role: string };
	
	// Wenn Premium gewünscht: Upgrade durchführen
	if (role === 'premium') {
		// Login um Tokens zu bekommen
		const loginRes = await api.post('/api/auth/login', {
			data: {username: baseEmail, password},
		});
		
		const tokens = await loginRes.json() as { access_token: string };
		
		// Upgrade zu Premium
		const upgradeRes = await api.post('/api/auth/upgrade-to-premium', {
			headers: {Authorization: `Bearer ${tokens.access_token}`},
		});
		
		const upgraded = await upgradeRes.json() as { email: string; role: string };
		return {email: upgraded.email, role: upgraded.role};
	}
	
	return {email: user.email, role: user.role};
}

