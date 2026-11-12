// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Hugo Tadashi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/zero-pole-cancellation.spec.js — browser tests of the "Zero-Pole Cancellation in Transfer Functions" page (attribution, start-up notice, UI inventory and
// bundle are in site.spec.js and bundle.spec.js; the errata switch, where there is one, in errata-mode.spec.js). Review
// screenshots at the snapshot settings (compare: docs/original-snapshots/zero-pole-cancellation-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/zero-pole-cancellation/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const plain = (v) => JSON.parse(JSON.stringify(v), (k, x) => (x && typeof x === 'object' && !Array.isArray(x) && typeof x.wl === 'string' && 'n' in x ? x.n : x));
const fx = plain(JSON.parse(fs.readFileSync('tests/golden/zero-pole-cancellation.original-states.json', 'utf8')));
const SKIP = new Set([]);
const settings = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !SKIP.has(k)));

test.describe('zero-pole-cancellation', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['root-locus', 'pole-zero-markers']) await expect(page.getByTestId(id).first(), id).toBeAttached();
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    const s = await state(page);
    for (const [k, v] of Object.entries({ gain: 0, tf: 1 })) expect(s[k], k).toEqual(v);
  });

  test('a control changes the picture', async ({ page }) => {
    await openDemo(page, URL);
    const before = JSON.stringify(await view(page));
    await page.getByTestId('slider-gain').focus();
    await page.keyboard.press('ArrowRight');
    // gain is a continuous slider (no step, so the range input has step "any"): the arrow key's step is the browser's
    // own — 1/100 of the range in Chromium and WebKit (0.01), the whole range in Firefox (1)
    await expect.poll(async () => (await state(page))['gain']).toBeGreaterThan(0);
    const g = (await state(page))['gain'];
    expect([0.01, 1].some((x) => Math.abs(g - x) < 1e-9), `gain after one ArrowRight: ${g}`).toBe(true);
    await expect.poll(async () => JSON.stringify(await view(page))).not.toBe(before);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), settings(fx.snapshots[k]));
      const v = await view(page);
      expect(v.poles).toHaveLength(v.tf === 2 ? 2 : 3);
      await reviewShot(page, testInfo, `zero-pole-cancellation-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ gain: 0.5, tf: 3 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });

  test('the three transfer functions', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-tf-3').click();
    expect((await view(page)).zeros).toEqual([[0.3, 0]]);
    await page.getByTestId('setter-tf-2').click();
    expect((await view(page)).poles).toHaveLength(2);
  });
});
