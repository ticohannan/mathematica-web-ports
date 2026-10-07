// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/prm.spec.js — browser tests of the "Probabilistic Roadmap Method" page
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/prm/';
const SAVED = JSON.parse(fs.readFileSync('tests/golden/prm.original-state.json', 'utf8')).state;
const TWO_PI = 2 * Math.PI;
const getState = (page) => page.evaluate(() => window.__demo.getState());

async function drag(page, from, to, steps = 6) {
  const a = await page.evaluate((p) => window.__demo.worldToClient(p), from);
  const b = await page.evaluate((p) => window.__demo.worldToClient(p), to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}

// a fixed scene: one triangle around {3,3} and a chain of good points from {1,1} to {2.6,1}
const CHAIN = {
  polySides: [3], polyXY: [[3, 3]], polyN: 1,
  polys: [[[3 + Math.sqrt(3) / 2, 2.5], [3, 4], [3 - Math.sqrt(3) / 2, 2.5]]],
  goodPts: [[1, 1], [1.4, 1], [1.8, 1], [2.2, 1], [2.6, 1], [5, 5]], badPts: [], pts: [],
  edgesNN: [], edgesNNadj: [[2], [1, 3], [2, 4], [3, 5], [4], []], r: 0.1, rold: 0.1, qs: [0.9, 1], qf: [2.7, 1], progress: 0,
};

test.describe('probabilistic roadmap', () => {
  test('loads without errors and draws axes, the two locator icons and the label', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (let k = 0; k <= 6; k++) await expect(page.getByTestId(`tick-x-${k}`)).toHaveText(String(k));
    // axes exactly 0…2π (prm-2.png), ticks every 0.2 up to 6.2
    await expect(page.getByTestId('axis-x')).toHaveAttribute('points', `0,0 ${2 * Math.PI},0`);
    await expect(page.getByTestId('tick-x')).toHaveCount(32);
    await expect(page.getByTestId('icon-qs')).toHaveCount(1);
    await expect(page.getByTestId('icon-qf')).toHaveCount(1);
    await expect(page.getByTestId('plot-label')).toHaveText('no path possible');
    const s = await getState(page);
    expect(s.polys.length).toBe(4);
    expect(s.qs).toEqual([1, 1]);
    expect(s.qf).toEqual([5, 5]);
    await reviewShot(page, testInfo, 'prm-initial');
  });

  test('has the controls of the original: add 50 vertices, radius 0.5, progress (disabled), show obstacles, restart', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('button-add-vertices')).toHaveText('add 50 vertices');
    await expect(page.getByTestId('button-restart')).toHaveText('restart');
    await expect(page.getByTestId('value-radius')).toHaveValue('0.5');
    await expect(page.getByTestId('slider-progress')).toBeDisabled();
    await expect(page.getByTestId('check-show-obstacles')).not.toBeChecked();
    await expect(page.getByTestId('ctl-show-obstacles')).toContainText('show obstacles');
  });

  test('"add 50 vertices" samples 50 configurations, drawn as green (free) and red (in collision) points', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('button-add-vertices').click();
    const s = await getState(page);
    expect(s.pts.length).toBe(50);
    await expect(page.getByTestId('good-point')).toHaveCount(s.goodPts.length);
    await expect(page.getByTestId('bad-point')).toHaveCount(s.badPts.length);
    expect(s.goodPts.length + s.badPts.length).toBe(50);
    await expect(page.getByTestId('roadmap-edge').first()).toBeAttached(); // radius 0.5 connects neighbours
  });

  test('moving the radius slider with the mouse rebuilds the roadmap', async ({ page }) => {
    await openDemo(page, URL);
    for (let k = 0; k < 4; k++) await page.getByTestId('button-add-vertices').click();
    const box = await page.getByTestId('slider-radius').boundingBox();
    await page.mouse.click(box.x + box.width * 0.15, box.y + box.height / 2);
    const s = await getState(page);
    expect(s.r).toBeLessThan(0.3);
    expect(s.rold).toBe(s.r);
    const before = s.edgesNN.length;
    await page.mouse.click(box.x + box.width * 0.85, box.y + box.height / 2);
    const s2 = await getState(page);
    expect(s2.r).toBeGreaterThan(0.7);
    expect(s2.edgesNN.length).toBeGreaterThan(before);
  });

  test('a value typed into the radius field is committed when the picture is pressed next', async ({ page }) => {
    // the press focuses the grabbed locator, so the field loses focus and its change event fires (shared/svg-plot.js)
    await openDemo(page, URL);
    await page.getByTestId('value-radius').fill('0.3');
    const c = await page.evaluate(() => window.__demo.worldToClient([3, 1.5]));
    await page.mouse.click(c.x, c.y);
    await expect.poll(async () => (await getState(page)).r).toBe(0.3);
    await expect(page.getByTestId('locator-qs')).toBeFocused();
  });

  test('dragging the start locator with the mouse moves qs', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [1, 1], [2, 3.2]);
    const s = await getState(page);
    expect(s.qs[0]).toBeCloseTo(2, 1);
    expect(s.qs[1]).toBeCloseTo(3.2, 1);
    expect(s.qf).toEqual([5, 5]);
  });

  test('a press away from every locator moves the nearest locator there', async ({ page }) => {
    // Manipulate Locator controls form a LocatorPane: any click goes to the nearest locator
    await openDemo(page, URL);
    const c = await page.evaluate(() => window.__demo.worldToClient([3, 1.5])); // 2.06 from qs, 4.03 from qf
    await page.mouse.click(c.x, c.y);
    const s = await getState(page);
    expect(s.qs[0]).toBeCloseTo(3, 1);
    expect(s.qs[1]).toBeCloseTo(1.5, 1);
    expect(s.qf).toEqual([5, 5]);
  });

  test('a locator dragged past the left edge jumps to the right edge (2π), as in the original', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [1, 1], [-0.08, 1.5], 8);
    const s = await getState(page);
    expect(s.qs[0]).toBe(TWO_PI);
  });

  test('"show obstacles" draws the four pink obstacle polygons', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.locator('[data-testid^=obstacle-]')).toHaveCount(0);
    await page.getByTestId('check-show-obstacles').check();
    await expect(page.locator('[data-testid^=obstacle-]')).toHaveCount(4);
    await expect(page.getByTestId('obstacle-1')).toHaveAttribute('fill', 'rgb(255,128,128)');
  });

  test('restart draws new obstacles and removes the samples', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('button-add-vertices').click();
    const before = await getState(page);
    await page.getByTestId('button-restart').click();
    const after = await getState(page);
    expect(after.pts).toEqual([]);
    expect(after.polyXY).not.toEqual(before.polyXY);
    expect(after.r).toBe(before.r);
  });

  test('the saved state of the original shows "no path possible" and a red start icon (snapshot 1)', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.evaluate((s) => window.__demo.loadState(s), SAVED);
    await expect(page.getByTestId('plot-label')).toHaveText('no path possible');
    await expect(page.getByTestId('icon-qs')).toHaveAttribute('data-color', 'red');
    await expect(page.getByTestId('icon-qf')).toHaveAttribute('data-color', 'green');
    await expect(page.locator('[data-testid^=obstacle-]')).toHaveCount(4);
    await expect(page.getByTestId('good-point')).toHaveCount(442);
    await expect(page.getByTestId('value-radius')).toHaveValue('0.14');
    expect((await getState(page)).edgesNN.length).toBe(1740);
    await reviewShot(page, testInfo, 'prm-original-state');
  });

  test('a path enables the progress slider, shows "path length = 1.8" and moves the purple point', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.evaluate((s) => window.__demo.loadState(s), CHAIN);
    await expect(page.getByTestId('plot-label')).toHaveText('path length = 1.8');
    await expect(page.getByTestId('slider-progress')).toBeEnabled();
    await expect(page.getByTestId('path-edge')).toHaveCount(4);
    const p0 = await page.evaluate(() => window.__demo.view().progressPoint);
    expect(p0).toEqual([0.9, 1]);
    const box = await page.getByTestId('slider-progress').boundingBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    const v = await page.evaluate(() => window.__demo.view());
    const prog = (await getState(page)).progress;
    expect(prog).toBeGreaterThan(0.3);
    expect(v.progressPoint[0]).toBeCloseTo(0.9 + 1.8 * prog, 9);
    await reviewShot(page, testInfo, 'prm-path');
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('button-add-vertices').click();
    await page.getByTestId('check-show-obstacles').check();
    await page.getByTestId('reset').click();
    const s = await getState(page);
    expect([s.pts, s.r, s.showConfigObs, s.qs, s.qf]).toEqual([[], 0.5, false, [1, 1], [5, 5]]);
    await expect(page.getByTestId('check-show-obstacles')).not.toBeChecked();
  });

  test('arrow keys move a focused locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-qf').focus();
    await page.keyboard.press('ArrowLeft');
    const s = await getState(page);
    expect(s.qf[0]).toBeCloseTo(4.95, 12);
  });

  test('?seed=N gives reproducible obstacles and samples (port addition)', async ({ page }) => {
    const run = async () => {
      await openDemo(page, `${URL}?seed=42`);
      await page.getByTestId('button-add-vertices').click();
      return getState(page);
    };
    const a = await run();
    const b = await run();
    expect(a.polyXY).toEqual(b.polyXY);
    expect(a.pts).toEqual(b.pts);
  });
});
