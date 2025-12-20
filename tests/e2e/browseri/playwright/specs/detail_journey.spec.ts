import {expect, test} from '@playwright/test';
import {budgets} from '../helpers/timing';

test.describe('Widget Detail Journey', () => {
	test('sollte vom Feed zum Detail navigieren können', async ({page}) => {
		// App öffnen
		await page.goto('/', {timeout: budgets.navigationMs});

		// Warten bis Feed geladen ist
		await expect(page.getByTestId('home.screen')).toBeVisible({timeout: budgets.navigationMs});
		
		// Erstes Widget finden und auf "Mehr" klicken
		const firstWidgetCta = page.getByRole('button', { name: 'Mehr' }).first();
		await expect(firstWidgetCta).toBeVisible({timeout: budgets.navigationMs});
		await firstWidgetCta.click();

		// Verifizieren, dass der Detail Screen sichtbar ist
		await expect(page.getByTestId('widgetDetail.screen')).toBeVisible({timeout: budgets.navigationMs});
		
		// Verifizieren, dass Inhalte aus Phase 2 (BlocksRenderer) sichtbar sind
		// Das erste Widget in den Fixtures ist "Offers" (ID 1003) mit einem offer_grid
		await expect(page.getByText('Top-Angebote')).toBeVisible();
		await expect(page.getByText('Kaffeemaschine')).toBeVisible();
		await expect(page.getByText('49.99 €')).toBeVisible();

		// Zurück navigieren (Browser Back oder falls vorhanden Back-Button)
		await page.goBack();
		
		// Wieder auf dem Home Screen
		await expect(page.getByTestId('home.screen')).toBeVisible({timeout: budgets.navigationMs});
	});
});
