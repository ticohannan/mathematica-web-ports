// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/robot-motion-obstacles.spec.js — browser tests of the "Robot Motion with Obstacles" page (TESTPLAN
// T-RM-46…55; attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/robot-motion-obstacles/';
const fixture = JSON.parse(fs.readFileSync('tests/golden/robot-motion-obstacles.original-states.json', 'utf8'));
const toClient = (page, p) => page.evaluate((q) => window.__demo.worldToClient(q), p);
const getState = (page) => page.evaluate(() => window.__demo.getState());
const getView = (page) => page.evaluate(() => window.__demo.view());
const gridSize = (page) => page.evaluate(() => window.__demo.gridImageSize());
async function drag(page, fromWorld, toWorld, steps = 8) {
  const a = await toClient(page, fromWorld), b = await toClient(page, toWorld);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}
const RED = 'rgb(255,0,0)', BLACK = 'rgb(0,0,0)';

test.describe('robot motion with obstacles', () => {
  test('loads without errors and draws the arm, the obstacles and the phase space', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['arm-link1', 'arm-link2', 'obstacle-1', 'obstacle-2']) await expect(page.getByTestId(id)).toHaveAttribute('stroke', BLACK);
    await expect(page.getByTestId('obstacle-1')).toHaveAttribute('fill', 'rgb(153,102,51)'); // Brown
    expect(await gridSize(page)).toEqual([64, 64]);
    await expect(page.getByTestId('frame-left')).toHaveAttribute('stroke', RED);
    await expect(page.getByTestId('frame-right')).toHaveAttribute('stroke-dasharray', /\d/);
    await expect(page.getByTestId('frame-bottom')).toHaveAttribute('stroke', 'rgb(0,0,255)');
    await expect(page.getByTestId('frame-top')).toHaveAttribute('stroke-dasharray', /\d/);
    await expect(page.getByTestId('glyph-config')).toHaveAttribute('data-color', 'green');
    await expect(page.getByTestId('glyph-config')).toHaveAttribute('transform', 'translate(5,0)');
    await expect(page.getByTestId('text-workspace')).toHaveText('robot workspace');
    await expect(page.getByTestId('text-phase')).toHaveText('robot phase space');
    await expect(page.getByTestId('text-theta1')).toHaveText('θ1');
    await expect(page.getByTestId('text-theta2')).toHaveText('θ2');
    await expect(page.getByTestId('text-robot-arm')).toHaveText('Robot Arm');
    await expect(page.getByTestId('label-theta1')).toHaveCount(1);
    await expect(page.getByTestId('label-theta2')).toHaveCount(1);
    await reviewShot(page, testInfo, 'robot-motion-obstacles-snapshot1');
  });

  test('has the controls of the original with their defaults: Q 2', async ({ page }) => {
    await openDemo(page, URL);
    const slider = page.getByTestId('slider-Quality');
    await expect(slider).toHaveAttribute('min', '0');
    await expect(slider).toHaveAttribute('max', '9'); // positions 1 … 10, step 1
    await expect(slider).toHaveValue('1');
    await expect(page.getByTestId('value-Quality')).toHaveValue('2');
    await expect(page.getByTestId('ctl-Quality').locator('.ctl-label i')).toHaveText('Q');
    await expect(page.getByTestId('plus-Quality')).toHaveCount(1);
    const s = await getState(page);
    expect([s.pObs, s.pObs2, s.pConfig, s.Quality]).toEqual([[1.1, 1.1], [1.1, -1.1], [5, 0], 2]);
    for (const n of ['pObs', 'pObs2', 'pConfig']) await expect(page.getByTestId(`locator-${n}`)).toHaveCount(1);
  });

  test('the Q slider changes the grid to 32Q by 32Q cells', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-Quality').focus();
    await page.keyboard.press('ArrowRight');
    expect((await getState(page)).Quality).toBe(3);
    expect(await gridSize(page)).toEqual([96, 96]);
    await page.getByTestId('value-Quality').fill('10');
    await page.getByTestId('value-Quality').press('Enter');
    expect((await getState(page)).Quality).toBe(10);
    expect(await gridSize(page)).toEqual([320, 320]);
    expect((await getView(page)).highRes).toBe(true);
    await reviewShot(page, testInfo, 'robot-motion-obstacles-q10');
  });

  test('dragging an obstacle with the mouse shows the coarse grid while dragging and the fine grid after release', async ({ page }) => {
    await openDemo(page, URL);
    const before = (await getView(page)).blocked;
    const a = await toClient(page, [1.1, 1.1]), b = await toClient(page, [0.8, 1.1]);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 5 });
    await expect.poll(() => gridSize(page)).toEqual([16, 16]); // ControlActive: 8Q cells per side
    expect(await page.evaluate(() => window.__demo.controlActive())).toBe(true);
    expect((await getView(page)).highRes).toBe(false);
    await page.mouse.up();
    await expect.poll(() => gridSize(page)).toEqual([64, 64]);
    const v = await getView(page);
    expect(v.highRes).toBe(true);
    expect(v.blocked).not.toBe(before);
    const s = await getState(page);
    expect(Math.abs(s.pObs[0] - 0.8)).toBeLessThan(0.03);
  });

  test('dragging the configuration locator with the mouse rotates the arm', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [5, 0], [4.8, 0.5]);
    const v = await getView(page);
    expect(Math.abs(v.Theta1 - 3.1416)).toBeLessThan(0.02);
    expect(Math.abs(v.Theta2 - 4.1338)).toBeLessThan(0.02);
    const t = await page.getByTestId('arm-link1').getAttribute('transform');
    expect(Number(t.match(/rotate\(([-\d.e]+)/)[1])).toBeCloseTo((v.Theta1 * 180) / Math.PI, 6);
  });

  test('dragging the configuration locator past the right edge wraps it to the left edge', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [5, 0], [6.78, 0]);
    const s = await getState(page);
    expect(s.pConfig[0]).toBe(2.9);
    const v = await getView(page);
    expect(v.Theta1).toBe(0);
    expect(v.theta1Label).toBe(false);
    await expect(page.getByTestId('label-theta1')).toHaveCount(0);
  });

  test('a press away from every locator moves the nearest locator there', async ({ page }) => {
    await openDemo(page, URL);
    const p = await toClient(page, [-1, -1.5]);
    await page.mouse.click(p.x, p.y);
    const s = await getState(page);
    expect(Math.hypot(s.pObs2[0] - -1, s.pObs2[1] - -1.5)).toBeLessThan(0.03); // nearest: 2.14 (pObs 3.34, pConfig 6.18)
    expect(s.pObs).toEqual([1.1, 1.1]);
    expect(s.pConfig).toEqual([5, 0]);
  });

  test('the configuration glyph and the arm outline turn red when the arm touches an obstacle', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await drag(page, [5, 0], [3.375, -1.95]);
    expect((await getView(page)).inCollision).toBe(true);
    await expect(page.getByTestId('glyph-config')).toHaveAttribute('data-color', 'red');
    for (const id of ['arm-link1', 'arm-link2', 'obstacle-1', 'obstacle-2']) await expect(page.getByTestId(id)).toHaveAttribute('stroke', RED);
    await reviewShot(page, testInfo, 'robot-motion-obstacles-collision');
    const s = await getState(page);
    await drag(page, s.pConfig, [5, 0]);
    expect((await getView(page)).inCollision).toBe(false);
    await expect(page.getByTestId('glyph-config')).toHaveAttribute('data-color', 'green');
    for (const id of ['arm-link1', 'obstacle-1']) await expect(page.getByTestId(id)).toHaveAttribute('stroke', BLACK);
  });

  test('arrow keys move a focused locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-pConfig').focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    const s = await getState(page);
    expect(s.pConfig[0]).toBeCloseTo(4.9, 12);
    expect(s.pConfig[1]).toBe(0);
    const v = await getView(page);
    expect(v.highRes).toBe(true);
    expect(await gridSize(page)).toEqual([64, 64]);
    await page.getByTestId('locator-pObs').focus();
    await page.keyboard.press('ArrowUp'); // an obstacle key move recomputes at full resolution (ControlActive False)
    expect(await gridSize(page)).toEqual([64, 64]);
    expect((await getState(page)).pObs[1]).toBeCloseTo(1.15, 12);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await getState(page);
    await page.getByTestId('slider-Quality').focus();
    await page.keyboard.press('ArrowRight');
    await drag(page, [1.1, 1.1], [0.5, 0.5]);
    await drag(page, [1.1, -1.1], [-1, -1]);
    await drag(page, [5, 0], [4, 1]);
    expect(await getState(page)).not.toEqual(opening);
    await page.getByTestId('reset').click();
    const s = await getState(page);
    expect(s).toEqual(opening);
    expect(s.freeConfigSpace).toEqual(fixture.states[0].freeConfigSpace);
    await expect(page.getByTestId('value-Quality')).toHaveValue('2');
    expect(await gridSize(page)).toEqual([64, 64]);
  });

  test('the original snapshot states, for review next to the snapshot pictures', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of [2, 3, 4]) {
      await page.evaluate((s) => window.__demo.setState(s), fixture.snapshots[String(k)]);
      expect((await getView(page)).gridSize).toBe(fixture.snapshots[String(k)].freeConfigSpace.length);
      await reviewShot(page, testInfo, `robot-motion-obstacles-snapshot${k}`);
    }
  });
});
