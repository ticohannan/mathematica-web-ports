// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/e2e/bundle.spec.js — owner rule R-A: every app can be deployed on its own. For each app of tests/e2e/apps.js
// (new apps are picked up automatically) the app is bundled with tools/bundle-app.mjs into
// test-output/bundle-e2e/<browser>/<dir>/, that folder ALONE is served by tools/serve.mjs on a free port, and the
// bundle's root page is opened: it must open the app, the app must start (window.__demo.ready) without page errors,
// and every request must stay inside the bundle and succeed. Every script and stylesheet of the bundle must be
// loaded (the bundle holds nothing the page does not use). One page load per app and browser.
// tests/unit/design-docs.test.js reads this file with ${app.dir} replaced by each app's folder, so the design
// documents can cite the test title verbatim.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { APPS } from './apps.js';
import { bundleApp } from '../../tools/bundle-app.mjs';
import { startServer } from '../../tools/serve.mjs';

for (const app of APPS) {
  test(`bundle: ${app.dir} runs from its own folder`, async ({ page }, testInfo) => {
    // WebGL pages can take long to start in software rendering when many browsers share few CPU cores
    test.slow(app.webgl, 'WebGL page');
    const outDir = path.resolve('test-output', 'bundle-e2e', testInfo.project.name);
    fs.mkdirSync(outDir, { recursive: true });
    const bundle = bundleApp(app.dir, { outDir });
    const server = await startServer({ root: bundle.folder, port: 0 });
    try {
      const origin = server.url;
      const problems = [], outside = [], failed = [], requested = new Set();
      page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' && !/\/favicon\.ico$/.test(m.location()?.url ?? '')) problems.push(`console.error: ${m.text()}`);
      });
      page.on('request', (r) => {
        const u = new URL(r.url());
        if (u.protocol === 'data:' || u.protocol === 'blob:') return;
        if (u.origin !== origin) outside.push(r.url());
        else requested.add(decodeURIComponent(u.pathname).replace(/^\//, ''));
      });
      page.on('requestfailed', (r) => failed.push(`failed: ${r.url()} (${r.failure()?.errorText})`));
      page.on('response', (r) => {
        // The site has no favicon (none is specified); some browser builds request /favicon.ico anyway.
        if (r.status() >= 400 && !/\/favicon\.ico$/.test(r.url())) failed.push(`${r.status()} ${r.url()}`);
      });

      // The root page replaces itself with the app while it is still loading, so wait only for the first commit.
      await page.goto(`${origin}/`, { waitUntil: 'commit' });
      await page.waitForURL(`${origin}/demos/${app.dir}/`, { waitUntil: 'load' });
      // Interval polling: polling on animation frames stalled now and then after the client-side redirect.
      await page.waitForFunction(() => window.__demo && window.__demo.ready === true, null, { polling: 100 });

      expect(problems, 'page errors').toEqual([]);
      expect(outside, 'requests outside the bundle folder').toEqual([]);
      expect(failed, 'failed requests').toEqual([]);
      const unused = bundle.files.filter((f) => /\.(js|mjs|css)$/.test(f) && !requested.has(f));
      expect(unused, 'scripts/stylesheets in the bundle that the page did not load').toEqual([]);

      // The app's "All demos" link (../../index.html) leads to the bundle's root page, which links back to the app.
      const href = await page.getByTestId('crumbs').locator('a').first().getAttribute('href');
      const res = await page.request.get(new URL(href, page.url()).toString());
      expect(res.status(), href).toBe(200);
      expect(await res.text()).toContain(`href="demos/${app.dir}/"`);
      // a second visit in the same tab (sessionStorage flag, no referrer needed) stays on the root page
      await page.goto(new URL(href, page.url()).toString());
      await expect(page.getByTestId('open-app')).toBeVisible();
      expect(new URL(page.url()).pathname).toMatch(/^\/(index\.html)?$/);
    } finally {
      await server.close();
    }
  });
}
