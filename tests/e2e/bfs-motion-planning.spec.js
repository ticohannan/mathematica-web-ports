// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/bfs-motion-planning.spec.js — browser tests of the "Breadth-First Search Robot Motion Planning" page
// (TESTPLAN T-BF-51…61, T-BF-76; attribution, start-up notice, UI inventory and bundle are in site.spec.js and
// bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/bfs-motion-planning/';
const fixture = JSON.parse(fs.readFileSync('tests/golden/bfs-motion-planning.original-states.json', 'utf8'));
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
/** a fixture state as the page takes it (exact numbers as doubles, Infinity as "Infinity") */
const fixtureState = (s) => JSON.parse(JSON.stringify(s, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) && typeof v.wl === 'string' ? (v.wl === 'Infinity' ? 'Infinity' : v.n) : v)));
const LABEL = (x) => `robot phase space, path length = ${x} rads`;

test.describe('breadth-first search robot motion planning', () => {
  test('loads without errors and draws the arm, the obstacles, the cost map and the path', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('arm-link1')).toHaveAttribute('fill', 'rgb(128,128,128)'); // Gray
    await expect(page.getByTestId('arm-link2')).toHaveAttribute('fill', 'rgb(217,217,217)'); // LightGray
    for (const id of ['arm-link1', 'arm-link2', 'obstacle-1', 'obstacle-2']) await expect(page.getByTestId(id)).toHaveAttribute('stroke', 'rgb(0,0,0)');
    expect(await gridSize(page)).toEqual([32, 32]);
    const v = await getView(page);
    expect(v.path).toHaveLength(9);
    expect(v.ccord).toEqual([16, 22]);
    expect(v.blocked).toBe(64);
    // the pixels of the inset image: white start cell, dark red blocked cells, green path, blue current cell
    const px = await page.evaluate(async () => {
      const img = document.querySelector('[data-testid=grid-image]');
      const im = new Image();
      im.src = img.getAttribute('href');
      await im.decode();
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(im, 0, 0);
      const at = (r, col) => Array.from(ctx.getImageData(col - 1, r - 1, 1, 1).data.slice(0, 3));
      const st = window.__demo.getState();
      const blocked = [];
      st.freeConfigSpace.forEach((row, i) => row.forEach((x, j) => { if (x === -1) blocked.push([i + 1, j + 1]); }));
      return { size: [im.width, im.height], path: at(16, 18), goal: at(16, 22), far: at(1, 1), blocked: at(...blocked[0]) };
    });
    expect(px.size).toEqual([32, 32]);
    // WebKit's canvas may change a channel by 1 when it decodes the PNG (colour management): ±2 per channel
    const near = (got, want) => got.forEach((v, k) => expect(Math.abs(v - want[k])).toBeLessThanOrEqual(2));
    near(px.path, [0, 255, 0]);
    near(px.goal, [0, 0, 255]);
    near(px.blocked, [127, 0, 0]);
    expect(px.far[0]).toBeLessThan(80); // far from the start: dark grey
    await expect(page.getByTestId('glyph-start')).toHaveAttribute('data-color', 'green');
    await expect(page.getByTestId('glyph-goal')).toHaveAttribute('data-color', 'green');
    await expect(page.getByTestId('text-workspace')).toHaveText('robot workspace');
    await expect(page.getByTestId('text-workspace')).toHaveAttribute('fill', 'rgb(0,0,0)');
    await reviewShot(page, testInfo, 'bfs-motion-planning-snapshot1');
  });

  test('has the controls of the original with their defaults: Q 2 and P 1', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('slider-Quality')).toHaveValue('1');
    await expect(page.getByTestId('slider-Quality')).toHaveAttribute('max', '9');
    await expect(page.getByTestId('value-Quality')).toHaveValue('2');
    await expect(page.getByTestId('slider-progress')).toHaveAttribute('max', '100'); // 0 … 1 in steps of 0.01
    await expect(page.getByTestId('slider-progress')).toHaveValue('100');
    await expect(page.getByTestId('value-progress')).toHaveValue('1');
    await expect(page.getByTestId('ctl-Quality').locator('.ctl-label i')).toHaveText('Q');
    await expect(page.getByTestId('ctl-progress').locator('.ctl-label i')).toHaveText('P');
    for (const n of ['Quality', 'progress']) await expect(page.getByTestId(`plus-${n}`)).toHaveCount(1);
    const s = await getState(page);
    expect([s.pObs, s.pObs2, s.pConfigI, s.pConfigF]).toEqual([[1.1, 1.1], [1.1, -1.1], [4.5, 0], [5.5, 0]]);
  });

  test('the phase-space label reads path length = 1.57 rads at the initial settings, as in snapshot 1', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('text-phase')).toHaveText(LABEL('1.57'));
  });

  test('moving the P slider moves the blue cell and the arm along the green path', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-progress').focus();
    await page.keyboard.press('Home');
    let v = await getView(page);
    expect((await getState(page)).progress).toBe(0);
    expect(v.ccord).toEqual([16, 14]);
    expect(v.Theta1).toBeCloseTo(2.6507, 4);
    await page.getByTestId('value-progress').fill('0.5');
    await page.getByTestId('value-progress').press('Enter');
    v = await getView(page);
    expect(v.ccord).toEqual([16, 18]);
    expect(v.searches).toBe(1); // the path does not change
    await reviewShot(page, testInfo, 'bfs-motion-planning-progress');
  });

  test('dragging the goal locator changes the path and the label but not the cost map', async ({ page }) => {
    await openDemo(page, URL);
    const before = await page.evaluate(() => window.__demo.costmap());
    await drag(page, [5.5, 0], [6.0, 0.5]);
    const v = await getView(page);
    expect(v.lE).toEqual([11, 27]);
    expect(v.path).toHaveLength(14);
    expect(v.label).toBe(LABEL('2.96'));
    expect(v.searches).toBe(1);
    expect(await page.evaluate(() => window.__demo.costmap())).toEqual(before);
    await expect(page.getByTestId('text-phase')).toHaveText(LABEL('2.96'));
  });

  test('dragging an obstacle with the mouse shows the coarse grid while dragging and the fine grid after release', async ({ page }) => {
    await openDemo(page, URL);
    const a = await toClient(page, [1.1, 1.1]), b = await toClient(page, [1.0, 1.0]);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 4 });
    await expect.poll(() => gridSize(page)).toEqual([8, 8]); // ControlActive: 4Q cells, search and path on them
    expect((await getView(page)).highRes).toBe(false);
    await page.mouse.up();
    await expect.poll(() => gridSize(page)).toEqual([32, 32]);
    expect((await getView(page)).highRes).toBe(true);
  });

  test('a goal inside an obstacle region gives a one-cell path and red glyphs', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await drag(page, [5.5, 0], [3.315625, 1.740625]);
    const v = await getView(page);
    expect(v.lE).toEqual([1, 4]);
    expect(v.path).toEqual([[1, 4]]);
    expect(v.inCollision).toBe(true);
    await expect(page.getByTestId('glyph-start')).toHaveAttribute('data-color', 'red');
    await expect(page.getByTestId('glyph-goal')).toHaveAttribute('data-color', 'red');
    for (const id of ['arm-link1', 'arm-link2', 'obstacle-1', 'obstacle-2']) await expect(page.getByTestId(id)).toHaveAttribute('stroke', 'rgb(255,0,0)');
    await expect(page.getByTestId('text-phase')).toHaveText(LABEL('∞')); // provisional (D-BF-06, K-BF-01)
    await reviewShot(page, testInfo, 'bfs-motion-planning-blocked-goal');
  });

  test('dragging the start locator past the top edge wraps it to the bottom edge', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [4.5, 0], [4.5, 1.85]);
    const s = await getState(page);
    expect(s.pConfigI[1]).toBe(-2);
    expect(s.lS[0]).toBe(32);
  });

  test('dragging the start locator below the bottom edge wraps it to the top row of the grid', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [4.5, 0], [4.5, -2.08]);
    const s = await getState(page);
    expect(s.pConfigI[1]).toBe(1.7999999999999998);
    expect(s.lS[0]).toBe(1); // a·(1/b) division (F-BF-09, K-BF-03)
    const v = await getView(page);
    expect(v.path[0]).toEqual(s.lS);
    expect(v.path[v.path.length - 1]).toEqual([16, 22]);
  });

  test('a press away from every locator moves the nearest locator there', async ({ page }) => {
    await openDemo(page, URL);
    const p = await toClient(page, [6.5, -1.8]);
    await page.mouse.click(p.x, p.y);
    const s = await getState(page);
    expect(Math.hypot(s.pConfigF[0] - 6.5, s.pConfigF[1] - -1.8)).toBeLessThan(0.03); // nearest: 2.06 (pConfigI 2.69)
    expect(s.pConfigI).toEqual([4.5, 0]);
  });

  test('arrow keys move a focused locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-pConfigF').focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
    const s = await getState(page);
    expect(s.pConfigF[1]).toBeCloseTo(0.2, 12);
    const v = await getView(page);
    expect(v.lE).toEqual([14, 22]);
    expect(v.walks).toBe(3); // the goal changed cell twice (rows 15, then 14)
    expect(v.highRes).toBe(true);
    expect(await gridSize(page)).toEqual([32, 32]);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await getState(page);
    await page.getByTestId('slider-Quality').focus();
    await page.keyboard.press('ArrowRight');
    await page.getByTestId('slider-progress').focus();
    await page.keyboard.press('Home');
    await drag(page, [1.1, 1.1], [0.5, 0.5]);
    await drag(page, [4.5, 0], [4, 1]);
    expect(await getState(page)).not.toEqual(opening);
    await page.getByTestId('reset').click();
    const s = await getState(page);
    expect(s).toEqual(opening);
    expect(s.path).toEqual(fixture.states[0].path);
    expect(s.freeConfigSpace).toEqual(fixture.states[0].freeConfigSpace);
    await expect(page.getByTestId('text-phase')).toHaveText(LABEL('1.57'));
    await expect(page.getByTestId('value-progress')).toHaveValue('1');
  });

  test('the original snapshot states, for review next to the snapshot pictures', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const labels = { 2: '2.99', 3: '2.58', 4: '4.31' };
    for (const k of [2, 3, 4]) {
      await page.evaluate((s) => window.__demo.setState(s), fixtureState(fixture.snapshots[String(k)]));
      await expect(page.getByTestId('text-phase')).toHaveText(LABEL(labels[k]));
      await reviewShot(page, testInfo, `bfs-motion-planning-snapshot${k}`);
    }
  });
});
