// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Stan Wagon and Karen Saxe
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/paths-inside-a-polygon.spec.js — browser tests of the "Paths inside a Polygon" page (attribution, start-up
// notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). Review screenshots at the four snapshot
// settings (compare: docs/original-snapshots/paths-inside-a-polygon-1…4.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/paths-inside-a-polygon/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());

test.describe('paths-inside-a-polygon', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['polygon', 'graph-edges', 'endpoints', 'path']) await expect(page.getByTestId(id), id).toHaveCount(1);
    await expect(page.locator('[data-testid^="locator-pt-"]')).toHaveCount(2);
    expect((await view(page)).path).toHaveLength(7);
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toEqual({ i: 1, pt: [[500, 100], [500, 910]] });
    await expect(page.getByTestId('setter-i-1')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-i-1')).toHaveText('random');
    await expect(page.getByTestId('setter-i-2')).toHaveText('orthogonal');
  });

  test('dragging a point moves the path (positions rounded; outside → nearest vertex)', async ({ page }) => {
    await openDemo(page, URL);
    const before = (await view(page)).pathLength;
    await page.evaluate(() => window.__demo.moveLocator('pt-1', [600.4, 140.6]));
    await expect.poll(async () => (await state(page)).pt[0]).toEqual([600, 141]);
    expect((await view(page)).pathLength).not.toBeCloseTo(before, 3);
    // a mouse drag of the finish point
    const p = await page.evaluate(() => window.__demo.worldToClient([500, 910]));
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x - 15, p.y + 5, { steps: 4 });
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).pt[1][0]).toBeLessThan(500);
    expect(Number.isInteger((await state(page)).pt[1][0])).toBe(true);
    // outside the polygon: the nearest vertex
    await page.evaluate(() => window.__demo.moveLocator('pt-1', [990, 990]));
    await expect.poll(async () => (await state(page)).pt[0]).toEqual([963, 889]);
  });

  test('switching the polygon moves the default points', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-i-2').click();
    await expect.poll(async () => (await state(page)).pt).toEqual([[300, 1150], [1150, 450]]);
    expect((await view(page)).reflex).toBe(24);
    await page.getByTestId('setter-i-1').click();
    await expect.poll(async () => (await state(page)).pt).toEqual([[500, 100], [500, 910]]);
  });

  test('the four snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/paths-inside-a-polygon.original-states.json', 'utf8'));
    expect(Object.keys(fx.snapshots)).toHaveLength(4);
    for (const k of Object.keys(fx.snapshots)) {
      const s = fx.snapshots[k];
      // snapshot 1 saved the unevaluated {A[i], B[i]}: the opening points
      const st = Array.isArray(s.pt[0]) ? s : { i: 1, pt: [[500, 100], [500, 910]] };
      await page.evaluate((x) => window.__demo.setState(x), st);
      expect(await state(page)).toEqual(st);
      await expect(page.getByTestId(`setter-i-${st.i}`)).toHaveAttribute('aria-pressed', 'true');
      await reviewShot(page, testInfo, `paths-inside-a-polygon-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ i: 2, pt: [[928, 184], [529, 293]] }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual({ i: 1, pt: [[500, 100], [500, 910]] });
  });
});
