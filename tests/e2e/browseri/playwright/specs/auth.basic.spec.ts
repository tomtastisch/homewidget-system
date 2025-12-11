import {expect, test} from '@playwright/test';
import {newApiRequestContext} from '../helpers/api';

// AUTH-01 – Login mit gültigen Daten (Happy Path)
test('AUTH-01: Login mit gültigen Daten', async () => {
	const api = await newApiRequestContext();
	const email = `auth01+${Date.now()}@example.com`;
	const password = 'Secret1234!';
	
	// Register user
	await api.post('/api/auth/register', {data: {email, password}});
	// Login via OAuth2 form
	const res = await api.post('/api/auth/login', {form: {username: email, password}});
	expect(res.ok()).toBeTruthy();
	const json = await res.json();
	expect(json.access_token).toBeTruthy();
	expect(json.refresh_token).toBeTruthy();
});

// AUTH-02 – Logout löscht Token, UI zeigt Login-Screen
test('AUTH-02: Logout löscht Token', async () => {
	const api = await newApiRequestContext();
	const email = `auth02+${Date.now()}@example.com`;
	const password = 'Secret1234!';
	await api.post('/api/auth/register', {data: {email, password}});
	const login = await (await api.post('/api/auth/login', {form: {username: email, password}})).json();
	
	// Call protected endpoint succeeds
	const meOk = await api.get('/api/auth/me', {headers: {Authorization: `Bearer ${login.access_token}`}});
	expect(meOk.ok()).toBeTruthy();
	
	// Logout (blacklists current access token)
	const loggedOut = await api.post('/api/auth/logout', {headers: {Authorization: `Bearer ${login.access_token}`}});
	expect(loggedOut.status()).toBe(204);
	
	// Token should no longer work
	const meFail = await api.get('/api/auth/me', {headers: {Authorization: `Bearer ${login.access_token}`}});
	expect(meFail.status()).toBe(401);
	
	// UI note: Real app should redirect to /login after client logout.
	// TODO: When UI exists, perform logout via UI and verify redirect.
});

// AUTH-03 – Abgelaufener Access-Token → Refresh oder Re-Login (verifizierbares Verhalten)
test('AUTH-03: Abgelaufener Access-Token → Refresh', async () => {
	const api = await newApiRequestContext();
	const email = `auth03+${Date.now()}@example.com`;
	const password = 'Secret1234!';
	await api.post('/api/auth/register', {data: {email, password}});
	const loginResp = await api.post('/api/auth/login', {form: {username: email, password}});
	const login = await loginResp.json();
	
	// Simulate expired/invalid access by mangling token
	const badAccess = login.access_token + 'x';
	const me401 = await api.get('/api/auth/me', {headers: {Authorization: `Bearer ${badAccess}`}});
	expect(me401.status()).toBe(401);
	
	// Refresh should provide a new access token
	const refresh = await api.post('/api/auth/refresh', {data: {refresh_token: login.refresh_token}});
	expect(refresh.ok()).toBeTruthy();
	const rotated = await refresh.json();
	const meOk = await api.get('/api/auth/me', {headers: {Authorization: `Bearer ${rotated.access_token}`}});
	expect(meOk.ok()).toBeTruthy();
});
