import {expect, test} from '@playwright/test';
import {budgets} from '../helpers/timing';

test.describe('Offers Journey', () => {
	test('sollte vom Widget-Detail zum OffersScreen navigieren können', async ({page}) => {
		// App öffnen
		await page.goto('/', {timeout: budgets.navigationMs});

		// Warten bis Feed geladen ist
		await expect(page.getByTestId('home.screen')).toBeVisible({timeout: budgets.navigationMs});
		
		// "Offers" Widget finden und auf "Mehr" klicken
		const offersWidgetCta = page.getByRole('button', { name: 'Mehr' }).first();
		await offersWidgetCta.click();

		// Im Detail Screen sein
		await expect(page.getByTestId('widgetDetail.screen')).toBeVisible({timeout: budgets.navigationMs});
		
		// Auf einen "Ansehen" Button im OfferGrid klicken
		const firstOfferCta = page.getByTestId('offer.cta.SKU-001');
		await expect(firstOfferCta).toBeVisible({timeout: budgets.navigationMs});
		await firstOfferCta.click();

		// Verifizieren, dass der Offers Screen sichtbar ist
		await expect(page.getByTestId('offers.screen')).toBeVisible({timeout: budgets.navigationMs});
		await expect(page.getByText('Aktuelle Angebote')).toBeVisible();

		// Zurück navigieren
		await page.goBack();
		
		// Wieder im Widget Detail
		await expect(page.getByTestId('widgetDetail.screen')).toBeVisible({timeout: budgets.navigationMs});
	});
});
