import {expect, type Page, test} from '@playwright/test';
import {createUserWithRole, newApiRequestContext} from '../helpers/api';

const DEMO_BANNER_TITLE = /-20\s% auf alles/i;

async function gotoLogin(page: Page): Promise<void> {
	await page.goto('/');
	
	// Demo-Widgets müssen sichtbar sein (zeigt: DEMO + Beispielwidgets)
	await expect(page.getByText(DEMO_BANNER_TITLE)).toBeVisible({timeout: 10_000});
	
	// In der aktuellen UI gibt es keinen "Registrieren"-Button auf Home,
	// sondern nur den Link "Einloggen oder Registrieren".
	await expect(page.getByTestId('home.loginLink')).toBeVisible({timeout: 10_000});
	await page.getByTestId('home.loginLink').click();
	
	await expect(page.getByTestId('login.screen')).toBeVisible({timeout: 10_000});
}

async function login(page: Page, email: string, password: string): Promise<void> {
	await gotoLogin(page);
	
	await page.getByTestId('login.email').fill(email);
	await page.getByTestId('login.password').fill(password);
	
	await page.getByRole('button', {name: 'Login'}).click();
	await expect(page.getByRole('button', {name: 'Account'})).toBeVisible({timeout: 10_000});
}

async function openAccount(page: Page): Promise<void> {
	await page.getByRole('button', {name: 'Account'}).click();
	await expect(page.getByTestId('account.role')).toBeVisible({timeout: 10_000});
}

test.describe('@minimal Freemium System', () => {
	test('@minimal FREEMIUM-01: Demo-Rolle zeigt Demo-Widgets mit Rabatten', async ({page}) => {
		await page.goto('/');
		
		await expect(page.getByText(DEMO_BANNER_TITLE)).toBeVisible({timeout: 10_000});
		await expect(page.getByText('Premium Card')).toBeVisible({timeout: 10_000});
		
		// Login-Link statt "Registrieren"-Button
		await expect(page.getByTestId('home.loginLink')).toBeVisible({timeout: 10_000});
	});
	
	test('@minimal FREEMIUM-02: Registrierung → Common-Rolle mit Premium-Button', async ({page}) => {
		const email = `freemium-common-${Date.now()}@test.com`;
		const password = 'TestPass123!';
		
		// Von Home zur Login-Screen
		await gotoLogin(page);
		
		// Von Login zur Register-Screen
		await page.getByTestId('login.registerLink').click();
		await expect(page.getByTestId('register.screen')).toBeVisible({timeout: 10_000});
		
		// Registrieren
		await page.getByTestId('register.email').fill(email);
		await page.getByTestId('register.password').fill(password);
		await page.getByRole('button', {name: 'Registrieren'}).click();
		
		// Nach Registrierung geht es zur Login-Screen (kein Auto-Login)
		await expect(page.getByTestId('login.screen')).toBeVisible({timeout: 10_000});
		
		// Login
		await page.getByTestId('login.email').fill(email);
		await page.getByTestId('login.password').fill(password);
		await page.getByRole('button', {name: 'Login'}).click();
		
		// Account öffnen und Rolle prüfen
		await openAccount(page);
		
		const roleDisplay = page.getByTestId('account.role');
		await expect(roleDisplay).toContainText('👤 Common');
		
		await expect(page.getByText('isCommon: true')).toBeVisible();
		await expect(page.getByText('isDemo: false')).toBeVisible();
		
		// Premium Upgrade Card + Button nur für Common sichtbar
		await expect(page.getByText('✨ Premium Upgrade')
			.first())
			.toBeVisible({timeout: 10_000});
		
		await expect(page.getByRole('button', {name: 'Zu Premium upgraden'})).toBeVisible();
	});
	
	test('@minimal FREEMIUM-03: Premium-Button nur für Common-User sichtbar', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'common', `freemium-button-${Date.now()}@test.com`);
		
		await login(page, user.email, user.password);
		await openAccount(page);
		
		await expect(page.getByRole('button', {name: 'Zu Premium upgraden'})).toBeVisible({timeout: 10_000});
		await expect(page.getByText('Upgrade zu Premium und erhalte 20% Rabatt')).toBeVisible({timeout: 10_000});
	});
	
	test('@minimal FREEMIUM-04: Premium-Button führt echtes Upgrade durch', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'common', `freemium-dialog-${Date.now()}@test.com`);
		
		await login(page, user.email, user.password);
		await openAccount(page);
		
		const roleDisplay = page.getByTestId('account.role');
		await expect(roleDisplay).toContainText('👤 Common');
		
		page.on('dialog', async (dialog) => {
			expect(dialog.message()).toContain('Premium aktiviert');
			await dialog.accept();
		});
		
		await page.getByRole('button', {name: 'Zu Premium upgraden'}).click();
		
		// Stabiler als waitForTimeout: warte bis Rolle umspringt
		await expect(roleDisplay).toContainText('👑 Premium', {timeout: 10_000});
	});
	
	test('@minimal FREEMIUM-05: Premium-User sehen keinen Upgrade-Button', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'premium', `freemium-premium-${Date.now()}@test.com`);
		
		await login(page, user.email, user.password);
		await openAccount(page);
		
		await expect(page.getByRole('button', {name: 'Zu Premium upgraden'}))
			.not.toBeVisible({timeout: 5_000});
		
		await expect(page.getByText('✨ Premium Upgrade'))
			.not.toBeVisible({timeout: 5_000});
		
		const roleDisplay = page.getByTestId('account.role');
		await expect(roleDisplay).toContainText('👑 Premium');
	});
	
	test('@minimal FREEMIUM-06: Demo-User sehen keinen Upgrade-Button', async ({page}) => {
		await page.goto('/');
		
		await expect(page.getByText(DEMO_BANNER_TITLE)).toBeVisible({timeout: 10_000});
		
		// Demo hat keinen Account/kein Upgrade
		await expect(page.getByRole('button', {name: 'Zu Premium upgraden'})).not.toBeVisible({timeout: 2_000});
		await expect(page.getByRole('button', {name: 'Account'})).not.toBeVisible({timeout: 2_000});
	});
});