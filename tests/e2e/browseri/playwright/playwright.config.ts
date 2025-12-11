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
	projects: [
		{
			name: 'chromium',
			use: {...devices['Desktop Chrome']},
		},
	],
	
	/**
	 * Expo-Web-Frontend automatisch starten (lokal und im CI).
	 * 
	 * Das Backend wird separat über backend/tools/start_test_backend_e2e.sh gestartet,
	 * entweder manuell (lokal) oder im CI-Job vor den Playwright-Tests.
	 */
	webServer: {
		command: 'npm run web',
		url: webBaseURL,
		cwd: path.resolve(__dirname, '../../../../mobile'),
		timeout: 120_000, // Expo-Web-Build kann lange dauern beim ersten Start
		reuseExistingServer: !process.env.CI,
		stdout: 'pipe',
		stderr: 'pipe',
		env: {
			// Expo-Web soll die Backend-API-URL kennen
			EXPO_PUBLIC_API_BASE_URL: apiBaseURL,
		},
	},
});
