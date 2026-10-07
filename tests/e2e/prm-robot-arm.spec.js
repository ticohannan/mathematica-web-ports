// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/prm-robot-arm.spec.js — browser tests of the "Probabilistic Roadmap Method for Robot Arm" page
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot, inkAfterContextRestore } from './helpers.js';

const URL = '/demos/prm-robot-arm/';
const getState = (page) => page.evaluate(() => window.__demo.getState());
const XMIN = 2.9, W = 3.8, TWO_PI = 2 * Math.PI;

async function drag(page, from, to, steps = 6) {
  const a = await page.evaluate((p) => window.__demo.worldToClient(p), from);
  const b = await page.evaluate((p) => window.__demo.worldToClient(p), to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}

test.describe('PRM for robot arm', () => {
  test('loads without errors and draws the 3D workspace and the phase space', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.02);
    await expect(page.getByTestId('text-workspace')).toHaveText('robot workspace');
    await expect(page.getByTestId('text-phase')).toHaveText('robot phase space');
    await expect(page.getByTestId('path-label')).toHaveText('No path possible');
    await expect(page.getByTestId('frame-left')).toHaveAttribute('stroke', 'rgb(255,0,0)');
    await expect(page.getByTestId('frame-bottom')).toHaveAttribute('stroke', 'rgb(0,0,255)');
    await expect(page.getByTestId('icon-start')).toHaveAttribute('data-color', 'green');
    await expect(page.getByTestId('icon-goal')).toHaveAttribute('data-color', 'green');
    expect(await page.evaluate(() => window.__demo.robotColor())).toBe('996633'); // Brown
    await expect(page.locator('[data-testid=requirements-notice]')).toHaveCount(0);
    await reviewShot(page, testInfo, 'prm-robot-arm-initial');
  });

  test('has the controls of the original with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-blue-xy-x')).toHaveValue('1');
    await expect(page.getByTestId('value-blue-xy-y')).toHaveValue('-0.6');
    await expect(page.getByTestId('vslider-blue-z')).toHaveValue('0.4');
    await expect(page.getByTestId('value-orange-xy-x')).toHaveValue('-0.8');
    await expect(page.getByTestId('value-orange-xy-y')).toHaveValue('0.2');
    await expect(page.getByTestId('vslider-orange-z')).toHaveValue('0.5');
    expect(Number(await page.getByTestId('slider-view-angle').inputValue())).toBeCloseTo(-Math.PI / 2, 12);
    await expect(page.getByTestId('check-show-obstacles')).not.toBeChecked();
    await expect(page.getByTestId('button-add-vertices')).toHaveText('add 100 vertices');
    await expect(page.getByTestId('button-restart')).toHaveText('restart');
    await expect(page.getByTestId('slider-progress')).toHaveValue('0');
    await expect(page.getByTestId('value-radius')).toHaveValue('1');
    const s = await getState(page);
    expect([s.pConfig, s.pConfigf]).toEqual([[5, 0], [4, -1]]);
  });

  test('dragging the start locator with the mouse changes the start configuration and the robot', async ({ page }) => {
    await openDemo(page, URL);
    const c0 = await page.evaluate(() => window.__demo.camera());
    await drag(page, [5, 0], [6, 1]);
    const s = await getState(page);
    expect(s.pConfig[0]).toBeCloseTo(6, 1);
    expect(s.pConfig[1]).toBeCloseTo(1, 1);
    const v = await page.evaluate(() => window.__demo.view());
    expect(v.qs[0]).toBeCloseTo(((s.pConfig[0] - XMIN) / W) * TWO_PI, 9);
    expect(v.robotq).toEqual(v.qs);
    expect(await page.evaluate(() => window.__demo.camera())).toEqual(c0);
  });

  test('a press away from every locator moves the nearest locator there', async ({ page }) => {
    await openDemo(page, URL);
    const c = await page.evaluate(() => window.__demo.worldToClient([6, -1.5])); // 1.80 from the start, 2.06 from the goal
    await page.mouse.click(c.x, c.y);
    const s = await getState(page);
    expect(s.pConfig[0]).toBeCloseTo(6, 1);
    expect(s.pConfig[1]).toBeCloseTo(-1.5, 1);
    expect(s.pConfigf).toEqual([4, -1]);
    // a press on the 3D workspace inset rotates the view instead and moves no locator
    const w = await page.evaluate(() => window.__demo.worldToClient([0.5, 0]));
    await page.mouse.click(w.x, w.y);
    const s2 = await getState(page);
    expect([s2.pConfig, s2.pConfigf]).toEqual([s.pConfig, s.pConfigf]);
  });

  test('a start configuration in collision turns its icon and the base and robot red', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    // θ1 = 2.9: link 1 points at the orange sphere
    await page.evaluate((x) => window.__demo.moveLocator('start', [x, 0]), XMIN + (2.9 / TWO_PI) * W);
    await expect(page.getByTestId('icon-start')).toHaveAttribute('data-color', 'red');
    expect(await page.evaluate(() => window.__demo.robotColor())).toBe('ff0000');
    await reviewShot(page, testInfo, 'prm-robot-arm-start-collision');
  });

  test('"add 100 vertices" samples 100 configurations and builds the roadmap', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('button-add-vertices').click();
    const s = await getState(page);
    expect(s.pts.length).toBe(100);
    expect(s.rold).toBe(1);
    await expect(page.getByTestId('good-point')).toHaveCount(s.goodPts.length);
    await expect(page.getByTestId('bad-point')).toHaveCount(s.badPts.length);
    expect(s.edgesNN.length).toBeGreaterThan(0);
  });

  test('show obstacles draws the blue and orange C-obstacle regions', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.getByTestId('button-add-vertices').click();
    await page.getByTestId('button-add-vertices').click();
    await page.getByTestId('check-show-obstacles').check();
    await expect(page.getByTestId('c-obstacle-blue')).toHaveAttribute('fill', 'rgb(222,240,255)');
    await expect(page.getByTestId('c-obstacle-orange')).toHaveAttribute('fill', 'rgb(255,230,204)');
    expect((await page.getByTestId('c-obstacle-orange').getAttribute('d')).length).toBeGreaterThan(100);
    expect((await getState(page)).freeConfigSpace.quality).toBe('quality');
    await reviewShot(page, testInfo, 'prm-robot-arm-obstacles');
  });

  test('the blue_z slider moves the blue sphere: samples are re-classified and the roadmap rebuilt', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('button-add-vertices').click();
    const s0 = await getState(page);
    const box = await page.getByTestId('vslider-blue-z').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.1);
    const s1 = await getState(page);
    expect(s1.obstaz).toBeGreaterThan(1.5);
    expect(s1.obstOld[0][2]).toBe(s1.obstaz);
    expect(s1.pts).toEqual(s0.pts);
    expect(s1.goodPts).not.toEqual(s0.goodPts);
  });

  test('the blue_xy pad moves the blue sphere', async ({ page }) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('pad-blue-xy').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const s = await getState(page);
    expect(s.obstaxy[0]).toBeCloseTo(0, 1);
    expect(s.obstaxy[1]).toBeCloseTo(0, 1);
    expect((await page.evaluate(() => window.__demo.view())).pObs3[0]).toEqual([s.obstaxy[0], s.obstaxy[1], 0.4]);
  });

  test('the view angle slider turns the 3D view point to {2 Cos, 2 Sin, 1}', async ({ page }) => {
    await openDemo(page, URL);
    const c0 = await page.evaluate(() => window.__demo.camera());
    // ViewPoint {0, -2, 1} in box units (longest side 3) about the box centre {0, 0, 1.15}
    expect(c0[0]).toBeCloseTo(0, 9); expect(c0[1]).toBeCloseTo(-6, 9); expect(c0[2]).toBeCloseTo(4.15, 9);
    const box = await page.getByTestId('slider-view-angle').boundingBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    const a = (await getState(page)).viewAng;
    expect(a).toBeGreaterThan(0);
    const c1 = await page.evaluate(() => window.__demo.camera());
    expect(c1[0]).toBeCloseTo(6 * Math.cos(a), 6);
    expect(c1[1]).toBeCloseTo(6 * Math.sin(a), 6);
  });

  test('restart removes the samples, Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('button-add-vertices').click();
    await page.getByTestId('button-restart').click();
    expect((await getState(page)).pts).toEqual([]);
    await page.getByTestId('check-show-obstacles').check();
    await page.evaluate(() => window.__demo.moveLocator('goal', [6, 1]));
    await page.getByTestId('reset').click();
    const s = await getState(page);
    expect([s.pConfigf, s.showConfigObs, s.r, s.obstaxy]).toEqual([[4, -1], false, 1, [1, -0.6]]);
    await expect(page.getByTestId('check-show-obstacles')).not.toBeChecked();
  });

  test('?seed=N gives reproducible samples (port addition)', async ({ page }) => {
    const run = async () => {
      await openDemo(page, `${URL}?seed=7`);
      await page.getByTestId('button-add-vertices').click();
      return (await getState(page)).pts;
    };
    expect(await run()).toEqual(await run());
  });

  test('arrow keys move a focused locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-goal').focus();
    await page.keyboard.press('ArrowUp');
    expect((await getState(page)).pConfigf[1]).toBeCloseTo(-0.95, 12);
  });

  test('without WebGL 2 the 3D inset shows a notice and the phase space keeps working', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return type === 'webgl2' ? null : orig.call(this, type, ...rest); };
    });
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('requirements-notice')).toContainText('WebGL 2');
    await expect(page.getByTestId('scene-canvas')).toHaveCount(0);
    const s = await page.evaluate(() => window.__demo.moveLocator('start', [6, 1]));
    expect(s.pConfig).toEqual([6, 1]);
    await page.getByTestId('button-add-vertices').click();
    await expect(page.getByTestId('good-point').first()).toBeAttached();
  });

  test('the 3D view redraws after a WebGL context loss', async ({ page }) => {
    await openDemo(page, URL);
    const r = await inkAfterContextRestore(page);
    if (r.supported) expect(r.ink).toBeGreaterThan(0.02);
  });
});
