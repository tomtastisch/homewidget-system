import {APIRequestContext, expect, Page} from '@playwright/test';
import {newApiRequestContext} from './api';

export async function createWidget(
	apiOrPage: APIRequestContext | Page,
	name: string,
	configJson: string = '{}',
	accessToken?: string,
) {
	const api = 'request' in apiOrPage ? await newApiRequestContext() : (apiOrPage as APIRequestContext);
	const headers: Record<string, string> = accessToken ? {Authorization: `Bearer ${accessToken}`} : {};
	const res = await api.post('/api/widgets/', {
		data: {name, config_json: configJson},
		headers,
	});
	expect(res.ok()).toBeTruthy();
	const json = await res.json();
	return json as { id: number; name: string; config_json: string };
}

export async function deleteWidgetById(
	apiOrPage: APIRequestContext | Page,
	widgetId: number,
	accessToken?: string,
) {
	const api = 'request' in apiOrPage ? await newApiRequestContext() : (apiOrPage as APIRequestContext);
	const headers: Record<string, string> = accessToken ? {Authorization: `Bearer ${accessToken}`} : {};
	const res = await api.delete(`/api/widgets/${widgetId}`, {headers});
	return res;
}

export async function listWidgets(
	apiOrPage: APIRequestContext | Page,
	accessToken?: string,
) {
	const api = 'request' in apiOrPage ? await newApiRequestContext() : (apiOrPage as APIRequestContext);
	const headers: Record<string, string> = accessToken ? {Authorization: `Bearer ${accessToken}`} : {};
	const res = await api.get('/api/widgets/', {headers});
	expect(res.ok()).toBeTruthy();
	return (await res.json()) as Array<{ id: number; name: string; config_json: string }>;
}

export async function expectWidgetInList(
	apiOrPage: APIRequestContext | Page,
	widgetName: string,
	accessToken?: string,
) {
	const widgets = await listWidgets(apiOrPage, accessToken);
	expect(widgets.map((w) => w.name)).toContain(widgetName);
}
