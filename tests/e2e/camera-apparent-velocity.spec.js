// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/camera-apparent-velocity.spec.js — browser tests of the "Maximizing Apparent Velocity in a Camera's Frame"
// page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';
import { sphericaldist, imagePlaneCoor } from '../../demos/camera-apparent-velocity/model.js';
import { textOf } from '../../shared/graphics.js';

const URL = '/demos/camera-apparent-velocity/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/camera-apparent-velocity.original-states.json', 'utf8'));
// the text a coordinate grid shows, row by row ("x = 3.6")
const gridText = (rows) => rows.map(([v, w]) => `${textOf(v)} ${textOf(w)}`.replace(/\s+/g, ' ').trim());
const shownGrid = (page, id) => page.getByTestId(id).locator('tr').evaluateAll((trs) => trs.map((tr) => [...tr.cells].map((td) => td.textContent).join(' ').replace(/\s+/g, ' ').trim()));
// dark pixels (R + G + B < 560; the image plane is about 655) along a row of the image plane at height y
const darkPixels = (page, y) => page.evaluate((yy) => {
  let n = 0;
  for (let x = -4.9; x <= 2.9; x += 0.1) { const [r, g, b] = window.__demo.pixelAt([x, yy, 5.001]); if (r + g + b < 560) n++; }
  return n;
}, y);

test.describe('camera-apparent-velocity', () => {
  test('loads without errors and draws the 3D view: the scene, its nine labels, the textured image plane label', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas')).toBeVisible();
    await expect(page.getByTestId('graphic2')).toBeHidden();
    expect(await page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.05);
    const labels = page.locator('[data-testid=text3d]');
    await expect(labels).toHaveCount(9);
    expect(await labels.allTextContents()).toEqual(['x', 'y', 'z', 'u', 'v', 'λ', 'θ', 'θ', 'ϕ']);
    // the label: one textured polygon, its image upside down (the ink of "image plane" in its top half), Opacity 0.5
    const [t] = await page.evaluate(() => window.__demo.textures());
    expect(t).toMatchObject({ width: 500, opacity: 0.5 });
    expect(t.inkTop).toBeGreaterThan(1.3 * t.inkBottom);
    // drawn: dark letters along the label's middle, none on the plane below it (the lines kept away from it: yc = -8)
    await page.evaluate(() => window.__demo.setState({ yc: -8 }));
    expect(await darkPixels(page, 4.3)).toBeGreaterThan(9);
    expect(await darkPixels(page, 3.0)).toBe(0);
  });
  test('has the controls of the original with their saved values and the two coordinate grids', async ({ page }) => {
    await openDemo(page, URL);
    for (const [n, v] of [['xc', '1'], ['yc', '1'], ['zc', '15'], ['r', '4']]) await expect(page.getByTestId(`value-${n}`)).toHaveValue(v);
    for (const n of ['Silhouette', 'imPlaneView', 'showDrone', 'animation']) await expect(page.getByTestId(`check-${n}`)).not.toBeChecked();
    const controls = page.locator('#controls');
    for (const t of ['drone starting location (green point)', 'sphere radius', 'show sphere', 'show 2D view', 'show drone', 'animate',
      'Red point maximizes pixel change.', 'coordinates in camera frame', 'image plane coordinates']) await expect(controls).toContainText(t);
    expect(await shownGrid(page, 'coords-camera')).toEqual(['x = 3.6', 'y = 3.6', 'z = 13.6', 'θ = 45.0∘', 'ϕ = 110.8∘']);
    expect(await shownGrid(page, 'coords-image')).toEqual(['(u, v) = (1.3, 1.3)', 'λ = 5', '0.3 = maxdist']);
  });
  test('a slider moves by keyboard; the goal and both grids follow', async ({ page }) => {
    await openDemo(page, URL);
    const before = await view(page);
    await page.getByTestId('slider-xc').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).xc).toBe(2);
    const after = await view(page);
    expect(after.x).toBeGreaterThan(before.x + 1);
    expect(after.Theta).toBeCloseTo(Math.atan2(1, 2), 12);
    expect(await shownGrid(page, 'coords-camera')).toEqual(gridText(sphericaldist(2, 1, 15, 4)));
    expect(await shownGrid(page, 'coords-image')).toEqual(gridText(imagePlaneCoor(2, 1, 15, 4)));
    await page.getByTestId('slider-zc').focus();
    await page.keyboard.press('Home');
    await expect.poll(async () => (await state(page)).zc).toBe(10); // {zc, 10, 20, 1}
    await page.getByTestId('slider-r').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).r).toBe(5); // {r, 1, 5} continuous: the machine number 5.
    await expect(page.getByTestId('value-r')).toHaveValue('5.');
  });
  test('show sphere and show drone add the sphere, its silhouette and the drones; (xc, yc) = (0, 0) gives the ring of goals', async ({ page }) => {
    await openDemo(page, URL);
    const ink0 = await page.evaluate(() => window.__demo.inkFraction());
    await page.getByTestId('check-Silhouette').click();
    expect((await state(page)).Silhouette).toBe(true);
    const ink1 = await page.evaluate(() => window.__demo.inkFraction());
    expect(ink1).toBeGreaterThan(ink0 + 0.01); // the translucent sphere and the silhouette
    await page.getByTestId('check-showDrone').click();
    expect((await state(page)).showDrone).toBe(true);
    const drones = () => page.evaluate(() => window.__demo.graphics(0).content.flat(Infinity).filter((g) => g && g.transform && JSON.stringify(g.content).includes('"cylinder"')).length);
    expect(await drones()).toBe(2); // the start (Darker@Green) and the goal (Red), each Translate[…]
    await page.evaluate(() => window.__demo.setState({ xc: 0, yc: 0, zc: 17, r: 3 }));
    expect((await view(page)).infinite).toBe(true);
    expect(await drones()).toBe(22);
    expect(await shownGrid(page, 'coords-camera')).toEqual(['infinite solutions', '(x, y) = 3.0(cos θ, sin θ)', 'z = 16.5', 'θ ∈ (0, 360)∘', 'ϕ = 100.2∘']);
  });
  test('show 2D view switches to the image plane as 2D Graphics with its upside-down label, and back', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('check-imPlaneView').click();
    await expect(page.getByTestId('graphic2')).toBeVisible();
    await expect(page.getByTestId('graphic')).toBeHidden();
    const svg = page.getByTestId('scene-svg');
    await expect(svg).toBeVisible();
    // the label: an <image> placed by the texture map (its top-left corner at the polygon's (-5, 5)), opacity 0.5
    const img = svg.locator('[data-texture] image');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('opacity', '0.5');
    expect(await img.getAttribute('href')).toMatch(/^data:image\/png;base64,/);
    const m = (await img.getAttribute('transform')).match(/matrix\(([^)]*)\)/)[1].split(/\s+/).map(Number);
    [8, 0, -0, -1.4, -5, 5].forEach((v, i) => expect(m[i]).toBeCloseTo(v, 12));
    await expect(svg).toContainText('u');
    await expect(page.getByTestId('theta')).toContainText('θ');
    expect((await view(page)).PlotRange2D).toEqual([[-5.3, 5], [-5.3, 5]]);
    for (const id of ['silhouette', 'drone-start', 'drone-goal']) await expect(page.getByTestId(id)).toHaveCount(0);
    await page.getByTestId('check-Silhouette').click();
    await page.getByTestId('check-showDrone').click();
    for (const id of ['image-plane', 'silhouette', 'drone-start', 'drone-goal']) await expect(page.getByTestId(id)).toHaveCount(1);
    await expect(page.getByTestId('drone-goal').locator('circle')).toHaveCount(5); // four rotors and the red centre
    await page.getByTestId('check-imPlaneView').click();
    await expect(page.getByTestId('graphic')).toBeVisible();
    await expect(page.getByTestId('graphic2')).toBeHidden();
    await expect(page.locator('[data-testid=text3d]')).toHaveCount(9);
  });
  test('the 2D plot range follows its content (PlotRange -> All): drones outside the plane make the picture larger', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ imPlaneView: true }));
    const vb0 = await page.getByTestId('scene-svg').getAttribute('viewBox');
    await page.evaluate(() => window.__demo.setState({ xc: 10, yc: -10, zc: 10, r: 5, showDrone: true, Silhouette: true }));
    const [[x0, x1], [y0]] = (await view(page)).PlotRange2D;
    expect(x0).toBe(-5.3);
    expect(x1).toBeGreaterThan(5);
    expect(y0).toBeLessThan(-5.3);
    expect(await page.getByTestId('scene-svg').getAttribute('viewBox')).not.toBe(vb0); // the picture was made again
  });
  test('animate moves the purple drone at every evaluation (the body evaluates itself again); unchecking stops it', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('check-animation').click();
    await expect.poll(async () => (await state(page)).a, { timeout: 10000 }).not.toBe(0.5); // the click's evaluation: a = 0.6
    const a1 = (await state(page)).a;
    await expect.poll(async () => (await state(page)).a, { timeout: 10000 }).not.toBe(a1); // and it goes on by itself
    const purple = await page.evaluate(() => window.__demo.graphics(0).content.flat(Infinity).filter((g) => g && g.transform && JSON.stringify(g.content).includes('"cylinder"')).length);
    expect(purple).toBe(1); // only the animated drone (show drone is off)
    await page.getByTestId('check-animation').click();
    const a = (await state(page)).a;
    // eight animation frames later nothing has moved (the loop stopped with the click's evaluation)
    const later = await page.evaluate(() => new Promise((res) => { let n = 0; const f = () => (++n < 8 ? requestAnimationFrame(f) : res(window.__demo.getState().a)); requestAnimationFrame(f); }));
    expect(later).toBe(a);
    expect(await page.locator('[data-testid=text3d]').count()).toBe(9);
  });
  test('Initial settings restores the opening state and the 3D view', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ xc: -4, yc: 6, zc: 19, r: 2.5, Silhouette: true, imPlaneView: true, showDrone: true }));
    await expect(page.getByTestId('graphic2')).toBeVisible();
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.getByTestId('graphic')).toBeVisible();
    await expect(page.getByTestId('value-xc')).toHaveValue('1');
    expect(await shownGrid(page, 'coords-camera')).toEqual(['x = 3.6', 'y = 3.6', 'z = 13.6', 'θ = 45.0∘', 'ϕ = 110.8∘']);
  });
  test('review screenshots at the eight snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      const s = await state(page);
      expect(s.imPlaneView).toBe(fx.snapshots[k].imPlaneView);
      await expect(page.getByTestId(s.imPlaneView ? 'graphic2' : 'graphic')).toBeVisible();
      await expect(page.getByTestId('value-r')).toHaveValue(String(fx.snapshots[k].r === 3.4000000000000004 ? 3.4 : fx.snapshots[k].r));
      await reviewShot(page, testInfo, `camera-apparent-velocity-snapshot-${k}`);
    }
  });
});
