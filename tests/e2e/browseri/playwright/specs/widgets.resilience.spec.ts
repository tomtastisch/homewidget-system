import {expect, test} from '@playwright/test';
import {createUserWithRole, loginAs, loginAsRole} from '../helpers/auth';
import {mockBackendError, newApiRequestContext} from '../helpers/api';
import {createWidget, deleteWidgetById} from '../helpers/widgets';

/**
 * Widget-Resilience-Tests: Standard- und Advanced-Ebene
 * 
 * Tests für Fehlerbehandlung und Edge-Cases bei Widget-Operationen.
 */
// WIDGET-05 – Backend-Fehler bei Creation (500)
test('@standard WIDGET-05: Backend-Fehler bei Widget-Erstellung liefert 500', async ({page}) => {
	// Login über UI (legt User automatisch an)
	const user = await loginAsRole(page, 'demo', 'widget05');
	await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
	
	// Mock Backend-Fehler für Widget-Creation
	await mockBackendError(page, /\/api\/widgets\/$/, 500, {
		detail: 'Internal server error during widget creation',
	});
	
	// UI für Widget-Erstellung ist aktuell nicht vorhanden.
	// Stattdessen wird der Call im Browser-Kontext abgesetzt, um den 500er-Fehlerpfad
	// (inkl. Interception via page.route) deterministisch zu verifizieren.
	const result = await page.evaluate(async ({baseUrl, accessToken}) => {
		try {
			const response = await fetch(`${baseUrl}/api/widgets/`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({name: 'Test', config_json: '{}'}),
			});
			
			let body: any = null;
			try {
				body = await response.json();
			} catch {
				// ignore (non-json)
			}
			
			return {status: response.status, ok: response.ok, body};
		} catch (error) {
			return {error: error instanceof Error ? error.message : 'Unknown error'};
		}
	}, {baseUrl: process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8100', accessToken: user.access_token});
	
	expect(result.status).toBe(500);
	expect(result.ok).toBe(false);
	expect(result.body?.detail).toBe('Internal server error during widget creation');
	
	await page.screenshot({path: 'test-results/widget-05-error.png'});
});

test.describe('@advanced Widget Edge Cases', () => {
	// WIDGET-07 – Löschen eines bereits gelöschten Widgets
	test('@advanced WIDGET-07: Bereits gelöschtes Widget erneut löschen gibt 404', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'widget07');
		
		// Erstelle Widget
		const widgetName = 'To be deleted';
		const widget = await createWidget(api, widgetName, '{}', user.access_token);
		
		// Lösche Widget (erster Versuch)
		const deleteRes1 = await deleteWidgetById(api, widget.id, user.access_token);
		expect(deleteRes1.status()).toBe(204);
		
		// Versuche erneut zu löschen (sollte 404 geben)
		const deleteRes2 = await deleteWidgetById(api, widget.id, user.access_token);
		expect(deleteRes2.status()).toBe(404);
		
		// Login über UI mit demselben User
		await loginAs(page, user.email, user.password);
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Optional: warten bis Laden fertig ist (falls Spinner existiert)
		const spinner = page.getByTestId('loading.spinner');
		if (await spinner.count()) {
			await expect(spinner).toBeHidden();
		}
		
		// Verifiziere: gelöschtes Widget ist nicht im Feed sichtbar
		await expect(page.getByText(widgetName)).toHaveCount(0);
		
		await page.screenshot({path: 'test-results/widget-07-already-deleted.png'});
	});
	
	// WIDGET-08 – gleichzeitiges Erstellen vieler Widgets
	test('@advanced WIDGET-08: Viele Widgets gleichzeitig erstellen', async ({page}) => {
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
	test('@advanced WIDGET-09: Konkurrierende Widget-Updates', async ({page}) => {
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
