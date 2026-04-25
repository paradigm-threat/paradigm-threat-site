import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8081'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: 'list',
  timeout: 90_000,
  expect: { timeout: 45_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
