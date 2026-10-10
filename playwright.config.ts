import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:4173/vote-better-malaysia/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: process.env.HANSARD_FROZEN_SITE
      ? 'npm run preview -- --outDir "$HANSARD_FROZEN_SITE" --host 127.0.0.1 --port 4173 --strictPort'
      : 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/vote-better-malaysia/',
    reuseExistingServer: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
