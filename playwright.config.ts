import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  use: { baseURL: 'http://127.0.0.1:5273', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run local', url: 'http://127.0.0.1:5273', reuseExistingServer: true, timeout: 60_000 },
  reporter: [['list']],
})
