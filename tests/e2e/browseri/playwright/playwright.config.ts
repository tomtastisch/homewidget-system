import {defineConfig, devices} from '@playwright/test';

// Base URL resolution: PLAYWRIGHT_BASE_URL > WEB_BASE_URL > default
const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.WEB_BASE_URL || 'http://localhost:3000';

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
	// If a separate web client must be started, configure here. Currently left as placeholder.
	// webServer: {
	//   command: process.env.WEB_START_CMD || 'npm run dev', // TODO: adjust when a real web client exists
	//   url: baseURL,
	//   reuseExistingServer: !process.env.CI,
	//   timeout: 120_000,
	// },
});
