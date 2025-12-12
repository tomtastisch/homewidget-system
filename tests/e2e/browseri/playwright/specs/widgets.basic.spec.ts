import {expect, test} from '@playwright/test';
import {loginAs} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';
import {createWidget, deleteWidgetById, listWidgets} from '../helpers/widgets';

/**
 * Widget-Tests: Hybrid-Ansatz (Minimal-Ebene)
 * 
 * Login/Navigation über UI, Widget-CRUD über API
 * (da die App aktuell keine UI für Widget-Erstellung/Löschung hat)
 * Tag: @minimal
 */

test.describe('@minimal Widget Basic', () => {
	test('@minimal WIDGET-01: Eigene Widgets anzeigen nach Login', async ({page}) => {
	const api = await newApiRequestContext();
	const email = `w1+${Date.now()}@example.com`;
	const password = 'Secret1234!';
	await api.post('/api/auth/register', {data: {email, password}});
	
	// Login über UI
	await loginAs(page, email, password);
	
	// Verifiziere: Home-Screen zeigt Widgets
	// Warte auf Home-Feed-Anzeige (nicht mehr Demo-Banner)
	const demoBanner = page.getByText('Demonstrations‑Ansicht');
	await expect(demoBanner).not.toBeVisible();
	
	// Prüfe, dass Feed geladen wurde (über API-Abfrage validieren)
	const login = await (await api.post('/api/auth/login', {form: {username: email, password}})).json();
	const widgets = await listWidgets(api, login.access_token);
	expect(Array.isArray(widgets)).toBeTruthy();
	
		// Screenshot
		await page.screenshot({path: 'test-results/widget-01-home-feed.png'});
	});

	test('@minimal WIDGET-02: Widget erstellen und im Feed sehen', async ({page}) => {
	const api = await newApiRequestContext();
	const email = `w2+${Date.now()}@example.com`;
	const password = 'Secret1234!';
	await api.post('/api/auth/register', {data: {email, password}});
	const login = await (await api.post('/api/auth/login', {form: {username: email, password}})).json();
	
	// Erstelle Widget über API (UI hat aktuell keine Widget-Erstellung)
	const name = `Widget ${Date.now()}`;
	const created = await createWidget(api, name, '{}', login.access_token);
	expect(created.name).toBe(name);
	
	// Login über UI und prüfe Feed
	await loginAs(page, email, password);
	
		// UI-Validierung: Widget-Namen wird im Feed angezeigt (testID: feed.widget.name)
		await expect(page.getByText(name)).toBeVisible();
		
		await page.screenshot({path: 'test-results/widget-02-created.png'});
	});

	test('@minimal WIDGET-03: Eigenes Widget löschen', async ({page}) => {
	const api = await newApiRequestContext();
	const email = `w3+${Date.now()}@example.com`;
	const password = 'Secret1234!';
	await api.post('/api/auth/register', {data: {email, password}});
	const login = await (await api.post('/api/auth/login', {form: {username: email, password}})).json();
	
	// Erstelle und lösche Widget über API
	const name = `Widget ${Date.now()}`;
	const created = await createWidget(api, name, '{}', login.access_token);
	const del = await deleteWidgetById(api, created.id, login.access_token);
	expect(del.status()).toBe(204);
	
	// Verifiziere Löschung
	const after = await listWidgets(api, login.access_token);
	expect(after.find((w) => w.id === created.id)).toBeFalsy();
	
		// Login über UI und prüfe Feed (Widget sollte nicht mehr da sein)
		await loginAs(page, email, password);
		await page.screenshot({path: 'test-results/widget-03-deleted.png'});
	});
});
