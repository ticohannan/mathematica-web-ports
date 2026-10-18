// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei, Muhammad Sultan and Maruthi S. Chemudupati
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/manipulator-workspaces.spec.js — browser tests of the Robot Manipulator Workspaces page (real mouse and
// keyboard). Expected values: the source's formulas (pm, the planar arm's closed form), the stored states and the
// snapshot pixels, never the port. Cross-engine rules: trig results compared to 1e-9, pointers never aimed at a
// snapping boundary, generous colour tolerances for WebGL pixels.
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot, inkAfterContextRestore } from './helpers.js';

const URL = '/demos/manipulator-workspaces/';
const demo = (page, fn, arg) => page.evaluate(fn, arg);
const state = (page) => demo(page, () => window.__demo.getState());
const near = (a, b, tol, what = '') => expect(Math.abs(a - b), `${what} ${a} vs ${b}`).toBeLessThanOrEqual(tol);
const { cos, sin } = Math;
/** IntervalSlider positions -3.1 + k·0.1 */
const pos = (k) => -3.1 + k * 0.1;

/** drag a joint slider's thumb (range input) by dx pixels with the mouse */
async function dragJoint(page, i, dx) {
  const range = page.getByTestId(`slider-params-${i}`);
  const box = await range.boundingBox();
  const frac = await range.evaluate((el) => (Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min)));
  const y = box.y + box.height / 2;
  const x = box.x + 8 + frac * (box.width - 16);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 8 });
  await page.mouse.up();
}
/** drag an IntervalSlider thumb ('lo' | 'hi') of `name` to the slider value v (aimed at a position, not a boundary) */
async function dragThumb(page, name, which, v) {
  const thumb = page.getByTestId(`islider-${name}-${which}`);
  const t = await thumb.boundingBox();
  const track = await page.getByTestId(`islider-${name}`).boundingBox();
  const x0 = t.x + t.width / 2, y0 = t.y + t.height / 2;
  const x1 = track.x + ((v + 3.1) / 6.2) * track.width;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x1, y0, { steps: 10 });
  await page.mouse.up();
}

test.describe('manipulator workspaces', () => {
  // WebGL pages with nine translucent surfaces: slow in software renderers (SwiftShader) and on busy machines
  test.describe.configure({ timeout: 180_000 });

  test('loads without errors and draws the robot, the ground and the workspace', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas-workspace')).toBeVisible();
    expect(await demo(page, () => window.__demo.inkFraction())).toBeGreaterThan(0.05);
    const v = await demo(page, () => window.__demo.view());
    expect(v.surfaces).toHaveLength(9);
    expect(v.surfaces.every((s) => s.vertices === 121 && s.quads === 100 && s.boundary === 41)).toBe(true);
    expect(v.robotFrames).toBe(4); // three joints and the wrist centre
    expect(v.options).toEqual({ SphericalRegion: true, ImageSize: 425, Boxed: false });
    // the saved state: pm = {1., 1., 1.}; planar arm of unit links
    expect(v.pm).toEqual([1, 1, 1]);
    near(v.o3[0], cos(1) + cos(2) + cos(3), 1e-9, 'x');
    near(v.o3[1], sin(1) + sin(2) + sin(3), 1e-9, 'y');
    expect(await demo(page, () => window.__demo.recomputes())).toBe(0); // TypeOld = Type (F-MW-09)
    await reviewShot(page, testInfo, 'manipulator-workspaces-initial');
  });

  test('has the controls of the original with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    for (const i of [1, 2, 3]) {
      await expect(page.getByTestId(`slider-params-${i}`)).toBeVisible();
      await expect(page.getByTestId(`slider-params-${i}`)).toHaveValue('50'); // position k = 50: 0.5
    }
    expect(await demo(page, () => window.__demo.labels())).toEqual(['θ1', 'θ2', 'θ3']);
    await expect(page.locator('[data-testid^=value-]')).toHaveCount(0);
    await expect(page.locator('[data-testid^=plus-]')).toHaveCount(0);
    for (const r of ['r1', 'r2', 'r3']) {
      await expect(page.getByTestId(`islider-${r}-lo`)).toHaveAttribute('aria-valuenow', '0.5');
      await expect(page.getByTestId(`islider-${r}-hi`)).toHaveAttribute('aria-valuenow', '1.5');
    }
    const popup = page.getByTestId('popup-Type');
    await expect(popup.locator('option')).toHaveCount(14);
    await expect(popup.locator('option:checked')).toHaveText('planar robot arm');
    await expect(page.locator('#controls hr.ctl-delimiter')).toHaveCount(2);
    // controls at the left of the picture (ControlPlacement -> Left), in the original's order
    const c = await page.locator('#controls').boundingBox();
    const g = await page.getByTestId('scene-canvas-workspace').boundingBox();
    expect(c.x + c.width).toBeLessThanOrEqual(g.x + 1);
    const y = async (id) => (await page.getByTestId(id).boundingBox()).y;
    expect(await y('slider-params-3')).toBeLessThan(await y('islider-r1'));
    expect(await y('islider-r3')).toBeLessThan(await y('popup-Type'));
  });

  test('dragging a joint slider with the mouse moves the robot but keeps the workspace', async ({ page }) => {
    await openDemo(page, URL);
    const before = await demo(page, () => window.__demo.view());
    await dragJoint(page, 1, 400);
    const s = await state(page);
    expect(s.params).toEqual([1, 0.5, 0.5]);
    const v = await demo(page, () => window.__demo.view());
    expect(v.pm[0]).toBe(1.5);
    near(v.o3[0], cos(1.5) + cos(2.5) + cos(3.5), 1e-9, 'x');
    near(v.o3[1], sin(1.5) + sin(2.5) + sin(3.5), 1e-9, 'y');
    expect(Math.hypot(v.o3[0] - before.o3[0], v.o3[1] - before.o3[1])).toBeGreaterThan(0.1);
    expect(await demo(page, () => window.__demo.recomputes())).toBe(0);
    expect(await demo(page, () => window.__demo.computes())).toBe(1);
  });

  test('dragging an IntervalSlider thumb with the mouse changes the range and recomputes the workspace', async ({ page }) => {
    await openDemo(page, URL);
    await dragJoint(page, 2, -60); // move a joint first: its fraction must survive the range change
    const p0 = (await state(page)).params;
    await dragThumb(page, 'r2', 'hi', 2.5);
    const s = await state(page);
    expect(s.r2[0]).toBe(0.5);
    const k = Math.round((s.r2[1] + 3.1) / 0.1);
    expect(s.r2[1]).toBe(pos(k));
    expect(Math.abs(s.r2[1] - 2.5)).toBeLessThan(0.15);
    expect(s.r2old).toEqual(s.r2);
    // one recompute per range change on the way (each pointer move that changes the value; at least the last)
    expect(await demo(page, () => window.__demo.recomputes())).toBeGreaterThanOrEqual(1);
    expect(s.params).toEqual(p0);
    await expect(page.getByTestId('slider-params-2')).toHaveValue(String(Math.round(p0[1] * 100)));
  });

  test('dragging the lower r1 thumb into the upper pushes it (Method Push, MinIntervalSize 0.1)', async ({ page }) => {
    await openDemo(page, URL);
    await dragThumb(page, 'r1', 'lo', 2.0);
    const s = await state(page);
    const k = Math.round((s.r1[0] + 3.1) / 0.1);
    expect(Math.abs(s.r1[0] - 2.0)).toBeLessThan(0.15);
    expect(s.r1).toEqual([pos(k), pos(k + 1)]);
    await expect(page.getByTestId('islider-r1-hi')).toHaveAttribute('aria-valuenow', String(pos(k + 1)));
  });

  test('arrow keys move a focused IntervalSlider thumb by one step (0.1) with the Push rule', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('islider-r3-hi').focus();
    await page.keyboard.press('ArrowLeft');
    expect((await state(page)).r3).toEqual([0.5, pos(45)]);
    for (let n = 0; n < 12; n++) await page.keyboard.press('ArrowLeft');
    // the upper thumb pushes the lower one down, 0.1 apart
    const s = await state(page);
    expect(s.r3).toEqual([pos(32), pos(33)]);
    expect(await demo(page, () => window.__demo.recomputes())).toBeGreaterThan(1);
  });

  test('choosing another robot rebuilds the joint grid with its labels and resets the sliders to the middle', async ({ page }) => {
    await openDemo(page, URL);
    await dragJoint(page, 2, -100);
    expect((await state(page)).params[1]).toBeLessThan(0.5);
    const rc = await demo(page, () => window.__demo.recomputes());
    await page.getByTestId('popup-Type').selectOption({ label: 'cylindrical robot arm' });
    expect(await demo(page, () => window.__demo.labels())).toEqual(['θ1', 'd2', 'd3']);
    expect((await state(page)).params).toEqual([0.5, 0.5, 0.5]);
    for (const i of [1, 2, 3]) await expect(page.getByTestId(`slider-params-${i}`)).toHaveValue('50');
    expect(await demo(page, () => window.__demo.recomputes())).toBe(rc + 1);
    expect((await state(page)).TypeOld).toBe(6);
  });

  test('Initial settings restores the elbow robot arm of the stored specifications', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('popup-Type').selectOption({ label: 'SCARA robot arm' });
    await dragThumb(page, 'r1', 'lo', -1.0);
    await dragJoint(page, 3, 80);
    const box = await page.getByTestId('scene-canvas-workspace').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual({
      Type: 2, TypeOld: 2, params: [0.5, 0.5, 0.5], r1: [0.5, 1.5], r2: [0.5, 1.5], r3: [0.5, 1.5],
      r1old: [0.5, 1.5], r2old: [0.5, 1.5], r3old: [0.5, 1.5],
    });
    await expect(page.getByTestId('popup-Type').locator('option:checked')).toHaveText('elbow robot arm');
    expect(await demo(page, () => window.__demo.labels())).toEqual(['θ1', 'θ2', 'θ3']);
    await expect(page.getByTestId('islider-r1-lo')).toHaveAttribute('aria-valuenow', '0.5');
    // the default view: the viewing direction is Mathematica's ViewPoint {1.3, -2.4, 2}
    const cam = await demo(page, () => window.__demo.camera());
    const d = cam.position.map((x, i) => x - cam.target[i]);
    const n = Math.hypot(...d), vp = [1.3, -2.4, 2], m = Math.hypot(...vp);
    d.forEach((x, i) => near(x / n, vp[i] / m, 1e-6, `direction ${i}`));
    // elbow arm at pm = (1, 1, 1): o3 = (cos 1 (cos 1 + cos 2), sin 1 (cos 1 + cos 2), 2 + sin 1 + sin 2)
    const v = await demo(page, () => window.__demo.view());
    near(v.o3[0], cos(1) * (cos(1) + cos(2)), 1e-9, 'x');
    near(v.o3[2], 2 + sin(1) + sin(2), 1e-9, 'z');
  });

  test('dragging in the picture rotates the view', async ({ page }) => {
    await openDemo(page, URL);
    const s0 = await state(page);
    const before = await demo(page, () => window.__demo.cameraPosition());
    const box = await page.getByTestId('scene-canvas-workspace').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 10, { steps: 6 });
    await page.mouse.up();
    const after = await demo(page, () => window.__demo.cameraPosition());
    expect(Math.hypot(...after.map((v, i) => v - before[i]))).toBeGreaterThan(0.5);
    expect(await state(page)).toEqual(s0);
    // the rotation is kept when a joint slider moves (D-MW-07); the refit for the moved arm keeps the direction
    const dir = (c) => { const d = c.position.map((x, i) => x - c.target[i]); const n = Math.hypot(...d); return d.map((x) => x / n); };
    const rotated = dir(await demo(page, () => window.__demo.camera()));
    await page.getByTestId('slider-params-3').focus();
    await page.keyboard.press('ArrowRight');
    expect((await state(page)).params[2]).toBe(0.51);
    const kept = dir(await demo(page, () => window.__demo.camera()));
    expect(Math.hypot(...kept.map((x, i) => x - rotated[i]))).toBeLessThan(1e-9);
  });

  test('the ground top is peach and the workspace translucent as in snapshot 1 (Mathematica colours)', async ({ page }) => {
    await openDemo(page, URL);
    // a point of the ground top away from the arm and the workspace
    const ground = await demo(page, () => window.__demo.pixelAt([0.6, -1.4, -0.25]));
    // tolerances as robot-singularities' ground check (15, 15, 30): the lighting model differs slightly (D-MW-02)
    [250, 200, 149].forEach((c, i) => expect(Math.abs(ground[i] - c), `ground ${ground}`).toBeLessThanOrEqual([15, 15, 30][i]));
    // a workspace point beyond the far rim of the disc (planar arm q = (0.9, 0.6, 0.6): r = 2.65 > 2.2), over white
    const q = [0.9, 1.5, 2.1];
    const p = [cos(q[0]) + cos(q[1]) + cos(q[2]), sin(q[0]) + sin(q[1]) + sin(q[2]), 0];
    const ws = await demo(page, (pt) => window.__demo.pixelAt(pt), p);
    [232, 210, 173].forEach((c, i) => expect(Math.abs(ws[i] - c), `workspace ${ws}`).toBeLessThanOrEqual(25));
  });

  test('review screenshots at the eight snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const S = [
      { Type: 1, r1: [0.5, 1.5] },
      { Type: 7, r1: [0.3999999999999999, 1.5000000000000004], r2: [-0.8999999999999999, 0.8999999999999999] },
      { Type: 10, r1: [0.48, 1.4999999999999996] },
      { Type: 12, r1: [0.3700000000000001, 1.4999999999999996] },
      { Type: 11, r1: [0.5, 1.8400000000000003] },
      { Type: 6, r1: [0.54, 1.4999999999999996] },
      { Type: 5, r1: [-0.8799999999999999, 0.9300000000000002], r2: [-0.8799999999999999, 0.9300000000000002] },
      { Type: 13, r1: [0.48, 1.4999999999999996] },
    ];
    for (const [i, s] of S.entries()) {
      await demo(page, (st) => window.__demo.setState(st), { params: [0.5, 0.5, 0.5], r2: [0.5, 1.5], r3: [0.5, 1.5], ...s });
      expect(await demo(page, () => window.__demo.inkFraction())).toBeGreaterThan(0.05);
      await reviewShot(page, testInfo, `manipulator-workspaces-snapshot-${i + 1}`);
    }
  });

  test('the view redraws after a WebGL context loss', async ({ page }) => {
    await openDemo(page, URL);
    expect(await demo(page, () => window.__demo.inkFraction())).toBeGreaterThan(0.05);
    const r = await inkAfterContextRestore(page, '[data-testid=scene-canvas-workspace]');
    test.skip(!r.supported, 'WEBGL_lose_context not offered by this browser');
    expect(r.ink).toBeGreaterThan(0.05);
  });
});
