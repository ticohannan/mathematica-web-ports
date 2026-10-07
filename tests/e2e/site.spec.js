// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Adapted from Wolfram Demonstrations Project content (see LICENSE.md)
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/site.spec.js — landing page, links, attribution, UI inventory, start-up notice (all apps)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { APPS } from './apps.js';

test('landing page links to all ten demos and they load', async ({ page }) => {
  await page.goto('/index.html');
  const links = page.locator('a[data-testid^="demo-link-"]');
  await expect(links).toHaveCount(APPS.length);
  for (const href of await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
    const res = await page.request.get(new URL(href, page.url()).toString());
    expect(res.status(), href).toBe(200);
  }
});

test('private folders are not served by the local server', async ({ page }) => {
  const res = await page.request.get('/_internal/RULES_AND_GUIDANCE.md');
  expect(res.status()).toBe(403);
});

// CC BY-NC-SA 3.0 requires every copy (each page) to credit the authors, the title, the source,
// the licence, and to say that this is an adaptation.
for (const p of APPS) {
  test(`attribution on ${p.url}`, async ({ page }) => {
    await page.goto(p.url);
    const credits = page.getByTestId('credits');
    for (const a of p.authors) await expect(credits).toContainText(a);
    await expect(credits).toContainText(p.title);
    await expect(credits).toContainText('Adapted from');
    await expect(credits.locator('a[href="https://creativecommons.org/licenses/by-nc-sa/3.0/"]')).toHaveCount(1);
    await expect(credits.locator(`a[href="https://demonstrations.wolfram.com/${p.slug}/"]`)).toHaveCount(1);
    await expect(credits).toContainText('Not affiliated with or endorsed');
  });
}

test('attribution on the landing page', async ({ page }) => {
  await page.goto('/index.html');
  const credits = page.getByTestId('credits');
  await expect(credits.locator('a[href="https://creativecommons.org/licenses/by-nc-sa/3.0/"]')).toHaveCount(1);
  await expect(credits).toContainText('Not affiliated with or endorsed');
});

// Design documents are the specification (docs/DESIGN_PROCESS.md): every interactive element of an
// app page must be listed in that app's UI inventory, and every inventory row must exist on the page.
function inventoryPatterns(docFile) {
  const md = fs.readFileSync(docFile, 'utf8');
  const sec = md.slice(md.indexOf('## 5. UI inventory'), md.indexOf('\n## 6.'));
  return [...sec.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
}
const toRegExp = (p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
for (const p of APPS) {
  test(`every control on ${p.url} is specified in its design document`, async ({ page }) => {
    await page.goto(p.url);
    await page.waitForFunction(() => window.__demo && window.__demo.ready === true);
    const ids = await page.$$eval(
      'button, input, select, textarea, a[href], summary, canvas, [role=button], [role=slider], [tabindex]:not([tabindex="-1"])',
      (els) => els.map((e) => {
        const own = e.getAttribute('data-testid');
        const anc = e.closest('[data-testid]');
        return own || (anc && anc.getAttribute('data-testid')) || `UNIDENTIFIED <${e.tagName.toLowerCase()}> "${(e.textContent || '').trim().slice(0, 30)}"`;
      }));
    const doc = `demos/${p.dir}/DESIGN.md`;
    const patterns = inventoryPatterns(doc).map((s) => ({ s, re: toRegExp(s) }));
    const unlisted = [...new Set(ids.filter((id) => !patterns.some((q) => q.re.test(id))))];
    expect(unlisted, `controls not in ${doc} §5 (add a design entry first)`).toEqual([]);
    const unused = patterns.filter((q) => !ids.some((id) => q.re.test(id))).map((q) => q.s);
    expect(unused, `inventory rows in ${doc} that match nothing on the page`).toEqual([]);
  });

  // DEC-22: a clear notice instead of an empty page when the browser cannot run the app (the seven apps added in v0.1.12)
  if (p.notice) test(`start-up notice when ${p.url} cannot start`, async ({ page }) => {
    // Simulate a browser whose module scripts fail: block the page's main module.
    await page.route('**/main.js', (route) => route.abort());
    await page.goto(p.url);
    await expect(page.getByTestId('requirements-notice')).toBeVisible({ timeout: 15000 });
  });
  if (p.webgl && p.notice) {
    test(`WebGL 2 notice on ${p.url} when WebGL 2 is unavailable`, async ({ page }) => {
      await page.addInitScript(() => {
        const orig = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return type === 'webgl2' ? null : orig.call(this, type, ...rest); };
      });
      await page.goto(p.url);
      await expect(page.getByTestId('requirements-notice')).toContainText('WebGL 2');
    });
  }
}
