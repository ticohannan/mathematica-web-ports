// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/visibility-region.spec.js — browser tests of the "Visibility Region of a Polygon" page (attribution, start-up notice, UI inventory and
// bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/visibility-region/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const close = (a, b, tol = 1e-9) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol;
const DRAWN = ['polygon', 'workspace', 'visibility-region', 'partial-region', 'reference-point', 'angle-arc', 'sweep-ray', 'active-edge', 'j-list', 'visible-points'];

test.describe('visibility-region', () => {
  test('loads without errors and draws the saved state: polygon, region, step 3, thirteen invisible locators', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of DRAWN) await expect(page.getByTestId(id)).toHaveCount(1);
    await expect(page.locator('[data-testid^="locator-pts-"]')).toHaveCount(13);
    await expect(page.locator('[data-testid^="locator-pts-"] .locator-invisible')).toHaveCount(13); // Appearance -> None
    await expect(page.getByTestId('scene-svg')).toBeVisible();
    // the region of snapshot 1: 21 vertices, red points on them; step 3 shows the orange triangle p, fv, (5.25, 3)
    const v = await view(page);
    expect(v.visibleList).toHaveLength(21);
    await expect(page.getByTestId('visible-points').locator('circle')).toHaveCount(21);
    expect(v.partial).toHaveLength(4);
    expect(close(v.partial[2], [5.25, 3])).toBe(true);
    await expect(page.getByTestId('j-list').locator('polyline')).toHaveCount(2);
  });

  test('has the control of the original with its saved value: "vertices sorted by angle" 3 in 1 … 42', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.locator('#controls')).toContainText('vertices sorted by angle');
    await expect(page.getByTestId('value-s')).toHaveValue('3');
    const s = await state(page);
    expect(s.m).toBe(40);
    expect(s.pts).toHaveLength(13);
    expect(s.pts[12]).toEqual([-1.83, 0.47]);
    // the range 1 … m + 2 (m = 40, written by the body)
    await page.getByTestId('slider-s').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).s).toBe(42);
    await page.keyboard.press('Home');
    await expect.poll(async () => (await state(page)).s).toBe(1);
    await expect(page.getByTestId('value-s')).toHaveValue('1');
  });

  test('a slider step by keyboard moves the sweep to the next vertex, its active edge and J list', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-s').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).s).toBe(4);
    await expect(page.getByTestId('value-s')).toHaveValue('4');
    const v = await view(page);
    expect(v.vertex).toEqual([2.25, 3]); // the third vertex by angle
    expect(v.activeEdge).toEqual([[2.25, 3], [2.25, 3.75]]);
    expect(v.jList).toHaveLength(4);
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).s).toBe(42);
    expect((await view(page)).partial).toHaveLength(21); // the whole region
    // Line@{{}, {}}: nothing (an empty group since v0.1.26; before, an empty polyline)
    expect(await page.getByTestId('active-edge').evaluate((n) => n.tagName === 'g' && n.childElementCount === 0)).toBe(true);
  });

  test('dragging the blue point with the mouse moves the reference point and recomputes the region', async ({ page }) => {
    await openDemo(page, URL);
    const s0 = await state(page), v0 = await view(page);
    const at = await page.evaluate((p) => window.__demo.worldToClient(p), s0.pts[12]);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 20, at.y - 15, { steps: 5 });
    await page.mouse.up();
    const s1 = await state(page), v1 = await view(page);
    expect(s1.pts[12][0]).toBeGreaterThan(s0.pts[12][0] + 0.2);
    expect(s1.pts[12][1]).toBeGreaterThan(s0.pts[12][1] + 0.2);
    expect(s1.pts.slice(0, 12)).toEqual(s0.pts.slice(0, 12)); // the other twelve stay
    expect(v1.p).toEqual(s1.pts[12]);
    expect(v1.visibleList).not.toEqual(v0.visibleList);
    const dot = page.getByTestId('reference-point');
    const box = await dot.boundingBox();
    expect(Math.abs(box.x + box.width / 2 - (at.x + 20))).toBeLessThan(3);
    // a locator moves by keyboard too: one arrow step is 0.05
    await page.getByTestId('locator-pts-13').focus();
    await page.keyboard.press('ArrowLeft');
    expect((await state(page)).pts[12][0]).toBeCloseTo(s1.pts[12][0] - 0.05, 12);
  });

  test('a click away from the blue point moves the nearest invisible locator instead (Q-VR-01)', async ({ page }) => {
    await openDemo(page, URL);
    const s0 = await state(page), v0 = await view(page);
    const at = await page.evaluate(() => window.__demo.worldToClient([1.5, 0.2])); // nearest: pts[[7]] = (1.25, 0)
    await page.mouse.click(at.x, at.y);
    const s1 = await state(page);
    expect(s1.pts[6][0]).toBeCloseTo(1.5, 1);
    expect(s1.pts[6][1]).toBeCloseTo(0.2, 1);
    expect(s1.pts[12]).toEqual(s0.pts[12]);
    expect((await view(page)).visibleList).toEqual(v0.visibleList); // nothing changes in the picture
  });

  test('Initial settings restores the saved state (step 3, the saved points)', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ s: 17, pts: [[0.5, 5], [-4.3, 2.65], [-5, -0.169], [-5, -3], [3.5, -5], [0, -2.5], [1.25, 0], [4.25, 0], [0.5, 1.15], [-1.15, 0.75], [1.22, -4.19], [-1.5, 1.5], [3, -1]] }));
    expect((await view(page)).step).toBe(17);
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.getByTestId('value-s')).toHaveValue('3');
  });

  test('review screenshots at the five snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/visibility-region.original-states.json', 'utf8'));
    // what each snapshot picture shows: the step's vertex (end of the blue ray) and the number of red points
    const expected = {
      1: { vertex: [5.25, 3.75], points: 21 }, 2: { vertex: [5.25, 3.75], points: 23 }, 3: { vertex: [-1.5, 3.75], points: 23 },
      4: { vertex: [3, -1.5], points: 23 }, 5: { vertex: [5.25, 0.65], points: 23 },
    };
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      await expect(page.getByTestId('value-s')).toHaveValue(String(fx.snapshots[k].s));
      const v = await view(page);
      expect(close(v.vertex, expected[k].vertex, 1e-12)).toBe(true);
      await expect(page.getByTestId('visible-points').locator('circle')).toHaveCount(expected[k].points);
      await expect(page.getByTestId('angle-arc')).toHaveCount(1); // snapshot 5: the full circle of the last step
      await reviewShot(page, testInfo, `visibility-region-snapshot-${k}`);
    }
  });
});
