import { defineConfig, devices } from '@playwright/test';
import { config as dotenv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load test env into the Playwright Node process (for e2e/db.ts admin client)
dotenv({ path: resolve(__dirname, '.env.test'), override: true });

export default defineConfig({
	testDir: './e2e',
	// Single worker: tests share a live remote DB — run serially
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 30_000,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: 'http://localhost:5173',
		headless: true,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	// Start the dev server with --mode e2etest so Vite loads .env.e2etest
	// (.env.e2etest points at the test Supabase project, not prod)
	webServer: {
		command: 'npx vite dev --mode e2etest',
		url: 'http://localhost:5173',
		reuseExistingServer: false,
		timeout: 30_000,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
