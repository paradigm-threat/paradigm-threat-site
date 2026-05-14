import { defineConfig, devices } from '@playwright/test'

/** dev-all.sh → :3000; production-like local → :8081 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'
const useExternalServer = process.env.PW_NO_SERVER === '1' || process.env.CI !== 'true'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 2,
  reporter: 'list',
  timeout: 90_000,
  expect: { timeout: 45_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: 'pnpm run build && pnpm run start',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 240_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
