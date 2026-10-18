// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/manipulability-ellipsoid.spec.js — browser tests of the "Manipulability Ellipsoid of a Robot Arm" page with
// the real mouse and keyboard. Expected values: the TESTPLAN rows T-ME-48 … T-ME-56 (closed forms, NumPy values of the
// plan, the saved state), never the port. Trig results are compared to ~1e-9, pointers are aimed at the middle of a
// π/32 step (never near a snapping boundary).
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot, inkAfterContextRestore } from './helpers.js';

const URL = '/demos/manipulability-ellipsoid/';
const demo = (page, fn, arg) => page.evaluate(fn, arg);
const state = (page) => demo(page, () => window.__demo.getState());
const dialToClient = (page, i, p) => demo(page, ([k, q]) => window.__demo.dialToClient(k, q), [i, p]);
const handAngle = (page, i) => page.locator(`[data-testid=dial-svg-p${i}] [data-layer=hand]`).getAttribute('data-ang').then(Number);
const near = (a, b, tol, what = '') => expect(Math.abs(a - b), `${what} ${a} vs ${b}`).toBeLessThanOrEqual(tol);
const OPENING = { k: [19, 18, -21], kprev: [19, 18, -21], m: [19, 18, -21] };
const at = (deg, r = 1) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];

test.describe('manipulability ellipsoid', () => {
  test('loads without errors and draws the robot, the ellipsoid and three dials', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas-workspace')).toBeVisible();
    await expect.poll(() => demo(page, () => window.__demo.inkFraction())).toBeGreaterThan(0.02);
    for (const i of [1, 2, 3]) {
      await expect(page.getByTestId(`dial-p${i}`)).toHaveCount(1);
      await expect(page.getByTestId(`locator-p${i}`)).toHaveCount(1);
    }
    const e = await demo(page, () => window.__demo.ellipsoid());
    expect(e.rank).toBe(3);
    expect(e).toMatchObject({ arrows: { blue: 2, red: 2, green: 2 }, rings: { blue: 1, red: 1, green: 1 }, ellipsoid: 1 });
    const prims = await demo(page, () => window.__demo.primitives());
    expect(prims.filter((p) => p.type === 'cylinder')).toHaveLength(6); // red base, gray shaft, two links, blue and green joint cylinders
    await expect(page.locator('[data-testid=requirements-notice]')).toHaveCount(0);
    await reviewShot(page, testInfo, 'manipulability-ellipsoid-initial');
  });

  test('has the controls of the original with their saved values (μ = 671.892×10^-3)', async ({ page }) => {
    await openDemo(page, URL);
    const order = await page.locator('#controls > [data-testid^=ctl-]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    expect(order).toEqual(['ctl-p1', 'ctl-p2', 'ctl-p3']);
    for (const [i, lab] of [[1, 'θ₁'], [2, 'θ₂'], [3, 'θ₃']]) await expect(page.getByTestId(`ctl-p${i}`).locator('.ctl-label')).toHaveText(lab);
    near(await handAngle(page, 1), (19 * Math.PI) / 32, 1e-12, 'θ1 hand');
    near(await handAngle(page, 2), (9 * Math.PI) / 16, 1e-12, 'θ2 hand');
    near(await handAngle(page, 3), (-21 * Math.PI) / 32, 1e-12, 'θ3 hand');
    await expect(page.getByTestId('mu-label')).toHaveAttribute('data-text', '671.892×10^-3');
    await expect(page.getByTestId('mu-label')).toHaveText('671.892×10−3');
    await expect(page.locator('.me-mu')).toContainText('Manipulability μ =');
    expect(await state(page)).toEqual(OPENING);
    // ControlPlacement -> Left
    const c = await page.locator('#controls').boundingBox(), g = await page.getByTestId('graphic').boundingBox();
    expect(c.x + c.width).toBeLessThanOrEqual(g.x + 1);
    // the stored dial has the automatic size (about 180 px), not the Input cell's ImageSize -> 140 (F-ME-01)
    const d = await page.getByTestId('dial-svg-p1').boundingBox();
    near(d.width, 180, 2, 'dial image width');
    // its unit circle as drawn: 173 px across (snapshot 1: 346 px at 2 px per pt, golden "snapshot 1 dial circles are 346 px across …")
    const [left, right] = [await dialToClient(page, 1, [-1, 0]), await dialToClient(page, 1, [1, 0])];
    near(right.x - left.x, 346 / 2, 346 / 2 * 0.03, 'dial circle diameter');
    // the dials are stacked about 189 pt apart (snapshot 1: 378 px at 2 px per pt)
    const d2 = await page.getByTestId('dial-svg-p2').boundingBox();
    near(d2.y - d.y, 189, 189 * 0.03, 'dial spacing');
  });

  test('a press in the θ3 dial moves its hand to the nearest multiple of π/32 and updates μ', async ({ page }) => {
    await openDemo(page, URL);
    const c = await dialToClient(page, 3, at(30, 0.8)); // 30° = 5.33 steps of π/32
    await page.mouse.click(c.x, c.y);
    const s = await state(page);
    expect(s.k[2]).toBe(5);
    expect(s.m[2]).toBe(5);
    near(await handAngle(page, 3), (5 * Math.PI) / 32, 1e-12, 'θ3 hand');
    await expect(page.getByTestId('mu-label')).toHaveAttribute('data-text', '391.016×10^-3');
    near((await demo(page, () => window.__demo.mu())).value, 0.39101586520380616, 1e-12, 'μ');
  });

  test('dragging the θ1 dial locator turns the arm about the vertical axis', async ({ page }) => {
    test.slow(); // every drag step redraws the WebGL picture (slow in software rendering)
    await openDemo(page, URL);
    const start = await dialToClient(page, 1, at((19 * 180) / 32));
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const a of [90, 60, 30, 0]) { // along the rim, clockwise; 0 lies in the middle of a π/32 step
      const p = await dialToClient(page, 1, at(a));
      await page.mouse.move(p.x, p.y, { steps: 2 });
    }
    await page.mouse.up();
    const s = await state(page);
    expect(s.k[0]).toBe(0);
    const o = await demo(page, () => window.__demo.points());
    near(o.oc[0], 0.7618500, 1e-6, 'oc x');
    near(o.oc[0], Math.cos((9 * Math.PI) / 16) + Math.cos((-3 * Math.PI) / 32), 1e-12, 'oc x closed form');
    expect(o.oc[1]).toBe(0);
    near(o.oc[2], 2.6905006, 1e-6, 'oc z');
    await expect(page.getByTestId('mu-label')).toHaveAttribute('data-text', '671.892×10^-3');
  });

  test('θ3 = π (a press at the left of the θ3 dial) folds the arm and leaves only the blue arrows and ring', async ({ page }) => {
    await openDemo(page, URL);
    const c = await dialToClient(page, 3, [-0.9, 0]);
    await page.mouse.click(c.x, c.y);
    expect((await state(page)).k[2]).toBe(32);
    const o = await demo(page, () => window.__demo.points());
    o.oc.forEach((x, i) => near(x, [0, 0, 2][i], 1e-15, `oc[${i}]`)); // r2 s2 + r3 s23 = 0 when θ3 = π, plus d1 = 2
    const e = await demo(page, () => window.__demo.ellipsoid());
    expect(e.rank).toBe(1);
    expect(e.S.slice(1)).toEqual([0, 0]);
    expect(e).toMatchObject({ arrows: { blue: 2, red: 0, green: 0 }, rings: { blue: 1, red: 0, green: 0 }, ellipsoid: 0 });
    await expect(page.getByTestId('mu-label')).toHaveAttribute('data-text', '0.');
  });

  test('arrow keys on a focused dial step by π/32 (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-p2').focus();
    await page.keyboard.press('ArrowRight');
    expect((await state(page)).k[1]).toBe(19);
    await page.keyboard.press('ArrowRight');
    expect((await state(page)).k[1]).toBe(20);
    await page.keyboard.press('Shift+ArrowLeft');
    expect((await state(page)).k[1]).toBe(16);
    near(await handAngle(page, 2), Math.PI / 2, 1e-12, 'θ2 hand');
  });

  test('dragging in the workspace picture rotates the view', async ({ page }) => {
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
    // the rotation is kept when a dial moves (D-ME-08)
    await page.getByTestId('locator-p1').focus();
    await page.keyboard.press('ArrowRight');
    const kept = await demo(page, () => window.__demo.cameraPosition());
    expect(Math.hypot(...kept.map((v, i) => v - after[i]))).toBeLessThan(1e-9);
  });

  test('the workspace is clipped at the plot range (clipping planes x = ±3.5, y = ±4, z = -1 and 5)', async ({ page }) => {
    await openDemo(page, URL);
    const planes = await demo(page, () => window.__demo.clipping());
    // THREE.Plane: n·p + c >= 0 is kept
    expect(planes).toEqual([
      { normal: [-1, 0, 0], constant: 3.5 }, { normal: [1, 0, 0], constant: 3.5 },
      { normal: [0, -1, 0], constant: 4 }, { normal: [0, 1, 0], constant: 4 },
      { normal: [0, 0, -1], constant: 5 }, { normal: [0, 0, 1], constant: 1 },
    ]);
    const extentZ = async () => {
      const { S, U } = await demo(page, () => window.__demo.svd());
      const oc = (await demo(page, () => window.__demo.points())).oc;
      const h = Math.hypot(U[2][0] * S[0], U[2][1] * S[1], U[2][2] * S[2]);
      return [oc[2] - h, oc[2] + h];
    };
    await demo(page, () => window.__demo.setState({ k: [61, 23, 3] }));
    near((await extentZ())[1], 5.01384, 1e-5, 'ellipsoid top');
    let cov = await demo(page, () => window.__demo.clipCoverage());
    expect(cov.clipped).toBe(cov.total);
    expect(cov.total).toBeGreaterThan(10);
    await demo(page, () => window.__demo.setState({ k: [10, -23, -3] }));
    near((await extentZ())[0], -1.01384, 1e-5, 'ellipsoid bottom');
    cov = await demo(page, () => window.__demo.clipCoverage());
    expect(cov.clipped).toBe(cov.total);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    for (const i of [1, 2, 3]) {
      const c = await dialToClient(page, i, at(-100 + 37 * i, 0.6));
      await page.mouse.click(c.x, c.y);
    }
    const box = await page.getByTestId('scene-canvas-workspace').boundingBox();
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 180, box.y + 120, { steps: 4 });
    await page.mouse.up();
    expect(await state(page)).not.toEqual(OPENING);
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(OPENING);
    await expect(page.getByTestId('mu-label')).toHaveAttribute('data-text', '671.892×10^-3');
    near(await handAngle(page, 3), (-21 * Math.PI) / 32, 1e-12, 'θ3 hand');
  });

  test('review screenshots at the four snapshot states', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const S = [
      OPENING,
      { k: [{ r: 1.1311921798353952 }, 0, 8], kprev: [{ r: 1.1311921798353952 }, 0, 8], m: [{ p: [0.42558128300629366, 0.9049202017607503] }, 0, 8] },
      { k: [{ r: 0.8929626109272769 }, 0, 8], kprev: [{ r: 0.8929626109272768 }, 0, 8], m: [{ p: [0.6271071064982527, 0.7789330375451982] }, 0, 8] },
      { k: [59, 0, 8], kprev: [59, 0, 8], m: [-5, 0, 8] },
    ];
    const MU = ['671.892×10^-3', '1.20711', '1.20711', '1.20711'];
    for (const [i, s] of S.entries()) {
      expect(await demo(page, (st) => window.__demo.setState(st), s)).toEqual(s); // fixed points of one evaluation
      await expect(page.getByTestId('mu-label')).toHaveAttribute('data-text', MU[i]);
      expect(await demo(page, () => window.__demo.inkFraction())).toBeGreaterThan(0.02);
      await reviewShot(page, testInfo, `manipulability-ellipsoid-snapshot-${i + 1}`);
    }
  });

  test('redraws after a WebGL context loss (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await expect.poll(() => demo(page, () => window.__demo.inkFraction())).toBeGreaterThan(0.02);
    const r = await inkAfterContextRestore(page, '[data-testid=scene-canvas-workspace]');
    test.skip(!r.supported, 'WEBGL_lose_context not offered by this browser');
    expect(r.ink).toBeGreaterThan(0.02);
  });
});
