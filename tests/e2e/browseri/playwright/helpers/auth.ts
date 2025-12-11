import {expect, Page} from '@playwright/test';

// TODO: Align selectors and routes with the real web client once available
const routes = {
	login: '/login', // TODO adjust if different
	afterLogin: '/dashboard', // TODO adjust if different
	logoutButton: '[data-testid="logout-button"]', // TODO: real selector
};

const storageKeys = {
	accessToken: 'access_token', // TODO: confirm key used by web client
	refreshToken: 'refresh_token', // optional
};

export async function loginAs(page: Page, email: string, password: string) {
	await page.goto(routes.login);
	// Email field
	const emailByLabel = page.getByLabel('Email');
	if (await emailByLabel.count()) {
		await emailByLabel.fill(email);
	} else {
		const emailByPh = page.getByPlaceholder('Email');
		await emailByPh.fill(email);
	}
	// Password field
	const passByLabel = page.getByLabel('Password');
	if (await passByLabel.count()) {
		await passByLabel.fill(password);
	} else {
		const passByPh = page.getByPlaceholder('Password');
		await passByPh.fill(password);
	}
	await page.getByRole('button', {name: /login|anmelden/i}).click();
	await page.waitForURL(`**${routes.afterLogin}`);
}

export async function logout(page: Page) {
	// Try clicking an explicit logout button first
	const btn = page.locator(routes.logoutButton);
	if (await btn.count()) {
		await btn.click();
	} else {
		// Fallback: navigate to a dedicated logout route if exists
		// TODO: if app supports GET /logout that clears tokens client-side, use it.
	}
	
	// Clear tokens client-side as a safety net
	await page.evaluate((k) => {
		localStorage.removeItem(k.accessToken);
		localStorage.removeItem(k.refreshToken);
	}, storageKeys);
	
	// Expect redirect back to login
	await expect(page).toHaveURL(new RegExp(`${routes.login.replace('/', '\\/')}`));
}

export async function getStoredToken(page: Page): Promise<string | null> {
	return page.evaluate((key) => localStorage.getItem(key), storageKeys.accessToken);
}

export async function setStoredToken(page: Page, token: string) {
	await page.addInitScript(([k, t]) => {
		localStorage.setItem(k, t);
	}, [storageKeys.accessToken, token]);
}

export const AuthSelectors = {routes, storageKeys} as const;
