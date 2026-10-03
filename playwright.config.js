// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// playwright.config.js — browser tests (tests/e2e). Default browser: Firefox.
//   npx playwright install firefox      (one-time download of Playwright's Firefox build)
//   npm run test:e2e                    (runs the Firefox project)
//   npx playwright test --project=chromium   (optional second engine: npx playwright install chromium)
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT || 8090);
// Optional: point at a specific Chromium binary (used in the authoring sandbox; normally unset).
const chromiumPath = process.env.PW_CHROMIUM_PATH;
const chromiumArgs = process.env.PW_CHROMIUM_ARGS ? process.env.PW_CHROMIUM_ARGS.split(' ') : [];

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-output/e2e-artifacts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Tests are independent (each opens its own page), so they run in parallel. Default 6 browser
  // workers; override with the PW_WORKERS environment variable (e.g. set PW_WORKERS=1 to debug).
  fullyParallel: true,
  workers: Number(process.env.PW_WORKERS || 6),
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'test-output/html-report', open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1100, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node tools/serve.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1100, height: 900 } } },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1100, height: 900 },
        launchOptions: chromiumPath ? { executablePath: chromiumPath, args: chromiumArgs } : {},
      },
    },
  ],
});
