// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Carsten Roppel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/harmonic-distortion.spec.js — browser tests of the "Harmonic Distortion of Nonlinear Transfer Function" page (attribution, start-up notice, UI inventory and
// bundle are in site.spec.js and bundle.spec.js; the errata switch, where there is one, in errata-mode.spec.js). Review
// screenshots at the snapshot settings (compare: docs/original-snapshots/harmonic-distortion-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/harmonic-distortion/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const plain = (v) => JSON.parse(JSON.stringify(v), (k, x) => (x && typeof x === 'object' && !Array.isArray(x) && typeof x.wl === 'string' && 'n' in x ? x.n : x));
const fx = plain(JSON.parse(fs.readFileSync('tests/golden/harmonic-distortion.original-states.json', 'utf8')));
const SKIP = new Set([]);
const settings = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !SKIP.has(k)));

test.describe('harmonic-distortion', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['signal-plot', 'spectrum-plot']) await expect(page.getByTestId(id).first(), id).toBeAttached();
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    const s = await state(page);
    for (const [k, v] of Object.entries({ c1: 0, c2: 0, clipping: false, level: 0.8, scale: 1 })) expect(s[k], k).toEqual(v);
  });

  test('a control changes the picture', async ({ page }) => {
    await openDemo(page, URL);
    const before = JSON.stringify(await view(page));
    await page.getByTestId('slider-c1').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page))['c1']).toBeCloseTo(0.01, 9);
    await expect.poll(async () => JSON.stringify(await view(page))).not.toBe(before);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), settings(fx.snapshots[k]));
      const v = await view(page);
      expect(v.harmonics[0]).toBeGreaterThan(0.8);
      await reviewShot(page, testInfo, `harmonic-distortion-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ c1: 0.3, clipping: true, scale: 2 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });

  test('the level slider is shown only while clipping is on', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('ctl-level')).toBeHidden();
    await page.getByTestId('check-clipping').check();
    await expect(page.getByTestId('ctl-level')).toBeVisible();
    expect((await view(page)).peak).toBeCloseTo(0.8, 12);
  });

  test('decibel scale', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-scale-2').click();
    expect((await state(page)).scale).toBe(2);
    await expect(page.getByTestId('spectrum-plot')).toBeAttached();
  });
});
