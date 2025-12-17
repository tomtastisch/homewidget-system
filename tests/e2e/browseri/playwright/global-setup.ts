import {chromium, type FullConfig} from '@playwright/test';
import {timeouts} from './helpers/timing';
import * as fs from 'fs';
import * as path from 'path';

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
	
	// Warm‑Up Modus:
	// - strict (Default): schlägt fehl, wenn Marker nicht gefunden werden
	// - soft: versucht Warm‑Up, fährt aber ohne Fehler fort, falls Marker fehlen (für Minimal‑Suites)
	// - off: überspringt Warm‑Up komplett
	const warmupMode = (process.env.PLAYWRIGHT_WARMUP_MODE || 'strict').toLowerCase();

	const browser = await chromium.launch();
	const context = await browser.newContext();
	const page = await context.newPage();
	
	const warmupDir = path.resolve(__dirname, 'test-results', 'warmup');
	try {
		fs.mkdirSync(warmupDir, {recursive: true});
	} catch {
	}
	
	// Reduziert, um schnelleres Feedback bei Fehlschlägen zu erhalten.
	// Segmentierte Polling-Strategie bleibt erhalten.
	const totalTimeoutMs = 90_000; // bis zu 90 Sekunden nur für Warm‑Up (kein Test‑Timeout)
	const start = Date.now();
	let attempt = 0;
	let ready = false;
	
	// Bei "off" nur kurz öffnen, damit ggf. Dev‑Server anläuft, danach abbrechen
	if (warmupMode === 'off') {
		try {
			await page.goto(String(baseURL), {waitUntil: 'domcontentloaded', timeout: 60_000});
		} catch {
		}
		await browser.close();
		return;
	}

	while (Date.now() - start < totalTimeoutMs && !ready) {
		attempt += 1;
		try {
			// Schnellere erste Paints erlauben (DOM bereit genügt)
			await page.goto(String(baseURL), {waitUntil: 'domcontentloaded', timeout: 60_000});
			
			// Stufe 1: Root vorhanden
			const hasRoot = await page.locator('#root').first().isVisible().catch(() => false);
			
			// Stufe 2: Einer der stabilen Marker sichtbar (home.screen bevorzugt)
			const homeScreen = page.getByTestId('home.screen');
			const homeLogin = page.getByTestId('home.loginLink');
			const demoBanner = page.getByTestId('home.demoBanner');
			
			// Kurze, wiederholte Poll‑Wartezeit je Versuch
			const pollStart = Date.now();
			while (Date.now() - pollStart < 20_000 && !ready) {
				if (await homeScreen.isVisible().catch(() => false)) {
					ready = true;
					break;
				}
				if (await homeLogin.isVisible().catch(() => false)) {
					ready = true;
					break;
				}
				if (await demoBanner.isVisible().catch(() => false)) {
					ready = true;
					break;
				}
				// Warte kurz auf Network-Idle (mit kleinem Timeout), statt fixem Sleep
				await page.waitForLoadState('networkidle', {timeout: Math.min(500, timeouts.uiDefaultMs)}).catch(async () => {
					await page.waitForTimeout(200);
				});
			}
			
			// Optional: grobe Fehlererkennung der Dev‑Seite (Overlay)
			if (!ready && hasRoot) {
				const errorOverlay = await page.getByText(/(Failed to compile|ReferenceError|TypeError|Unhandled Runtime Error)/i).first();
				if (await errorOverlay.isVisible().catch(() => false)) {
					// Einmal reloaden und weiter versuchen
					await page.reload({waitUntil: 'domcontentloaded'});
				}
			}
			
			if (!ready) {
				// kurze Backoff‑Pause (steigend), bevorzugt networkidle mit Fallback
				const backoff = Math.min(1000 * attempt, Math.min(timeouts.uiDefaultMs, 8000));
				await page.waitForLoadState('networkidle', {timeout: backoff}).catch(async () => {
					await page.waitForTimeout(250);
				});
			}
		} catch (e) {
			// Ignoriere Zwischenfehler und versuche erneut (Server evtl. noch nicht bereit)
			const backoff = Math.min(1000 * attempt, Math.min(timeouts.uiDefaultMs, 8000));
			await page.waitForLoadState('networkidle', {timeout: backoff}).catch(async () => {
				await page.waitForTimeout(250);
			});
		}
	}
	
	if (!ready) {
		// Diagnose: Screenshot + HTML ablegen
		try {
			await page.screenshot({path: path.join(warmupDir, `warmup-timeout.png`), fullPage: true});
			const html = await page.content();
			fs.writeFileSync(path.join(warmupDir, `warmup-timeout.html`), html, 'utf-8');
		} catch {
		}
		await browser.close();
		if (warmupMode === 'soft') {
			// Nur Hinweis ausgeben und fortfahren – Minimal‑Suites benötigen ggf. keinen UI‑Warm‑Up
			console.warn(
				`[Warm‑Up] Marker nicht sichtbar innerhalb ${Math.round(totalTimeoutMs / 1000)}s @ ${baseURL}. ` +
				`Modus=soft → fahre ohne Fehler fort.`,
			);
			return;
		}
		throw new Error(`Warm‑Up: 'home.screen' bzw. Start‑Marker nicht sichtbar innerhalb ${Math.round(totalTimeoutMs / 1000)}s @ ${baseURL}`);
	}
	
	await browser.close();
}
