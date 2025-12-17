import {defineConfig, devices} from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Playwright Configuration for Browser E2E Tests
 *
 * Diese Tests nutzen das Expo-Web-Frontend aus mobile/ als Web-Client
 * und testen darüber das Backend im E2E-Modus.
 *
 * Umgebungsvariablen (mit Fallbacks):
 * - PLAYWRIGHT_WEB_BASE_URL: Expo-Web-Frontend (Versucht: env → 19006 → 8081 → 8000)
 * - E2E_API_BASE_URL: Backend-API im E2E-Modus (Versucht: env → 8100 → 8000)
 * - PLAYWRIGHT_NO_AUTO_START: "true" um Auto-Start zu deaktivieren (für manuelle Server-Verwaltung)
 */

/**
 * Hilfsfunktion: Gibt die erste verfügbare URL für einen Service zurück.
 * Nutzt Environment-Variable als Fallback, dann Default-Ports.
 */
function detectServiceURL(envVar: string, defaultPorts: number[], useLocalhost = false): string {
	if (process.env[envVar]) {
		console.log(`[Playwright] ${envVar} = ${process.env[envVar]}`);
		return process.env[envVar];
	}
	
	const host = useLocalhost ? '127.0.0.1' : 'localhost';
	const url = `http://${host}:${defaultPorts[0]}`;
	console.log(`[Playwright] ${envVar} not set, using default: ${url} (ports: ${defaultPorts.join(', ')})`);
	return url;
}

const webBaseURL = detectServiceURL('PLAYWRIGHT_WEB_BASE_URL', [19006, 8081, 8000], false);
const apiBaseURL = detectServiceURL('E2E_API_BASE_URL', [8100, 8000], true);

export default defineConfig({
	testDir: './specs',
	timeout: 30_000,
	expect: {
		timeout: 10_000,
	},
	retries: process.env.CI ? 1 : 0,
	fullyParallel: false,
	reporter: [['list']],
	// Warms up Expo-Web vor Teststart über globalSetup (siehe global-setup.ts)
	globalSetup: './global-setup.ts',
	use: {
		// baseURL zeigt auf das Expo-Web-Frontend für UI-Interaktionen
		baseURL: webBaseURL,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},
	
	/**
	 * Test-Projekte für verschiedene Testebenen (Minimal/Standard/Advanced)
	 *
	 * Verwendung:
	 * - npx playwright test --project=minimal      # Nur Minimal-Tests
	 * - npx playwright test --project=standard     # Minimal + Standard
	 * - npx playwright test --project=advanced     # Alle Tests inkl. Advanced
	 * - npx playwright test                        # Standard (Minimal + Standard)
	 */
	projects: [
		{
			name: 'minimal',
			testMatch: /.*\.spec\.ts$/,
			grep: /@minimal/,
			use: {...devices['Desktop Chrome']},
		},
		{
			name: 'standard',
			testMatch: /.*\.spec\.ts$/,
			grep: /@minimal|@standard/,
			use: {...devices['Desktop Chrome']},
		},
		{
			name: 'advanced',
			testMatch: /.*\.spec\.ts$/,
			// Kein grep-Filter: alle Tests (minimal + standard + advanced)
			use: {...devices['Desktop Chrome']},
		},
	],
	
	/**
	 * Expo-Web-Frontend automatisch starten (lokal, falls nicht manuell verwaltet).
	 *
	 * Verhalten:
	 * - PLAYWRIGHT_NO_AUTO_START=true: Server wird NICHT automatisch gestartet (manuell verwalten)
	 * - CI=true: Reuse existing server (angenommen, dass im CI vorher gestartet wurde)
	 * - lokal: Auto-Start mit reuseExistingServer=true für schnellere Wiederholungen
	 *
	 * Das Backend wird separat über backend/tools/start_test_backend_e2e.sh gestartet.
	 */
	webServer: process.env.PLAYWRIGHT_NO_AUTO_START === 'true' ? undefined : {
		command: 'npm run web',
		url: webBaseURL,
		cwd: path.resolve(__dirname, '../../../../mobile'),
		timeout: 180_000, // Expo-Web-Build kann lange dauern beim ersten Start (3 Min)
		reuseExistingServer: true, // Immer reuse, um Blockierung zu vermeiden
		stdout: 'pipe',
		stderr: 'pipe',
		env: {
			// Expo-Web soll die Backend-API-URL kennen
			EXPO_PUBLIC_API_BASE_URL: apiBaseURL,
			// CI-Env explizit setzen (für Metro und andere Tools)
			...(process.env.CI ? { CI: 'true' } : {}),
		},
	},
	
	// Globaler Teardown für sauberes Herunterfahren nach allen Tests
	globalTeardown: './global-teardown.ts',
});



