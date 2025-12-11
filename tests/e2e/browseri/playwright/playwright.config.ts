import {defineConfig, devices} from '@playwright/test';

/**
 * Playwright Configuration for Browser E2E Tests (Ticket 13 - Minimum)
 *
 * WICHTIG: Diese Tests laufen direkt gegen das Backend-API unter http://127.0.0.1:8100
 * Es gibt aktuell KEIN dediziertes Web-Frontend. Die Tests nutzen primär das request-Objekt
 * für API-Aufrufe oder page.evaluate() für minimale Browser-Interaktionen.
 *
 * Base URL: E2E_API_BASE_URL (Backend-API, nicht Web-Client)
 * Standard: http://127.0.0.1:8100
 */
const baseURL = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8100';

export default defineConfig({
	testDir: './specs',
	timeout: 30_000,
	expect: {
		timeout: 10_000,
	},
	retries: process.env.CI ? 1 : 0,
	fullyParallel: false,
	reporter: [['list']],
	use: {
		baseURL,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: {...devices['Desktop Chrome']},
		},
	],
	
	/**
	 * KEIN webServer-Block:
	 * Das Backend wird separat über backend/tools/start_test_backend_e2e.sh im CI gestartet.
	 * Es gibt keinen separaten Web-Client, der hier gestartet werden müsste.
	 *
	 * Für zukünftige Web-Frontend-Integration (TODO):
	 * - Wenn ein dediziertes Web-Frontend existiert, kann hier ein webServer-Block
	 *   hinzugefügt werden, der z.B. 'npm run dev' im Frontend-Verzeichnis startet.
	 * - Die baseURL würde dann auf den Web-Client zeigen (z.B. http://localhost:3000)
	 * - API-Calls würden über den Web-Client-Proxy oder direkt erfolgen
	 */
});
