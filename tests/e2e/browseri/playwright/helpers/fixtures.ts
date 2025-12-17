import {expect, Page, test as base} from '@playwright/test';
import {newApiRequestContext} from './api';
import {DEFAULT_PASSWORD, uniqueEmail} from './testdata';

type AuthContext = {
	email: string;
	password: string;
	access_token: string;
	refresh_token: string;
};

type Fixtures = {
	authenticatedPage: Page & { auth: AuthContext };
};

export const test = base.extend<Fixtures>({
	authenticatedPage: async ({page}: { page: Page }, use: any) => {
		const api = await newApiRequestContext();
		const email = uniqueEmail('demo');
		const password = DEFAULT_PASSWORD;
		
		// Ensure user exists (idempotent enough for tests)
		await api.post('/api/auth/register', {data: {email, password}});
		
		// OAuth2PasswordRequestForm expects form-encoded username/password
		const loginRes = await api.post('/api/auth/login', {
			form: {username: email, password},
		});
		expect(loginRes.ok()).toBeTruthy();
		const login = await loginRes.json();
		const auth: AuthContext = {
			email,
			password,
			access_token: login.access_token,
			refresh_token: login.refresh_token,
		};
		
		// Inject tokens into localStorage before any script runs
		await page.addInitScript((pair: AuthContext) => {
			localStorage.setItem('access_token', pair.access_token);
			localStorage.setItem('refresh_token', pair.refresh_token);
		}, auth);
		
		// Expose on page object for convenience
		(page as any).auth = auth;
		
		await use(page as Page & { auth: AuthContext });
	},
});

export {expect};
