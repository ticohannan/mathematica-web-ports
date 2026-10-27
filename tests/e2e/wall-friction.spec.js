// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/wall-friction.spec.js — browser tests of the "Moving Two Particles with Shared Control Inputs Using Wall
// Friction" page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/wall-friction/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const fx = JSON.parse(fs.readFileSync('tests/golden/wall-friction.original-states.json', 'utf8'));

test.describe('wall-friction', () => {
  test('loads without errors and draws the saved state: workspace, markers, two paths, the Δ configuration space inset', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['workspace', 'markers-1', 'markers-2', 'path-1', 'path-2', 'position-1', 'position-2', 'config-plot']) await expect(page.getByTestId(id)).toHaveCount(1);
    const inset = page.getByTestId('config-plot');
    for (const id of ['reach-blue', 'reach-green', 'goal-delta', 'current-delta', 'label-r', 'label-g']) await expect(inset.getByTestId(id)).toHaveCount(1);
    await expect(inset.getByTestId('frame-label-bottom')).toHaveText('Δx');
    await expect(inset.getByTestId('frame-label-left')).toHaveText('Δy');
    await expect(inset.getByTestId('label-r')).toHaveText('Δr');
    await expect(inset.getByTestId('frame')).toContainText('0.5');
    await expect(page.getByTestId('moves')).toHaveCount(0);
    await expect(page.getByTestId('path-1').locator('polygon')).toHaveCount(3); // three arrowheads: moves 1, 2 and 4 (held in 3)
    // four invisible locators (Appearance -> None)
    for (const n of ['s1', 's2', 'e1', 'e2']) await expect(page.getByTestId(`locator-${n}`)).toHaveCount(1);
    await expect(page.locator('.locator-glyph')).toHaveCount(0);
    await expect(page.getByTestId('scene-svg')).toBeVisible();
  });
  test('has the controls of the original with their saved values', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('setter-ifMove-Δ-configuration-space')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-ifMove-moves')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('value-progress')).toHaveValue('1');
    await expect(page.getByTestId('value-ϵ')).toHaveValue('1/20'); // the exact value, as Mathematica's label
    await expect(page.getByTestId('plus-progress')).toHaveCount(0); // ControlType -> Slider: no animation panel
    await expect(page.getByTestId('plus-ϵ')).toHaveCount(0);
    for (const t of ['on the right, show', 'progress', 'ϵ']) await expect(page.locator('#controls')).toContainText(t);
    const s = await state(page);
    expect(s).toEqual({ ifMove: 'Δ configuration space', progress: 1, 'ϵ': 0.05, s1: [0.95, 0.95], s2: [0.2, 0.8], e1: [0.05, 0.95], e2: [0.33, 0.66] });
  });
  test('a progress slider step by keyboard moves the robots back along their paths (exact steps k/420)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-progress').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('value-progress')).toHaveValue('419/420');
    let v = await view(page);
    expect(v.mvNum).toBe(3); // 419/420 · 4 = 3.99…: in move 4
    expect(v.mvFrac).toBeCloseTo(416 / 420, 14);
    await page.keyboard.press('Home');
    await expect(page.getByTestId('value-progress')).toHaveValue('0');
    v = await view(page);
    expect(v.pm1).toEqual([0.95, 0.95]);
    await expect(page.getByTestId('path-1').locator('polygon')).toHaveCount(0); // no move made yet
    // three quarters: robot 1 in the top-left corner (a point with a white centre), robot 2 at the left wall
    await page.evaluate(() => window.__demo.setState({ progress: 315 * (1 / 420) }));
    await expect(page.getByTestId('value-progress')).toHaveValue('3/4');
    await expect(page.getByTestId('position-1').locator('circle')).toHaveCount(2); // a point, then a smaller white one
    await expect(page.getByTestId('position-2').locator('circle')).toHaveCount(1);
  });
  test('the ϵ slider changes the workspace; the body keeps the points in it', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-ϵ').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('value-ϵ')).toHaveValue('51/1000');
    expect((await state(page))['ϵ']).toBeCloseTo(0.051, 12);
    const white = page.getByTestId('workspace').locator('rect').nth(2);
    expect(Number(await white.getAttribute('x'))).toBeCloseTo(0.051, 12);
    // the largest ϵ, 1/10: robot 1's start (0.95, 0.95) and goal (0.05, 0.95) are pulled in to the ϵ workspace
    await page.keyboard.press('End');
    await expect(page.getByTestId('value-ϵ')).toHaveValue('1/10');
    const s = await state(page);
    expect(s.s1).toEqual([0.9, 0.9]);
    expect(s.e1).toEqual([0.1, 0.9]);
    expect((await view(page)).found).toBe(true);
  });
  test('the setter shows the moves (move k of n, total distance, the current move) or the Δ configuration space', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-ifMove-moves').click();
    expect((await state(page)).ifMove).toBe('moves');
    await expect(page.getByTestId('config-plot')).toHaveCount(0);
    await expect(page.getByTestId('move-text')).toHaveText('move 4 of 4');
    await expect(page.getByTestId('distance-text')).toHaveText(/^total distance 1\.33\s*$/);
    await expect(page.getByTestId('move-done').locator('polygon')).toHaveCount(1);
    await page.evaluate(() => window.__demo.setState({ progress: 105 * (1 / 420) })); // the start of move 2
    await expect(page.getByTestId('move-text')).toHaveText('move 2 of 4');
    await expect(page.getByTestId('move-point')).toHaveCount(1);
    await expect(page.getByTestId('move-done')).toHaveCount(0); // nothing of move 2 done yet
    await page.getByTestId('setter-ifMove-Δ-configuration-space').click();
    await expect(page.getByTestId('config-plot')).toHaveCount(1);
    await expect(page.getByTestId('moves')).toHaveCount(0);
  });
  test("dragging robot 2's start with the mouse moves it and recomputes the paths", async ({ page }) => {
    await openDemo(page, URL);
    const before = await view(page);
    const at = await page.evaluate(() => window.__demo.worldToClient([0.2, 0.8]));
    const to = await page.evaluate(() => window.__demo.worldToClient([0.5, 0.4]));
    await page.mouse.move(at.x, at.y); await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 6 }); await page.mouse.up();
    const s = await state(page);
    expect(dist(s.s2, [0.5, 0.4])).toBeLessThan(0.01);
    expect(s.s1).toEqual([0.95, 0.95]); // the other points stay
    const v = await view(page);
    expect(v.found).toBe(true);
    expect(v.path).not.toEqual(before.path);
    expect(dist(v.path2[0], s.s2)).toBeLessThan(1e-12);
    expect(dist(v.pm2, s.e2)).toBeLessThan(1e-12); // still ends at the goal
    const r = page.getByTestId('markers-2').locator('rect');
    expect(Number(await r.getAttribute('x'))).toBeCloseTo(s.s2[0] - 1 / 60, 9);
  });
  test('an invisible locator takes the keyboard focus and moves 0.05 per arrow key', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-e2').focus();
    await page.keyboard.press('ArrowLeft');
    const s = await state(page);
    expect(s.e2[0]).toBeCloseTo(0.28, 12);
    expect(s.e2[1]).toBe(0.66);
    expect((await view(page)).pm2[0]).toBeCloseTo(0.28, 12); // the path now ends at the new goal
  });
  test('a locator is kept in the opening ϵ workspace; a goal moved next to the other pushes that one away, ϵ toward the centre', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.moveLocator('e1', [0, 1.2])); // the range {ϵ, ϵ}…{1 − ϵ, 1 − ϵ} of ϵ = 1/20
    expect((await state(page)).e1).toEqual([0.05, 0.95]);
    await page.evaluate(() => window.__demo.moveLocator('e2', [0.3, 0.6])); // far from e1: e1 stays
    expect((await state(page)).e1).toEqual([0.05, 0.95]);
    // e2 dragged to 0.01 beside e1 on the top edge of the ϵ workspace: moving e2 away would put it on that edge (not
    // strictly inside), so e1 is put ϵ from e2 toward the centre {1/2, 1/2} (Q-WF-03)
    await page.evaluate(() => window.__demo.moveLocator('e2', [0.06, 0.95]));
    const s = await state(page);
    expect(s.e2).toEqual([0.06, 0.95]);
    expect(dist(s.e1, s.e2)).toBeCloseTo(0.05, 12);
    const c = [0.5 - 0.06, 0.5 - 0.95], l = Math.hypot(...c);
    expect(dist(s.e1, [0.06 + (0.05 * c[0]) / l, 0.95 + (0.05 * c[1]) / l])).toBeLessThan(1e-12);
  });
  test('Initial settings restores the saved state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ ifMove: 'moves', progress: 0.5, 'ϵ': 0.08, s1: [0.5, 0.5], e2: [0.7, 0.2] }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.getByTestId('value-ϵ')).toHaveValue('1/20');
    await expect(page.getByTestId('setter-ifMove-Δ-configuration-space')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('config-plot')).toHaveCount(1);
  });
  test('aligned points whose spacing must grow: the search does not end, the picture shows $Aborted until a point moves', async ({ page }) => {
    const problems = await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ s1: [0.3, 0.5], s2: [0.4, 0.5], e1: [0.2, 0.3], e2: [0.7, 0.3] }));
    await expect(page.getByTestId('aborted')).toHaveText('$Aborted');
    await expect(page.getByTestId('path-1')).toHaveCount(0);
    await page.evaluate(() => window.__demo.moveLocator('s2', [0.4, 0.55]));
    await expect(page.getByTestId('aborted')).toHaveCount(0);
    await expect(page.getByTestId('path-1')).toHaveCount(1);
    expect(problems).toEqual([]);
  });
  test('review screenshots at the four snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const shown = { 1: '1/20', 2: '13/500', 3: '1/1000', 4: '61/1000' };
    for (const k of Object.keys(fx.snapshots)) {
      // the settings as saved (exact numbers as {wl, n}): the layer sets the numbers and shows exact values as text
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      await expect(page.getByTestId('value-ϵ')).toHaveValue(shown[k]);
      await expect(page.getByTestId('value-progress')).toHaveValue('1');
      const s = await state(page);
      expect(s.s1).toEqual(fx.snapshots[k].s1.map((x) => (typeof x === 'object' ? x.n : x)));
      // snapshots 2 and 4 store "Δ Configuration Space", not a value of the setter: no button pressed, the moves shown
      const inset = fx.snapshots[k].ifMove === 'Δ configuration space';
      await expect(page.getByTestId('setter-ifMove-Δ-configuration-space')).toHaveAttribute('aria-pressed', String(inset));
      await expect(page.getByTestId('setter-ifMove-moves')).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByTestId('config-plot')).toHaveCount(inset ? 1 : 0);
      if (!inset) {
        await expect(page.getByTestId('move-text')).toHaveText('move 5 of 5');
        await expect(page.getByTestId('distance-text')).toHaveText(k === '2' ? /total distance 1\.89/ : /total distance 1\.93/);
      }
      await reviewShot(page, testInfo, `wall-friction-snapshot-${k}`);
    }
  });
});
