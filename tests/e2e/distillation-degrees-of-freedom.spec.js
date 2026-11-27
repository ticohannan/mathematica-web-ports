// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann, Janet deGrazia, John L. Falconer, Nathan S. Nelson and Nick Bongiardina
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/distillation-degrees-of-freedom.spec.js — browser tests of the "Degree-of-Freedom Analysis on a Distillation
// Process" page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.js';

const URL = '/demos/distillation-degrees-of-freedom/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const text = (page, id) => page.getByTestId(id).textContent();

test.describe('distillation-degrees-of-freedom', () => {
  test('loads without errors and draws the title, the flowsheet and the explanation', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['title-svg', 'flowsheet-svg', 'explanation-svg']) await expect(page.getByTestId(id)).toBeVisible();
    for (const id of ['equipment', 'unit-outline', 'streams', 'unit-streams', 'var-m1', 'var-1-y2A', 'unit-name', 'count-dof', 'status', 'relation']) {
      await expect(page.getByTestId(id)).toHaveCount(1);
    }
    expect(await text(page, 'unit-name')).toBe('condenser');
    expect(await text(page, 'relation')).toContain('/');
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    expect(await page.getByTestId('popup-select').evaluate((e) => e.selectedOptions[0].textContent)).toBe('condenser');
    await expect(page.getByTestId('setter-view-1')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('value-u1')).toHaveValue('5');
    await expect(page.getByTestId('slider-u2')).toBeHidden(); // the u2 slider belongs to the zB representation
    await expect(page.getByTestId('setter-cond-1')).toHaveAttribute('aria-pressed', 'true');
  });

  test('the representation setter shows the zB labels and the u2 slider', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-view-2').click();
    await expect.poll(async () => (await state(page)).view).toBe(2);
    await expect(page.getByTestId('slider-u2')).toBeVisible();
    await expect(page.getByTestId('slider-u1')).toBeHidden();
    await expect(page.getByTestId('var-y2B')).toHaveCount(1);
    await expect(page.getByTestId('var-1-y2A')).toHaveCount(0);
    expect((await view(page)).unknown).toHaveLength(10);
  });

  test('the balance popup changes the unit; the condenser setter only shows for the condenser', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('popup-select').selectOption({ label: 'reboiler' });
    await expect.poll(() => text(page, 'unit-name')).toBe('reboiler');
    await expect(page.getByTestId('setter-cond-1')).toBeHidden();
    await page.getByTestId('popup-select').selectOption({ label: 'condenser' });
    await page.getByTestId('setter-cond-2').click();
    await expect.poll(async () => (await view(page)).extra).toBeGreaterThanOrEqual(2);
    expect(await text(page, 'relation')).toContain('=');
  });

  test('new problem draws other known variables; the unknowns slider sets their number', async ({ page }) => {
    await openDemo(page, URL);
    const before = (await view(page)).known;
    await page.getByTestId('button-new-problem').click();
    await expect.poll(async () => (await state(page)).reset).toBe(2);
    expect((await view(page)).known).not.toEqual(before);
    await page.getByTestId('slider-u1').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await view(page)).unknown.filter((k) => !k.includes('1-'))).toHaveLength(13);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ select: 4, view: 2, reset: 7, u1: 2, u2: 15, cond: 2 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
