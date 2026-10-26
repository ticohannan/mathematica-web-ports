// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Yitong Lu and Daniel Biediger
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/graham-scan.spec.js — browser tests of the "Graham Scan to Find the Convex Hull of a Set of Points in 2D"
// page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/graham-scan/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());

test.describe('graham-scan', () => {
  test('loads without errors and draws the points, the first ray and the start point', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['points', 'start', 'rays', 'hull-last']) await expect(page.getByTestId(id)).toHaveCount(1);
    await expect(page.getByTestId('scene-svg')).toBeVisible();
    await expect(page.getByTestId('locator-Allpts-1')).toHaveCount(1);
    await expect(page.locator('[data-testid^="locator-Allpts-"]')).toHaveCount(20);
  });
  test('has the controls of the original with their defaults: step 1, n = 20', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-iMax')).toHaveValue('1');
    await expect(page.getByTestId('value-n')).toHaveValue('20');
    await expect(page.getByTestId('button-generate')).toBeVisible();
    expect((await state(page)).Allpts.length).toBe(20);
  });
  test('the step slider adds one sorted point per step; the last step closes the hull', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-iMax').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).iMax).toBe(2);
    await expect(page.getByTestId('rays').locator('polyline')).toHaveCount(2);
    await page.evaluate(() => window.__demo.setState({ iMax: 19 }));
    const v = await view(page);
    expect(v.hull.at(-1)).toEqual(v.hull[0]);
  });
  test('dragging a point with the mouse moves it and the scan follows', async ({ page }) => {
    await openDemo(page, URL);
    const p = (await state(page)).Allpts[5];
    const at = await page.evaluate((q) => window.__demo.worldToClient(q), p);
    await page.mouse.move(at.x, at.y); await page.mouse.down();
    await page.mouse.move(at.x + 30, at.y + 40, { steps: 4 }); await page.mouse.up();
    const q = (await state(page)).Allpts[5];
    expect(q[0]).toBeGreaterThan(p[0]); expect(q[1]).toBeLessThan(p[1]);
  });
  test('"generate n new points" makes n new locators and the step range follows (seeded)', async ({ page }) => {
    await openDemo(page, `${URL}?seed=5`);
    await page.evaluate(() => window.__demo.setState({ n: 7 }));
    await page.getByTestId('button-generate').click();
    await expect(page.locator('[data-testid^="locator-Allpts-"]')).toHaveCount(7);
    const s = await state(page);
    expect(s.Allpts.length).toBe(7);
    expect(s.Allpts.flat().every((x) => x >= -1 && x <= 1)).toBe(true);
    await page.evaluate(() => window.__demo.setState({ iMax: 6 }));
    expect((await view(page)).hull.length).toBeGreaterThanOrEqual(4);
    await page.getByTestId('slider-iMax').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).iMax).toBe(6);
    // the same seed gives the same points
    await page.evaluate(() => window.__demo.setRng({ seed: 5 }));
    await page.getByTestId('button-generate').click();
    expect((await state(page)).Allpts).toEqual(s.Allpts);
  });
  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ iMax: 9, n: 50 }));
    await page.getByTestId('button-generate').click();
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.locator('[data-testid^="locator-Allpts-"]')).toHaveCount(20);
  });
  test('review screenshots at the five snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/graham-scan.original-states.json', 'utf8'));
    for (const k of Object.keys(fx.snapshots)) {
      const s = fx.snapshots[k];
      const after = await page.evaluate((st) => window.__demo.setState(st), s);
      expect(after.Allpts.length).toBe(s.Allpts.length);
      await expect(page.locator('[data-testid^="locator-Allpts-"]')).toHaveCount(s.Allpts.length);
      await reviewShot(page, testInfo, `graham-scan-snapshot-${k}`);
    }
  });
});
