import {chromium, type FullConfig} from '@playwright/test';

/**
 * Globales Setup für Playwright: wärmt das Expo‑Web‑Bundle vor Teststart auf.
 *
 * Hintergrund: Der erste Seitenaufruf triggert im CI oft noch die Webpack/Metro-
 * Kompilierung. Wir laden die App einmal vorab und warten auf den stabilen
 * Home‑Marker (data-testid="home.screen"). Danach sind die eigentlichen Tests
 * deutlich stabiler und schneller.
 */
export default async function globalSetup(config: FullConfig) {
	// Bevorzugt die in der Config gesetzte baseURL; fallback auf Env bzw. Default
	const baseURL = (config.projects?.[0]?.use as any)?.baseURL
		|| process.env.PLAYWRIGHT_WEB_BASE_URL
		|| 'http://localhost:19006';
	
	const browser = await chromium.launch();
	const context = await browser.newContext();
	const page = await context.newPage();
	
	try {
		await page.goto(String(baseURL), {waitUntil: 'load', timeout: 120_000});
		// Warten auf stabilen Screen‑Marker statt auf Netzwerklast (HMR/WebSockets laufen weiter)
		await page.getByTestId('home.screen').waitFor({state: 'visible', timeout: 120_000});
	} finally {
		await browser.close();
	}
}
