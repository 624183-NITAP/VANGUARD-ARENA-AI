import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    actionTimeout: 0,
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    headless: true
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
  webServer: {
    command: 'npx http-server ./ -p 8000',
    url: 'http://localhost:8000',
    reuseExistingServer: true,
    timeout: 10 * 1000
  }
});
