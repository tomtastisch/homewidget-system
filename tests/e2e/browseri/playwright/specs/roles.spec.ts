import {expect, test} from '@playwright/test';
import {loginAsRole, createUserWithRole} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';

/**
 * Rollen-Tests: Standard- und Advanced-Ebene
 * 
 * Tests für rollenbasierte Funktionalität und Feature-Sichtbarkeit.
 */

test.describe('@standard Roles', () => {
	// ROLE-01 – Rolle (demo/common/premium) im UI korrekt angezeigt und genutzt
	test('@standard ROLE-01: Demo-Rolle wird korrekt angezeigt', async ({page}) => {
		await loginAsRole(page, 'demo', 'role01-demo');
		
		// Verifiziere erfolgreichen Login
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// UI-Validierung: Rolle wird im Account-Screen angezeigt (testID: account.role)
		// Navigiere zum Account-Screen über UI-Button
		await page.getByRole('button', {name: 'Account'}).click();
		await expect(page.getByTestId('account.role')).toBeVisible();
		await expect(page.getByTestId('account.role')).toHaveText('demo');
		
		await page.screenshot({path: 'test-results/role-01-demo.png'});
	});
	
	test('@standard ROLE-01: Common-Rolle wird korrekt angezeigt', async ({page}) => {
		await loginAsRole(page, 'common', 'role01-common');
		
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// UI-Validierung: Rolle wird im Account-Screen angezeigt (testID: account.role)
		await page.getByRole('button', {name: 'Account'}).click();
		await expect(page.getByTestId('account.role')).toBeVisible();
		await expect(page.getByTestId('account.role')).toHaveText('common');
		
		await page.screenshot({path: 'test-results/role-01-common.png'});
	});
	
	test('@standard ROLE-01: Premium-Rolle wird korrekt angezeigt', async ({page}) => {
		await loginAsRole(page, 'premium', 'role01-premium');
		
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// UI-Validierung: Rolle wird im Account-Screen angezeigt (testID: account.role)
		await page.getByRole('button', {name: 'Account'}).click();
		await expect(page.getByTestId('account.role')).toBeVisible();
		await expect(page.getByTestId('account.role')).toHaveText('premium');
		
		await page.screenshot({path: 'test-results/role-01-premium.png'});
	});
});

test.describe('@advanced Roles - Feature Visibility', () => {
	// ROLE-02 – rollenspezifische Features sichtbar/unsichtbar
	test('@advanced ROLE-02: Demo-Rolle hat eingeschränkten Zugriff', async ({page}) => {
		test.skip(process.env.CI === 'true', 'BLOCKED-UI: Rollenspezifische UI-Features (Premium-Features, Demo-Banner) nicht implementiert. Entfernen sobald Feature-Visibility implementiert ist.');
		
		await loginAsRole(page, 'demo');
		
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// TODO: Sobald rollenspezifische Features implementiert sind:
		// - Prüfe, dass Premium-Features für Demo-User nicht sichtbar sind
		// - Prüfe, dass Demo-Banner oder Demo-Hinweise sichtbar sind
		// Beispiel:
		// await expect(page.getByTestId('premium.feature')).not.toBeVisible();
		// await expect(page.getByText('Demo-Modus')).toBeVisible();
		
		await page.screenshot({path: 'test-results/role-02-demo-limited.png'});
	});
	
	test('@advanced ROLE-02: Premium-Rolle hat vollen Zugriff', async ({page}) => {
		test.skip(process.env.CI === 'true', 'BLOCKED-UI: Rollenspezifische UI-Features (Premium-Features) nicht implementiert. Entfernen sobald Feature-Visibility implementiert ist.');
		
		await loginAsRole(page, 'premium');
		
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// TODO: Sobald rollenspezifische Features implementiert sind:
		// - Prüfe, dass alle Premium-Features sichtbar sind
		// - Prüfe, dass keine Demo-Einschränkungen angezeigt werden
		// Beispiel:
		// await expect(page.getByTestId('premium.feature')).toBeVisible();
		// await expect(page.getByText('Demo-Modus')).not.toBeVisible();
		
		await page.screenshot({path: 'test-results/role-02-premium-full.png'});
	});
	
	test('@advanced ROLE-02: Rolle beeinflusst verfügbare Widget-Typen', async ({page}) => {
		test.skip(process.env.CI === 'true', 'BLOCKED-UI: Widget-Erstellung UI und rollenbasierte Einschränkungen nicht implementiert. Entfernen sobald Widget-Creation-UI implementiert ist.');
		
		// Test für rollenbasierte Widget-Beschränkungen
		
		// Demo-User: möglicherweise limitierte Widget-Anzahl oder -Typen
		await createUserWithRole(await newApiRequestContext(), 'demo', 'role02-widget-demo');
		await loginAsRole(page, 'demo', 'role02-widget-demo-ui');
		
		// TODO: Sobald Widget-Erstellung in UI verfügbar:
		// - Prüfe verfügbare Widget-Typen
		// - Prüfe Limits (z.B. max. 3 Widgets für Demo)
		
		await page.screenshot({path: 'test-results/role-02-demo-widgets.png'});
		
		// Premium-User: voller Zugriff
		await createUserWithRole(await newApiRequestContext(), 'premium', 'role02-widget-premium');
		await loginAsRole(page, 'premium', 'role02-widget-premium-ui');
		
		// TODO: Prüfe erweiterte Widget-Optionen für Premium
		
		await page.screenshot({path: 'test-results/role-02-premium-widgets.png'});
	});
});
