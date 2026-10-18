// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Benedict Isichei
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/distance-norms.spec.js — browser tests of the distance-norms page (real mouse and keyboard). Expected areas
// from TESTPLAN T-DN-03 (closed forms) and T-DN-22 (∫∫ cos Δθ2 over each ball).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/distance-norms/';
const getState = (page) => page.evaluate(() => window.__demo.getState());
const getView = (page) => page.evaluate(() => window.__demo.view());
const toClient = (page, p) => page.evaluate((q) => window.__demo.worldToClient(q), p);
const dialClient = (page, name, p) => page.evaluate(([n, q]) => window.__demo.dialToClient(n, q), [name, p]);
const states = JSON.parse(fs.readFileSync('tests/golden/distance-norms.original-states.json', 'utf8'));
const plain = (v) => (v && typeof v === 'object' && !Array.isArray(v) && 'wl' in v ? (v.wl === 'Infinity' ? Infinity : v.n) : v);

test.describe('distance norms', () => {
  test('has the controls of the original with their defaults: norm space, norm type, d, r1 and two dials', async ({ page }) => {
    await openDemo(page, URL);
    // ControlPlacement -> Left: one column in the original's order
    const order = await page.locator('#controls > .ctl').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    expect(order).toEqual(['ctl-cORw', 'ctl-p', 'ctl-bound', 'ctl-r1', 'ctl-p1', 'ctl-p2']);
    await expect(page.getByTestId('setter-cORw-phase-space')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-cORw-workspace')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('setter-p-Infinity')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-p-Infinity')).toHaveText('∞');
    for (const v of [1, 2, 3]) await expect(page.getByTestId(`setter-p-${v}`)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('value-bound')).toHaveValue('1/2');
    await expect(page.getByTestId('value-r1')).toHaveValue('1');
    for (const id of ['plus-bound', 'plus-r1', 'locator-p1', 'locator-p2', 'locator-pEnd']) await expect(page.getByTestId(id)).toHaveCount(1);
    await expect(page.getByTestId('ctl-cORw').locator('.ctl-label')).toHaveText('norm space');
    await expect(page.getByTestId('ctl-p').locator('.ctl-label')).toHaveText('norm type');
    await expect(page.getByTestId('ctl-bound').locator('.ctl-label')).toHaveText('d');
    await expect(page.getByTestId('ctl-r1').locator('.ctl-label')).toHaveText('r1');
    const s = await getState(page);
    expect(s).toEqual({ cORw: 'phase space', p: Infinity, bound: 0.5, r1: 1, p1: [1, 0], p2: [0, 1], pEnd: [2, 0], pEndp: [2, 0], IsElbowUpp: true });
    const v = await getView(page);
    expect(v.locals).toEqual({ r2: 1, Theta1: 0, Theta2: Math.PI / 2 }); // θ1 dial at 0, θ2 dial at π/2
  });

  test('loads without errors and draws the arm under the shaded region', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    // Prolog: the arm comes first in document order, then the frame and axes, then the region and its outline
    const layers = await page.locator('[data-testid=scene-svg] [data-layer]').evaluateAll((els) => els.map((e) => e.getAttribute('data-layer')));
    expect(layers.indexOf('arm')).toBeLessThan(layers.indexOf('region'));
    expect(layers.indexOf('region')).toBeLessThan(layers.indexOf('outline'));
    await expect(page.getByTestId('region-sheet-1')).toHaveCount(1);
    await expect(page.getByTestId('region-sheet-1')).toHaveAttribute('fill-opacity', '0.5');
    await expect(page.getByTestId('region-boundary')).toHaveCount(1);
    for (const id of ['link-1', 'link-2', 'base-point', 'elbow-point', 'theta1-arc', 'theta2-arc', 'theta2-label', 'robot-arm-label']) {
      await expect(page.getByTestId(id), id).toHaveCount(1);
    }
    await expect(page.getByTestId('theta1-label')).toHaveCount(0); // Abs[θ1] > π/4 is False at θ1 = 0
    const labels = await page.locator('[data-testid=labels] text').allTextContents();
    expect(labels).toEqual(['−2', '−1', '0', '1', '2', '−2', '−1', '0', '1', '2']);
    await reviewShot(page, testInfo, 'distance-norms-initial');
  });

  test('every norm type and both norm spaces draw a region', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const expected = { workspace: [0.5, 0.7854, 0.8833, 1.0], 'phase-space': [0.48941, 0.76112, 0.85243, 0.95885] };
    for (const space of ['workspace', 'phase-space']) {
      await page.getByTestId(`setter-cORw-${space}`).click();
      for (const [i, p] of ['1', '2', '3', 'Infinity'].entries()) {
        await page.getByTestId(`setter-p-${p}`).click();
        await expect(page.getByTestId(`setter-p-${p}`)).toHaveAttribute('aria-pressed', 'true');
        const v = await getView(page);
        expect(v.mode).toBe(space.replace('-', ' '));
        expect(v.sheetCount).toBe(1);
        expect(Math.abs(v.totalArea / expected[space][i] - 1), `${space} p = ${p}`).toBeLessThan(0.01);
        const pts = await page.getByTestId('region-sheet-1').getAttribute('points');
        expect(pts.split(' ').length).toBeGreaterThan(100);
        const box = await page.getByTestId('region-sheet-1').boundingBox();
        expect(box.width).toBeGreaterThan(20);
      }
    }
    await reviewShot(page, testInfo, 'distance-norms-workspace-infinity');
  });

  test('moving the d slider with the mouse grows the region', async ({ page }) => {
    await openDemo(page, URL);
    const before = (await getView(page)).totalArea;
    const slider = page.getByTestId('slider-bound');
    const box = await slider.boundingBox();
    // the thumb sits at 0.5 of 0.01 … π (about 16 %); drag it to about 30 %
    await page.mouse.move(box.x + box.width * 0.155, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    const s = await getState(page);
    expect(s.bound).toBeGreaterThan(0.5);
    const k = Math.round((s.bound - 0.01) / 0.01);
    expect(s.bound).toBe(0.01 + k * 0.01); // Mathematica's discrete slider value min + k·step
    expect((await getView(page)).totalArea).toBeGreaterThan(before);
    await expect(page.getByTestId('value-bound')).not.toHaveValue('1/2');
  });

  test('dragging a dial turns the arm and moves the region', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const before = await page.evaluate(() => window.__demo.region().boundary[0]);
    const top = await dialClient(page, 'p1', [0, 1]);
    await page.mouse.move(top.x, top.y);
    await page.mouse.down();
    await page.mouse.up();
    const v = await getView(page);
    expect(Math.abs(v.locals.Theta1 - Math.PI / 2)).toBeLessThan(0.01);
    expect(Math.hypot(v.elbow[0] - 0, v.elbow[1] - 1)).toBeLessThan(0.01);
    const after = await page.evaluate(() => window.__demo.region().boundary[0]);
    expect(Math.hypot(after[0] - before[0], after[1] - before[1])).toBeGreaterThan(0.5);
    // a drag along the θ2 dial follows the pointer (Normalize of the pointer position)
    const a = await dialClient(page, 'p2', [0, 1]), b = await dialClient(page, 'p2', [-0.7, -0.7]);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up();
    const w = await getView(page);
    expect(Math.abs(w.locals.Theta2 - -3 * Math.PI / 4)).toBeLessThan(0.03);
    const s = await getState(page);
    expect(Math.abs(Math.hypot(...s.p2) - 1)).toBeLessThan(1e-15);
    await reviewShot(page, testInfo, 'distance-norms-dials-turned');
  });

  test('a press in the plot moves only the invisible locator', async ({ page }) => {
    await openDemo(page, URL);
    const before = await page.evaluate(() => ({ region: window.__demo.region(), arm: window.__demo.arm(), n: window.__demo.evaluations() }));
    const a = await toClient(page, [-1, -1]), b = await toClient(page, [-1.5, -0.5]);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    let s = await getState(page);
    expect(Math.abs(s.pEnd[0] - -1)).toBeLessThan(0.02);
    expect(Math.abs(s.pEnd[1] - -1)).toBeLessThan(0.02);
    await page.mouse.move(b.x, b.y, { steps: 4 });
    await page.mouse.up();
    s = await getState(page);
    expect(Math.abs(s.pEnd[0] - -1.5)).toBeLessThan(0.02);
    expect(Math.abs(s.pEnd[1] - -0.5)).toBeLessThan(0.02);
    expect(s.pEndp).toEqual([2, 0]);
    const after = await page.evaluate(() => ({ region: window.__demo.region(), arm: window.__demo.arm(), n: window.__demo.evaluations() }));
    expect(after.region).toEqual(before.region);
    expect(after.arm).toEqual(before.arm);
    expect(after.n).toBe(before.n); // the body does not depend on pEnd (N-DN-03)
    // the locator range {-2, -2} … {2, 2}
    const c = await toClient(page, [-2.4, 2.4]);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.up();
    expect((await getState(page)).pEnd).toEqual([-2, 2]);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-cORw-workspace').click();
    await page.getByTestId('setter-p-2').click();
    await page.getByTestId('value-bound').fill('1.3');
    await page.getByTestId('value-bound').press('Enter');
    await page.getByTestId('value-r1').fill('0.4');
    await page.getByTestId('value-r1').press('Enter');
    const top = await dialClient(page, 'p1', [0, -1]);
    await page.mouse.click(top.x, top.y);
    const p = await toClient(page, [1, -1]);
    await page.mouse.click(p.x, p.y);
    const changed = await getState(page);
    expect(changed.bound).toBe(1.3);
    expect(changed.r1).toBe(0.4);
    expect(changed.cORw).toBe('workspace');
    await page.getByTestId('reset').click();
    expect(await getState(page)).toEqual({ cORw: 'phase space', p: Infinity, bound: 0.5, r1: 1, p1: [1, 0], p2: [0, 1], pEnd: [2, 0], pEndp: [2, 0], IsElbowUpp: true });
    await expect(page.getByTestId('setter-cORw-phase-space')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-p-Infinity')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('value-bound')).toHaveValue('1/2');
    await expect(page.getByTestId('value-r1')).toHaveValue('1');
    const v = await getView(page);
    expect(Math.abs(v.totalArea / 0.95885 - 1)).toBeLessThan(0.01);
  });

  test('arrow keys move a focused dial locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-p2').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const s = await getState(page);
    expect(s.p2[0]).toBeGreaterThan(0);
    expect(Math.abs(Math.hypot(...s.p2) - 1)).toBeLessThan(1e-15);
    const v = await getView(page);
    expect(Math.abs(v.locals.Theta2 - 1.4711)).toBeLessThan(0.001); // (0, 1) + 0.05 x, normalised, twice
    // the invisible locator moves 0.05 per key (Shift 0.25)
    await page.getByTestId('locator-pEnd').focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Shift+ArrowUp');
    const t = await getState(page);
    expect(t.pEnd[0]).toBeCloseTo(1.95, 12);
    expect(t.pEnd[1]).toBeCloseTo(0.25, 12);
  });

  test('review screenshots at the six snapshot Settings (snapshot 1 to 6)', async ({ page }, testInfo) => {
    // for human side-by-side comparison with docs/original-snapshots/distance-norms-<k>.png
    const problems = await openDemo(page, URL);
    for (const k of Object.keys(states.snapshots)) {
      const s = Object.fromEntries(Object.entries(states.snapshots[k]).map(([a, v]) => [a, plain(v)]));
      await page.evaluate((x) => window.__demo.setState(x), s);
      if (s.cORw === 'configuration') {
        for (const b of ['workspace', 'phase-space']) await expect(page.getByTestId(`setter-cORw-${b}`)).toHaveAttribute('aria-pressed', 'false');
      }
      await expect(page.getByTestId('value-bound')).toHaveValue('1/2');
      await reviewShot(page, testInfo, `distance-norms-snapshot${k}`);
    }
    expect(problems).toEqual([]);
  });
});
