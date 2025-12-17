import {Page} from '@playwright/test';
import {budgets, timeouts} from './timing';

/**
 * Wartehilfen für state-based waiting statt zeitbasierten Timeouts.
 * 
 * Diese Helfer ersetzen willkürliche `page.waitForTimeout()` Aufrufe durch
 * explizite Wartelogik auf stabile Signale (API idle, DOM ready, etc.).
 */

/**
 * Wartet bis alle ausstehenden Netzwerk-Requests abgeschlossen sind.
 * Nutzt die Network-Idle-Strategie von Playwright.
 * 
 * @param page Playwright Page-Objekt
 * @param timeout Maximales Timeout in ms (Standard: 5000)
 */
export async function waitForNetworkIdle(
	page: Page,
	timeout: number = timeouts.uiDefaultMs,
	maxAttempts: number = 3,
): Promise<void> {
	let lastError: Error | undefined;
	
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			await page.waitForLoadState('networkidle', {timeout});
			return;
		} catch (e) {
			lastError = e as Error;
			console.log(`[WAIT] Network-Idle Versuch ${attempt}/${maxAttempts} fehlgeschlagen`);
			
			if (attempt < maxAttempts) {
				// Begrenzter Backoff, um Hänger zu vermeiden; kein endloses Warten
				const backoff = Math.min(250 * attempt, 1000);
				await page.waitForTimeout(backoff);
			}
		}
	}
	
	// Nach Erschöpfung aller Versuche Fehler werfen
	throw new Error(
		`waitForNetworkIdle fehlgeschlagen nach ${maxAttempts} Versuchen. ` +
		`Ursprünglicher Fehler: ${lastError?.message || 'Unbekannt'}`
	);
}

/**
 * Wartet bis eine spezifische API-Route aufgerufen wurde.
 * Nützlich für das Warten auf Feed-Laden, Widget-Updates, etc.
 * 
 * @param page Playwright Page-Objekt
 * @param urlPattern URL-Pattern (RegExp oder String)
 * @param timeout Maximales Timeout in ms (Standard: 10000)
 */
export async function waitForApiCall(
	page: Page,
	urlPattern: string | RegExp,
	timeout: number = budgets.apiCallMs
): Promise<void> {
	await page.waitForResponse(
		(response) => {
			const url = response.url();
			const matches = typeof urlPattern === 'string'
				? url.includes(urlPattern)
				: urlPattern.test(url);
			return matches && response.status() < 400;
		},
		{timeout}
	);
}

/**
 * Wartet bis DOM-Änderungen abgeschlossen sind (z.B. nach Login, Navigation).
 * Nutzt Playwrights domcontentloaded Event.
 * 
 * @param page Playwright Page-Objekt
 * @param timeout Maximales Timeout in ms (Standard: 5000)
 */
export async function waitForDOMReady(page: Page, timeout: number = timeouts.uiDefaultMs): Promise<void> {
	await page.waitForLoadState('domcontentloaded', {timeout});
}

/**
 * Wartet bis ein Element erscheint und attached ist (aber nicht zwingend visible).
 * Nützlich für das Warten auf dynamisch eingefügte Elemente.
 * 
 * @param page Playwright Page-Objekt
 * @param testId TestID des Elements
 * @param timeout Maximales Timeout in ms (Standard: 5000)
 */
export async function waitForElement(
	page: Page,
	testId: string,
	timeout: number = timeouts.uiDefaultMs
): Promise<void> {
	await page.getByTestId(testId).waitFor({state: 'attached', timeout});
}

/**
 * Wartet bis die Seite vollständig geladen ist (inkl. Bilder, Styles).
 * 
 * @param page Playwright Page-Objekt
 * @param timeout Maximales Timeout in ms (Standard: 10000)
 */
export async function waitForPageLoad(page: Page, timeout: number = timeouts.slowUiMs): Promise<void> {
	await page.waitForLoadState('load', {timeout});
}

/**
 * Kombiniert mehrere Wait-Strategien für robustes Warten nach Reload.
 * Wartet auf DOM-Ready + Network-Idle.
 * 
 * @param page Playwright Page-Objekt
 * @param timeout Maximales Timeout in ms (Standard: 10000)
 */
export async function waitAfterReload(page: Page, timeout: number = timeouts.slowUiMs): Promise<void> {
	await waitForDOMReady(page, timeout);
	await waitForNetworkIdle(page, timeout);
}

/**
 * Wartet auf Navigation-Completion nach einer Aktion (z.B. Klick auf Link).
 * Kombiniert Navigation-Wait mit Network-Idle.
 * 
 * @param page Playwright Page-Objekt
 * @param timeout Maximales Timeout in ms (Standard: 10000)
 */
export async function waitForNavigation(page: Page, timeout: number = budgets.navigationMs): Promise<void> {
	await page.waitForLoadState('domcontentloaded', {timeout});
	await waitForNetworkIdle(page, timeout / 2);
}

/**
 * Wartet minimal kurz (z.B. für UI-Animationen), aber mit explizitem Grund.
 * Sollte nur verwendet werden, wenn keine bessere Wait-Strategie existiert.
 * 
 * @param page Playwright Page-Objekt
 * @param reason Grund für den kurzen Wait (für Dokumentation)
 * @param ms Wartezeit in ms (Standard: 500, max: 1000)
 */
export async function waitForAnimation(
	page: Page,
	reason: string,
	ms: number = 500
): Promise<void> {
	if (ms > 1000) {
		throw new Error('waitForAnimation sollte nicht für lange Waits verwendet werden. Nutze state-based waits.');
	}
	// Dokumentiere Grund im Test-Log
	console.log(`[WAIT] Animation/UI-Transition: ${reason} (${ms}ms)`);
	await page.waitForTimeout(ms);
}
