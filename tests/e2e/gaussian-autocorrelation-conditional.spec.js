// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Victor S. Frost
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/gaussian-autocorrelation-conditional.spec.js — browser tests of the "Linking Autocorrelation of Gaussian
// Random Process to Conditional Probabilities" page (attribution, start-up notice, UI inventory and bundle are in
// site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo } from './helpers.js';

const URL = '/demos/gaussian-autocorrelation-conditional/';
const golden = JSON.parse(fs.readFileSync('tests/golden/gaussian-autocorrelation-conditional.original-states.json', 'utf8'));
const state = (page) => page.evaluate(() => window.__demo.getState());
const text = (page, id) => page.getByTestId(id).textContent();

test.describe('gaussian-autocorrelation-conditional', () => {
  test('loads without errors and draws the four plots, the legend and the three lines', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['rplot-svg', 'psd-svg', 'pplot-svg', 'legend-svg', 'pdf-svg', 'pdf-text-svg']) await expect(page.getByTestId(id)).toBeVisible();
    for (const id of ['legend-1', 'legend-2', 'threshold-line', 'text-mean', 'text-variance', 'text-probability']) await expect(page.getByTestId(id)).toHaveCount(1);
    expect(await text(page, 'text-probability')).toBe('conditional probability = 0.4408');
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-t')).toHaveValue('0.05');
    await expect(page.getByTestId('value-y')).toHaveValue('1');
    await expect(page.getByTestId('value-L')).toHaveValue('1');
    await expect(page.getByTestId('setter-fun-f1')).toHaveAttribute('aria-pressed', 'true');
  });

  test('the autocorrelation setter changes the plots and the numbers', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-fun-f2').click();
    await expect.poll(() => text(page, 'text-variance')).toBe('conditional variance = 0.975');
    await page.getByTestId('setter-fun-f3').click();
    await expect.poll(() => text(page, 'text-mean')).toBe('conditional expected value = 0.6065');
  });

  test('the threshold and lag sliders move the probability', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('value-L').fill('1.8');
    await page.getByTestId('value-L').press('Enter');
    await page.getByTestId('value-t').fill('0.0411');
    await page.getByTestId('value-t').press('Enter');
    await expect.poll(() => text(page, 'text-probability')).toBe('conditional probability = 0.3086');
    await page.getByTestId('slider-y').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).y).toBeCloseTo(1.1, 9);
  });

  test('the snapshot settings show the snapshots numbers', async ({ page }) => {
    await openDemo(page, URL);
    const want = { 2: '0.3086', 3: '0.4798', 4: '0.4378' };
    for (const [k, p] of Object.entries(want)) {
      const s = golden.snapshots[k];
      await page.evaluate((st) => window.__demo.setState(st), { ...s, fun: s.fun.sym });
      await expect.poll(() => text(page, 'text-probability')).toBe(`conditional probability = ${p}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ fun: 'f3', t: 0.5, y: -2, L: 3 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
