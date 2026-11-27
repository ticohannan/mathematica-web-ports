// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Michel de Spot
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/solar-yield-mounting-systems.spec.js — browser tests of the "Solar Energy Yield for Three Mounting Systems"
// page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import { openDemo } from './helpers.js';

const URL = '/demos/solar-yield-mounting-systems/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());

test.describe('solar-yield-mounting-systems', () => {
  test('loads without errors and draws the plot, the legend and the bar chart', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['plot-svg', 'legend-svg', 'bars-svg']) await expect(page.getByTestId(id)).toBeVisible();
    for (const id of ['fill-fixed', 'fill-full', 'bar-1', 'bar-5', 'legend-1', 'legend-5']) await expect(page.getByTestId(id)).toHaveCount(1);
    await expect(page.getByTestId('bars-label')).toHaveText('Energy Yield kW/h/da');
  });

  test('the headings show the latitude, the panel angle and the date', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('heading-h-lat')).toHaveText('latitude 49.7 °');
    await expect(page.getByTestId('heading-h-sl')).toHaveText('panel angle 58 °');
    await expect(page.getByTestId('heading-h-dp')).toHaveText('June 21');
    await expect(page.getByTestId('setter-season-171')).toHaveAttribute('aria-pressed', 'true');
  });

  test('the optimized setters set the panel angle from the latitude', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-optimize-summer').click();
    await expect.poll(async () => (await state(page)).sl).toBeCloseTo(26.3, 9);
    await expect(page.getByTestId('setter-optimize-summer')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('heading-h-sl')).toHaveText('panel angle 26.3 °');
    await page.getByTestId('setter-optimize-winter').click();
    await expect.poll(async () => (await state(page)).sl).toBeCloseTo(73.1, 9);
    await page.getByTestId('setter-equinox-equinox').click();
    await expect.poll(async () => (await state(page)).sl).toBeCloseTo(49.7, 9);
  });

  test('the season setters and the day slider change the date and the yields', async ({ page }) => {
    await openDemo(page, URL);
    const summer = (await view(page)).yields[0];
    await page.getByTestId('setter-season-354').click();
    await expect(page.getByTestId('heading-h-dp')).toHaveText('December 21');
    expect((await view(page)).yields[0]).toBeLessThan(summer / 2);
    await page.getByTestId('slider-dp').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).dp).toBe(353);
    await expect(page.getByTestId('heading-h-dp')).toHaveText('December 20');
  });

  test('the latitude slider moves sunrise and sunset', async ({ page }) => {
    await openDemo(page, URL);
    const before = await view(page);
    await page.getByTestId('slider-lat').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).lat).toBe(65);
    const after = await view(page);
    expect(after.sunset - after.sunrise).toBeGreaterThan(before.sunset - before.sunrise);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ lat: 30, sl: 10, dp: 50 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    expect(opening).toMatchObject({ lat: 49.7, sl: 58, dp: 171, season: 171 });
  });
});
