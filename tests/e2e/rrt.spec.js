// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Li Huang
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/rrt.spec.js — browser tests of the RRT page (real mouse and keyboard; random trees through ?seed=N)
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';

const URL = '/demos/rrt/';
const snapshots = loadStates('tests/golden/rrt.original-states.json').snapshots.map((s) => plain(s));
const toClient = (page, p) => page.evaluate((q) => window.__demo.worldToClient(q), p);
async function drag(page, fromWorld, toWorld, steps = 8) {
  const a = await toClient(page, fromWorld), b = await toClient(page, toWorld);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}
const getState = (page) => page.evaluate(() => window.__demo.getState());
const label = (page) => page.getByTestId('plot-label');

test.describe('rrt', () => {
  test('loads without errors and shows 1 node, goal not yet reached with the goal at (18, -18)', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(label(page)).toHaveText('1 node, goal not yet reached');
    expect((await getState(page)).finalGoal).toEqual([18, -18]);
    await expect(page.getByTestId('obstacle')).toHaveCount(4);
    await expect(page.getByTestId('wall')).toHaveCount(4);
    await expect(page.getByTestId('node')).toHaveCount(1);
    await expect(page.getByTestId('node')).toHaveAttribute('cx', '0');
    await expect(page.getByTestId('goal-disk')).toHaveAttribute('fill', 'rgb(255,255,0)');
    await reviewShot(page, testInfo, 'rrt-snapshot-1');
  });

  test('has the controls of the original with their defaults: RRT, narrow passage, five add buttons, bias 0, goal radius 1', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('setter-treeType-RRT')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-treeType-Random-Tree')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('setter-treeType-RRT*')).toHaveText('RRT*');
    await expect(page.getByTestId('popup-obstacles').locator('option:checked')).toHaveText('narrow passage');
    const buttons = page.getByTestId('row-add').locator('button');
    await expect(buttons).toHaveText(['1', '10', '100', '200', '500']);
    const tops = await buttons.evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1); // one row
    await expect(page.getByTestId('value-explorationBias')).toHaveValue('0');
    await expect(page.getByTestId('value-goalRadius')).toHaveValue('1');
    await expect(page.locator('[data-testid^=plus-]')).toHaveCount(0);
    for (const h of ['tree type', 'obstacle type', 'number of nodes to add:', 'exploration bias', 'goal radius']) {
      await expect(page.locator('.ctl-heading', { hasText: h })).toHaveCount(1);
    }
  });

  test('pressing 10 grows the tree to 11 nodes (seeded)', async ({ page }) => {
    await openDemo(page, `${URL}?seed=7`);
    await page.getByTestId('button-add-10').click();
    await expect(label(page)).toHaveText('11 nodes, goal not yet reached');
    await expect(page.getByTestId('node')).toHaveCount(11);
    await expect(page.getByTestId('edge')).toHaveCount(10);
    expect((await getState(page)).nodestoadd).toBe(0);
  });

  test('the tree type setter and the obstacle popup reset the tree to 1 node', async ({ page }) => {
    await openDemo(page, `${URL}?seed=8`);
    await page.getByTestId('button-add-10').click();
    await expect(label(page)).toHaveText('11 nodes, goal not yet reached');
    await page.getByTestId('setter-treeType-Random-Tree').click();
    await expect(label(page)).toHaveText('1 node, goal not yet reached');
    await page.getByTestId('button-add-10').click();
    await expect(label(page)).toHaveText('11 nodes, goal not yet reached');
    await page.getByTestId('popup-obstacles').selectOption({ label: 'sparse' });
    await expect(label(page)).toHaveText('1 node, goal not yet reached');
    const s = await getState(page);
    expect([s.treeType, s.obstacles, s.verts.length]).toEqual(['Random Tree', 'sparse', 1]);
  });

  test('the obstacle popup draws 4, 4, 1 and 0 obstacle polygons', async ({ page }) => {
    await openDemo(page, URL);
    for (const [name, n] of [['sparse', 4], ['narrow passage', 4], ['concave', 1], ['none', 0]]) {
      await page.getByTestId('popup-obstacles').selectOption({ label: name });
      await expect(page.getByTestId('obstacle'), name).toHaveCount(n);
      await expect(page.getByTestId('wall')).toHaveCount(4);
    }
  });

  test('dragging the goal locator with the mouse moves the goal disk', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, [18, -18], [10, 10]);
    const g = (await getState(page)).finalGoal;
    expect(Math.abs(g[0] - 10)).toBeLessThan(0.1);
    expect(Math.abs(g[1] - 10)).toBeLessThan(0.1);
    const cx = Number(await page.getByTestId('goal-disk').getAttribute('cx'));
    const cy = Number(await page.getByTestId('goal-disk').getAttribute('cy'));
    expect([cx, cy]).toEqual(g);
    expect(Number(await page.getByTestId('goal-point').getAttribute('cx'))).toBe(g[0]);
  });

  test('a press away from the goal locator moves it there (LocatorPane)', async ({ page }) => {
    await openDemo(page, URL);
    const c = await toClient(page, [-5, 5]);
    await page.mouse.click(c.x, c.y);
    const g = (await getState(page)).finalGoal;
    expect(Math.abs(g[0] + 5)).toBeLessThan(0.1);
    expect(Math.abs(g[1] - 5)).toBeLessThan(0.1);
  });

  test('dragging the goal onto the root turns the disk green and reads 1 node, path length 0', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await drag(page, [18, -18], [0.5, 0.5], 12);
    await expect(label(page)).toHaveText('1 node, path length 0');
    await expect(page.getByTestId('goal-disk')).toHaveAttribute('fill', 'rgb(0,255,0)');
    await expect(page.getByTestId('path')).toHaveCount(1);
    await reviewShot(page, testInfo, 'rrt-goal-on-root');
  });

  test('every node carries its cost as a tooltip', async ({ page }) => {
    await openDemo(page, `${URL}?seed=3`);
    await page.getByTestId('button-add-10').click();
    await expect(page.getByTestId('node')).toHaveCount(11);
    const titles = await page.getByTestId('node').evaluateAll((cs) => cs.map((c) => c.querySelector('title').textContent));
    const s = await getState(page);
    expect(titles[0]).toBe('0');
    const six = (x) => { let t = String(Number(x.toPrecision(6))); if (!t.includes('.')) t += '.'; return t; };
    titles.slice(1).forEach((t, i) => expect(t).toBe(six(s.verts[i + 1][3])));
    expect(titles[1]).toMatch(/\.$|\.\d+$/);
  });

  test('the sliders show their values as text: 0 at start, 0.05 after one step', async ({ page }) => {
    await openDemo(page, URL);
    const bias = page.getByTestId('slider-explorationBias');
    await expect(page.getByTestId('value-explorationBias')).toHaveValue('0');
    await bias.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('value-explorationBias')).toHaveValue('0.05');
    expect((await getState(page)).explorationBias).toBe(0.05);
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('value-explorationBias')).toHaveValue('0.');
    await expect(page.getByTestId('value-goalRadius')).toHaveValue('1');
    await page.getByTestId('slider-goalRadius').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('value-goalRadius')).toHaveValue('1.1');
    expect((await getState(page)).goalRadius).toBe(1.1);
  });

  test('?seed=N gives reproducible trees (port addition)', async ({ page }) => {
    const grow = async (url) => {
      await openDemo(page, url);
      await page.getByTestId('button-add-100').click();
      await expect(label(page)).toHaveText(/^101 nodes/);
      return (await getState(page)).verts.map((v) => v[0]);
    };
    const a = await grow(`${URL}?seed=5`);
    const b = await grow(`${URL}?seed=5`);
    expect(a).toEqual(b);
    const c = await grow(URL);
    const d = await grow(URL);
    expect(c).not.toEqual(d);
  });

  test('the saved snapshot states load through the automation hook and show the snapshot labels', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const [k, text] of [[2, '1001 nodes, goal not yet reached'], [3, '1001 nodes, path length 47.'], [4, '1001 nodes, path length 40.39'], [5, '501 nodes, path length 20.82'], [6, '501 nodes, path length 27.']]) {
      await page.evaluate((s) => window.__demo.loadState(s), snapshots[k - 1]);
      await expect(label(page)).toHaveText(text);
      await expect(page.getByTestId('goal-disk')).toHaveAttribute('fill', k === 2 ? 'rgb(255,255,0)' : 'rgb(0,255,0)');
      await expect(page.getByTestId('node')).toHaveCount(snapshots[k - 1].verts.length);
      await reviewShot(page, testInfo, `rrt-snapshot-${k}`);
    }
    await expect(page.getByTestId('setter-treeType-RRT')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('value-goalRadius')).toHaveValue('2.5');
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, `${URL}?seed=9`);
    await page.getByTestId('setter-treeType-RRT*').click();
    await page.getByTestId('popup-obstacles').selectOption({ label: 'concave' });
    await page.getByTestId('slider-goalRadius').focus();
    await page.keyboard.press('ArrowRight');
    await page.getByTestId('button-add-10').click();
    await drag(page, [18, -18], [-10, 10]);
    await expect(label(page)).toHaveText(/^11 nodes/);
    await page.getByTestId('reset').click();
    await expect(label(page)).toHaveText('1 node, goal not yet reached');
    const s = await getState(page);
    expect([s.treeType, s.obstacles, s.goalRadius, s.explorationBias, s.finalGoal, s.verts.length]).toEqual(['RRT', 'narrow passage', 1, 0, [18, -18], 1]);
    await expect(page.getByTestId('setter-treeType-RRT')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('popup-obstacles').locator('option:checked')).toHaveText('narrow passage');
    await expect(page.getByTestId('value-goalRadius')).toHaveValue('1');
    await expect(page.getByTestId('obstacle')).toHaveCount(4);
  });

  test('arrow keys move the focused goal locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-finalGoal').focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Shift+ArrowUp');
    const g = (await getState(page)).finalGoal;
    expect(g[0]).toBeCloseTo(17.7, 10);
    expect(g[1]).toBeCloseTo(-17.5, 10);
    for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowDown');
    expect((await getState(page)).finalGoal[1]).toBe(-19);
  });
});
