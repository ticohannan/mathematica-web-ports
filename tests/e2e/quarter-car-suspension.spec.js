// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Erik Mahieu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/quarter-car-suspension.spec.js — browser tests of the "Simulating Vehicle Suspension with a Simplified Quarter-Car Model" page (attribution, start-up notice, UI inventory and
// bundle are in site.spec.js and bundle.spec.js; the errata switch, where there is one, in errata-mode.spec.js). Review
// screenshots at the snapshot settings (compare: docs/original-snapshots/quarter-car-suspension-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/quarter-car-suspension/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const plain = (v) => JSON.parse(JSON.stringify(v), (k, x) => (x && typeof x === 'object' && !Array.isArray(x) && typeof x.wl === 'string' && 'n' in x ? x.n : x));
const fx = plain(JSON.parse(fs.readFileSync('tests/golden/quarter-car-suspension.original-states.json', 'utf8')));
const SKIP = new Set([]);
const settings = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !SKIP.has(k)));

test.describe('quarter-car-suspension', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['signals-plot', 'mass', 'spring']) await expect(page.getByTestId(id).first(), id).toBeAttached();
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    const s = await state(page);
    for (const [k, v] of Object.entries({ time: 0, c: 0.85, k: 0.165, m: 1, h: 0.1, fb: 1 })) expect(s[k], k).toEqual(v);
  });

  test('a control changes the picture', async ({ page }) => {
    await openDemo(page, URL);
    const before = JSON.stringify(await view(page));
    await page.getByTestId('slider-c').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page))['c']).toBeCloseTo(0.851, 9);
    await expect.poll(async () => JSON.stringify(await view(page))).not.toBe(before);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), settings(fx.snapshots[k]));
      const v = await view(page);
      expect(Number.isFinite(v.top)).toBe(true);
      await reviewShot(page, testInfo, `quarter-car-suspension-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ time: 7.75, c: 1 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });

  test('the Trigger plays and resets', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setClock(0));
    await page.getByTestId('trigger-play-time').click();
    // v0.1.38a: let the animation's first frame run before the clock moves (it records the start time; without this
    // wait a slow first frame starts at 1.1 and, with the clock fixed, no time ever passes), as dh-parameters and euler
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate(() => window.__demo.setClock(1.1));
    await expect.poll(async () => (await state(page)).time, { timeout: 5000 }).toBeGreaterThan(0.9);
    expect((await state(page)).time % 0.25).toBeCloseTo(0, 9);
    await page.getByTestId('trigger-reset-time').click();
    await expect.poll(async () => (await state(page)).time).toBe(0);
    await expect(page.getByTestId('elapsed-time')).toContainText('elapsed time in sec = 0');
    await page.evaluate(() => window.__demo.setClock(null));
  });
});
