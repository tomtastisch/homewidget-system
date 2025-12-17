/**
 * Zentrale Testdaten-Helfer für E2E-Tests
 * - uniqueEmail: erzeugt eine einzigartige E‑Mail-Adresse (stabil gegenüber Parallelruns)
 * - DEFAULT_PASSWORD: einheitliches Standardpasswort für Testnutzer
 */

/**
 * Erzeugt eine eindeutige E‑Mail-Adresse mit optionalem Präfix.
 * Beispiel: uniqueEmail('freemium') → freemium+1700000000000-ab12cd@example.com
 */
export function uniqueEmail(prefix = 'user'): string {
	const ts = Date.now();
	const rnd = Math.random().toString(36).slice(2, 8);
	return `${prefix}+${ts}-${rnd}@example.com`;
}

/**
 * Einheitliches Standardpasswort für Testnutzer.
 */
export const DEFAULT_PASSWORD = 'TestPass123!';

/**
 * Weitere zentrale Testdaten-Konstanten zur Vermeidung harter Strings in Specs
 */
export const INVALID_EMAIL = 'invalid-email-format';
export const WRONG_PASSWORD = 'WrongPassword999!';
