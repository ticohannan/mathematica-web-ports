// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/minkowski-sum.spec.js — browser tests of the Minkowski-sum page (real mouse and keyboard input).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/minkowski-sum/';
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
const snapshots = JSON.parse(fs.readFileSync('tests/golden/minkowski-sum.original-states.json', 'utf8')).snapshots;

// independent oracle: Andrew's monotone chain of all o - (r - rc)
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function hull(P) {
  const Q = [...P].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lo = [], up = [];
  for (const p of Q) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of [...Q].reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

test.describe('minkowski sum', () => {
  test('minkowski-sum: loads without errors and draws obstacle, robot, sorted normals and Minkowski sum', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const t of ['obstacle', 'robot', 'sorted normals', 'Minkowski sum']) await expect(page.locator('svg text', { hasText: new RegExp(`^${t}$`) })).toHaveCount(1);
    await expect(page.locator('[data-testid=mink-points] circle')).toHaveCount(9); // 8 vertices, the first repeated
    const v = await getView(page);
    expect(v.minkowskiPoints.length).toBe(8);
    await expect(page.locator('text[data-key]')).toHaveCount(24); // 3 robot, 5 obstacle, 8 sorted-normal, 8 sum-side
    await expect(page.locator('[data-testid=label-robot-label]')).toHaveCount(3);
    await expect(page.locator('[data-testid=label-obstacle-label]')).toHaveCount(5);
    await expect(page.locator('[data-testid=label-sorted-label]')).toHaveCount(8);
    await expect(page.locator('[data-testid=label-mink-label]')).toHaveCount(8);
    await reviewShot(page, testInfo, 'minkowski-sum-snapshot1');
  });

  test('minkowski-sum: has the controls of the original with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('setter-stableOrMove-static')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-stableOrMove-move-around-Minkowski')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('check-a')).not.toBeChecked();
    await expect(page.getByTestId('check-c')).toBeChecked();
    await expect(page.getByTestId('setter-m-3')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-n-5')).toHaveAttribute('aria-pressed', 'true');
    for (const k of [1, 2, 3, 4, 5]) { await expect(page.getByTestId(`setter-m-${k}`)).toBeVisible(); await expect(page.getByTestId(`setter-n-${k}`)).toBeVisible(); }
    await expect(page.getByTestId('slider-s')).toBeHidden(); // the move slider exists only in the move view
    await expect(page.getByTestId('ctl-a')).toContainText('show normals');
    await expect(page.getByTestId('ctl-c')).toContainText('enable locators');
    await expect(page.getByTestId('ctl-m')).toContainText('number of robot edges');
    await expect(page.getByTestId('ctl-n')).toContainText('number of obstacle edges');
  });

  test('minkowski-sum: move around Minkowski replaces the four controls by the running move slider and disables the locators', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-stableOrMove-move-around-Minkowski').click();
    for (const id of ['check-a', 'check-c', 'setter-m-3', 'setter-n-5']) await expect(page.getByTestId(id)).toBeHidden();
    await expect(page.getByTestId('slider-s')).toBeVisible();
    await expect(page.getByTestId('slider-s')).toHaveAttribute('max', '1016'); // positions 1 … 1017 (dl)
    expect((await getState(page)).dl).toBe(1017);
    await expect(page.getByTestId('anim-s')).toBeVisible(); // Appearance -> "Open"
    await expect(page.getByTestId('play-s')).toHaveText('❚❚'); // AnimationRunning -> True
    const s0 = (await getState(page)).s;
    await expect.poll(async () => (await getState(page)).s, { timeout: 5000 }).toBeGreaterThan(s0);
    expect((await getState(page)).c).toBe(false);
    await page.evaluate(() => window.__demo.stopAnimation());
    const before = (await getState(page)).pts;
    const p = await toClient(page, [2.0, 2.5]);
    await page.mouse.click(p.x, p.y);
    expect((await getState(page)).pts).toEqual(before); // Enabled -> c with c = False
    await page.getByTestId('setter-stableOrMove-static').click();
    await expect(page.getByTestId('check-a')).toBeVisible();
    await expect(page.getByTestId('slider-s')).toBeHidden();
    const st = await getState(page);
    expect([st.c, st.s]).toEqual([true, 1]);
  });

  test('minkowski-sum: dragging a robot vertex with the mouse reshapes the robot and the Minkowski sum', async ({ page }) => {
    await openDemo(page, URL);
    const before = await getView(page);
    await drag(page, [2.298, 3.298], [2.6, 3.0]);
    const s = await getState(page);
    expect(Math.abs(s.pts[2][0] - 2.6)).toBeLessThan(0.02);
    expect(Math.abs(s.pts[2][1] - 3.0)).toBeLessThan(0.02);
    const v = await getView(page);
    expect(v.robot).not.toEqual(before.robot);
    expect(v.minkowskiPoints).not.toEqual(before.minkowskiPoints);
    const H = hull(v.obstacle.flatMap((o) => v.robot.map((r) => [o[0] - r[0] + v.rc[0], o[1] - r[1] + v.rc[1]])));
    for (const h of H) expect(v.minkowskiPoints.some((q) => Math.hypot(q[0] - h[0], q[1] - h[1]) <= 1e-9)).toBe(true);
    await expect(page.locator('[data-testid=robot-polygon]')).toHaveAttribute('points', new RegExp(`${v.robot[0][0]},${v.robot[0][1]}`));
  });

  test('minkowski-sum: a robot vertex dragged left of the limit stops at x = 1.34704', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [2.885, 1.489], [0.5, 1.8]);
    const s = await getState(page);
    expect(s.pts[0][0]).toBe(1.34704);
    const v = await getView(page);
    expect(v.robot.some((p) => p[0] === 1.34704)).toBe(true);
  });

  test('minkowski-sum: a press away from every locator moves the nearest locator there, also an unused one', async ({ page }) => {
    await openDemo(page, URL);
    const before = await getView(page);
    const p = await toClient(page, [1.55, 2.0]);
    await page.mouse.click(p.x, p.y);
    const s = await getState(page);
    expect(Math.abs(s.pts[4][0] - 1.55)).toBeLessThan(0.01); // unused locator 5 jumped to the press point
    expect(Math.abs(s.pts[4][1] - 2.0)).toBeLessThan(0.01);
    const v = await getView(page);
    expect(v.robot).toEqual(before.robot);
    expect(v.obstacle).toEqual(before.obstacle);
    expect(v.minkowskiPoints).toEqual(before.minkowskiPoints);
  });

  test('minkowski-sum: show normals draws the normal arrows', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await expect(page.locator('[data-testid^=arrow-]')).toHaveCount(8);
    await expect(page.locator('[data-testid=arrow-sorted-arrows]')).toHaveCount(8);
    await page.getByTestId('check-a').click();
    await expect(page.locator('[data-testid^=arrow-]')).toHaveCount(24);
    await expect(page.locator('[data-testid=arrow-robot-arrows]')).toHaveCount(3);
    await expect(page.locator('[data-testid=arrow-obstacle-arrows]')).toHaveCount(5);
    await expect(page.locator('[data-testid=arrow-mink-arrows]')).toHaveCount(8);
    await reviewShot(page, testInfo, 'minkowski-sum-normals');
    await page.getByTestId('check-a').click();
    await expect(page.locator('[data-testid^=arrow-]')).toHaveCount(8);
  });

  test('minkowski-sum: unchecking enable locators in the static view is undone by the next evaluation', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('check-c').click();
    await expect(page.getByTestId('check-c')).toBeChecked();
    expect((await getState(page)).c).toBe(true);
    await drag(page, [2.298, 3.298], [2.5, 3.1]);
    expect(Math.abs((await getState(page)).pts[2][0] - 2.5)).toBeLessThan(0.02);
  });

  test('minkowski-sum: robot edges 5 shows the pentagon with labels alpha1 to alpha5', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-m-5').click();
    const v = await getView(page);
    expect(v.robot.length).toBe(5);
    expect(v.minkowskiPoints.length).toBe(10);
    const keys = await page.locator('[data-testid=label-robot-label]').evaluateAll((ns) => ns.map((n) => n.getAttribute('data-key')));
    expect(keys).toEqual(['α1', 'α2', 'α3', 'α4', 'α5']);
    // α2 on the bottom edge (1.71, 1.489)-(2.885, 1.489): its label lies outside, just below y 1.489
    const y2 = await page.locator('[data-testid=label-robot-label][data-key=α2]').evaluate((n) => n.getAttribute('transform'));
    const y = Number(/translate\([^,]+,([^)]+)\)/.exec(y2)[1]);
    expect(y).toBeLessThan(1.489);
    expect(y).toBeGreaterThan(1.2);
  });

  test('minkowski-sum: arrow keys move a focused locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    const p0 = (await getState(page)).pts[2];
    await page.getByTestId('locator-pts-3').focus();
    // locator 3 (2.298, 3.298) lies on the top edge of the locator box {…, 3.298}: ArrowUp is clipped there, so the
    // 0.05 step is checked downwards (the TESTPLAN's ArrowUp would leave y at 3.298)
    await page.keyboard.press('ArrowUp');
    expect((await getState(page)).pts[2]).toEqual(p0);
    await page.keyboard.press('ArrowDown');
    let p = (await getState(page)).pts[2];
    expect(p[0]).toBe(p0[0]);
    expect(p[1]).toBeCloseTo(p0[1] - 0.05, 12);
    await page.keyboard.press('Shift+ArrowRight');
    p = (await getState(page)).pts[2];
    expect(p[0]).toBeCloseTo(p0[0] + 0.25, 12);
  });

  test('minkowski-sum: Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await getState(page);
    await drag(page, [2.298, 3.298], [2.7, 2.9]);
    await page.getByTestId('setter-m-4').click();
    await page.getByTestId('setter-n-3').click();
    await page.getByTestId('setter-stableOrMove-move-around-Minkowski').click();
    await page.getByTestId('reset').click();
    expect(await getState(page)).toEqual(opening);
    await expect(page.getByTestId('setter-m-3')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-n-5')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-stableOrMove-static')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('check-a')).toBeVisible();
    expect(opening.pts[6]).toEqual([-1.34704, 2.607]);
    expect([opening.dl, opening.rl, opening.ol]).toEqual([1017, 3, 5]);
  });

  test('minkowski-sum: the animation moves the robot along the Minkowski boundary', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-stableOrMove-move-around-Minkowski').click();
    const s0 = (await getState(page)).s;
    await page.waitForTimeout(1000);
    await expect.poll(async () => (await getState(page)).s, { timeout: 5000 }).not.toBe(s0);
    await page.evaluate(() => window.__demo.stopAnimation());
    const v = await getView(page);
    const M = v.minkowskiPoints.map((p) => [p[0] - v.oc[0], p[1] - v.oc[1]]);
    const c = v.robotAt.centroid;
    const d = Math.min(...M.map((a, i) => {
      const b = M[(i + 1) % M.length], dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(c[0] - a[0] - t * dx, c[1] - a[1] - t * dy);
    }));
    expect(d).toBeLessThanOrEqual(1e-9);
    await expect(page.locator('[data-testid=robot-centroid] circle')).toHaveCount(1);
    await reviewShot(page, testInfo, 'minkowski-sum-moving');
  });

  test('minkowski-sum: the snapshot Settings 2 to 5 drawn for side-by-side review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of ['2', '3', '4', '5']) {
      const s = snapshots[k];
      await page.evaluate((st) => { window.__demo.setState(st); window.__demo.stopAnimation(); window.__demo.setState({ s: st.s }); window.__demo.stopAnimation(); }, s);
      const st = await getState(page);
      expect([st.dl, st.c, st.s]).toEqual([s.dl, s.c, s.s]);
      await reviewShot(page, testInfo, `minkowski-sum-snapshot${k}`);
    }
  });
});
