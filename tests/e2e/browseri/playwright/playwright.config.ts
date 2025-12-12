import {defineConfig, devices} from '@playwright/test';
import * as path from 'path';

/**
 * Playwright Configuration for Browser E2E Tests
 *
 * Diese Tests nutzen das Expo-Web-Frontend aus mobile/ als Web-Client
 * und testen darüber das Backend im E2E-Modus.
 *
 * Umgebungsvariablen:
 * - PLAYWRIGHT_WEB_BASE_URL: Expo-Web-Frontend (Standard: http://localhost:19006)
 * - E2E_API_BASE_URL: Backend-API im E2E-Modus (Standard: http://127.0.0.1:8100)
 */
const webBaseURL = process.env.PLAYWRIGHT_WEB_BASE_URL || 'http://localhost:19006';
const apiBaseURL = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8100';

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
		// baseURL zeigt auf das Expo-Web-Frontend für UI-Interaktionen
		baseURL: webBaseURL,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},
	
	/**
	 * Test-Projekte für verschiedene Testebenen (Minimum/Standard/Bestenfalls)
	 * 
	 * Verwendung:
	 * - npx playwright test --project=minimum      # Nur Minimum-Tests
	 * - npx playwright test --project=standard     # Minimum + Standard
	 * - npx playwright test --project=bestenfalls  # Alle Tests inkl. Bestenfalls
	 * - npx playwright test                        # Standard (Minimum + Standard)
	 */
	projects: [
		{
			name: 'minimum',
			testMatch: /.*\.spec\.ts$/,
			grep: /@minimum/,
			use: {...devices['Desktop Chrome']},
		},
		{
			name: 'standard',
			testMatch: /.*\.spec\.ts$/,
			grep: /@minimum|@standard/,
			use: {...devices['Desktop Chrome']},
		},
		{
			name: 'bestenfalls',
			testMatch: /.*\.spec\.ts$/,
			// Kein grep-Filter: alle Tests (minimum + standard + bestenfalls)
			use: {...devices['Desktop Chrome']},
		},
	],
	
	/**
	 * Expo-Web-Frontend automatisch starten (lokal).
	 * 
	 * Im CI wird Expo-Web manuell im Workflow gestartet, daher wird dort
	 * der bereits laufende Server wiederverwendet (reuseExistingServer: true).
	 * 
	 * Das Backend wird separat über backend/tools/start_test_backend_e2e.sh gestartet,
	 * entweder manuell (lokal) oder im CI-Job vor den Playwright-Tests.
	 */
	webServer: {
		command: 'npm run web',
		url: webBaseURL,
		cwd: path.resolve(__dirname, '../../../../mobile'),
		timeout: 180_000, // Expo-Web-Build kann lange dauern beim ersten Start (3 Min)
		reuseExistingServer: !!process.env.CI, // Im CI wird Expo-Web bereits manuell gestartet
		stdout: 'pipe',
		stderr: 'pipe',
		env: {
			// Expo-Web soll die Backend-API-URL kennen
			EXPO_PUBLIC_API_BASE_URL: apiBaseURL,
			// CI-Env explizit setzen (für Metro und andere Tools)
			...(process.env.CI ? { CI: 'true' } : {}),
		},
	},
});
