// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Jon Neades
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/quarter-car-double-spring.spec.js — browser tests of the "Quarter-Car Suspension Model with Double Spring" page (attribution, start-up notice, UI inventory and
// bundle are in site.spec.js and bundle.spec.js; the errata switch, where there is one, in errata-mode.spec.js). Review
// screenshots at the snapshot settings (compare: docs/original-snapshots/quarter-car-double-spring-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/quarter-car-double-spring/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const plain = (v) => JSON.parse(JSON.stringify(v), (k, x) => (x && typeof x === 'object' && !Array.isArray(x) && typeof x.wl === 'string' && 'n' in x ? x.n : x));
const fx = plain(JSON.parse(fs.readFileSync('tests/golden/quarter-car-double-spring.original-states.json', 'utf8')));
const SKIP = new Set([]);
const settings = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !SKIP.has(k)));

test.describe('quarter-car-double-spring', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['displacement-plot', 'sprung-mass', 'unsprung-mass']) await expect(page.getByTestId(id).first(), id).toBeAttached();
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    const s = await state(page);
    for (const [k, v] of Object.entries({ run: 0, m1: 400, m2: 30, k1: 20000, k2: 80000, c1: 2000, c2: 0, type: 1, h: 0.15, wid: 1, ω: 1 })) expect(s[k], k).toEqual(v);
  });

  test('a control changes the picture', async ({ page }) => {
    await openDemo(page, URL);
    const before = JSON.stringify(await view(page));
    await page.getByTestId('slider-m1').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page))['m1']).toBeCloseTo(401, 9);
    await expect.poll(async () => JSON.stringify(await view(page))).not.toBe(before);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), settings(fx.snapshots[k]));
      const v = await view(page);
      expect(v.unsprung.ω).toBeCloseTo(51.64, 2);
      await reviewShot(page, testInfo, `quarter-car-double-spring-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ run: 3, type: 2 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });

  test('the Trigger and the time slider move the same variable', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-run').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).run).toBeCloseTo(0.05, 9);
    await page.getByTestId('trigger-reset-run').click();
    await expect.poll(async () => (await state(page)).run).toBe(0);
    expect(Number(await page.getByTestId('value-run').inputValue())).toBe(0);
  });

  test('the input type', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('radio-type-2').check();
    expect((await state(page)).type).toBe(2);
  });
});
