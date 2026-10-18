// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/arm-configurations.spec.js — browser tests of the Common Robot Arm Configurations page (real mouse and
// keyboard). Expected values: the snapshots, the source's formulas and an independent NumPy DH product, never the port.
// Cross-engine rules: no last-bit trig expectations (the exact angles give exact 0 and ±1), pointers never aimed at
// a snapping boundary (drags move until the state is reached), WebGL pixels only with generous tolerances.
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot, inkAfterContextRestore } from './helpers.js';

const URL = '/demos/arm-configurations/';
const demo = (page, fn, arg) => page.evaluate(fn, arg);
const state = (page) => demo(page, () => window.__demo.getState());
const hText = (page) => page.getByTestId('h-matrix').locator('tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent).join(' ')).join(' / '));
const H_OPENING = '1. 0. 0. 2. / 0. -1. 0. 0. / 0. 0. -1. 0.25 / 0. 0. 0. 1.';
const near = (a, b, tol, what = '') => expect(Math.abs(a - b), `${what} ${a} vs ${b}`).toBeLessThanOrEqual(tol);

/** press on the slider's thumb, then move the mouse in small steps until `done(state)` holds (or the track ends) */
async function dragSliderUntil(page, testid, dir, done, maxPx = 400) {
  const range = page.getByTestId(testid);
  const box = await range.boundingBox();
  const frac = await range.evaluate((el) => (Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min)));
  const y = box.y + box.height / 2;
  let x = box.x + 8 + frac * (box.width - 16); // the thumb (about 16 px wide) travels inside the track
  await page.mouse.move(x, y);
  await page.mouse.down();
  if (!done) {
    await page.mouse.move(x + dir * maxPx, y, { steps: 8 });
    await page.mouse.up();
    return;
  }
  for (let px = 0; px < maxPx; px += 1) {
    x += dir;
    await page.mouse.move(x, y);
    if (done(await state(page))) break;
  }
  await page.mouse.up();
}
/**
 * press on the slider's thumb and drag it to the CENTRE of position `k` of the range input (never near a boundary
 * between two positions), in a few moves; then nudge pixel by pixel until the input shows k (layout rounding)
 */
async function dragSliderTo(page, testid, k) {
  const range = page.getByTestId(testid);
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
const choose = (page, name) => page.getByTestId('popup-DHParameters').selectOption({ label: name });
const tableColumn = (page, col) => page.getByTestId('dh-table').locator('tr').evaluateAll((trs, c) => trs.slice(1).map((tr) => tr.children[c].textContent), col);

test.describe('arm configurations', () => {
  test('loads without errors and draws the ground, the arm and H', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas-workspace')).toBeVisible();
    expect(await demo(page, () => window.__demo.inkFraction())).toBeGreaterThan(0.05);
    expect(await hText(page)).toBe(H_OPENING);
    const v = await demo(page, () => window.__demo.view());
    expect(v.parts.map((p) => p.part)).toEqual(['ground', 'joint1', 'joints', 'gripper']);
    expect(v.dof).toBe(6);
    // six joints: joint 1 + five transformed joints, each with one body cylinder (revolute) and one axis cylinder
    expect(v.parts[1].counts.cylinder + v.parts[2].counts.cylinder).toBe(12);
    expect(v.counts.cylinder).toBe(13); // + the ground
    await reviewShot(page, testInfo, 'arm-configurations-initial');
  });

  test('has the controls of the original with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    for (let i = 1; i <= 6; i++) {
      await expect(page.getByTestId(`slider-params-${i}`)).toBeVisible();
      await expect(page.getByTestId(`value-params-${i}`)).toHaveText('0');
      await expect(page.getByTestId(`ctl-params-${i}`)).toContainText(`θ${i}*`);
    }
    await expect(page.locator('[data-testid^=slider-params-]')).toHaveCount(6);
    await expect(page.locator('[data-testid^=plus-params]')).toHaveCount(0);
    await expect(page.getByTestId('value-g')).toHaveValue('1');
    await expect(page.getByTestId('plus-g')).toBeVisible();
    await expect(page.getByTestId('ctl-g')).toContainText('grip');
    await expect(page.getByTestId('check-showRobot')).toBeChecked();
    await expect(page.getByTestId('ctl-showRobot')).toContainText('show robot');
    await expect(page.getByTestId('popup-DHParameters').locator('option:checked')).toHaveText('anthropomorphic');
    await expect(page.getByTestId('popup-DHParameters').locator('option')).toHaveText(['planar elbow', 'elbow robot', 'anthropomorphic', 'Stanford robot', 'cylindrical robot', 'spherical robot', 'SCARA robot', 'Cartesian robot', 'CNC robot']);
    await expect(page.locator('#controls')).toContainText('DH parameters for robot arm');
    await expect(page.getByTestId('dh-table').locator('tr')).toHaveCount(7);
    await expect(page.getByTestId('dh-table').locator('tr').first()).toHaveText('jointtyperαd0');
    // controls at the left of the picture (ControlPlacement -> Left)
    const c = await page.locator('#controls').boundingBox();
    const g = await page.getByTestId('scene-canvas-workspace').boundingBox();
    expect(c.x + c.width).toBeLessThanOrEqual(g.x + 1);
    // the order of the original's column: grid, grip, show robot, caption, popup, table
    const ys = [];
    for (const id of ['slider-params-6', 'slider-g', 'check-showRobot', 'popup-DHParameters', 'dh-table']) ys.push((await page.getByTestId(id).boundingBox()).y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });

  test('choosing planar elbow rebuilds two θ* sliders and H reads 2.5', async ({ page }) => {
    await openDemo(page, URL);
    await choose(page, 'planar elbow');
    await expect(page.locator('[data-testid^=slider-params-]')).toHaveCount(2);
    for (const i of [1, 2]) await expect(page.getByTestId(`value-params-${i}`)).toHaveText('0');
    expect(await hText(page)).toBe('1. 0. 0. 2.5 / 0. 1. 0. 0. / 0. 0. 1. 0. / 0. 0. 0. 1.');
    expect((await state(page)).dof).toBe(2);
  });

  test("choosing CNC robot shows three d* sliders at 0.5 and the table's θ column -π/2, -π/2, 0", async ({ page }) => {
    await openDemo(page, URL);
    await choose(page, 'CNC robot');
    await expect(page.locator('[data-testid^=slider-params-]')).toHaveCount(3);
    for (const i of [1, 2, 3]) {
      await expect(page.getByTestId(`value-params-${i}`)).toHaveText('0.5');
      await expect(page.getByTestId(`ctl-params-${i}`)).toContainText(`d${i}*`);
    }
    expect(await tableColumn(page, 5)).toEqual(['−π/2', '−π/2', '0']);
    expect(await tableColumn(page, 4)).toEqual(['d1*', 'd2*', 'd3*']);
    expect(await hText(page)).toBe('0. 1. 0. 0.5 / 0. 0. 1. 0.5 / 1. 0. 0. 0.5 / 0. 0. 0. 1.');
    expect((await state(page)).params.slice(0, 3)).toEqual([{ v: 0.5, exact: false }, { v: 0.5, exact: false }, { v: 0.5, exact: false }]);
  });

  test('dragging the θ*1 slider turns the arm and changes H', async ({ page }) => {
    await openDemo(page, URL);
    await dragSliderTo(page, 'slider-params-1', 48); // input positions 0 … 64 for n = -32 … 32: n = 16 is 3/4 of the track
    const s = await state(page);
    expect(s.params[0]).toEqual({ v: Math.PI / 2, exact: true, pi: 16 });
    await expect(page.getByTestId('value-params-1')).toHaveText('π/2');
    expect(await hText(page)).toBe('0. 1. 0. 0. / 1. 0. 0. 2. / 0. 0. -1. 0.25 / 0. 0. 0. 1.');
    // on the way the value text showed exact fractions of π: one step left is 15π/32
    await page.getByTestId('slider-params-1').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('value-params-1')).toHaveText('15π/32');
  });

  test('show robot off leaves joint 1 and the gripper', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('check-showRobot').click();
    await expect(page.getByTestId('check-showRobot')).not.toBeChecked();
    const v = await demo(page, () => window.__demo.view());
    expect(v.parts.map((p) => p.count)).toEqual([1, v.parts[1].count, 0, v.parts[3].count]);
    expect(v.parts[3].counts.cuboid).toBe(3);
    const grip = await demo(page, () => window.__demo.primitives('gripper'));
    const m = grip.find((p) => p.type === 'cuboid').matrix;
    [2, 0, 0.25].forEach((x, i) => near(m[i][3], x, 1e-12, 'gripper origin'));
    expect(await hText(page)).toBe(H_OPENING);
  });

  test('the grip slider opens and closes the gripper', async ({ page }) => {
    await openDemo(page, URL);
    const gap = async () => {
      const f = (await demo(page, () => window.__demo.primitives('gripper'))).filter((p) => p.type === 'cuboid').slice(1);
      const lo = (p) => Math.min(p.min[0], p.max[0]), hi = (p) => Math.max(p.min[0], p.max[0]);
      return lo(f[0]) - hi(f[1]); // fingers at +x and −x (hand along z): the gap between them
    };
    await dragSliderUntil(page, 'slider-g', -2, null, 260);
    expect((await state(page)).g.v).toBe(0);
    near(await gap(), 0, 1e-15, 'closed');
    await expect(page.getByTestId('value-g')).toHaveValue('0.');
    await dragSliderUntil(page, 'slider-g', 2, null, 260);
    expect((await state(page)).g).toEqual({ v: 1, exact: false });
    near(await gap(), 0.2, 1e-15, 'open');
    await expect(page.getByTestId('value-g')).toHaveValue('1.');
  });

  test('moving all three CNC sliders switches H to the two-digit exact display (original quirk)', async ({ page }) => {
    await openDemo(page, URL);
    await choose(page, 'CNC robot');
    for (const i of [1, 2]) {
      await page.getByTestId(`slider-params-${i}`).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId(`value-params-${i}`)).toHaveText('11/20');
      expect(await hText(page)).toMatch(/^0\. 1\. 0\. /); // still machine: d*3 is the machine 0.5
    }
    await page.getByTestId('slider-params-3').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('value-params-3')).toHaveText('11/20');
    expect(await hText(page)).toBe('0 1.0 0 0.55 / 0 0 1.0 0.55 / 1.0 0 0 0.55 / 0 0 0 1.0');
  });

  test('the plot range ±3 clips the arm (Stanford robot with d*3 = 3/2)', async ({ page }) => {
    await openDemo(page, URL);
    await choose(page, 'Stanford robot');
    await page.getByTestId('slider-params-3').focus();
    await page.keyboard.press('End');
    await expect(page.getByTestId('value-params-3')).toHaveText('3/2');
    const planes = await demo(page, () => window.__demo.clipping());
    expect(planes).toEqual([[[1, 0, 0], 3], [[-1, 0, 0], 3], [[0, 1, 0], 3], [[0, -1, 0], 3], [[0, 0, 1], 3], [[0, 0, -1], 3]]);
    const t = await demo(page, () => window.__demo.transforms());
    const o = t.origins[5];
    [0, 1, 3.5].forEach((x, i) => near(o[i], x, 1e-12, 'Td[6] origin'));
    // every corner of the gripper's cuboids lies above the clipping plane z = 3 (the hand points up along z)
    const grip = (await demo(page, () => window.__demo.primitives('gripper'))).filter((p) => p.type === 'cuboid');
    for (const p of grip) {
      for (let k = 0; k < 8; k++) {
        const c = [0, 1, 2].map((i) => ((k >> i) & 1 ? p.max[i] : p.min[i]));
        const z = p.matrix[2][0] * c[0] + p.matrix[2][1] * c[1] + p.matrix[2][2] * c[2] + p.matrix[2][3];
        expect(z).toBeGreaterThan(3);
      }
    }
    expect(await demo(page, () => window.__demo.inkFraction())).toBeGreaterThan(0.05);
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
    // the rotation is kept when a control changes (fixed PlotRange, K-AC-08 / D-AC-06)
    await page.getByTestId('check-showRobot').click();
    const kept = await demo(page, () => window.__demo.cameraPosition());
    expect(Math.hypot(...kept.map((v, i) => v - after[i]))).toBeLessThan(1e-9);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.getByTestId('slider-params-2').focus();
    await page.keyboard.press('ArrowRight');
    await page.getByTestId('check-showRobot').click();
    await choose(page, 'SCARA robot');
    await page.getByTestId('slider-params-3').focus();
    await page.keyboard.press('ArrowRight');
    expect(await state(page)).not.toEqual(opening);
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual({ robot: 2, dof: 6, params: Array.from({ length: 20 }, () => ({ v: 0, exact: true })), g: { v: 1, exact: true }, showRobot: true });
    expect(await hText(page)).toBe(H_OPENING);
    await expect(page.locator('[data-testid^=slider-params-]')).toHaveCount(6);
    for (let i = 1; i <= 6; i++) await expect(page.getByTestId(`value-params-${i}`)).toHaveText('0');
    await expect(page.getByTestId('check-showRobot')).toBeChecked();
    await expect(page.getByTestId('popup-DHParameters').locator('option:checked')).toHaveText('anthropomorphic');
    await expect(page.getByTestId('value-g')).toHaveValue('1');
  });

  test('review screenshots at the six snapshot states', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const z = (n) => Array.from({ length: n }, () => ({ v: 0, exact: true }));
    const S = [
      null,
      null,
      { g: { v: 0.62, exact: false }, showRobot: false },
      { robot: 0, params: z(2), g: { v: 1, exact: true }, showRobot: true },
      { robot: 1, params: z(3) },
      { robot: 8, params: [{ v: 0.5, exact: false }, { v: 0.5, exact: false }, { v: 0.5, exact: false }] },
    ];
    for (const [i, s] of S.entries()) {
      if (s) await demo(page, (st) => window.__demo.setState(st), s);
      expect(await demo(page, () => window.__demo.inkFraction())).toBeGreaterThan(0.05);
      await reviewShot(page, testInfo, `arm-configurations-snapshot-${i + 1}`);
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
