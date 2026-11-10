// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/e2e/errata-mode.spec.js — the switch "errors of the original: kept | corrected" (shared/errata.js) in the
// browser, for every app with a demos/<dir>/errata-mode.js: the page opens with "kept" and the original's value at
// the scenario of tests/support/errata-scenarios.js, "corrected" gives the corrected value, the note lists every
// correction, and "Initial settings" returns to "kept". A screenshot of each mode is saved for review.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { APPS } from './apps.js';
import { openDemo, reviewShot } from './helpers.js';
import { SCENARIOS } from '../support/errata-scenarios.js';

const WITH = APPS.filter((a) => fs.existsSync(`demos/${a.dir}/errata-mode.js`));
const probe = (page, src) => page.evaluate((s) => {
  const d = window.__demo;
  // eslint-disable-next-line no-new-func
  return new Function('view', 'state', 'demo', `return (${s})(view, state, demo);`)(d.view(), d.getState(), d);
}, src);
const same = (got, want, digits) => {
  if (typeof want === 'number') expect(got).toBeCloseTo(want, digits ?? 6);
  else expect(got).toEqual(want);
};

for (const app of WITH) {
  test(`errata switch on ${app.dir}: kept is the original, corrected changes the listed result`, async ({ page }, testInfo) => {
    const s = SCENARIOS[app.dir];
    const problems = await openDemo(page, app.url);
    const kept = page.getByTestId('setter-errata-original');
    const corrected = page.getByTestId('setter-errata-corrected');
    await expect(kept).toHaveAttribute('aria-pressed', 'true');
    await expect(corrected).toHaveAttribute('aria-pressed', 'false');
    expect((await page.evaluate(() => window.__demo.getState())).errata).toBe('original');
    // the note lists every correction of errata-mode.js
    const ids = (await import(`../../demos/${app.dir}/errata-mode.js`)).CORRECTIONS.map((c) => c.id);
    await expect(page.getByTestId('errata-details')).toBeAttached();
    expect(await page.$$eval('[data-testid=errata-details] li', (els) => els.map((e) => e.getAttribute('data-errata-id')))).toEqual(ids);
    // the scenario: the original's value, then the corrected one, then back
    const apply = async () => { if (s.state) await page.evaluate((st) => window.__demo.setState(st), s.state); };
    // reapply: the body changes the scenario's own variables (e.g. it moves markers apart), so the state is set again
    // after each change of the switch
    const again = async () => { if (s.reapply) await apply(); };
    await apply();
    same(await probe(page, s.probe), s.original, s.digits);
    await reviewShot(page, testInfo, `${app.dir}-errata-kept`);
    await corrected.click();
    await expect(corrected).toHaveAttribute('aria-pressed', 'true');
    expect((await page.evaluate(() => window.__demo.getState())).errata).toBe('corrected');
    await again();
    same(await probe(page, s.probe), s.corrected, s.digits);
    await reviewShot(page, testInfo, `${app.dir}-errata-corrected`);
    await kept.click();
    await again();
    same(await probe(page, s.probe), s.original, s.digits);
    // "Initial settings" returns to kept
    await corrected.click();
    await page.getByTestId('reset').click();
    await expect(kept).toHaveAttribute('aria-pressed', 'true');
    expect((await page.evaluate(() => window.__demo.getState())).errata).toBe('original');
    expect(problems).toEqual([]);
  });
}
