// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/robot-singularities.spec.js — browser tests of the robot singularities page
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/robot-singularities/';
const π = Math.PI;
const demo = (page, expr) => page.evaluate(expr);

test.describe('robot singularities', () => {
  test('loads without errors and draws the workspace and the phase space', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas-workspace')).toBeVisible();
    await expect(page.getByTestId('scene-canvas-phase')).toBeVisible();
    expect(await demo(page, () => window.__demo.inkFraction('workspace'))).toBeGreaterThan(0.05);
    expect(await demo(page, () => window.__demo.inkFraction('phase'))).toBeGreaterThan(0.05);
    expect(await demo(page, () => window.__demo.singularSummary())).toMatchObject({ workspace: { sphere: 2, line: 1 }, phase: { line: 6, infinitePlane: 5 } });
    await reviewShot(page, testInfo, 'robot-singularities-initial');
  });

  test('the ground top is peach and the translucent singular sphere red as in snapshot 1 (Mathematica colours)', async ({ page }) => {
    await openDemo(page, URL);
    // snapshot 1: ground top (250, 200, 149), big sphere near its centre (236, 124, 124)
    const near = (c, ref, tol) => c.forEach((v, i) => expect(Math.abs(v - ref[i]), `${c} vs ${ref}`).toBeLessThanOrEqual(tol[i]));
    near(await demo(page, () => window.__demo.workspacePixelAt([0, -1.8, -0.25])), [250, 200, 149], [15, 15, 30]);
    near(await demo(page, () => window.__demo.workspacePixelAt([-0.8, 0, 2])), [236, 124, 124], [20, 20, 20]);
  });

  test('has the controls of the original with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    const popup = page.getByTestId('popup-iType');
    await expect(popup.locator('option')).toHaveCount(16);
    await expect(popup.locator('option:checked')).toHaveText('elbow robot arm');
    for (let i = 1; i <= 3; i++) {
      await expect(page.getByTestId(`label-params-${i}`)).toHaveText(`θ${i}`);
      await expect(page.getByTestId(`value-params-${i}`)).toHaveValue('0');
    }
    await expect(page.getByTestId('check-showRobot')).not.toBeChecked();
    await expect(page.getByTestId('check-showManipulability')).not.toBeChecked();
    await expect(page.getByTestId('ctl-showRobot')).toContainText('show robot');
    await expect(page.getByTestId('ctl-showManipulability')).toContainText('show manipulability ellipsoid');
    await expect(page.getByTestId('ctl-isJLinearVel')).toContainText('velocity singularities');
    await expect(page.getByTestId('setter-isJLinearVel-Linear')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-isJLinearVel-Angular')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('plotlabel-workspace')).toHaveText('Workspace');
  });

  test('the phase-space label reads phase space at opening (as snapshot 1) and Phase Space after changing the robot', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('plotlabel-phase')).toHaveText('phase space');
    await page.getByTestId('popup-iType').selectOption({ label: 'PUMA robot arm' });
    await expect(page.getByTestId('plotlabel-phase')).toHaveText('Phase Space');
    await page.getByTestId('popup-iType').selectOption({ label: 'elbow robot arm' });
    await expect(page.getByTestId('plotlabel-phase')).toHaveText('Phase Space');
  });

  test('dragging the θ1 slider with the mouse turns the elbow arm about the vertical axis', async ({ page }) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('slider-params-1').boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.62, y, { steps: 5 });
    await page.mouse.move(box.x + box.width * 0.7, y, { steps: 5 });
    await page.mouse.up();
    const s = await demo(page, () => window.__demo.getState());
    expect(s.params[0]).toBeGreaterThan(0.3);
    expect(s.params[1]).toBe(0);
    // the value is min + k step of the slider {-1.01π, 1.01π, 0.01π}
    const k = (s.params[0] + 1.01 * π) / (0.01 * π);
    expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-9);
    const o3 = (await demo(page, () => window.__demo.view())).o3;
    expect(o3[0]).toBeCloseTo(2 * Math.cos(s.params[0]), 9);
    expect(o3[1]).toBeCloseTo(2 * Math.sin(s.params[0]), 9);
    expect(o3[2]).toBeCloseTo(2, 9);
    await expect(page.getByTestId('value-params-1')).not.toHaveValue('0');
  });

  test('pushing a joint slider to its end makes it jump by 6.28 (original quirk)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-params-1').focus();
    await page.keyboard.press('End');
    const s = await demo(page, () => window.__demo.getState());
    expect(s.params[0]).toBeCloseTo(1.01 * π - 6.28, 12);
    await expect(page.getByTestId('value-params-1')).toHaveValue('-3.10699');
    await page.keyboard.press('Home');
    expect((await demo(page, () => window.__demo.getState())).params[0]).toBeCloseTo(-1.01 * π + 6.28, 12);
  });

  test('choosing another robot rebuilds the sliders and resets them: SCARA shows d3 = 0.5', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-params-2').focus();
    await page.keyboard.press('ArrowRight');
    expect((await demo(page, () => window.__demo.getState())).params[1]).not.toBe(0);
    await page.getByTestId('popup-iType').selectOption({ label: 'SCARA robot arm' });
    await expect(page.getByTestId('label-params-3')).toHaveText('d3');
    await expect(page.getByTestId('value-params-3')).toHaveValue('0.5');
    await expect(page.getByTestId('value-params-2')).toHaveValue('0');
    expect((await demo(page, () => window.__demo.getState())).params).toEqual([0, 0, 0.5]);
    await page.getByTestId('check-showRobot').check();
    await page.getByTestId('check-showManipulability').check();
    await reviewShot(page, testInfo, 'robot-singularities-scara');
  });

  test('show robot draws the robot and show manipulability ellipsoid adds the ellipsoid and the phase-space ball', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const before = await demo(page, () => window.__demo.view());
    expect(before.workspace.point).toBeUndefined();
    await page.getByTestId('check-showRobot').check();
    const robot = await demo(page, () => window.__demo.view());
    expect(robot.workspace.point).toBe(1); // the orange wrist centre
    expect(robot.workspace.cuboid).toBeGreaterThan(0);
    expect(await demo(page, () => window.__demo.ellipsoid())).toBe(null);
    await page.getByTestId('check-showManipulability').check();
    const e = await demo(page, () => window.__demo.ellipsoid());
    expect(e.Sigma[0]).toBeCloseTo(Math.sqrt(5) / 2, 12);
    expect(e.Sigma[1]).toBeCloseTo(1, 12);
    expect(e.rank).toBe(2);
    expect(e.prims).toEqual({ arrow: 4, circle: 2 });
    expect((await demo(page, () => window.__demo.view())).phase.sphere).toBe(2); // blue ball + light-blue ball (the elbow set has no spheres)
    await reviewShot(page, testInfo, 'robot-singularities-robot-ellipsoid');
  });

  test('Angular shows the angular-velocity singular sets (elbow: whole phase cube and the sphere)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-isJLinearVel-Angular').click();
    await expect(page.getByTestId('setter-isJLinearVel-Angular')).toHaveAttribute('aria-pressed', 'true');
    const s = await demo(page, () => window.__demo.singularSummary());
    expect(s).toMatchObject({ isJLinearVelOld: 'Angular', phaseLabel: 'Phase Space', workspace: { sphere: 1 }, phase: { cuboid: 1 } });
    expect(await demo(page, () => window.__demo.inkFraction('phase'))).toBeGreaterThan(0.1);
  });

  test('dragging in the workspace picture rotates the view', async ({ page }) => {
    await openDemo(page, URL);
    const before = await demo(page, () => window.__demo.cameraPosition('workspace'));
    const box = await page.getByTestId('scene-canvas-workspace').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 10, { steps: 6 });
    await page.mouse.up();
    const after = await demo(page, () => window.__demo.cameraPosition('workspace'));
    expect(Math.hypot(...after.map((v, i) => v - before[i]))).toBeGreaterThan(0.5);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('popup-iType').selectOption({ label: 'Stanford robot arm' });
    await page.getByTestId('check-showRobot').check();
    await page.getByTestId('setter-isJLinearVel-Angular').click();
    await page.getByTestId('reset').click();
    const s = await demo(page, () => window.__demo.getState());
    expect(s).toEqual({ iType: 2, params: [0, 0, 0], showRobot: false, showManipulability: false, isJLinearVel: 'Linear', iTypeOld: 2, isJLinearVelOld: 'Linear', singularLabel: 'phase space' });
    await expect(page.getByTestId('popup-iType').locator('option:checked')).toHaveText('elbow robot arm');
    await expect(page.getByTestId('check-showRobot')).not.toBeChecked();
    await expect(page.getByTestId('setter-isJLinearVel-Linear')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('label-params-3')).toHaveText('θ3');
    await expect(page.getByTestId('plotlabel-phase')).toHaveText('phase space');
  });
});
