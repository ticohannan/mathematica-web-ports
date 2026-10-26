// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/sensor-fusion.spec.js — browser tests of the "Sensor Fusion with Normally Distributed Noise" page (attribution, start-up notice, UI inventory and
// bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/sensor-fusion/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const svg = (page) => page.getByTestId('scene-svg');

test.describe('sensor-fusion', () => {
  test('loads without errors and draws the densities, the peak stems, the frame and the legend', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['curves', 'peaks', 'legend', 'frame']) await expect(svg(page).getByTestId(id)).toHaveCount(1);
    await expect(svg(page)).toBeVisible();
    await expect(svg(page).getByTestId('legend')).toContainText('measurement 2');
    await expect(svg(page).getByTestId('legend')).toContainText('combined');
    await expect(svg(page).getByTestId('frame-label-bottom')).toContainText('Drag locators to change measurements');
    await expect(svg(page).getByTestId('frame-label-left')).toContainText('probability');
    for (const k of [1, 2, 3, 4]) await expect(page.getByTestId(`locator-z${k}`)).toHaveCount(1);
  });
  test('has the controls of the original with their defaults: 2 measurements, variances 5, 10, 10, 10', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.locator('#controls')).toContainText('number of measurements');
    await expect(page.locator('#controls')).toContainText('measurement variances');
    for (const [k, v] of [[1, '5'], [2, '10'], [3, '10'], [4, '10']]) await expect(page.getByTestId(`value-σSq${k}`)).toHaveValue(v);
    await expect(page.getByTestId('slider-σSq2')).toBeEnabled();
    await expect(page.getByTestId('slider-σSq3')).toBeDisabled();
    await expect(page.getByTestId('slider-σSq4')).toBeDisabled();
    const s = await state(page);
    expect([s.u, s.z1, s.z2, s.z3, s.z4]).toEqual([2, [2, 0], [4, 0], [6, 0], [8, 0]]);
  });
  test('the setter "number of measurements" adds curves, legend rows and enables the variance sliders', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-u-4').click();
    await expect.poll(async () => (await state(page)).u).toBe(4);
    await expect(page.getByTestId('slider-σSq4')).toBeEnabled();
    await expect(svg(page).getByTestId('legend')).toContainText('measurement 4');
    expect((await view(page)).gains.length).toBe(3);
    await page.getByTestId('setter-u-1').click();
    await expect(page.getByTestId('slider-σSq2')).toBeDisabled();
    const v = await view(page);
    expect(v.zEst).toBe(2); expect(v.σEst).toBe(5);
  });
  test('a variance slider step by keyboard changes the estimate', async ({ page }) => {
    await openDemo(page, URL);
    const before = (await view(page)).zEst;
    await page.getByTestId('slider-σSq1').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).σSq1).toBeGreaterThan(5);
    expect((await view(page)).zEst).toBeGreaterThan(before); // measurement 1 weighs less: the estimate moves towards z2 = 4
  });
  test('dragging a measurement locator with the mouse moves it along the x axis only', async ({ page }) => {
    await openDemo(page, URL);
    const at = await page.evaluate(() => window.__demo.worldToClient([4, 0]));
    await page.mouse.move(at.x, at.y); await page.mouse.down();
    await page.mouse.move(at.x - 40, at.y - 30, { steps: 4 }); await page.mouse.up();
    const z2 = (await state(page)).z2;
    expect(z2[0]).toBeLessThan(3.5); expect(z2[1]).toBe(0);
    const v = await view(page);
    expect(v.zEst).toBeCloseTo((2 * 10 + z2[0] * 5) / 15, 12);
  });
  test('a measurement dragged to the right end stays where it was dropped (the x range stays −10…10)', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ u: 1 }));
    const at = await page.evaluate(() => window.__demo.worldToClient([2, 0]));
    const to = await page.evaluate(() => window.__demo.worldToClient([9.5, 0]));
    await page.mouse.move(at.x, at.y); await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 }); await page.mouse.up();
    const z1 = (await page.evaluate(() => window.__demo.getState())).z1;
    expect(z1[0]).toBeGreaterThan(9.2); expect(z1[0]).toBeLessThan(9.8);
    const g = await page.evaluate(() => window.__demo.graphics(0));
    expect(JSON.stringify(g.options.PlotRange[0])).toBe('[-10,10]');
  });
  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ u: 4, σSq1: 1, σSq3: 3, z3: [-5, 0] }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
  test('review screenshots at the four snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/sensor-fusion.original-states.json', 'utf8'));
    for (const k of Object.keys(fx.snapshots)) {
      const { MyColors, ...s } = fx.snapshots[k]; // the colours are the opening ones (RGBColor expressions in the file)
      expect(MyColors.length).toBe(4);
      const after = await page.evaluate((st) => window.__demo.setState(st), s);
      expect(after.u).toBe(s.u);
      await expect(svg(page).getByTestId('legend').locator('text', { hasText: 'measurement' })).toHaveCount(s.u);
      await reviewShot(page, testInfo, `sensor-fusion-snapshot-${k}`);
    }
  });
});
