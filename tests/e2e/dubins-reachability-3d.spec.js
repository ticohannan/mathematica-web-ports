// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/dubins-reachability-3d.spec.js — browser tests of the "3D Reachability Set for a Dubins Car" page (attribution,
// start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/dubins-reachability-3d/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const COLORS = [[0.368417, 0.506779, 0.709798], [0.880722, 0.611041, 0.142051]]; // ColorData[97] 1, 2
const withoutPlot = ({ plotReach, ...rest }) => rest;

test.describe('dubins-reachability-3d', () => {
  test('loads without errors and draws the 3D set: six surfaces in the plot theme lighting, the 2D picture hidden', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas')).toBeVisible();
    await expect(page.getByTestId('graphic2')).toBeHidden();
    expect(await page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.05);
    expect(await page.evaluate(() => window.__demo.themed())).toBe(6);
    const v = await view(page);
    expect(v.dim).toBe('3D');
    expect(v.clr).toEqual(COLORS[1]); // RSR: the orange sphere
    // the frame: Mathematica's ticks of snapshot 1 and the axes labels x, y, θ
    await expect(page.locator('.d3-tick')).toHaveText(['-5', '0', '5', '-5', '0', '5', '10', '0', '5']);
    await expect(page.locator('.d3-axis-label')).toHaveText(['x', 'y', 'θ']);
    // the box behind the content (D-D3-07): the front top edge is grey on white but hidden by the blue and orange surfaces
    const [[x0, x1], [y0], [, z1]] = v.PlotRange;
    const edge = (s) => page.evaluate((p) => window.__demo.pixelAt(p), [x0 + s * (x1 - x0), y0, z1]);
    const grey = await edge(0.05), blue = await edge(0.3), orange = await edge(0.9);
    expect(Math.abs(grey[0] - grey[2])).toBeLessThan(10); expect(grey[0]).toBeLessThan(240);
    expect(blue[2] - blue[0]).toBeGreaterThan(60);
    expect(orange[0] - orange[2]).toBeGreaterThan(60);
  });
  test('has the controls of the original with their saved values', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('setter-dim-3D')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('value-r')).toHaveValue('1.8');
    await expect(page.getByTestId('value-t')).toHaveValue('10');
    await expect(page.getByTestId('value-p')).toHaveValue('100');
    await expect(page.getByTestId('popup-path').locator('option:checked')).toHaveText('RSR');
    await expect(page.getByTestId('popup-path').locator('option')).toHaveText(['RSR', 'LSL', 'RSL', 'LSR', 'RLR', 'LRL']);
    await expect(page.getByTestId('islider-τ-lo')).toHaveAttribute('aria-valuenow', '0.5');
    await expect(page.getByTestId('islider-τ-hi')).toHaveAttribute('aria-valuenow', '0.75');
    for (const t of ['dimension', 'r (m)', 't (s)', 'move car', 'path type', 'switching times τ', 'path progress (%)']) await expect(page.locator('#controls')).toContainText(t);
    for (const [name, min, max] of [['r', '0.5', '10'], ['t', '0.1', '14'], ['p', '0', '100']]) {
      await expect(page.getByTestId(`slider-${name}`)).toHaveAttribute('min', min);
      await expect(page.getByTestId(`slider-${name}`)).toHaveAttribute('max', max);
    }
  });
  test('the dimension setter switches to the 2D projection (legend, cars, path) and back to the 3D set', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-dim-2D').click();
    await expect(page.getByTestId('graphic2')).toBeVisible();
    await expect(page.getByTestId('graphic')).toBeHidden();
    const s = await state(page);
    expect(s).toMatchObject({ dim: '2D', dimold: '2D', plotReach: { dim: '2D', r: 1.8, t: 10 } });
    await expect(page.getByTestId('legend-5')).toContainText('RLR, Δθ = 0');
    await expect(page.locator('[data-testid^="legend-"]')).toHaveCount(7);
    for (const id of ['car', 'start-car', 'path', 'turning-circles', 'reach-polygon-1', 'reach-polygon-2']) await expect(page.getByTestId(id)).toHaveCount(1);
    const v = await view(page);
    expect(v.pathPoints.length).toBe(101);
    expect(v.car.xy).toEqual(v.pathPoints[100]);
    await page.getByTestId('setter-dim-3D').click();
    await expect(page.getByTestId('graphic')).toBeVisible();
    await expect(page.getByTestId('graphic2')).toBeHidden();
    expect(await page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.05);
    expect((await state(page)).dimold).toBe('3D');
  });
  test('a keyboard step of r: a new plot with a new plot range, the camera fitted to the new box, the surfaces lit again', async ({ page }) => {
    await openDemo(page, URL);
    const v0 = await view(page), cam0 = await page.evaluate(() => window.__demo.camera());
    await page.getByTestId('slider-r').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).r).toBeGreaterThan(1.8);
    const s = await state(page), v = await view(page);
    expect(s.rold).toBe(s.r); // not dragged with the mouse: the old value follows
    expect(s.plotReach).toEqual({ dim: '3D', r: s.r, t: 10 });
    expect(v.PlotRange[2][1]).toBeLessThan(v0.PlotRange[2][1]); // θ up to π/2 + t/r: a larger r turns less
    expect(await page.evaluate(() => window.__demo.camera())).not.toEqual(cam0);
    expect(await page.evaluate(() => window.__demo.themed())).toBe(6);
  });
  test('dragging r with the mouse: rold, told, dimold stay while the slider is held (ControlActive) and follow on release', async ({ page }) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('slider-r').boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 0.08 * box.width, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 0.3 * box.width, y, { steps: 4 });
    await expect.poll(async () => (await state(page)).r).toBeGreaterThan(2);
    const held = await state(page);
    expect(held.rold).toBe(1.8); // ControlActive[None, rold = r; …]: not while dragging
    expect(held.plotReach.r).toBe(held.r); // but the plot follows r at every step
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).rold).toBe(held.r);
  });
  test('dragging the 3D picture turns the view without evaluating the body again', async ({ page }) => {
    await openDemo(page, URL);
    const s0 = await state(page), cam0 = await page.evaluate(() => window.__demo.camera());
    const box = await page.getByTestId('scene-canvas').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 20, { steps: 5 });
    await page.mouse.up();
    const cam1 = await page.evaluate(() => window.__demo.camera());
    expect(cam1.position).not.toEqual(cam0.position);
    expect(cam1.target).toEqual(cam0.target);
    expect(await state(page)).toEqual(s0);
  });
  test('the path popup chooses the path: the sphere moves to the end of LSL and turns blue', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('popup-path').selectOption({ label: 'LSL' });
    await expect.poll(async () => (await state(page)).path).toBe('LSL');
    const v = await view(page);
    expect(v.clr).toEqual(COLORS[0]);
    expect(v.sphere.center[2]).toBeCloseTo(Math.PI / 2 + (0.5 + 0.25) * 10 / 1.8, 12); // left 5 s, straight, left 2.5 s
    expect(v.recomputed).toBe(false); // the plot is kept
  });
  test('the switching times τ by keyboard; Method Push: the lower end pushes the upper one', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('islider-τ-lo').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).τ[0]).toBeCloseTo(0.51, 12);
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).τ).toEqual([1, 1]);
    await page.getByTestId('islider-τ-hi').focus();
    await page.keyboard.press('Home');
    await expect.poll(async () => (await state(page)).τ).toEqual([0, 0]);
    const v = await view(page); // τ = {0, 0}: the whole path is the last turn (RSR: right for 10 s)
    expect(v.sphere.center[2]).toBeCloseTo(Math.PI / 2 - 10 / 1.8, 12);
  });
  test('the path progress p moves the car back along its path to the start (2D)', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ dim: '2D' }));
    const v0 = await view(page);
    await page.getByTestId('slider-p').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).p).toBe(99);
    const v1 = await view(page);
    expect(v1.car.xy).not.toEqual(v0.car.xy);
    expect(v1.pathPoints).toEqual(v0.pathPoints); // the path is drawn whole; the car is at p % of it
    await page.keyboard.press('Home');
    await expect.poll(async () => (await view(page)).car.xy).toEqual([0, 0]);
    expect((await view(page)).car.Theta).toBe(Math.PI / 2);
  });
  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ dim: '2D', r: 3, t: 6, path: 'LRL', τ: [0.2, 0.9], p: 40 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.getByTestId('graphic')).toBeVisible();
    await expect(page.getByTestId('value-t')).toHaveValue('10');
    await expect(page.getByTestId('popup-path').locator('option:checked')).toHaveText('RSR');
  });
  test('review screenshots at the four snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/dubins-reachability-3d.original-states.json', 'utf8'));
    for (const k of Object.keys(fx.snapshots)) {
      const s = withoutPlot(fx.snapshots[k]); // the saved plot is not loaded: the body computes it (N-D3-02)
      await page.evaluate((st) => window.__demo.setState(st), s);
      const after = await state(page);
      expect(withoutPlot(after)).toEqual(s);
      await expect(page.getByTestId(s.dim === '3D' ? 'graphic' : 'graphic2')).toBeVisible();
      await expect(page.getByTestId('value-r')).toHaveValue(String(s.r));
      await reviewShot(page, testInfo, `dubins-reachability-3d-snapshot-${k}`);
    }
  });
});
