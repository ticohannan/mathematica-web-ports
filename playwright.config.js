// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// playwright.config.js — browser tests (tests/e2e). Three engines:
//   npx playwright install firefox chromium webkit   (one-time download of Playwright's browser builds)
//   npm run test:e2e           all three: Firefox, Chromium, WebKit (what publish:tested requires)
//   npm run test:e2e:firefox | test:e2e:chromium | test:e2e:webkit    one engine
//   WebKit is the engine of Safari, but Playwright's own build, NOT Safari: on Windows it differs in
//   graphics stack, fonts and WebGL. Report it as "WebKit (Playwright)".
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
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1100, height: 900 } } },
  ],
});
