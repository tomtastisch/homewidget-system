import {expect, test} from '@playwright/test';
import {newApiRequestContext} from '../helpers/api';
import {createWidget, deleteWidgetById} from '../helpers/widgets';

test('WIDGET-04: Fremdes Widget löschen → 404', async () => {
	const api = await newApiRequestContext();
	
	// User A creates a widget
	const emailA = `owner+${Date.now()}@example.com`;
	const pwd = 'Secret1234!';
	await api.post('/api/auth/register', {data: {email: emailA, password: pwd}});
	const loginA = await (await api.post('/api/auth/login', {form: {username: emailA, password: pwd}})).json();
	const w = await createWidget(api, 'Owned by A', '{}', loginA.access_token);
	
	// User B tries to delete it
	const emailB = `other+${Date.now()}@example.com`;
	await api.post('/api/auth/register', {data: {email: emailB, password: pwd}});
	const loginB = await (await api.post('/api/auth/login', {form: {username: emailB, password: pwd}})).json();
	
	const del = await deleteWidgetById(api, w.id, loginB.access_token);
	expect(del.status()).toBe(404);
});

test('WIDGET-06: XSS in Widget-Name wird nicht ausgeführt (escaped in UI – TODO)', async () => {
	const api = await newApiRequestContext();
	const email = `xss+${Date.now()}@example.com`;
	const pwd = 'Secret1234!';
	await api.post('/api/auth/register', {data: {email, password: pwd}});
	const login = await (await api.post('/api/auth/login', {form: {username: email, password: pwd}})).json();
	
	const payload = '<script>alert("XSS")</script>';
	const created = await createWidget(api, payload, '{}', login.access_token);
	expect(created.name).toBe(payload);
	
	// NOTE: A real UI test would navigate to the widget list and assert text is escaped and no <script> appears.
	// TODO: Once UI routes/selectors are available, use helpers/security.expectSecureText on the corresponding locator.
});
