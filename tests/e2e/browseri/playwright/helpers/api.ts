import {APIRequestContext, Page, request} from '@playwright/test';

export function getApiBaseUrl(): string {
	// Prefer explicit E2E API base; fallback to common defaults
	return (
		process.env.E2E_API_BASE_URL ||
		process.env.BACKEND_BASE_URL ||
		'http://127.0.0.1:8100'
	);
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
