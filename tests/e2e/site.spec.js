// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Adapted from Wolfram Demonstrations Project content (see LICENSE.md)
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/site.spec.js — landing page, links, attribution
import { test, expect } from '@playwright/test';

test('landing page links to all three demos and they load', async ({ page }) => {
  await page.goto('/index.html');
  const links = page.locator('a[data-testid^="demo-link-"]');
  await expect(links).toHaveCount(3);
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
const pages = [
  { url: '/demos/motion-planning/', authors: ['Shreyas Poyrekar', 'Aaron T. Becker', 'Arifa Sultana'], title: 'Motion Planning for Robot Path around Obstacles' },
  { url: '/demos/three-parametrizations/', authors: ['Aaron T. Becker', 'Benedict Isichei'], title: 'Three Parametrizations of Rotations' },
  { url: '/demos/euler-angles/', authors: ['Kevin Hernandez', 'Sándor Kabai'], title: 'Euler Angles: Precession, Nutation, and Spin' },
];
for (const p of pages) {
  test(`attribution on ${p.url}`, async ({ page }) => {
    await page.goto(p.url);
    const credits = page.getByTestId('credits');
    for (const a of p.authors) await expect(credits).toContainText(a);
    await expect(credits).toContainText(p.title);
    await expect(credits).toContainText('Adapted from');
    await expect(credits.locator('a[href="https://creativecommons.org/licenses/by-nc-sa/3.0/"]')).toHaveCount(1);
    await expect(credits.locator('a[href^="https://demonstrations.wolfram.com/"]')).toHaveCount(1);
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
import fs from 'node:fs';
const INVENTORY_PAGES = [
  { url: '/demos/motion-planning/', doc: 'demos/motion-planning/DESIGN.md' },
  { url: '/demos/three-parametrizations/', doc: 'demos/three-parametrizations/DESIGN.md' },
  { url: '/demos/euler-angles/', doc: 'demos/euler-angles/DESIGN.md' },
];
function inventoryPatterns(docFile) {
  const md = fs.readFileSync(docFile, 'utf8');
  const sec = md.slice(md.indexOf('## 5. UI inventory'), md.indexOf('\n## 6.'));
  return [...sec.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
}
const toRegExp = (p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
for (const p of INVENTORY_PAGES) {
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
    const patterns = inventoryPatterns(p.doc).map((s) => ({ s, re: toRegExp(s) }));
    const unlisted = [...new Set(ids.filter((id) => !patterns.some((q) => q.re.test(id))))];
    expect(unlisted, `controls not in ${p.doc} §5 (add a design entry first)`).toEqual([]);
    const unused = patterns.filter((q) => !ids.some((id) => q.re.test(id))).map((q) => q.s);
    expect(unused, `inventory rows in ${p.doc} that match nothing on the page`).toEqual([]);
  });
}
