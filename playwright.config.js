import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  outputDir: '/tmp/proof-fitness-playwright-results',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_500 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    launchOptions: { executablePath: '/usr/bin/google-chrome' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30_000
  },
  reporter: 'list'
});
