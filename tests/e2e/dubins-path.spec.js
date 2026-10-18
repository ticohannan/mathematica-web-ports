// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/dubins-path.spec.js — browser tests of the Dubins-car page (real mouse and keyboard; window.__demo only
// reads values, except to show the snapshot states for the review screenshots).
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/dubins-path/';
const toClient = (page, p) => page.evaluate((q) => window.__demo.worldToClient(q), p);
async function drag(page, fromWorld, toWorld, steps = 8) {
  const a = await toClient(page, fromWorld), b = await toClient(page, toWorld);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}
const getState = (page) => page.evaluate(() => window.__demo.getState());
const getView = (page) => page.evaluate(() => window.__demo.view());
const labelNumbers = async (page) => (await page.getByTestId('plot-label').textContent()).match(/^([\d.]+) path length, ([\d.]+) distance$/).slice(1).map(Number);
/** distance from p to a word drawing (arcs sampled densely) */
function distToDrawing(p, drawing) {
  let best = Infinity;
  for (const q of drawing.pieces) {
    if (q.kind === 'line') {
      const [a, b] = [q.from, q.to], dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
    } else {
      for (let i = 0; i <= 2000; i++) {
        const a = q.a1 + ((q.a2 - q.a1) * i) / 2000;
        best = Math.min(best, Math.hypot(p[0] - q.c[0] - q.r * Math.cos(a), p[1] - q.c[1] - q.r * Math.sin(a)));
      }
    }
  }
  return best;
}

test.describe('dubins path', () => {
  test('dubins-path loads without errors and draws both cars, the turning circles, the candidate words and the label', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['start-car', 'goal-car', 'moving-car', 'heading-glyph', 'turning-circle-csL', 'turning-circle-csR',
      'turning-circle-ceL', 'turning-circle-ceR', 'candidate-LSL', 'candidate-RSR', 'candidate-RSL', 'candidate-LRL', 'candidate-RLR', 'plot-label']) {
      await expect(page.getByTestId(id), id).toHaveCount(1);
    }
    await expect(page.getByTestId('candidate-LSR')).toHaveCount(0); // LSR does not exist at the opening state
    await expect(page.getByTestId('shortest-path')).toHaveAttribute('data-word', 'LSL');
    await expect(page.getByTestId('turning-circle-csL')).toHaveAttribute('stroke-dasharray', /\d/);
    await reviewShot(page, testInfo, 'dubins-path-snapshot1');
  });

  test('dubins-path has the controls of the original with their defaults: progress 0.25 and r_min 3', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-progress')).toHaveValue('0.25');
    await expect(page.getByTestId('value-minRadius')).toHaveValue('3');
    await expect(page.getByTestId('ctl-minRadius').locator('.ctl-label')).toHaveText('rmin');
    await expect(page.getByTestId('locator-goalXY')).toHaveCount(1);
    await expect(page.getByTestId('locator-goalThetaloc')).toHaveCount(1);
    // ControlPlacement -> Top: the sliders are above the graphic
    const s = await page.getByTestId('slider-minRadius').boundingBox(), g = await page.getByTestId('graphic').boundingBox();
    expect(s.y + s.height).toBeLessThan(g.y);
  });

  test('dubins-path label reads 20.76 path length, 2.83 distance at the start', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('plot-label')).toHaveText('20.76 path length, 2.83 distance');
    expect(await page.evaluate(() => window.__demo.labelText())).toBe('20.76 path length, 2.83 distance');
    const v = await getView(page);
    expect(v.word).toBe('LSL');
    expect(v.lengths.LSR).toBe(null); // ∞: the word does not exist
  });

  test('dragging the goal locator with the mouse moves the goal car and keeps its heading', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [2, 2], [5, -3]);
    const s = await getState(page);
    expect(Math.hypot(s.goalXY[0] - 5, s.goalXY[1] - -3)).toBeLessThan(0.05);
    expect(Math.abs(s.Theta - -Math.PI / 4)).toBeLessThan(1e-9);
    expect(Math.hypot(s.goalThetaloc[0] - 6.41, s.goalThetaloc[1] - -4.41)).toBeLessThan(0.07);
    const [len, dist] = await labelNumbers(page);
    expect(Math.abs(len - 5.93)).toBeLessThanOrEqual(0.06);
    expect(Math.abs(dist - 5.83)).toBeLessThanOrEqual(0.06);
    expect((await getView(page)).word).toBe('RSR');
  });

  test('dragging the heading locator with the mouse turns the goal car', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const s0 = await getState(page);
    await drag(page, s0.goalThetaloc, [2, 6]);
    const s = await getState(page);
    expect(s.goalXY).toEqual([2, 2]);
    expect(Math.abs(s.Theta - Math.PI / 2)).toBeLessThan(0.01);
    expect(Math.hypot(s.goalThetaloc[0] - 2, s.goalThetaloc[1] - 4)).toBeLessThan(0.05);
    const [len, dist] = await labelNumbers(page);
    expect(Math.abs(len - 22.14)).toBeLessThanOrEqual(0.05);
    expect(dist).toBe(2.83);
    await reviewShot(page, testInfo, 'dubins-path-heading-up');
  });

  test('a press away from both locators moves the nearer one there', async ({ page }) => {
    await openDemo(page, URL);
    const p = await toClient(page, [-10, -5]);
    await page.mouse.click(p.x, p.y);
    const s = await getState(page);
    expect(Math.hypot(s.goalXY[0] - -10, s.goalXY[1] - -5)).toBeLessThan(0.05);
    const [len, dist] = await labelNumbers(page);
    expect(Math.abs(len - 26.32)).toBeLessThanOrEqual(0.06);
    expect(Math.abs(dist - 11.18)).toBeLessThanOrEqual(0.06);
  });

  test('the goal locator stops at 13 x 8', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [2, 2], [14.5, 9.5]);
    const s = await getState(page);
    expect(s.goalXY).toEqual([13, 8]);
    await expect(page.getByTestId('plot-label')).toHaveText('16.8 path length, 15.26 distance');
  });

  test('moving the progress slider with the mouse moves the blue car along the thick path', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('slider-progress').boundingBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    const s = await getState(page);
    expect(Math.abs(s.progress - 0.5)).toBeLessThan(0.05);
    const v = await getView(page);
    expect(distToDrawing(v.car.xyP, v.shortestPath)).toBeLessThan(0.01);
    expect(Math.hypot(v.car.xyP[0] - 5.03, v.car.xyP[1] - 1.26)).toBeGreaterThan(0.5);
    await expect(page.getByTestId('plot-label')).toHaveText('20.76 path length, 2.83 distance'); // the path does not change
    // exactly 0.5 (typed): the Python transcription's (6.801114166067764, 5.469914081068204)
    await page.getByTestId('value-progress').fill('0.5');
    await page.getByTestId('value-progress').press('Enter');
    const v2 = await getView(page);
    expect(Math.hypot(v2.car.xyP[0] - 6.801114166067764, v2.car.xyP[1] - 5.469914081068204)).toBeLessThan(1e-12);
    await reviewShot(page, testInfo, 'dubins-path-progress-half');
  });

  test('the r_min value field changes the turning circles and the path length', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('value-minRadius').fill('5');
    await page.getByTestId('value-minRadius').press('Enter');
    expect((await getState(page)).minRadius).toBe(5);
    await expect(page.getByTestId('turning-circle-csL')).toHaveAttribute('r', '5');
    await expect(page.getByTestId('plot-label')).toHaveText('33.05 path length, 2.83 distance');
    await page.getByTestId('value-minRadius').fill('0.001');
    await page.getByTestId('value-minRadius').press('Enter');
    await expect(page.getByTestId('plot-label')).toHaveText('2.83 path length, 2.83 distance');
    const v = await getView(page);
    expect(v.word).toBe('LSR');
    expect(Math.abs(v.lengths.LSR - 2.8290765081287956)).toBeLessThan(1e-12);
  });

  test('arrow keys move a focused locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-goalXY').focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    const s = await getState(page);
    expect(Math.abs(s.goalXY[0] - 2.5)).toBeLessThan(1e-9);
    expect(s.goalXY[1]).toBe(2);
    expect(Math.abs(s.Theta - -Math.PI / 4)).toBeLessThan(1e-9);
    await expect(page.getByTestId('plot-label')).toHaveText('21.25 path length, 3.2 distance');
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('value-progress').fill('0.8');
    await page.getByTestId('value-progress').press('Enter');
    await page.getByTestId('value-minRadius').fill('1.5');
    await page.getByTestId('value-minRadius').press('Enter');
    await drag(page, [2, 2], [-4, 3]);
    await page.getByTestId('locator-goalThetaloc').focus();
    await page.keyboard.press('ArrowUp');
    await page.getByTestId('reset').click();
    const s = await getState(page);
    expect(s.goalXY).toEqual([2, 2]);
    expect(s.goalXYold).toEqual([2, 2]);
    expect(s.Theta).toBe(-0.7853981633974483);
    expect(s.goalThetaloc).toEqual([3.414213562373095, 0.585786437626905]); // exact opening kept in every engine (D-DP-09)
    expect([s.progress, s.minRadius]).toEqual([0.25, 3]);
    await expect(page.getByTestId('value-progress')).toHaveValue('0.25');
    await expect(page.getByTestId('value-minRadius')).toHaveValue('3');
    await expect(page.getByTestId('plot-label')).toHaveText('20.76 path length, 2.83 distance');
  });

  test('dubins-path review screenshots of the snapshot settings 2 to 4', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const snaps = {
      2: { goalXY: [3.6000000000000014, -3.84], Theta: -0.7853981633974483, goalThetaloc: [5.014213562373096, -5.254213562373095], label: '23.91 path length, 5.26 distance' },
      3: { goalXY: [1.9000000000000004, -3.58], Theta: -0.7853981633974483, goalThetaloc: [3.3142135623730953, -4.994213562373095], label: '22.5 path length, 4.05 distance' },
      4: { goalXY: [-5.75, -1.6799999999999997], Theta: 3.0648207623200157, goalThetaloc: [-7.744108971003163, -1.5266070022305265], label: '17.02 path length, 5.99 distance' },
    };
    for (const [k, s] of Object.entries(snaps)) {
      await page.evaluate((x) => window.__demo.setState({ goalXY: x.goalXY, goalXYold: x.goalXY, Theta: x.Theta, goalThetaloc: x.goalThetaloc, progress: 0.25, minRadius: 3 }), s);
      await expect(page.getByTestId('plot-label')).toHaveText(s.label);
      await reviewShot(page, testInfo, `dubins-path-snapshot${k}`);
    }
  });
});
