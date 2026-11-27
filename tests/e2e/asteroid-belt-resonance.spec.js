// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by S. M. Blinder
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/asteroid-belt-resonance.spec.js — browser tests of the "Orbital Resonance in the Asteroid Belt" page
// (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.js';

const URL = '/demos/asteroid-belt-resonance/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());

test.describe('asteroid-belt-resonance', () => {
  test('loads without errors and draws the planets, the belt and the legend', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['sky', 'orbits', 'sun', 'jupiter', 'mars', 'earth', 'venus', 'mercury', 'belt', 'trojans', 'hildas', 'gaps', 'legend']) {
      await expect(page.getByTestId(id)).toHaveCount(1);
    }
    await expect(page.getByTestId('gap-shown')).toHaveCount(0);
    expect(await page.getByTestId('legend').textContent()).toContain('Jupiter');
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-theta')).toHaveValue('0');
    await expect(page.getByTestId('value-t')).toHaveValue('0');
    await expect(page.getByTestId('setter-k-0')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('check-T')).not.toBeChecked();
    await expect(page.getByTestId('check-H')).not.toBeChecked();
  });

  test('the Kirkwood gap setter draws the chosen gap in yellow', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-k-4').click();
    await expect.poll(async () => (await state(page)).k).toBe(4);
    await expect(page.getByTestId('gap-shown')).toHaveCount(1);
    expect((await view(page)).shownGap.label).toBe('2:1');
    await page.getByTestId('setter-k-0').click();
    await expect(page.getByTestId('gap-shown')).toHaveCount(0);
  });

  test('the checkboxes colour the Trojans green and the Hildas red', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('check-T').click();
    await expect.poll(async () => (await view(page)).trojanColor).toEqual([0, 1, 0]);
    await page.getByTestId('check-H').click();
    await expect.poll(async () => (await view(page)).hildaColor).toEqual([1, 0, 0]);
  });

  test('the time and orbit sliders move the gaps and the planets', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('value-t').fill('200');
    await page.getByTestId('value-t').press('Enter');
    await expect.poll(async () => (await view(page)).gapThickness).toBeCloseTo(0.005, 6);
    await page.getByTestId('value-theta').fill('3.14159');
    await page.getByTestId('value-theta').press('Enter');
    await expect.poll(async () => (await view(page)).planets.earth[0]).toBeCloseTo(-1, 4);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ 'θ': 20, t: 100, k: 2, T: 1, H: 1 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
