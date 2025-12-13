import {expect, test} from '@playwright/test';
import {createUserWithRole, loginAs, loginAsRole} from '../helpers/auth';
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
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'feed01');
		
		// Erstelle einige Test-Widgets
		const widget1 = await createWidget(
			api,
			'Feed Test Widget 1',
			'{}',
			user.access_token
		);
		
		const widget2 = await createWidget(
			api,
			'Feed Test Widget 2',
			'{}',
			user.access_token
		);
		
		// Login über UI mit DEMSELBEN User (nicht neuen User erstellen!)
		await loginAs(page, user.email, user.password);
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Warte kurz, dass Feed geladen wird
		await page.waitForTimeout(2000);
		
		// Verifiziere, dass Feed geladen wurde (über API)
		const widgets = await listWidgets(api, user.access_token);
		expect(widgets.length).toBeGreaterThanOrEqual(2);
		expect(widgets.some((w) =>
			w.name === 'Feed Test Widget 1')
		).toBeTruthy();
		
		expect(widgets.some((w) =>
			w.name === 'Feed Test Widget 2')
		).toBeTruthy();
		
		// UI-Validierung: Widget-Namen sind jetzt im Feed sichtbar (testID: feed.widget.name)
		await expect(page.getByText('Feed Test Widget 1')).toBeVisible({timeout: 10_000});
		await expect(page.getByText('Feed Test Widget 2')).toBeVisible({timeout: 10_000});
		
		await page.screenshot({path: 'test-results/feed-01-widgets-loaded.png'});
		
		// Cleanup
		await deleteWidgetById(api, widget1.id, user.access_token);
		await deleteWidgetById(api, widget2.id, user.access_token);
	});
	
	// FEED-02 – Feed-Caching (30 s) wird respektiert
	test('@standard FEED-02: Feed-Caching verhindert redundante API-Calls', async ({page}) => {
		const isCI = process.env.CI === 'true';
		const reason =
			'BLOCKED: Clientseitiges Feed-Caching (TTL/Store) ist im Mobile-Client aktuell nicht implementiert. HomeScreen lädt den Feed bei jedem Mount/Reload erneut via getHomeWidgets() -> /api/home/feed.';
		
		test.skip(isCI, reason);
		test.fixme(!isCI, reason);
		
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'feed02');
		
		// Erstelle Widget
		const widget = await createWidget(api, 'Cache Test Widget', '{}', user.access_token);
		
		// Tracke API-Calls zum Feed-Endpoint
		const feedCalls: string[] = [];
		let trackApiCalls = false;
		
		// NOTE: feedCalls is intentionally not asserted yet; it will be used once FEED-02 caching is implemented.
		// This keeps strict lint/tsc settings clean without weakening global rules.
		expect(feedCalls).toBeDefined();
		await page.route('**/api/home/feed**', async (route) => {
			
			const req = route.request();
			if (trackApiCalls && req.method() === 'GET') {
				feedCalls.push(req.url());
			}
			
			await route.continue();
		});
		
		// Login über UI
		await loginAs(page, user.email, user.password);
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		trackApiCalls = true;
		
		// Initial load
		await page.reload();
		await page.waitForTimeout(2000);
		
		// Reload innerhalb Cache-Zeitfenster (sollte Cache nutzen, kein neuer API-Call)
		await page.reload();
		await page.waitForTimeout(2000);
		
		// @TODO: Sobald Caching implementiert ist, verifiziere:
		// expect(feedCalls.length).toBe(1); // kein neuer Call wegen Cache (Beispiel)
		
		await page.screenshot({path: 'test-results/feed-02-caching.png'});
		
		// Cleanup
		await deleteWidgetById(api, widget.id, user.access_token);
	});
	
	// FEED-03 – Rate-Limit (429) → UI-Fehlermeldung
	test('@standard FEED-03: Feed-Rate-Limit zeigt Fehlermeldung',
		async ({page}) => {
		
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'feed03');
		
		// Login über UI mit demselben User
		await loginAs(page, user.email, user.password);
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Mock Rate-Limit-Response für Feed-Endpoint
		await page.route('**/api/home/feed**', async (route) => {
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
		
		// Warte länger auf Toast (Toast hat Animation + Delay)
		await page.waitForTimeout(1500);
		
		// UI-Validierung: Error-Toast wird angezeigt (testID: error.toast)
		await expect(page.getByTestId('error.toast')).toBeVisible({timeout: 10_000});
		// Text-Check auf Toast-Element beschränken, um strict mode violation zu vermeiden
		await expect(page.getByTestId('error.toast').getByText(/Rate limit|zu viele|too many/i)).toBeVisible({timeout: 5_000});
		
		await page.screenshot({path: 'test-results/feed-03-rate-limit.png'});
	});
	
	// FEED-04 – XSS-Inhalte im Feed werden nicht ausgeführt
	test('@standard FEED-04: XSS in Feed-Inhalten wird escaped', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'feed04');
		
		// Erstelle Widgets mit XSS-Payloads
		// noinspection HtmlUnknownTarget,HtmlDeprecatedAttribute
		const xssPayloads = [
			'<script>alert("XSS1")</script>',
			'<img src="https://example.invalid/x" alt="" onerror="alert(\'XSS2\')">',
			'<svg onload="alert(\'XSS3\')"></svg>',
		];
		
		const widgets = await Promise.all(
			xssPayloads.map((payload) =>
				createWidget(api, payload, '{}', user.access_token))
		);
		
		// Falls XSS ausgeführt würde, würde ein Dialog/Alert aufpoppen
		const dialogs: string[] = [];
		page.on('dialog', async (d) => {
			dialogs.push(`${d.type()}: ${d.message()}`);
			await d.dismiss();
		});
		
		// Login über UI mit demselben User
		await loginAs(page, user.email, user.password);
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Optional: warten bis Laden fertig ist (falls Spinner existiert)
		const spinner = page.getByTestId('loading.spinner');
		if (await spinner.count()) {
			await expect(spinner).toBeHidden();
		}
		
		// Baseline: vorhandene Scripts im DOM (React/Expo etc.)
		const initialScriptCount = await page.locator('script').count();
		
		// UI-Validierung: Payloads werden als Text angezeigt (escaped), nicht als Script/DOM-Element ausgeführt
		for (const payload of xssPayloads) {
			await expect(page.getByTestId('feed.widget.name').filter({hasText: payload})).toBeVisible({timeout: 10_000});
		}
		
		// Zusätzliche Absicherung: es wurde kein Script mit den Payloads injiziert
		await expect(page.locator('script', {hasText: 'alert('})).toHaveCount(0);
		
		await page.screenshot({path: 'test-results/feed-04-xss-escaped.png'});
		
		// Verifiziere, dass kein zusätzliches Script-Tag hinzugefügt wurde
		const finalScriptCount = await page.locator('script').count();
		expect(finalScriptCount).toBe(initialScriptCount);
		
		// Und: es ist kein Alert/Dialog getriggert worden
		expect(dialogs).toHaveLength(0);
		
		// Cleanup
		await Promise.all(widgets.map((w) => deleteWidgetById(api, w.id, user.access_token)));
	});
	
	// FEED-05 – Leerer Feed wird korrekt angezeigt
	test('@standard FEED-05: Leerer Feed zeigt passende Nachricht', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'feed05');
		
		// Login über UI (ohne Widgets zu erstellen)
		await loginAsRole(page, 'demo', 'feed05-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Verifiziere über API, dass keine Widgets vorhanden sind
		const widgets = await listWidgets(api, user.access_token);
		expect(widgets.length).toBe(0);
		
		// UI-Validierung: Empty-State wird angezeigt (testID: feed.empty)
		await expect(page.getByTestId('feed.empty')).toBeVisible();
		await expect(page.getByText(/Keine Widgets/i)).toBeVisible();
		
		await page.screenshot({path: 'test-results/feed-05-empty.png'});
	});
});
