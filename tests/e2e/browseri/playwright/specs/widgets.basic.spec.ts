import {expect, test} from '@playwright/test';
import {newApiRequestContext} from '../helpers/api';
import {createWidget, deleteWidgetById, expectWidgetInList, listWidgets} from '../helpers/widgets';

test('WIDGET-01: Eigene Widgets anzeigen', async () => {
	const api = await newApiRequestContext();
	const email = `w1+${Date.now()}@example.com`;
	const password = 'Secret1234!';
	await api.post('/api/auth/register', {data: {email, password}});
	const login = await (await api.post('/api/auth/login', {form: {username: email, password}})).json();
	
	const widgets = await listWidgets(api, login.access_token);
	expect(Array.isArray(widgets)).toBeTruthy();
});

test('WIDGET-02: Neues Widget erstellen', async () => {
	const api = await newApiRequestContext();
	const email = `w2+${Date.now()}@example.com`;
	const password = 'Secret1234!';
	await api.post('/api/auth/register', {data: {email, password}});
	const login = await (await api.post('/api/auth/login', {form: {username: email, password}})).json();
	
	const name = `Widget ${Date.now()}`;
	const created = await createWidget(api, name, '{}', login.access_token);
	expect(created.name).toBe(name);
	
	await expectWidgetInList(api, name, login.access_token);
});

test('WIDGET-03: Eigenes Widget löschen', async () => {
	const api = await newApiRequestContext();
	const email = `w3+${Date.now()}@example.com`;
	const password = 'Secret1234!';
	await api.post('/api/auth/register', {data: {email, password}});
	const login = await (await api.post('/api/auth/login', {form: {username: email, password}})).json();
	
	const name = `Widget ${Date.now()}`;
	const created = await createWidget(api, name, '{}', login.access_token);
	const del = await deleteWidgetById(api, created.id, login.access_token);
	expect(del.status()).toBe(204);
	const after = await listWidgets(api, login.access_token);
	expect(after.find((w) => w.id === created.id)).toBeFalsy();
});
