// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Francesco Bernardini and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/car-paths.spec.js — browser tests of the car-path page
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/car-paths/';
const toClient = (page, p) => page.evaluate((q) => window.__demo.worldToClient(q), p);
async function drag(page, fromWorld, toWorld, steps = 6) {
  const a = await toClient(page, fromWorld), b = await toClient(page, toWorld);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}
const getState = (page) => page.evaluate(() => window.__demo.getState());
const getView = (page) => page.evaluate(() => window.__demo.view());

test.describe('car paths', () => {
  test('loads without errors and draws the path, the three cars and the locator glyphs', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.locator('[data-testid^=path-piece-]')).toHaveCount(4); // R- L+ S+ R+
    await expect(page.locator('circle[data-testid^=construction-circle-]')).toHaveCount(3);
    for (const id of ['start-car', 'goal-car', 'moving-car', 'glyph-1', 'glyph-2', 'glyph-3', 'glyph-4']) await expect(page.getByTestId(id)).toHaveCount(1);
    // the orientation glyphs are rotated by the headings (start -pi/2 = -90 degrees)
    await expect(page.locator('[data-testid=glyph-2] .orient-glyph')).toHaveAttribute('transform', /^rotate\(-90\)/);
    await reviewShot(page, testInfo, 'car-paths-initial');
  });

  test('plot label reads path length 24.08 and distance 20.62 at the start, as in the original snapshot', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('plot-label')).toHaveText(/^path length: 24\.08\s+distance: 20\.62$/);
    expect(await page.evaluate(() => window.__demo.labelText())).toBe('path length: 24.08   distance: 20.62');
  });

  test('has the controls of the original with their defaults: progress, r_min, type and the swap button', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('slider-progress')).toHaveValue('0');
    await expect(page.getByTestId('slider-minRadius')).toHaveValue('3');
    await expect(page.getByTestId('value-minRadius')).toHaveValue('3');
    await expect(page.getByTestId('setter-type-Reeds-Shepp')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-type-Dubins')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('button-swap')).toHaveText('swap start and goal');
    await expect(page.getByTestId('ctl-minRadius').locator('.ctl-label')).toHaveText('rmin');
  });

  test('dragging the start locator with the mouse moves the start car and keeps its heading', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [-10, -5], [-6, 2]);
    const s = await getState(page);
    expect(Math.abs(s.locs[0][0] - -6)).toBeLessThan(0.15);
    expect(Math.abs(s.locs[0][1] - 2)).toBeLessThan(0.15);
    const v = await getView(page);
    expect(v.sTheta).toBeCloseTo(-Math.PI / 2, 12);
    expect(s.locs[1][0]).toBeCloseTo(s.locs[0][0], 12);
    expect(s.locs[1][1]).toBeCloseTo(s.locs[0][1] - 2, 12);
    expect(s.locsOld).toEqual(s.locs);
    await expect(page.getByTestId('plot-label')).not.toHaveText(/path length: 24\.08/);
  });

  test('dragging the goal orientation locator with the mouse turns the goal car', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await drag(page, [10, 4], [8, 9]); // straight above the goal (8, 5)
    const s = await getState(page);
    const v = await getView(page);
    expect(Math.abs(v.gTheta - Math.PI / 2)).toBeLessThan(0.03);
    expect(Math.hypot(s.locs[3][0] - 8, s.locs[3][1] - 5)).toBeCloseTo(2, 12);
    expect(s.locs[2]).toEqual([8, 5]);
    await reviewShot(page, testInfo, 'car-paths-goal-turned');
  });

  test('dragging a car beyond 13 x 8 stops it at the limit', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [8, 5], [14.6, 9.6]);
    const s = await getState(page);
    expect(s.locs[2]).toEqual([13, 8]);
  });

  test('moving the progress slider with the mouse moves the blue car along the path', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('slider-progress').boundingBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    const s = await getState(page);
    expect(s.progress).toBeGreaterThan(0.4);
    expect(s.progress).toBeLessThan(0.6);
    const v = await getView(page);
    expect(Math.hypot(v.ppos[0] - -10, v.ppos[1] - -5)).toBeGreaterThan(3);
    await expect(page.getByTestId('plot-label')).toHaveText(/path length: 24\.08/); // the path does not change
    await reviewShot(page, testInfo, 'car-paths-progress');
  });

  test('the r_min value field changes the turning radius and the path length', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('value-minRadius').fill('5');
    await page.getByTestId('value-minRadius').press('Enter');
    expect((await getState(page)).minRadius).toBe(5);
    await expect(page.getByTestId('construction-circle-1')).toHaveAttribute('r', '5');
    await expect(page.getByTestId('plot-label')).not.toHaveText(/path length: 24\.08/);
  });

  test('the Dubins setter gives 26.47 in the configuration of snapshot 2', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.evaluate(() => { const L = [[-10, -5], [-10, -3], [8, 5], [6, 6]]; window.__demo.setState({ locs: L, locsOld: L, progress: 0.745 }); });
    await page.getByTestId('setter-type-Dubins').click();
    await expect(page.getByTestId('setter-type-Dubins')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.__demo.labelText())).toBe('path length: 26.47   distance: 20.62');
    await reviewShot(page, testInfo, 'car-paths-snapshot2');
  });

  test('swap start and goal exchanges the cars and the Reeds-Shepp length stays 24.08', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('button-swap').click();
    const s = await getState(page);
    expect(s.locs).toEqual([[8, 5], [10, 4], [-10, -5], [-10, -7]]);
    expect(await page.evaluate(() => window.__demo.labelText())).toBe('path length: 24.08   distance: 20.62');
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-type-Dubins').click();
    await page.evaluate(() => window.__demo.moveLocator(1, [0, 0]));
    await page.getByTestId('value-minRadius').fill('7');
    await page.getByTestId('value-minRadius').press('Enter');
    await page.getByTestId('reset').click();
    const s = await getState(page);
    expect(s.locs).toEqual([[-10, -5], [-10, -7], [8, 5], [10, 4]]);
    expect([s.type, s.minRadius, s.progress, s.progressOld]).toEqual(['Reeds-Shepp', 3, 0, -1]);
    await expect(page.getByTestId('setter-type-Reeds-Shepp')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('value-minRadius')).toHaveValue('3');
    expect(await page.evaluate(() => window.__demo.labelText())).toBe('path length: 24.08   distance: 20.62');
  });

  test('arrow keys move a focused locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-1').focus();
    await page.keyboard.press('ArrowRight');
    const s = await getState(page);
    expect(s.locs[0][0]).toBeCloseTo(-9.9, 12);
    expect(s.locs[0][1]).toBe(-5);
  });

  test('a press away from every locator moves the nearest locator there', async ({ page }) => {
    // LocatorPane "by default directs any click to the nearest locator": (-6, 0) is nearest to the start position (-10, -5)
    await openDemo(page, URL);
    await drag(page, [-6, 0], [-4, 1]);
    const s = await getState(page);
    expect(Math.abs(s.locs[0][0] - -4)).toBeLessThan(0.15);
    expect(Math.abs(s.locs[0][1] - 1)).toBeLessThan(0.15);
    expect(s.locs[1][1]).toBeCloseTo(s.locs[0][1] - 2, 12); // heading kept, marker carried along
    expect(s.locs[2]).toEqual([8, 5]);
  });

  test('a press on the start car body drags the car', async ({ page }) => {
    // the body centre is 0.7 units ahead of the rear-axle locator (about 15 px): the nearest locator (the car) follows
    await openDemo(page, URL);
    const at = await toClient(page, [-10, -5.7]), loc = await toClient(page, [-10, -5]);
    expect(Math.hypot(at.x - loc.x, at.y - loc.y)).toBeGreaterThan(12); // outside the 12 px no-jump grab zone
    await drag(page, [-10, -5.7], [-2, -3]);
    const s = await getState(page);
    expect(Math.abs(s.locs[0][0] - -2)).toBeLessThan(0.15);
    expect(Math.abs(s.locs[0][1] - -3)).toBeLessThan(0.15);
  });

  test('dragging a car centre while progress is animating moves the car and the path follows', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('plus-progress').click();
    await page.getByTestId('play-progress').click();
    await expect.poll(() => page.evaluate(() => window.__demo.getState().progress)).toBeGreaterThan(0.02);
    const before = (await getState(page)).progress;
    await drag(page, [8, 5], [3, 0], 8);
    const s = await getState(page);
    const v = await getView(page);
    expect(Math.abs(s.locs[2][0] - 3)).toBeLessThan(0.15);
    expect(Math.abs(s.locs[2][1] - 0)).toBeLessThan(0.15);
    expect(v.goal[0]).toBe(s.locs[2][0]); // the path and the moving car are computed for the new goal
    expect(v.goal[1]).toBe(s.locs[2][1]);
    await expect.poll(() => page.evaluate(() => window.__demo.getState().progress)).not.toBe(before); // still animating
    await page.getByTestId('play-progress').click();
    await expect(page.getByTestId('plot-label')).not.toHaveText(/path length: 24\.08/);
  });
});
