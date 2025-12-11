import {expect, Page, test} from '@playwright/test';
import {getApiBaseUrl, mockBackendError, newApiRequestContext} from '../helpers/api';

// INFRA-01 – /health-Endpunkt erreichbar (200, erwartete JSON-Struktur)
test('INFRA-01: /health liefert 200 und {status:"ok"}', async () => {
	const api = await newApiRequestContext();
	const res = await api.get('/health');
	expect(res.status()).toBe(200);
	const json = await res.json();
	expect(json).toEqual({status: 'ok'});
});

// INFRA-02 – simulierter 500-Fehler → UI zeigt generische Fehlerseite/-Toast
// Hinweis: Da aktuell keine Web-UI vorhanden ist, simulieren wir nur den 500er-Rückweg.
// TODO: Sobald eine UI existiert, eine Seite aufrufen, die /health lädt, den 500er mocken und
//       dann auf einen generischen Fehlerindikator (Toast/Seite) asserten.
test('INFRA-02: simulierter 500-Fehler (Backend-Route gemockt)', async ({page}: { page: Page }) => {
	const apiBase = getApiBaseUrl();
	await mockBackendError(page, new RegExp(`${apiBase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}/health`), 500, {
		detail: 'Simulated failure',
	});
	
	// Trigger the request explicitly via page.evaluate fetch (acts like the UI would)
	const status = await page.evaluate(async (url: string) => {
		try {
			const res = await fetch(url);
			return res.status;
		} catch {
			return -1;
		}
	}, `${apiBase}/health`);
	
	expect(status).toBe(500);
});
