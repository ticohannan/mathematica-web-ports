// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Ed Pegg Jr, Jeff Bryant and Theodore W. Gray
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/voronoi-diagrams.spec.js — browser tests of the "Voronoi Diagrams" page (attribution, start-up notice, UI
// inventory and bundle are in site.spec.js and bundle.spec.js). Review screenshots at the five snapshot settings
// (compare: docs/original-snapshots/voronoi-diagrams-1…5.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/voronoi-diagrams/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/voronoi-diagrams.original-states.json', 'utf8'));

test.describe('voronoi-diagrams', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (let k = 1; k <= 10; k++) await expect(page.getByTestId(`cell-${k}`)).toHaveCount(1);
    await expect(page.locator('[data-testid^="locator-loc-"]')).toHaveCount(10);
    expect((await view(page)).area).toBeCloseTo(100, 9);
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toEqual({ loc: fx.states[0].loc, colors: 'BeachColors', mesh: false });
    await expect(page.getByTestId('popup-colors')).toHaveCount(1);
    expect(await page.getByTestId('popup-colors').locator('option').allTextContents()).toEqual(['BeachColors', 'DarkRainbow', 'LakeColors', 'PlumColors', 'SunsetColors']);
    await expect(page.getByTestId('check-mesh')).not.toBeChecked();
  });

  test('drag, add and delete a point (Alt-click)', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.moveLocator('loc-1', [5, 5]));
    expect((await state(page)).loc[0]).toEqual([5, 5]);
    // Alt-click on empty space adds a point at the end of the list
    const a = await page.evaluate(() => window.__demo.worldToClient([8.5, 8.5]));
    await page.keyboard.down('Alt');
    await page.mouse.click(a.x, a.y);
    await page.keyboard.up('Alt');
    await expect.poll(async () => (await state(page)).loc.length).toBe(11);
    expect((await state(page)).loc[10][0]).toBeCloseTo(8.5, 1);
    await expect(page.getByTestId('cell-11')).toHaveCount(1);
    // Alt-click on a point deletes it
    const b = await page.evaluate(() => window.__demo.worldToClient([5, 5]));
    await page.keyboard.down('Alt');
    await page.mouse.click(b.x, b.y);
    await page.keyboard.up('Alt');
    await expect.poll(async () => (await state(page)).loc.length).toBe(10);
    expect((await state(page)).loc.some(([x, y]) => x === 5 && y === 5)).toBe(false);
    // the locators stay inside the square {0, 0} … {10, 10}
    await page.evaluate(() => window.__demo.moveLocator('loc-2', [12, -3]));
    expect((await state(page)).loc[1]).toEqual([10, 0]);
  });

  test('show borders draws the cell edges', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('borders')).toHaveCount(0);
    await page.getByTestId('check-mesh').check();
    await expect.poll(async () => (await state(page)).mesh).toBe(true);
    await expect(page.getByTestId('borders')).toHaveCount(1);
  });

  test('the five snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    expect(Object.keys(fx.snapshots)).toHaveLength(5);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      expect(await state(page)).toEqual(fx.snapshots[k]);
      await expect(page.getByTestId('popup-colors')).toHaveValue(String(['BeachColors', 'DarkRainbow', 'LakeColors', 'PlumColors', 'SunsetColors'].indexOf(fx.snapshots[k].colors)));
      await expect(page.locator('[data-testid^="locator-loc-"]')).toHaveCount(fx.snapshots[k].loc.length);
      await reviewShot(page, testInfo, `voronoi-diagrams-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate((st) => window.__demo.setState(st), fx.snapshots['4']);
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual({ loc: fx.states[0].loc, colors: 'BeachColors', mesh: false });
  });
});
