import {expect, test} from '@playwright/test';
import {loginAs, loginViaApi} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';
import {createWidget, deleteWidgetById} from '../helpers/widgets';

/**
 * Widget-Security-Tests: Hybrid-Ansatz (Minimal-Ebene)
 * 
 * Login über UI, Security-Checks über API
 * Tag: @minimal
 */

test.describe('@minimal Widget Security', () => {
	test('@minimal WIDGET-04: Fremdes Widget löschen → 404', async ({page}) => {
	const api = await newApiRequestContext();
	
	// User A erstellt Widget
	const emailA = `owner+${Date.now()}@example.com`;
	const pwd = 'Secret1234!';
	await api.post('/api/auth/register', {data: {email: emailA, password: pwd}});
	const loginA = await (await api.post('/api/auth/login', {form: {username: emailA, password: pwd}})).json();
	const w = await createWidget(api, 'Owned by A', '{}', loginA.access_token);
	
	// User B versucht zu löschen
	const emailB = `other+${Date.now()}@example.com`;
	await api.post('/api/auth/register', {data: {email: emailB, password: pwd}});
	
	// Login als User B über UI
	await loginAs(page, emailB, pwd);
	
	// Verifiziere Login erfolgreich
	await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
	
	// Hole Access-Token via API-Login (Access-Token wird nicht in localStorage gespeichert,
	// sondern nur in-memory im React State gehalten)
	const accessTokenB = await loginViaApi(api, emailB, pwd);
	const del = await deleteWidgetById(api, w.id, accessTokenB);
	expect(del.status()).toBe(404);
	
		// Screenshot
		await page.screenshot({path: 'test-results/widget-04-security.png'});
	});
	
	test('@minimal WIDGET-06: XSS in Widget-Name wird escaped in UI', async ({page}) => {
		const api = await newApiRequestContext();
		const email = `xss+${Date.now()}@example.com`;
		const pwd = 'Secret1234!';
		await api.post('/api/auth/register', {data: {email, password: pwd}});
		const login = await (await api.post('/api/auth/login', {form: {username: email, password: pwd}})).json();
		
		// Erstelle Widget mit XSS-Payload im Namen
		const payload = '<script>alert("XSS")</script>';
		const created = await createWidget(api, payload, '{}', login.access_token);
		expect(created.name).toBe(payload);
		
		// Falls XSS wirklich ausgeführt würde, würde ein Dialog/Alert aufpoppen
		const dialogs: string[] = [];
		page.on('dialog', async (d) => {
			dialogs.push(`${d.type()}: ${d.message()}`);
			await d.dismiss();
		});
		
		// Login über UI und prüfe Home-Feed
		await loginAs(page, email, pwd);
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Optional: warten bis Laden fertig ist (falls Spinner existiert)
		const spinner = page.getByTestId('loading.spinner');
		if (await spinner.count()) {
			await expect(spinner).toBeHidden();
		}
		
		// Baseline: vorhandene Scripts im DOM (React/Expo etc.)
		const initialScriptCount = await page.locator('script').count();
		
		// Prüfe: Payload wird als Text angezeigt (escaped), nicht als echtes <script>-Element interpretiert
		const widgetName = page.getByTestId('feed.widget.name').filter({hasText: payload});
		await expect(widgetName).toBeVisible({timeout: 10_000});
		
		// Zusätzliche Absicherung: es wurde kein Script mit der Payload in den DOM injiziert
		await expect(page.locator('script', {hasText: 'alert("XSS")'})).toHaveCount(0);
		
		// Screenshot für manuelle Verifikation
		await page.screenshot({path: 'test-results/widget-06-xss-escaped.png'});
		
		// Verifiziere, dass kein zusätzliches Script-Tag hinzugefügt wurde
		const finalScriptCount = await page.locator('script').count();
		expect(finalScriptCount).toBe(initialScriptCount);
		
		// Und: es ist kein Alert/Dialog getriggert worden
		expect(dialogs).toHaveLength(0);
	});
});
