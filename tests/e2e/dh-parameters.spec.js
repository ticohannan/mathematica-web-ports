// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/dh-parameters.spec.js — browser tests of the Denavit-Hartenberg parameters page (real mouse and keyboard).
// Expected values: the source's formulas (closed form of the elbow arm, DrawJoint / DrawGripper), never the port.
// Cross-engine rules: trig results compared to 1e-9, pointers never aimed at a snapping boundary.
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot, inkAfterContextRestore } from './helpers.js';

const URL = '/demos/dh-parameters/';
const demo = (page, fn, arg) => page.evaluate(fn, arg);
const state = (page) => demo(page, () => window.__demo.getState());
const near = (a, b, tol, what = '') => expect(Math.abs(a - b), `${what} ${a} vs ${b}`).toBeLessThanOrEqual(tol);
const OPENING_LABELS = { theta1: '5π/32', d1: '1', r1: '0', alpha1: 'π/2', theta2: 'π/4', d2: '0', r2: '1', alpha2: '0', theta3: '−3π/8', d3: '0', r3: '1', alpha3: '0', g: '1' };
const SLIDERS = Object.keys(OPENING_LABELS);

/** press on the slider's thumb and drag it past one end of the track (dir −1: left, +1: right) */
async function dragSliderPastEnd(page, name, dir, px = 400) {
  const range = page.getByTestId(`slider-${name}`);
  const box = await range.boundingBox();
  const frac = await range.evaluate((el) => (Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min)));
  const y = box.y + box.height / 2;
  const x = box.x + 8 + frac * (box.width - 16); // the thumb (about 16 px wide) travels inside the track
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dir * px, y, { steps: 8 });
  await page.mouse.up();
}
/**
 * press on the slider's thumb and drag it to the CENTRE of position `k` of the range input (never near a boundary
 * between two positions), in a few moves; then nudge pixel by pixel until the input shows k (layout rounding)
 */
async function dragSliderTo(page, name, k) {
  const range = page.getByTestId(`slider-${name}`);
  const box = await range.boundingBox();
  const [min, max, v0] = await range.evaluate((el) => [Number(el.min), Number(el.max), Number(el.value)]);
  const xAt = (v) => box.x + 8 + ((v - min) / (max - min)) * (box.width - 16); // the thumb travels inside the track
  const y = box.y + box.height / 2;
  await page.mouse.move(xAt(v0), y);
  await page.mouse.down();
  let x = xAt(k);
  await page.mouse.move(x, y, { steps: 5 });
  for (let i = 0; i < 12; i++) {
    const v = await range.evaluate((el) => Number(el.value));
    if (v === k) break;
    x += v < k ? 1 : -1;
    await page.mouse.move(x, y);
  }
  await page.mouse.up();
}

test.describe('dh parameters', () => {
  test('loads without errors and draws the ground and the arm', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas-workspace')).toBeVisible();
    expect(await demo(page, () => window.__demo.inkFraction())).toBeGreaterThan(0.05);
    const v = await demo(page, () => window.__demo.view());
    expect(v.parts.map((p) => p.part)).toEqual(['ground', 'joint1', 'joint2', 'joint3', 'gripper']);
    expect(v.parts.every((p) => p.count > 0)).toBe(true);
    expect(v.counts.cylinder).toBe(7); // ground + 3 × (axis, body)
    await reviewShot(page, testInfo, 'dh-parameters-initial');
  });

  test('has the controls of the original with their defaults (13 labelled sliders, 3 setter bars, 3 delimiters)', async ({ page }) => {
    await openDemo(page, URL);
    for (const n of SLIDERS) {
      await expect(page.getByTestId(`slider-${n}`)).toBeVisible();
      await expect(page.getByTestId(`value-${n}`)).toHaveValue(OPENING_LABELS[n]);
      await expect(page.getByTestId(`plus-${n}`)).toBeVisible();
    }
    await expect(page.locator('[data-testid^=plus-]')).toHaveCount(13);
    for (const k of [1, 2, 3]) {
      await expect(page.getByTestId(`setter-j${k}-Revolute`)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId(`setter-j${k}-Prismatic`)).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(page.locator('#controls hr.ctl-delimiter')).toHaveCount(3);
    await expect(page.getByTestId('ctl-g')).toContainText('grip');
    // controls at the left of the picture (snapshots)
    const c = await page.locator('#controls').boundingBox();
    const g = await page.getByTestId('scene-canvas-workspace').boundingBox();
    expect(c.x + c.width).toBeLessThanOrEqual(g.x + 1);
  });

  test('dragging the θ1 slider with the mouse turns the arm about the vertical axis and the label shows exact fractions of π', async ({ page }) => {
    await openDemo(page, URL);
    await dragSliderTo(page, 'theta1', 32); // position 32 of 0 … 64 (−π + 32·π/32 = 0)
    const s = await state(page);
    expect(s.theta[0]).toBe(0);
    await expect(page.getByTestId('value-theta1')).toHaveValue('0');
    const o = (await demo(page, () => window.__demo.transforms())).origins[2];
    near(o[0], Math.cos(Math.PI / 4) + Math.cos(Math.PI / 8), 1e-9, 'x');
    near(o[0], 1.630986, 1e-6, 'x');
    near(o[1], 0, 1e-12, 'y');
    near(o[2], 1.324423, 1e-6, 'z');
    // on the way the label showed exact fractions: one step right is π/32
    await page.getByTestId('slider-theta1').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('value-theta1')).toHaveValue('π/32');
  });

  test('Prismatic for j3 draws a cube joint and a long translucent axis bar', async ({ page }) => {
    await openDemo(page, URL);
    const before = await demo(page, () => window.__demo.transforms());
    await page.getByTestId('setter-j3-Prismatic').click();
    await expect(page.getByTestId('setter-j3-Prismatic')).toHaveAttribute('aria-pressed', 'true');
    const prims = await demo(page, () => window.__demo.primitives('joint3'));
    const cub = prims.filter((p) => p.type === 'cuboid');
    expect(prims.filter((p) => p.type === 'cylinder')).toHaveLength(0);
    const [axis, body] = cub;
    near(axis.max[2] - axis.min[2], 1.22, 1e-12, 'axis length');
    expect(axis.opacity).toBe(0.5);
    expect(body.max.map((v, i) => v - body.min[i])).toEqual([0.4, 0.4, 0.4]);
    expect(await demo(page, () => window.__demo.transforms())).toEqual(before); // Q-DH-01
  });

  test('r3 = 0 turns the gripper to point along z', async ({ page }) => {
    await openDemo(page, URL);
    await dragSliderPastEnd(page, 'r3', -1);
    await expect(page.getByTestId('value-r3')).toHaveValue('0.');
    expect((await state(page)).r[2]).toBe(0);
    const prims = await demo(page, () => window.__demo.primitives('gripper'));
    const t = await demo(page, () => window.__demo.transforms());
    const palm = prims.find((p) => p.type === 'cuboid');
    expect([palm.min, palm.max]).toEqual([[-0.2, -0.05, -0.1], [0.2, 0.05, 0]]);
    expect(palm.matrix).toEqual(t.T123);
  });

  test('the grip slider opens and closes the gripper', async ({ page }) => {
    await openDemo(page, URL);
    const gap = async () => {
      const f = (await demo(page, () => window.__demo.primitives('gripper'))).filter((p) => p.type === 'cuboid').slice(1);
      const lo = (p) => Math.min(p.min[2], p.max[2]), hi = (p) => Math.max(p.min[2], p.max[2]);
      return lo(f[0]) - hi(f[1]); // fingers at +z and −z (r3 = 1: hand along x): the gap between them
    };
    await dragSliderPastEnd(page, 'g', -1);
    expect((await state(page)).g).toBe(0);
    near(await gap(), 0, 1e-15, 'closed');
    await dragSliderPastEnd(page, 'g', 1);
    expect((await state(page)).g).toBe(1);
    near(await gap(), 0.2, 1e-15, 'open');
    await expect(page.getByTestId('value-g')).toHaveValue('1.');
  });

  test('typing into the d1 value field sets d1 (clamped to 0..1)', async ({ page }) => {
    await openDemo(page, URL);
    const field = page.getByTestId('value-d1');
    await field.fill('0.5');
    await field.press('Enter');
    expect((await state(page)).d[0]).toBe(0.5);
    near((await demo(page, () => window.__demo.transforms())).T1[2][3], 0.5, 1e-15, 'T1 origin z');
    await field.fill('2');
    await field.press('Enter');
    expect((await state(page)).d[0]).toBe(1);
    await expect(field).toHaveValue('1.');
  });

  test('the ⊕ panel of θ1 animates the arm', async ({ page }) => {
    await openDemo(page, URL);
    const before = (await demo(page, () => window.__demo.transforms())).origins[2];
    // the page clock fixed (v0.1.25): one second of clock time moves θ1 by 64/8 steps of π/32, from 5π/32 to 13π/32
    const T = 3.8e9;
    await page.evaluate((t) => window.__demo.setClock(t), T);
    await page.getByTestId('plus-theta1').click();
    await page.getByTestId('play-theta1').click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); // the animation's first frame has run
    await page.evaluate((t) => window.__demo.setClock(t), T + 1);
    await expect.poll(async () => (await state(page)).theta[0]).toBe(13);
    await page.getByTestId('play-theta1').click();
    await page.evaluate(() => window.__demo.setClock(null));
    const s = await state(page);
    expect(s.theta[0]).not.toBe(5);
    expect(Number.isInteger(s.theta[0])).toBe(true);
    await expect(page.getByTestId('value-theta1')).toHaveValue(/^(0|−?\d*π(\/\d+)?)$/);
    const after = (await demo(page, () => window.__demo.transforms())).origins[2];
    expect(Math.hypot(...after.map((v, i) => v - before[i]))).toBeGreaterThan(1e-3);
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
    // the rotation is kept when a control changes (D-DH-05)
    await page.getByTestId('setter-j2-Prismatic').click();
    const kept = await demo(page, () => window.__demo.cameraPosition());
    expect(Math.hypot(...kept.map((v, i) => v - after[i]))).toBeLessThan(1e-9);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-j1-Prismatic').click();
    await page.getByTestId('slider-alpha2').focus();
    await page.keyboard.press('ArrowLeft');
    const field = page.getByTestId('value-r1');
    await field.fill('0.3');
    await field.press('Enter');
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual({
      j: ['Revolute', 'Revolute', 'Revolute'], theta: [5, 8, -12], d: [1, 0, 0], r: [0, 1, 1], alpha: [16, 0, 0], g: 1,
      exact: { d: [true, true, true], r: [true, true, true], g: true },
    });
    for (const n of SLIDERS) await expect(page.getByTestId(`value-${n}`)).toHaveValue(OPENING_LABELS[n]);
    await expect(page.getByTestId('setter-j1-Revolute')).toHaveAttribute('aria-pressed', 'true');
  });

  test('the camera framing follows the arm: the planar arm (snapshot 4) is drawn larger than the opening arm', async ({ page }) => {
    await openDemo(page, URL);
    const fov1 = (await demo(page, () => window.__demo.camera())).fov;
    await demo(page, () => window.__demo.setState({ j: ['Revolute', 'Revolute', 'Revolute'], theta: [0, -9, -6], d: [0, 0, 0], r: [0.8, 0.8, 0.5], alpha: [0, 0, -16], g: 1, exact: { d: [false, false, false], r: [false, false, false], g: true } }));
    const fov4 = (await demo(page, () => window.__demo.camera())).fov;
    expect(fov4).toBeLessThan(fov1);
    await expect(page.getByTestId('value-alpha3')).toHaveValue('−π/2');
    await expect(page.getByTestId('value-d1')).toHaveValue('0.');
  });

  test('review screenshots at the five snapshot states', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const S = [
      { j: ['Revolute', 'Revolute', 'Revolute'], theta: [5, 8, -12], d: [1, 0, 0], r: [0, 1, 1], alpha: [16, 0, 0], g: 1, exact: { d: [true, true, true], r: [true, true, true], g: true } },
      { j: ['Revolute', 'Revolute', 'Prismatic'], theta: [-26, 7, 0], d: [1, 0, 0.81], r: [1, 1, 0], alpha: [0, 32, 0], g: 0.52, exact: { d: [false, false, false], r: [false, false, false], g: false } },
      { j: ['Revolute', 'Prismatic', 'Prismatic'], theta: [-6, 0, 0], d: [1, 0.74, 0.89], r: [0, 0, 0], alpha: [0, -16, 0], g: 1, exact: { d: [false, false, false], r: [false, false, false], g: true } },
      { j: ['Revolute', 'Revolute', 'Revolute'], theta: [0, -9, -6], d: [0, 0, 0], r: [0.8, 0.8, 0.5], alpha: [0, 0, -16], g: 1, exact: { d: [false, false, false], r: [false, false, false], g: true } },
      { j: ['Revolute', 'Revolute', 'Revolute'], theta: [5, 5, 27], d: [1, 0, 0.77], r: [0, 0, 0], alpha: [-16, 16, 0], g: 0.49, exact: { d: [true, false, false], r: [true, false, false], g: false } },
    ];
    for (const [i, s] of S.entries()) {
      await demo(page, (st) => window.__demo.setState(st), s);
      expect(await demo(page, () => window.__demo.inkFraction())).toBeGreaterThan(0.05);
      await reviewShot(page, testInfo, `dh-parameters-snapshot-${i + 1}`);
    }
  });

  test('redraws after a WebGL context loss (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    expect(await demo(page, () => window.__demo.inkFraction())).toBeGreaterThan(0.05);
    const r = await inkAfterContextRestore(page, '[data-testid=scene-canvas-workspace]');
    test.skip(!r.supported, 'WEBGL_lose_context not offered by this browser');
    expect(r.ink).toBeGreaterThan(0.05);
  });
});
