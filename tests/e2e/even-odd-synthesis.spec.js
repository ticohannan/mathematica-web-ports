// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/even-odd-synthesis.spec.js — browser tests of the "Synthesis with Even and Odd Functions" page (attribution,
// start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). Review screenshots at the four
// snapshot settings (compare: docs/original-snapshots/even-odd-synthesis-1…4.png; the lower plot is larger, D-EO-01).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/even-odd-synthesis/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());

test.describe('even-odd-synthesis', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['input-plot', 'parts-plot', 'shift-point', 'legend-2', 'legend-3']) await expect(page.getByTestId(id), id).toHaveCount(1);
    await expect(page.getByTestId('graphic').locator('svg')).toBeVisible();
    await expect(page.getByTestId('graphic2').locator('svg')).toBeVisible();
    // the two plots are equally wide (D-EO-01)
    const [a, b] = await Promise.all(['graphic', 'graphic2'].map((id) => page.getByTestId(id).locator('svg').boundingBox()));
    expect(Math.abs(a.width - b.width)).toBeLessThan(2);
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toEqual({ signal: 'StairStep', τ: 0 });
    await expect(page.getByTestId('setter-signal-StairStep')).toHaveAttribute('aria-pressed', 'true');
    for (const s of ['Step', 'RampUp', 'Cos', 'Sin', 'TopHat', 'Triangle']) await expect(page.getByTestId(`setter-signal-${s}`)).toHaveCount(1);
    await expect(page.getByTestId('value-τ')).toHaveValue('0');
  });

  test('the T slider shifts the signal', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-τ').focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).τ).toBeCloseTo(0.5, 12);
    expect((await view(page)).jumps).toEqual([0.5, 1.5, 2.5, 3.5, 4.5]);
    expect((await view(page)).x0).toBe(0); // x(0 − 0.5) = 0
    await page.getByTestId('setter-signal-Sin').click();
    await expect.poll(async () => (await view(page)).jumps).toEqual([]);
  });

  test('the four snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/even-odd-synthesis.original-states.json', 'utf8'));
    expect(Object.keys(fx.snapshots)).toHaveLength(4);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      expect(await state(page)).toEqual(fx.snapshots[k]);
      await expect(page.getByTestId(`setter-signal-${fx.snapshots[k].signal}`)).toHaveAttribute('aria-pressed', 'true');
      await reviewShot(page, testInfo, `even-odd-synthesis-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ signal: 'Cos', τ: -4.2 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
