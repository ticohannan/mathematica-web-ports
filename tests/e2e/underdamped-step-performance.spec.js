// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Housam Binous, Mohammad Mozahar Hossain and Ahmed Bellagi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/underdamped-step-performance.spec.js — browser tests of the "Performance Characteristics for Step Response of an Underdamped Process" page (attribution, start-up notice, UI inventory and
// bundle are in site.spec.js and bundle.spec.js; the errata switch, where there is one, in errata-mode.spec.js). Review
// screenshots at the snapshot settings (compare: docs/original-snapshots/underdamped-step-performance-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/underdamped-step-performance/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const plain = (v) => JSON.parse(JSON.stringify(v), (k, x) => (x && typeof x === 'object' && !Array.isArray(x) && typeof x.wl === 'string' && 'n' in x ? x.n : x));
const fx = plain(JSON.parse(fs.readFileSync('tests/golden/underdamped-step-performance.original-states.json', 'utf8')));
const SKIP = new Set([]);
const settings = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !SKIP.has(k)));

test.describe('underdamped-step-performance', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['response-plot', 'frame']) await expect(page.getByTestId(id).first(), id).toBeAttached();
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    const s = await state(page);
    for (const [k, v] of Object.entries({ Kg: 5, τ: 1, ζ: 0.2, M: 5, ctrl: 1 })) expect(s[k], k).toEqual(v);
  });

  test('a control changes the picture', async ({ page }) => {
    await openDemo(page, URL);
    const before = JSON.stringify(await view(page));
    await page.getByTestId('slider-Kg').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page))['Kg']).toBeCloseTo(5.1, 9);
    await expect.poll(async () => JSON.stringify(await view(page))).not.toBe(before);
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), settings(fx.snapshots[k]));
      const v = await view(page);
      expect(v.tPeak2 - v.tPeak1).toBeCloseTo(v.P, 5);
      await reviewShot(page, testInfo, `underdamped-step-performance-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ Kg: 9.1, ctrl: 2 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });

  test('the performance table', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ Kg: 9.1, τ: 0.7, ζ: 0.2, M: 8 }));
    await page.getByTestId('setter-ctrl-2').click();
    await expect(page.getByTestId('performance-table')).toContainText('1.2661');
    await expect(page.getByTestId('performance-table')).toContainText('0.5266');
  });
});
