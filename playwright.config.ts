import { defineConfig } from '@playwright/test';

const PORT = 5180;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    // Yerelde kurulu Chrome, CI'da Playwright'ın Chromium'u kullanılır.
    channel: process.env.CI ? undefined : 'chrome',
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
