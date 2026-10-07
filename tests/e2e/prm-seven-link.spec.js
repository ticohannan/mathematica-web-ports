// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/prm-seven-link.spec.js — browser tests of the seven-link robot page
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/prm-seven-link/';
const ang = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]);

test.describe('seven-link robot', () => {
  test('loads without errors and draws workspace, obstacles, robot and goal', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('workspace')).toHaveCount(1);
    await expect(page.locator('[data-testid^=obstacle-]')).toHaveCount(7);
    await expect(page.getByTestId('robot')).toHaveCount(1);
    await expect(page.getByTestId('goal-line')).toHaveCount(1);
    await reviewShot(page, testInfo, 'prm-seven-link-initial');
  });

  test('status text reads "0 collisions, worst error = 669.7" at the start (as the original snapshot)', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('status-text')).toHaveText('0 collisions, worst error = 669.7');
  });

  test('has the controls of the original: restart button, movement and goal setters', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('button-restart')).toHaveText('restart');
    for (const v of ['relative', 'absolute']) await expect(page.getByTestId(`setter-movement-${v}`)).toBeVisible();
    for (let g = 1; g <= 7; g++) await expect(page.getByTestId(`setter-goal-${g}`)).toBeVisible();
    await expect(page.getByTestId('setter-movement-relative')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-goal-1')).toHaveAttribute('aria-pressed', 'true');
  });

  test('dragging joint 7 with the mouse turns the last link a little per update', async ({ page }) => {
    await openDemo(page, URL);
    const s0 = await page.evaluate(() => window.__demo.getState());
    const a0 = ang(s0.loc[5], s0.loc[6]);
    const from = await page.evaluate((p) => window.__demo.worldToClient(p), s0.loc[6]);
    const to = await page.evaluate((p) => window.__demo.worldToClient(p), [s0.loc[5][0] + 140, s0.loc[5][1]]);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
    const s1 = await page.evaluate(() => window.__demo.getState());
    const turned = Math.abs(ang(s1.loc[5], s1.loc[6]) - a0);
    expect(turned).toBeGreaterThan(0.04);
    expect(turned).toBeLessThan(0.05 * 4 + 1e-9); // at most THETA_STEP per update
    expect(s1.loc.slice(0, 6)).toEqual(s0.loc.slice(0, 6));
  });

  test('a press away from every locator turns the nearest joint toward the press point', async ({ page }) => {
    // LocatorPane "by default directs any click to the nearest locator" (D-SL-05): the press moves joint 7's invisible
    // locator to the press point; one evaluation then turns the last link by at most 0.05 rad toward it (Q-SL-01).
    await openDemo(page, URL);
    const s0 = await page.evaluate(() => window.__demo.getState());
    const a0 = ang(s0.loc[5], s0.loc[6]);
    const a1 = a0 + 0.3 * Math.sign(0 - a0); // towards angle 0 (the free side, as the drag test)
    const target = [s0.loc[5][0] + 140 * Math.cos(a1), s0.loc[5][1] + 140 * Math.sin(a1)];
    const from = await page.evaluate((p) => window.__demo.worldToClient(p), s0.loc[6]);
    const at = await page.evaluate((p) => window.__demo.worldToClient(p), target);
    expect(Math.hypot(at.x - from.x, at.y - from.y)).toBeGreaterThan(15); // outside the 12 px grab radius
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => window.__demo.getState().loc[6][0])).not.toBe(s0.loc[6][0]);
    const s1 = await page.evaluate(() => window.__demo.getState());
    const turned = ang(s1.loc[5], s1.loc[6]) - a0;
    expect(Math.sign(turned)).toBe(Math.sign(a1 - a0));
    expect(Math.abs(turned)).toBeLessThan(0.05 + 1e-9);
    expect(s1.loc.slice(0, 6)).toEqual(s0.loc.slice(0, 6));
  });

  test('a goal button redraws the goal configuration and the worst error', async ({ page }) => {
    await openDemo(page, URL);
    const before = await page.getByTestId('status-text').textContent();
    await page.getByTestId('setter-goal-4').click();
    await expect(page.getByTestId('setter-goal-4')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.__demo.getState().goal)).toBe(4);
    await expect(page.getByTestId('status-text')).not.toHaveText(before);
  });

  test('colliding turns the robot red, counts one collision and disables the movement setter, then restart resets', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.evaluate(() => { for (let k = 0; k < 200 && !window.__demo.getState().isCollide; k++) window.__demo.moveLocator(7, [300, 230]); });
    const s = await page.evaluate(() => window.__demo.getState());
    expect(s.isCollide).toBe(true);
    expect(s.collisions).toBe(1);
    await expect(page.getByTestId('robot')).toHaveAttribute('stroke', 'rgb(255,0,0)');
    await expect(page.getByTestId('setter-movement-absolute')).toBeDisabled();
    await expect(page.getByTestId('status-text')).toContainText('1 collisions');
    await reviewShot(page, testInfo, 'prm-seven-link-collision');
    await page.getByTestId('button-restart').click();
    const r = await page.evaluate(() => window.__demo.getState());
    expect(r.collisions).toBe(0);
    expect(r.isCollide).toBe(false);
    await expect(page.getByTestId('setter-movement-absolute')).toBeEnabled();
  });

  test('absolute movement rotates the following links with the dragged one', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-movement-absolute').click();
    const s0 = await page.evaluate(() => window.__demo.getState());
    const s1 = await page.evaluate((p) => window.__demo.moveLocator(4, p), [s0.loc[3][0] - 60, s0.loc[3][1] + 10]);
    const d4 = ang(s1.loc[3], s1.loc[4]) - ang(s0.loc[3], s0.loc[4]);
    const d3 = ang(s1.loc[2], s1.loc[3]) - ang(s0.loc[2], s0.loc[3]);
    expect(Math.abs(d3)).toBeGreaterThan(0.01);
    expect(d4).toBeCloseTo(d3, 6);
  });

  test('arrow keys move a focused joint locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    const s0 = await page.evaluate(() => window.__demo.getState());
    await page.getByTestId('locator-7').focus();
    await page.keyboard.press('ArrowRight');
    const s1 = await page.evaluate(() => window.__demo.getState());
    expect(s1.loc[6]).not.toEqual(s0.loc[6]);
  });

  test('success message when the robot matches the goal', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => {
      const L = 140, O = [445, 846];
      const g = [5.12, 5.90, -0.08, 6.01, 0.93, 0.97, 0.42];
      let t = 0, x = O[0], y = O[1];
      const joints = g.map((a) => { t += a; x += L * Math.cos(t); y += L * Math.sin(t); return [x, y]; });
      window.__demo.setState({ loc: joints, locOld: joints, isCollide: false });
      window.__demo.setState({});
    });
    await expect(page.getByTestId('success-text')).toHaveText('Congratulations! You solved goal 1 in only 0 collisions!');
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-goal-3').click();
    await page.evaluate(() => window.__demo.moveLocator(2, [100, 700]));
    await page.getByTestId('reset').click();
    const s = await page.evaluate(() => window.__demo.getState());
    expect(s.goal).toBe(1);
    expect(s.loc).toEqual([[321, 780], [181, 785], [104, 668], [42, 542], [144, 446], [144, 306], [133, 167]]);
  });
});
