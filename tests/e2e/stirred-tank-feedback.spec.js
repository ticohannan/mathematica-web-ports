// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by R. Ricardo Sánchez
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/stirred-tank-feedback.spec.js — browser tests of the "Feedback Control in a Stirred-Tank Reactor" page (attribution, start-up notice, UI inventory and
// bundle are in site.spec.js and bundle.spec.js; the errata switch, where there is one, in errata-mode.spec.js). Review
// screenshots at the snapshot settings (compare: docs/original-snapshots/stirred-tank-feedback-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/stirred-tank-feedback/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const plain = (v) => JSON.parse(JSON.stringify(v), (k, x) => (x && typeof x === 'object' && !Array.isArray(x) && typeof x.wl === 'string' && 'n' in x ? x.n : x));
const fx = plain(JSON.parse(fs.readFileSync('tests/golden/stirred-tank-feedback.original-states.json', 'utf8')));
const SKIP = new Set([]);
const settings = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !SKIP.has(k)));

test.describe('stirred-tank-feedback', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['temperature-plot', 'heat-plot', 'legend']) await expect(page.getByTestId(id).first(), id).toBeAttached();
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    const s = await state(page);
    for (const [k, v] of Object.entries({ Kp: 10, τI: 4, Q0: 100, inletT: 20, pertur: 40, Flu: 3 })) expect(s[k], k).toEqual(v);
  });

  test('a control changes the picture', async ({ page }) => {
    await openDemo(page, URL);
    const before = JSON.stringify(await view(page));
    await page.getByTestId('slider-Kp').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page))['Kp']).toBeCloseTo(10.1, 9);
    await expect.poll(async () => JSON.stringify(await view(page))).not.toBe(before);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), settings(fx.snapshots[k]));
      const v = await view(page);
      expect(v.at200.TR).toBeGreaterThan(50);
      await reviewShot(page, testInfo, `stirred-tank-feedback-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ Kp: 0, Flu: 20 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
