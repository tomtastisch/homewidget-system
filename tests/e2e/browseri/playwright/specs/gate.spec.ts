import {expect, test} from '@playwright/test';
import {budgets} from '../helpers/timing';

/**
 * CI Gate Spec (HW-NEXT-06B)
 * 
 * Diese Spec dient als "Fail-Fast" Gate in der CI. 
 * Sie verifiziert die absolut kritische Basisfunktionalität der Web-App.
 */
test.describe('@gate CI Gate', () => {
    test('CI-GATE: Basisfunktionalität und Navigation verifizieren', async ({page}) => {
        // 1. Home-Seite laden
        await page.goto('/', {timeout: budgets.navigationMs});
        
        // 2. home.mainContent sichtbar
        const mainContent = page.getByTestId('home.mainContent');
        await expect(mainContent).toBeVisible({timeout: budgets.renderMs});
        
        // 3. Mindestens 1 Widget sichtbar
        // Widgets haben in der Liste Test-IDs, wir prüfen auf die Liste oder ein Element darin
        const widgetList = page.getByTestId('home.widgets.list');
        await expect(widgetList).toBeVisible({timeout: budgets.renderMs});
        
        // Wir erwarten mindestens ein Widget-Element (WidgetCard hat keine explizite TestID in HomeScreen, 
        // aber wir können nach Text oder Rollen suchen, oder wir verlassen uns auf die ListEmptyComponent Nicht-Sichtbarkeit)
        await expect(page.getByTestId('home.empty')).not.toBeVisible({timeout: budgets.renderMs});
        
        // 4. CTA -> offers.screen
        const cta = page.getByTestId('home.cta.offers');
        await expect(cta).toBeVisible();
        await cta.click();
        
        // Verifiziere Navigation zu Offers
        await expect(page.getByTestId('offers.screen')).toBeVisible({timeout: budgets.navigationMs});
    });
});
