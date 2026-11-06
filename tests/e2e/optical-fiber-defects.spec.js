// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Hoang Nguyen
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/optical-fiber-defects.spec.js — browser tests of the "Defects in an Optical Fiber" page (attribution,
// start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). Review screenshots at the four
// snapshot settings (compare: docs/original-snapshots/optical-fiber-defects-1…4.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/optical-fiber-defects/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());

test.describe('optical-fiber-defects', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['fiber', 'defect', 'light-1', 'light-2']) await expect(page.getByTestId(id), id).toHaveCount(1);
    expect(await page.getByTestId('normal').count()).toBeGreaterThan(4);
    await expect(page.locator('[data-testid^="locator-p-"]')).toHaveCount(2);
  });

  test('has its controls with their defaults (sliders without value fields)', async ({ page }) => {
    await openDemo(page, URL);
    const s = await state(page);
    expect(s.h).toBeCloseTo(0.405, 15);
    expect(s.w).toBeCloseTo(0.78, 15);
    expect(s.θ1).toBeCloseTo(-Math.PI / 16, 15);
    expect(s.θ2).toBeCloseTo(-Math.PI / 16, 15);
    expect(s.p).toEqual([[-1.8, 0.5], [-3.8, 0.5]]);
    for (const n of ['h', 'w', 'θ1', 'θ2']) {
      await expect(page.getByTestId(`slider-${n}`)).toHaveCount(1);
      await expect(page.getByTestId(`value-${n}`)).toHaveCount(0);
    }
  });

  test('dragging a source moves its ray; a source outside the fiber starts in N = 1', async ({ page }) => {
    await openDemo(page, URL);
    expect((await view(page)).indices).toEqual([[1.5, 1], [1.5, 1]]);
    await page.evaluate(() => window.__demo.moveLocator('p-1', [-2, 2]));
    const v = await view(page);
    expect(v.rays[0][0].from).toEqual([-2, 2]);
    expect(v.indices[0]).toEqual([1, 1.5]);
    const p = await page.evaluate(() => window.__demo.worldToClient([-3.8, 0.5]));
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 20, p.y, { steps: 4 });
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).p[1][0]).toBeGreaterThan(-3.8);
  });

  test('the four snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/optical-fiber-defects.original-states.json', 'utf8'));
    expect(Object.keys(fx.snapshots)).toHaveLength(4);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      const v = await view(page);
      expect(v.rays).toHaveLength(2);
      await reviewShot(page, testInfo, `optical-fiber-defects-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ h: 0.9, θ2: 1, p: [[0, 3], [1, 0.5]] }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
