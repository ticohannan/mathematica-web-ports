// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Simon M. Lane
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/first-order-process-control.spec.js — browser tests of the "First-Order Transfer Functions in Process Control" page (attribution, start-up notice, UI inventory and
// bundle are in site.spec.js and bundle.spec.js; the errata switch, where there is one, in errata-mode.spec.js). Review
// screenshots at the snapshot settings (compare: docs/original-snapshots/first-order-process-control-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/first-order-process-control/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const plain = (v) => JSON.parse(JSON.stringify(v), (k, x) => (x && typeof x === 'object' && !Array.isArray(x) && typeof x.wl === 'string' && 'n' in x ? x.n : x));
const fx = plain(JSON.parse(fs.readFileSync('tests/golden/first-order-process-control.original-states.json', 'utf8')));
const SKIP = new Set([]);
const settings = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !SKIP.has(k)));

test.describe('first-order-process-control', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['response-plot-3', 'frame']) await expect(page.getByTestId(id).first(), id).toBeAttached();
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    const s = await state(page);
    for (const [k, v] of Object.entries({ W: 3, T: 5, α: 3, w: 1 })) expect(s[k], k).toEqual(v);
  });

  test('a control changes the picture', async ({ page }) => {
    await openDemo(page, URL);
    const before = JSON.stringify(await view(page));
    await page.getByTestId('slider-T').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page))['T']).toBeCloseTo(6, 9);
    await expect.poll(async () => JSON.stringify(await view(page))).not.toBe(before);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), settings(fx.snapshots[k]));
      const v = await view(page);
      expect(v).toBeTruthy();
      await reviewShot(page, testInfo, `first-order-process-control-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ W: 2, T: 8 }));
    await page.getByTestId('reset').click();
    // Initial Settings: the controls' own values (step input), not the saved state (F-FO-06)
    expect(await state(page)).toEqual({ ...opening, W: 1 });
  });

  test('ω is enabled only for the sinusoidal input', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('slider-w')).toBeEnabled();
    await page.getByTestId('setter-W-1').click();
    await expect(page.getByTestId('slider-w')).toBeDisabled();
    expect((await view(page)).timeconstant).toBeCloseTo(5, 2);
  });
});
