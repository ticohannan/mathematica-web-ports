// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Adapted from Wolfram Demonstrations Project content (see LICENSE.md)
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/motion-planning.spec.js — Motion Planning for Robot Path around Obstacles (browser tests)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/motion-planning/';
const golden = JSON.parse(fs.readFileSync('tests/golden/motion-planning.original-states.json', 'utf8'));
const scene = (page) => page.evaluate(() => window.__demo.scene());
const state = (page) => page.evaluate(() => window.__demo.getState());
const polyPoints = async (page, testid) => (await page.getByTestId(testid).getAttribute('points')).trim().split(/\s+/).map((p) => p.split(',').map(Number));

test.describe('Motion planning demo', () => {
  test('loads without errors with the original default scene and path', async ({ page }) => {
    const problems = await openDemo(page, URL);
    const sc = await scene(page);
    expect(sc.path.length).toBe(3);
    expect(sc.discretePath.length).toBe(golden.states[0].discretePath.length);
    // the drawn path polyline is the computed path
    const drawn = await polyPoints(page, 'path');
    drawn.forEach((p, i) => { expect(p[0]).toBeCloseTo(sc.path[i][0], 6); expect(p[1]).toBeCloseTo(sc.path[i][1], 6); });
    await expect(page.getByTestId('no-path')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('controls of the original are present', async ({ page }) => {
    await openDemo(page, URL);
    for (const id of ['setter-configOrWork-workspace', 'setter-configOrWork-configuration-space', 'setter-x-3', 'setter-x-4', 'setter-x-5', 'setter-n-3', 'setter-n-4', 'setter-n-5', 'slider-s']) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    for (const id of ['r1', 'r2', 'o1', 'o2', 'o3', 'o4']) await expect(page.getByTestId(`locator-${id}`)).toBeVisible();
    await expect(page.getByTestId('setter-x-4')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-n-3')).toHaveAttribute('aria-pressed', 'true');
  });

  test('dragging the start locator with the mouse moves the robot and replans', async ({ page }) => {
    await openDemo(page, URL);
    const from = await page.evaluate(() => window.__demo.locatorClientPoint('r1'));
    const to = await page.evaluate(() => window.__demo.worldToClient([-3, 1]));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const st = await state(page);
    expect(st.r1[0]).toBeCloseTo(-3, 1);
    expect(st.r1[1]).toBeCloseTo(1, 1);
    const sc = await scene(page);
    expect(sc.path[0][0]).toBeCloseTo(st.r1[0], 9);
    const robot = await polyPoints(page, 'robot-start');
    const cx = robot.reduce((s, p) => s + p[0], 0) / robot.length;
    expect(cx).toBeCloseTo(st.r1[0], 6);
  });

  test('locators stay inside their ranges (obstacles ±3.75, robot −4.25..4.15)', async ({ page }) => {
    await openDemo(page, URL);
    for (const [name, target, lim] of [['o1', [9, 9], [3.75, 3.75]], ['r2', [9, -9], [4.15, -4.25]]]) {
      const from = await page.evaluate((n) => window.__demo.locatorClientPoint(n), name);
      const to = await page.evaluate((p) => window.__demo.worldToClient(p), target);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(Math.min(to.x, 1095), Math.max(Math.min(to.y, 895), 5), { steps: 10 });
      await page.mouse.up();
      const p = (await state(page))[name];
      expect(Math.abs(p[0])).toBeLessThanOrEqual(Math.abs(lim[0]) + 1e-9);
      expect(Math.abs(p[1])).toBeLessThanOrEqual(Math.abs(lim[1]) + 1e-9);
    }
  });

  test('start inside an obstacle: robot drawn red and "No path exists." shown', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ r1: [-1, -0.5] }));
    await expect(page.getByTestId('no-path')).toBeVisible();
    await expect(page.getByTestId('robot-start')).toHaveAttribute('fill', '#ff0000');
    await page.getByTestId('setter-configOrWork-configuration-space').click();
    await expect(page.getByTestId('background')).toHaveAttribute('fill', '#ff0000');
    await reviewShot(page, testInfo, 'motion-start-inside-obstacle-config');
  });

  test('robot sides setter changes the robot polygon and resets progress', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ s: 20 }));
    for (const n of [4, 5, 3]) {
      await page.getByTestId(`setter-n-${n}`).click();
      expect((await polyPoints(page, 'robot-start')).length).toBe(n);
      expect((await state(page)).s).toBe(1);
    }
  });

  test('boundary sides setter changes the boundary polygon', async ({ page }) => {
    await openDemo(page, URL);
    for (const x of [3, 5, 4]) {
      await page.getByTestId(`setter-x-${x}`).click();
      expect((await polyPoints(page, 'boundary')).length).toBe(x);
    }
  });

  test('progress slider moves the robot along the path from start to end', async ({ page }) => {
    await openDemo(page, URL);
    const sc = await scene(page);
    const slider = page.getByTestId('slider-s');
    await expect(slider).toHaveAttribute('max', String(sc.discretePath.length));
    await slider.focus();
    await page.keyboard.press('End');
    const st = await state(page);
    expect(st.s).toBe(sc.discretePath.length);
    const moving = await polyPoints(page, 'robot-moving');
    const c = moving.reduce((a, p) => [a[0] + p[0] / moving.length, a[1] + p[1] / moving.length], [0, 0]);
    expect(c[0]).toBeCloseTo(st.r2[0], 6);
    expect(c[1]).toBeCloseTo(st.r2[1], 6);
  });

  test('configuration space view shows C-obstacles and the path, hides robot/obstacle bodies', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-configOrWork-configuration-space').click();
    for (let i = 1; i <= 4; i++) await expect(page.getByTestId(`cobstacle-fill-${i}`)).toHaveCount(1);
    await expect(page.getByTestId('obstacle-1')).toHaveCount(0);
    await expect(page.getByTestId('robot-start')).toHaveCount(0);
    await expect(page.getByTestId('path')).toHaveCount(1);
    await reviewShot(page, testInfo, 'motion-default-config-space');
  });

  test('a scene can be opened from a link (URL parameters)', async ({ page }) => {
    await openDemo(page, `${URL}?r1=-0.06,2.61&r2=2.895,-3.1&o1=-0.47,0.05&o2=1.375,-1.8&o3=0.53,1.41&o4=-0.68,-1.76&n=4&x=3`);
    const st = await state(page);
    expect(st.n).toBe(4);
    expect(st.x).toBe(3);
    expect((await scene(page)).discretePath.length).toBe(golden.states[3].discretePath.length);
  });

  test('keyboard: arrow keys move a focused locator', async ({ page }) => {
    await openDemo(page, URL);
    const before = (await state(page)).o3;
    await page.getByTestId('locator-o3').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    const after = (await state(page)).o3;
    expect(after[0]).toBeCloseTo(before[0] + 0.05, 9);
    expect(after[1]).toBeCloseTo(before[1] + 0.05, 9);
  });

  for (const [i, g] of golden.states.entries()) {
    test(`original snapshot state ${i}: same trajectory as the original + screenshot for review`, async ({ page }, testInfo) => {
      await openDemo(page, URL);
      await page.evaluate((s) => window.__demo.setState({ configOrWork: s.configOrWork, x: s.x, n: s.n, r1: s.r1, r2: s.r2, o1: s.o1, o2: s.o2, o3: s.o3, o4: s.o4, s: s.s }), g);
      const sc = await scene(page);
      expect(sc.discretePath.length).toBe(g.discretePath.length);
      sc.discretePath.forEach((p, k) => { expect(p[0]).toBeCloseTo(g.discretePath[k][0], 8); expect(p[1]).toBeCloseTo(g.discretePath[k][1], 8); });
      expect((await state(page)).s).toBe(g.s);
      await reviewShot(page, testInfo, `motion-snapshot-${i}-${g.configOrWork.replace(' ', '-')}`);
    });
  }
});
