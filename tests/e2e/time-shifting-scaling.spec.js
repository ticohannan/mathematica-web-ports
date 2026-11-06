// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mable Wan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/time-shifting-scaling.spec.js — browser tests of the "Time Shifting and Time Scaling in Signal Processing"
// page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). Review
// screenshots at the four snapshot settings (compare: docs/original-snapshots/time-shifting-scaling-1…4.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/time-shifting-scaling/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const OPENING = { signal: 'RampDown', β: 4, α: 2, τ: 2, bOld: 4, aOld: 2, TOld: 2, checked: [1, 2] };

test.describe('time-shifting-scaling', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['input-plot', 'output-plot']) await expect(page.getByTestId(id), id).toHaveCount(1);
    await expect(page.getByTestId('point-T')).toHaveCount(2);
    await expect(page.getByTestId('point-b')).toHaveCount(2);
    await expect(page.getByTestId('graphic2').locator('[data-testid^="legend-"]')).toHaveCount(4);
  });

  test('has its controls with their defaults (T shown as the machine real "2.")', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toEqual(OPENING);
    await expect(page.getByTestId('setter-signal-RampDown')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('value-β')).toHaveValue('4');
    await expect(page.getByTestId('value-α')).toHaveValue('2');
    await expect(page.getByTestId('value-τ')).toHaveValue('2.');
    for (const [i, on] of [[1, true], [2, true], [3, false], [4, false]]) await expect(page.getByTestId(`checkbar-checked-${i}`)).toBeChecked({ checked: on });
  });

  test('moving T moves b (b = T a), moving b moves T (T = b/a)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-τ').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).τ).toBeCloseTo(2.1, 12);
    expect((await state(page)).β).toBeCloseTo(4.2, 12);
    await expect(page.getByTestId('value-β')).toHaveValue('4.2');
    await page.getByTestId('slider-β').focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).β).toBeCloseTo(4, 9); // two steps of 0.1 down from 4.2
    expect((await state(page)).τ).toBeCloseTo(((await state(page)).β) / 2, 12);
    await page.getByTestId('slider-α').focus();
    await page.keyboard.press('End'); // a = 4: T = b/a
    await expect.poll(async () => (await state(page)).α).toBe(4);
    expect((await state(page)).τ).toBeCloseTo((await state(page)).β / 4, 12);
    expect((await view(page)).Ty[1]).toBeCloseTo((await state(page)).β / 4, 12); // y's break point t = 0 → b/a
  });

  test('the display checkboxes hide and show the curves', async ({ page }) => {
    await openDemo(page, URL);
    const curves = () => page.getByTestId('output-plot').locator('polyline').count();
    const before = await curves();
    await page.getByTestId('checkbar-checked-3').check();
    await expect.poll(async () => (await state(page)).checked).toEqual([1, 2, 3]);
    expect(await curves()).toBe(before + 1);
    await page.getByTestId('checkbar-checked-1').uncheck();
    await page.getByTestId('checkbar-checked-2').uncheck();
    await expect.poll(async () => (await state(page)).checked).toEqual([3]);
    expect(await curves()).toBe(before - 1);
    // the legend keeps all four entries (Q-TS-01)
    await expect(page.getByTestId('graphic2').locator('[data-testid^="legend-"]')).toHaveCount(4);
  });

  test('the four snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/time-shifting-scaling.original-states.json', 'utf8'));
    expect(Object.keys(fx.snapshots)).toHaveLength(4);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      expect(await state(page)).toEqual(fx.snapshots[k]); // the coupled variables are already at their fixed point
      await expect(page.getByTestId('value-τ')).toHaveValue('2.');
      await reviewShot(page, testInfo, `time-shifting-scaling-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ signal: 'UH', β: -3, checked: [4] }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(OPENING);
  });
});
