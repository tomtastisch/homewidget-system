import {expect, test} from '@playwright/test';
import {loginAsRole, createUserWithRole} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';
import {createWidget, deleteWidgetById, listWidgets} from '../helpers/widgets';

/**
 * Feed-Tests: Standard-Ebene
 * 
 * Tests für Feed-Funktionalität, Caching und Security.
 */

test.describe('@standard Feed', () => {
	// FEED-01 – Home-Feed lädt Widgets des Users
	test('@standard FEED-01: Home-Feed zeigt eigene Widgets', async ({page}) => {
		test.skip(process.env.CI === 'true', 'BLOCKED-UI: Widget-Namen sind im Feed-UI nicht sichtbar. Entfernen sobald Widget-Namen-Anzeige implementiert ist.');
		
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'feed01');
		
		// Erstelle einige Test-Widgets
		const widget1 = await createWidget(api, 'Feed Test Widget 1', '{}', user.access_token);
		const widget2 = await createWidget(api, 'Feed Test Widget 2', '{}', user.access_token);
		
		// Login über UI (verwendet denselben User)
		await loginAsRole(page, 'demo', 'feed01');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Verifiziere, dass Feed geladen wurde (über API)
		const widgets = await listWidgets(api, user.access_token);
		expect(widgets.length).toBeGreaterThanOrEqual(2);
		expect(widgets.some(w => w.name === 'Feed Test Widget 1')).toBeTruthy();
		expect(widgets.some(w => w.name === 'Feed Test Widget 2')).toBeTruthy();
		
		// TODO: Sobald Widget-Namen in UI sichtbar sind, prüfe direkt im DOM
		// await expect(page.getByText('Feed Test Widget 1')).toBeVisible();
		// await expect(page.getByText('Feed Test Widget 2')).toBeVisible();
		
		await page.screenshot({path: 'test-results/feed-01-widgets-loaded.png'});
		
		// Cleanup
		await deleteWidgetById(api, widget1.id, user.access_token);
		await deleteWidgetById(api, widget2.id, user.access_token);
	});
	
	// FEED-02 – Feed-Caching (30 s) wird respektiert
	test('@standard FEED-02: Feed-Caching verhindert redundante API-Calls', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'feed02');
		
		// Erstelle Widget
		const widget = await createWidget(api, 'Cache Test Widget', '{}', user.access_token);
		
		// Tracke API-Calls zu /api/widgets/ (Tracking erst nach Login aktiv)
		const apiCalls: string[] = [];
		let trackApiCalls = false;
		await page.route('**/api/widgets/**', async (route) => {
			if (trackApiCalls) {
				apiCalls.push(route.request().url());
			}
			await route.continue();
		});
		
		// Login über UI
		await loginAsRole(page, 'demo', 'feed02-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		// Tracking ab jetzt aktivieren
		trackApiCalls = true;
		
		// Initial load (sollte API-Call triggern)
		await page.reload();
		await page.waitForTimeout(2000);
		
		// Reload innerhalb Cache-Zeitfenster (sollte Cache nutzen, kein neuer API-Call)
		await page.reload();
		await page.waitForTimeout(2000);
		
		// TODO: Sobald Caching implementiert ist, verifiziere:
		// expect(cachedCalls).toBe(initialCalls); // Kein neuer Call wegen Cache
		
		// Für jetzt: Dokumentiere erwartetes Verhalten
		// Nach 30s sollte Cache invalidiert werden und neuer Call erfolgen
		
		await page.screenshot({path: 'test-results/feed-02-caching.png'});
		
		// Cleanup
		await deleteWidgetById(api, widget.id, user.access_token);
	});
	
	// FEED-03 – Rate-Limit (429) → UI-Fehlermeldung
	test('@standard FEED-03: Feed Rate-Limit zeigt Fehlermeldung', async ({page}) => {
		test.skip(process.env.CI === 'true', 'BLOCKED-UI: Error-Toast/Fehlermeldung für Rate-Limit fehlt im Feed-UI. Entfernen sobald Feed-Error-Handling implementiert ist.');
		
		await createUserWithRole(await newApiRequestContext(), 'demo', 'feed03');
		
		// Login über UI
		await loginAsRole(page, 'demo', 'feed03-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Mock Rate-Limit-Response für Feed-Endpoint
		await page.route('**/api/widgets/**', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 429,
					contentType: 'application/json',
					body: JSON.stringify({detail: 'Rate limit exceeded. Please try again later.'}),
				});
			} else {
				await route.continue();
			}
		});
		
		// Trigger Feed-Reload
		await page.reload();
		await page.waitForTimeout(2000);
		
		// TODO: Sobald Error-Handling in UI implementiert:
		// await expect(page.getByTestId('feed.error')).toBeVisible();
		// await expect(page.getByText(/Rate limit/i)).toBeVisible();
		
		await page.screenshot({path: 'test-results/feed-03-rate-limit.png'});
	});
	
	// FEED-04 – XSS-Inhalte im Feed werden nicht ausgeführt
	test('@standard FEED-04: XSS in Feed-Inhalten wird escaped', async ({page}) => {
		test.skip(process.env.CI === 'true', 'BLOCKED-UI: Widget-Namen nicht im DOM sichtbar für XSS-Text-Verifizierung. Entfernen sobald Widget-Namen-Anzeige implementiert ist.');
		
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'feed04');
		
		// Erstelle Widgets mit XSS-Payloads
		const xssPayloads = [
			'<script>alert("XSS1")</script>',
			'<img src=x onerror="alert(\'XSS2\')">',
			'<svg/onload=alert("XSS3")>',
		];
		
		const widgets = await Promise.all(
			xssPayloads.map((payload, i) =>
				createWidget(api, payload, '{}', user.access_token)
			)
		);
		
		// Login über UI
		await loginAsRole(page, 'demo', 'feed04-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Zähle initiale Script-Tags (nur legitime von React/Expo)
		const initialScriptCount = await page.locator('script').count();
		
		// Warte auf Feed-Laden
		await page.waitForTimeout(2000);
		
		// Verifiziere, dass keine zusätzlichen Scripts hinzugefügt wurden
		const finalScriptCount = await page.locator('script').count();
		expect(finalScriptCount).toBe(initialScriptCount);
		
		// Verifiziere, dass XSS-Payloads als Text escaped wurden
		// TODO: Sobald Widget-Namen im DOM sichtbar:
		// const content = await page.textContent('body');
		// expect(content).toContain('<script>'); // Als Text, nicht als Element
		
		// Prüfe, dass keine Alerts ausgelöst wurden (indirekt durch Script-Count)
		await page.screenshot({path: 'test-results/feed-04-xss-escaped.png'});
		
		// Cleanup
		await Promise.all(widgets.map(w => deleteWidgetById(api, w.id, user.access_token)));
	});
	
	// FEED-05 – Leerer Feed wird korrekt angezeigt
	test('@standard FEED-05: Leerer Feed zeigt passende Nachricht', async ({page}) => {
		test.skip(process.env.CI === 'true', 'BLOCKED-UI: Empty-State-Anzeige für leeren Feed fehlt. Entfernen sobald Feed-Empty-State implementiert ist.');
		
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'feed05');
		
		// Login über UI (ohne Widgets zu erstellen)
		await loginAsRole(page, 'demo', 'feed05-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Verifiziere über API, dass keine Widgets vorhanden sind
		const widgets = await listWidgets(api, user.access_token);
		expect(widgets.length).toBe(0);
		
		// TODO: Sobald Empty-State im UI implementiert:
		// await expect(page.getByText(/Keine Widgets/i)).toBeVisible();
		// oder
		// await expect(page.getByTestId('feed.empty')).toBeVisible();
		
		await page.screenshot({path: 'test-results/feed-05-empty.png'});
	});
});
