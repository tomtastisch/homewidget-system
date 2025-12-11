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
