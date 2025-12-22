import {expect, test} from '@playwright/test';
import {budgets} from '../helpers/timing';

/**
 * Home-Content Tests: Minimal-Ebene
 * 
 * Verifiziert die grundlegende Struktur der Startseite (MainContentContainer).
 */

test.describe('@minimal Home Content', () => {
	test('@minimal HOME-01: MainContentContainer und Slots sind sichtbar', async ({page}) => {
		// Navigation zur Startseite (unauthentifiziert -> Demo-Flow)
		await page.goto('/', {timeout: budgets.navigationMs});
		
		// Verifiziere, dass der MainContentContainer sichtbar ist
		const mainContent = page.getByTestId('home.mainContent');
		await expect(mainContent).toBeVisible({timeout: budgets.feedLoadMs});
		
		// Verifiziere, dass mindestens ein Slot sichtbar ist (0-basiert)
		const firstSlot = page.getByTestId('home.mainContent.slot.0');
		await expect(firstSlot).toBeVisible({timeout: budgets.feedLoadMs});
		
		// Optional: Prüfe, ob Slot Inhalt hat (entweder Platzhalter "Slot 1" oder CTA "Angebote")
		await expect(firstSlot.locator('text=/Slot 1|Angebote/i')).toBeVisible();
		
		await page.screenshot({path: 'test-results/home-01-main-content.png'});
	});
});
