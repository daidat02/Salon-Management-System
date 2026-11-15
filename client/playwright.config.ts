import { defineConfig, devices } from '@playwright/test';
import { ACCOUNTS, authFile } from './e2e/support/env';

const APP_URL = process.env.E2E_APP_URL ?? 'http://app.localhost:3000';
const LANDING_URL = process.env.E2E_LANDING_URL ?? 'http://localhost:3000/landing';
const IS_CI = !!process.env.CI;
const ownerState = ACCOUNTS.owner ? authFile('owner') : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/global-setup.ts',
  outputDir: './test-results',
  reporter: IS_CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: APP_URL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    storageState: ownerState,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: LANDING_URL,
    reuseExistingServer: !IS_CI,
    timeout: 180_000,
    env: {
      API_PROXY_TARGET: process.env.API_PROXY_TARGET ?? 'http://localhost:8080',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '/api',
      NEXT_PUBLIC_API_VERSION: process.env.NEXT_PUBLIC_API_VERSION ?? 'v1',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://app.localhost:3000',
    },
  },
});
