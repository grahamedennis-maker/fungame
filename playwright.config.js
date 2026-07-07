import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  webServer: {
    command: 'node scripts/serve.js',
    port: 8123,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:8123',
    headless: true,
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    },
  },
});
