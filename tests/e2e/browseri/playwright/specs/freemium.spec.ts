import {expect, test} from '@playwright/test';
import {createUserWithRole, newApiRequestContext} from '../helpers/api';

/**
 * FREEMIUM-SYSTEM E2E Tests
 *
 * Testet das Freemium-Upselling-System mit drei Rollen:
 * - Demo: Unauthentifiziert, sieht Rabattpreise (zum Anlocken)
 * - Common: Registriert/kostenlos, sieht normale Preise, kann zu Premium upgraden
 * - Premium: Registriert/bezahlt, sieht Rabattpreise (Belohnung)
 */

test.describe('@minimal Freemium System', () => {
	// FREEMIUM-01: Demo-User sehen Demo-Widgets mit Rabatten
	test('@minimal FREEMIUM-01: Demo-Rolle zeigt Demo-Widgets mit Rabatten', async ({page}) => {
		await page.goto('/');
		
		// Prüfe, dass wir im Demo-Modus sind (nicht authentifiziert)
		const demoWidgets = page.locator('text=Sommer Sale');
		await expect(demoWidgets).toBeVisible({timeout: 5000});
		
		// Registrieren/Login Buttons sollten sichtbar sein
		const registerButton = page.locator('text=Registrieren');
		await expect(registerButton).toBeVisible();
	});
	
	// FREEMIUM-02: Registrierung → User bekommt Common-Rolle
	test('@minimal FREEMIUM-02: Registrierung → Common-Rolle mit Premium-Button', async ({page}) => {
		const email = `freemium-common-${Date.now()}@test.com`;
		const password = 'TestPass123!';
		
		// Starte als Demo (Home Screen)
		await page.goto('/');
		
		// Klicke Registrieren
		const registerButton = page.locator('text=Registrieren');
		await expect(registerButton).toBeVisible({timeout: 5000});
		await registerButton.click();
		
		// Fülle Registrierungs-Form aus
		await page.fill('input[placeholder*="E-Mail"]', email);
		await page.fill('input[placeholder*="Passwort"]', password);
		
		const registerSubmit = page.locator('button:has-text("Registrieren")').last();
		await registerSubmit.click();
		
		// Warte bis nach Login → Home Screen
		await expect(page.locator('text=Account')).toBeVisible({timeout: 10000});
		
		// Gehe zu Account
		await page.locator('text=Account').click();
		
		// Prüfe Common-Rolle
		const roleDisplay = page.locator('testid=account.role');
		await expect(roleDisplay).toContainText('👤 Common');
		
		// Prüfe isCommon: true
		const isCommonText = page.locator('text=isCommon: true');
		await expect(isCommonText).toBeVisible();
		
		// Prüfe isDemo: false
		const isDemoText = page.locator('text=isDemo: false');
		await expect(isDemoText).toBeVisible();
		
		// Prüfe Premium Upgrade Card ist sichtbar
		const premiumCard = page.locator('text=✨ Premium Upgrade');
		await expect(premiumCard).toBeVisible();
		
		// Prüfe Premium Button
		const upgradeButton = page.locator('button:has-text("Zu Premium upgraden")');
		await expect(upgradeButton).toBeVisible();
	});
	
	// FREEMIUM-03: Premium-Upgrade-Button sichtbar nur für Common-User
	test('@minimal FREEMIUM-03: Premium-Button nur für Common-User sichtbar', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'common', `freemium-button-${Date.now()}`);
		
		// Login mit Common-User
		await page.goto('/');
		const emailInput = page.locator('input[placeholder*="E-Mail"]').first();
		const passwordInput = page.locator('input[placeholder*="Passwort"]').first();
		const loginButton = page.locator('button:has-text("Anmelden")').first();
		
		await emailInput.fill(user.email);
		await passwordInput.fill('DemoPass123!');
		await loginButton.click();
		
		// Warte bis eingeloggt
		await expect(page.locator('text=Account')).toBeVisible({timeout: 10000});
		
		// Gehe zu Account
		await page.locator('text=Account').click();
		
		// Premium-Button sollte sichtbar sein
		const upgradeButton = page.locator('button:has-text("Zu Premium upgraden")');
		await expect(upgradeButton).toBeVisible({timeout: 5000});
		
		// Card sollte Upgrade-Text enthalten
		const upgradeCard = page.locator('text=Upgrade zu Premium und erhalte 20% Rabatt');
		await expect(upgradeCard).toBeVisible();
	});
	
	// FREEMIUM-04: Premium-Button zeigt Dialog und führt Upgrade durch
	test('@minimal FREEMIUM-04: Premium-Button führt echtes Upgrade durch', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'common', `freemium-dialog-${Date.now()}`);
		
		// Login
		await page.goto('/');
		const emailInput = page.locator('input[placeholder*="E-Mail"]').first();
		const passwordInput = page.locator('input[placeholder*="Passwort"]').first();
		const loginButton = page.locator('button:has-text("Anmelden")').first();
		
		await emailInput.fill(user.email);
		await passwordInput.fill('DemoPass123!');
		await loginButton.click();
		
		// Account öffnen
		await expect(page.locator('text=Account')).toBeVisible({timeout: 10000});
		await page.locator('text=Account').click();
		
		// Prüfe dass Rolle Common ist
		const roleDisplay = page.locator('testid=account.role');
		await expect(roleDisplay).toContainText('👤 Common');
		
		// Klicke Premium-Button
		const upgradeButton = page.locator('button:has-text("Zu Premium upgraden")');
		await expect(upgradeButton).toBeVisible();
		
		// Handle Alert Dialog
		page.on('dialog', async (dialog) => {
			expect(dialog.message()).toContain('Premium aktiviert');
			await dialog.accept();
		});
		
		await upgradeButton.click();
		
		// Warte auf erfolgreiche Alert
		await page.waitForTimeout(2000);
		
		// Rolle sollte jetzt Premium sein
		await expect(roleDisplay).toContainText('👑 Premium');
	});
	
	// FREEMIUM-05: Premium-User sehen kein Upgrade-Button mehr
	test('@minimal FREEMIUM-05: Premium-User sehen keinen Upgrade-Button', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'premium', `freemium-premium-${Date.now()}`);
		
		// Login mit Premium-User
		await page.goto('/');
		const emailInput = page.locator('input[placeholder*="E-Mail"]').first();
		const passwordInput = page.locator('input[placeholder*="Passwort"]').first();
		const loginButton = page.locator('button:has-text("Anmelden")').first();
		
		await emailInput.fill(user.email);
		await passwordInput.fill('DemoPass123!');
		await loginButton.click();
		
		// Warte bis eingeloggt
		await expect(page.locator('text=Account')).toBeVisible({timeout: 10000});
		
		// Gehe zu Account
		await page.locator('text=Account').click();
		
		// Premium-Button sollte NICHT sichtbar sein
		const upgradeButton = page.locator('button:has-text("Zu Premium upgraden")');
		await expect(upgradeButton).not.toBeVisible({timeout: 5000});
		
		// Premium Card sollte NICHT sichtbar sein
		const upgradeCard = page.locator('text=✨ Premium Upgrade');
		await expect(upgradeCard).not.toBeVisible({timeout: 5000});
		
		// Aber Rolle sollte Premium sein
		const roleDisplay = page.locator('testid=account.role');
		await expect(roleDisplay).toContainText('👑 Premium');
	});
	
	// FREEMIUM-06: Demo-User sehen keine Upgrade-Card
	test('@minimal FREEMIUM-06: Demo-User sehen keinen Upgrade-Button', async ({page}) => {
		// Starte ohne Login (Demo-Mode)
		await page.goto('/');
		
		// Navigiere zur Account-Seite (sollte nicht möglich sein oder zu Login führen)
		// Da Demo-User nicht eingeloggt sind, gibt es keinen Account-Button sichtbar
		
		// Prüfe dass wir Demo-Widgets sehen
		const demoWidgets = page.locator('text=Sommer Sale');
		await expect(demoWidgets).toBeVisible({timeout: 5000});
		
		// Es gibt keinen Premium-Button im Demo-Modus
		const upgradeButton = page.locator('button:has-text("Zu Premium upgraden")');
		await expect(upgradeButton).not.toBeVisible({timeout: 2000});
	});
});

