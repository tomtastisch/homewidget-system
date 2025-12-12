import {expect, test} from '@playwright/test';
import {loginAsRole, loginViaApi, createUserWithRole} from '../helpers/auth';
import {newApiRequestContext, mockBackendError} from '../helpers/api';
import {createWidget, deleteWidgetById} from '../helpers/widgets';

/**
 * Widget-Resilience-Tests: Standard- und Bestenfalls-Ebene
 * 
 * Tests für Fehlerbehandlung und Edge-Cases bei Widget-Operationen.
 */

test.describe('@standard Widget Resilience', () => {
	// WIDGET-05 – Backend-Fehler bei Creation (500) → UI-Error-Toast
	test('@standard WIDGET-05: Backend-Fehler bei Widget-Erstellung zeigt Fehler', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'widget05');
		
		// Login über UI
		await loginAsRole(page, 'demo', 'widget05-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Mock Backend-Fehler für Widget-Creation
		await mockBackendError(page, /\/api\/widgets\/$/, 500, {
			detail: 'Internal server error during widget creation',
		});
		
		// TODO: Sobald Widget-Erstellung in UI verfügbar:
		// - Navigiere zu Widget-Erstellungs-Formular
		// - Fülle Formular aus und submit
		// - Verifiziere, dass Error-Toast/Message angezeigt wird
		// Beispiel:
		// await page.getByTestId('create-widget.button').click();
		// await page.getByTestId('widget.name').fill('Test Widget');
		// await page.getByTestId('widget.submit').click();
		// await expect(page.getByTestId('error.toast')).toBeVisible();
		// await expect(page.getByText(/Internal server error/i)).toBeVisible();
		
		// Für jetzt: Simuliere API-Call direkt über Page-Evaluation
		const result = await page.evaluate(async (baseUrl) => {
			try {
				const response = await fetch(`${baseUrl}/api/widgets/`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${localStorage.getItem('hw_refresh_token')}`,
					},
					body: JSON.stringify({name: 'Test', config_json: '{}'}),
				});
				return {status: response.status, ok: response.ok};
			} catch (error) {
				return {error: error instanceof Error ? error.message : 'Unknown error'};
			}
		}, process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8100');
		
		expect(result.status).toBe(500);
		expect(result.ok).toBe(false);
		
		await page.screenshot({path: 'test-results/widget-05-error.png'});
	});
});

test.describe('@bestenfalls Widget Edge Cases', () => {
	// WIDGET-07 – Löschen eines bereits gelöschten Widgets
	test('@bestenfalls WIDGET-07: Bereits gelöschtes Widget erneut löschen gibt 404', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'widget07');
		
		// Erstelle Widget
		const widget = await createWidget(api, 'To be deleted', '{}', user.access_token);
		
		// Lösche Widget (erster Versuch)
		const deleteRes1 = await deleteWidgetById(api, widget.id, user.access_token);
		expect(deleteRes1.status()).toBe(204);
		
		// Versuche erneut zu löschen (sollte 404 geben)
		const deleteRes2 = await deleteWidgetById(api, widget.id, user.access_token);
		expect(deleteRes2.status()).toBe(404);
		
		// Login über UI und verifiziere, dass Widget nicht im Feed ist
		await loginAsRole(page, 'demo', 'widget07-ui');
		
		// TODO: Sobald Widget-Liste in UI verfügbar, prüfe dass Widget nicht vorhanden ist
		
		await page.screenshot({path: 'test-results/widget-07-already-deleted.png'});
	});
	
	// WIDGET-08 – gleichzeitiges Erstellen vieler Widgets
	test('@bestenfalls WIDGET-08: Viele Widgets gleichzeitig erstellen', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'widget08');
		
		// Erstelle mehrere Widgets parallel
		const createPromises = Array.from({length: 10}, (_, i) =>
			createWidget(api, `Parallel Widget ${i}`, '{}', user.access_token)
		);
		
		const widgets = await Promise.all(createPromises);
		
		// Verifiziere, dass alle erfolgreich erstellt wurden
		expect(widgets).toHaveLength(10);
		widgets.forEach((w, i) => {
			expect(w.name).toBe(`Parallel Widget ${i}`);
		});
		
		// Login über UI und verifiziere Feed
		await loginAsRole(page, 'demo', 'widget08-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// TODO: Sobald Widget-Details in UI sichtbar, prüfe Anzahl
		
		await page.screenshot({path: 'test-results/widget-08-many-widgets.png'});
		
		// Cleanup: Lösche alle erstellten Widgets
		await Promise.all(widgets.map(w => deleteWidgetById(api, w.id, user.access_token)));
	});
	
	// WIDGET-09 – Widget-Update mit konkurrierenden Änderungen
	test('@bestenfalls WIDGET-09: Konkurrierende Widget-Updates', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'widget09');
		
		// Erstelle Widget
		const widget = await createWidget(api, 'Original Name', '{"version": 1}', user.access_token);
		
		// Simuliere konkurrierende Updates (falls Update-Endpoint existiert)
		// TODO: Sobald PATCH/PUT für Widgets implementiert:
		// const update1 = api.patch(`/api/widgets/${widget.id}`, {
		//     data: {name: 'Updated by User 1'},
		//     headers: {Authorization: `Bearer ${user.access_token}`}
		// });
		// const update2 = api.patch(`/api/widgets/${widget.id}`, {
		//     data: {name: 'Updated by User 2'},
		//     headers: {Authorization: `Bearer ${user.access_token}`}
		// });
		// const results = await Promise.all([update1, update2]);
		// Verifiziere, dass beide erfolgreich waren oder eine Konflikt-Behandlung stattfand
		
		// Für jetzt: Dokumentiere Test als konzeptionell
		await loginAsRole(page, 'demo', 'widget09-ui');
		await page.screenshot({path: 'test-results/widget-09-concurrent.png'});
		
		// Cleanup
		await deleteWidgetById(api, widget.id, user.access_token);
	});
});
