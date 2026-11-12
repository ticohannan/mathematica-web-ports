// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Jeff Bryant and Housam Binous
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/proportional-temperature-control.spec.js — browser tests of the "Proportional Temperature Control" page (attribution, start-up notice, UI inventory and
// bundle are in site.spec.js and bundle.spec.js; the errata switch, where there is one, in errata-mode.spec.js). Review
// screenshots at the snapshot settings (compare: docs/original-snapshots/proportional-temperature-control-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/proportional-temperature-control/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const plain = (v) => JSON.parse(JSON.stringify(v), (k, x) => (x && typeof x === 'object' && !Array.isArray(x) && typeof x.wl === 'string' && 'n' in x ? x.n : x));
const fx = plain(JSON.parse(fs.readFileSync('tests/golden/proportional-temperature-control.original-states.json', 'utf8')));
const SKIP = new Set([]);
const settings = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !SKIP.has(k)));

test.describe('proportional-temperature-control', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['temperature-plot', 'plot-label']) await expect(page.getByTestId(id).first(), id).toBeAttached();
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    const s = await state(page);
    for (const [k, v] of Object.entries({ V: 100, F: 10, Q0: 2500, TRset: 80, T0: 20 })) expect(s[k], k).toEqual(v);
  });

  test('a control changes the picture', async ({ page }) => {
    await openDemo(page, URL);
    const before = JSON.stringify(await view(page));
    await page.getByTestId('slider-F').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page))['F']).toBeCloseTo(11, 9);
    await expect.poll(async () => JSON.stringify(await view(page))).not.toBe(before);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), settings(fx.snapshots[k]));
      const v = await view(page);
      expect(v.TR150).toBeGreaterThan(70);
      await reviewShot(page, testInfo, `proportional-temperature-control-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ V: 10, T0: 100 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });

  test('ContinuousAction -> False: a drag computes at the release', async ({ page }) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('slider-V').boundingBox();
    await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
    expect((await state(page)).V).toBe(100); // not yet
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).V).toBeLessThan(80);
  });
});
