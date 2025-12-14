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
 * @returns User-Objekt mit email, password und role
 */
export async function createUserWithRole(
	api: APIRequestContext,
	role: 'demo' | 'common' | 'premium',
	baseEmail: string
): Promise<{ email: string; password: string; role: 'common' | 'premium' | 'demo' }> {
	const password = 'DemoPass123!';
	
	// Registrieren (Backend vergibt initial i. d. R. 'common')
	const registerRes = await api.post('/api/auth/register', {
		data: {email: baseEmail, password},
	});
	
	if (!registerRes.ok()) {
		const body = await registerRes.text();
		throw new Error(`createUserWithRole: register failed (${registerRes.status()}): ${body}`);
	}
	
	// Defensive: nicht auf Response-Shape angewiesen sein
	let effectiveRole: 'common' | 'premium' | 'demo' = 'common';
	
	// Optional: falls Backend role im JSON liefert, übernehmen (ohne Abhängigkeit)
	try {
		const json = (await registerRes.json()) as Partial<{ role: string }>;
		if (json.role === 'demo' || json.role === 'common' || json.role === 'premium') {
			effectiveRole = json.role;
		}
	} catch {
		// ignore – wir arbeiten deterministisch mit baseEmail/password weiter
	}
	
	if (role !== 'premium') {
		return {email: baseEmail, password, role: role === 'demo' ? 'demo' : effectiveRole};
	}
	
	// Login um Access-Token zu bekommen (OAuth2PasswordRequestForm: form-encoded)
	const loginRes = await api.post('/api/auth/login', {
		form: {username: baseEmail, password},
	});
	
	if (!loginRes.ok()) {
		const body = await loginRes.text();
		throw new Error(`createUserWithRole: login failed (${loginRes.status()}): ${body}`);
	}
	
	const tokens = (await loginRes.json()) as { access_token?: string };
	if (!tokens.access_token) {
		throw new Error(`createUserWithRole: login response missing access_token`);
	}
	
	// Upgrade zu Premium
	const upgradeRes = await api.post('/api/auth/upgrade-to-premium', {
		headers: {Authorization: `Bearer ${tokens.access_token}`},
	});
	
	if (!upgradeRes.ok()) {
		const body = await upgradeRes.text();
		throw new Error(`createUserWithRole: upgrade failed (${upgradeRes.status()}): ${body}`);
	}
	
	return {email: baseEmail, password, role: 'premium'};
}

