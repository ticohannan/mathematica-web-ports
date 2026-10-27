// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/drone-reachable-set.spec.js — browser tests of the "Reachable Set for a Drone" page (attribution, start-up
// notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/drone-reachable-set/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const paneRange = (page) => page.evaluate(() => window.__demo.graphics(1).options.PlotRange);
/** press at world point a of picture k (the locator there), drag to b, release */
async function drag(page, a, b, k = 1) {
  const p = await page.evaluate(([q, i]) => window.__demo.worldToClient(q, i), [a, k]);
  const q = await page.evaluate(([r, i]) => window.__demo.worldToClient(r, i), [b, k]);
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 6 }); await page.mouse.up();
}
// a snapshot's settings without the two cached plots (not variables of the port)
const snapshotSettings = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'regionsd' && k !== 'regionsOpt'));

test.describe('drone-reachable-set', () => {
  test('loads without errors and draws the reachable set, the dashed path, the orange point and the LocatorPane', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    const pic = page.getByTestId('scene-svg');
    await expect(pic).toBeVisible();
    for (const id of ['region-face-1', 'region-face-2', 'region-boundary-1', 'region-boundary-2', 'path', 'drone-point', 'frame', 'axes-label-x', 'axes-label-z']) {
      await expect(pic.getByTestId(id), id).toHaveCount(1);
    }
    await expect(pic.getByTestId('region-boundary-2').locator('polyline').first()).toHaveAttribute('stroke', 'rgb(225,156,36)'); // ColorData[97, 2]
    await expect(pic.getByTestId('axes-label-z')).toContainText('ẑ');
    await expect(pic.getByTestId('drone')).toHaveCount(0);
    await expect(pic.getByTestId('optimum-blue')).toHaveCount(0);
    const pane = page.getByTestId('pane-svg');
    await expect(pane).toBeVisible();
    for (const id of ['pane-square', 'pane-brown', 'pane-green', 'pane-magenta', 'pane-red', 'locator-tRtT']) await expect(pane.getByTestId(id), id).toHaveCount(1);
    // the pane is in the control column, below the controls (ControlPlacement -> Left)
    const c = await page.getByTestId('ctl-Optimum').boundingBox(), p = await pane.boundingBox(), g = await page.getByTestId('graphic').boundingBox();
    expect(p.y).toBeGreaterThan(c.y);
    expect(p.x + p.width).toBeLessThan(g.x);
    await expect(page.getByTestId('label-tRtT')).toContainText('control');
  });
  test('has the controls of the original with their saved values', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-T')).toHaveValue('3');
    await expect(page.getByTestId('value-t')).toHaveValue('3');
    await expect(page.getByTestId('value-r1')).toHaveText('{0.102, 2.04}');
    await expect(page.getByTestId('islider-r1-lo')).toHaveAttribute('aria-valuenow', '0.102');
    await expect(page.getByTestId('check-Drone')).not.toBeChecked();
    await expect(page.getByTestId('check-Optimum')).not.toBeChecked();
    for (const t of ['final', 'min/max', 'drone', 'optimum']) await expect(page.locator('#controls')).toContainText(t);
    const s = await state(page);
    expect(s.t).toEqual({ sym: 'T' });
    expect(s.tRtT).toEqual([1, 0]);
    await expect(page.getByTestId('slider-t')).toHaveAttribute('max', '100'); // positions k·T/100, k = 0 … 100
  });
  test('a new T: the region and the pane follow; t = T follows T; the t slider (keyboard) moves by T/100 and then stays', async ({ page }) => {
    await openDemo(page, URL);
    const v0 = await view(page);
    await page.getByTestId('value-T').fill('2');
    await page.getByTestId('value-T').press('Enter');
    await expect.poll(async () => (await state(page)).T).toBe(2);
    const v1 = await view(page);
    expect(v1.regionRange[1][1]).toBeCloseTo(1.04 * 2, 10); // the top (UT2 − 1) T²/2
    expect(v1.PlotRange).not.toEqual(v0.PlotRange);
    expect((await paneRange(page))[0][1]).toBeCloseTo(2.02, 12); // PlotRange {−.1, 1.01 T}
    expect((await state(page)).t).toEqual({ sym: 'T' }); // t is still the symbol T …
    await expect(page.getByTestId('value-t')).toHaveValue('2'); // … and shows T
    expect(v1.t).toBe(2);
    await page.getByTestId('slider-t').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).t).toBeCloseTo(1.98, 12); // step T/100 = 0.02
    await expect(page.getByTestId('value-t')).toHaveValue('1.98');
    expect((await view(page)).t).toBeCloseTo(1.98, 12);
    // now t is a number: a larger T leaves it, a smaller T clamps it (If[t > T, t = T])
    await page.getByTestId('value-T').fill('2.5');
    await page.getByTestId('value-T').press('Enter');
    await expect.poll(async () => (await state(page)).T).toBe(2.5);
    expect((await state(page)).t).toBeCloseTo(1.98, 12);
    await page.getByTestId('value-T').fill('1.5');
    await page.getByTestId('value-T').press('Enter');
    await expect.poll(async () => (await state(page)).t).toBe(1.5);
    await expect(page.getByTestId('value-t')).toHaveValue('1.5');
    // the ⊕ panel of t: a step back is T/100; the panel stays open when T changes (the slider is made again, D-DR-05)
    await page.getByTestId('plus-t').click();
    await page.getByTestId('stepback-t').click();
    await expect.poll(async () => (await state(page)).t).toBeCloseTo(1.485, 12);
    await page.getByTestId('value-T').fill('2');
    await page.getByTestId('value-T').press('Enter');
    await expect.poll(async () => (await state(page)).T).toBe(2);
    await expect(page.getByTestId('anim-t')).toBeVisible();
    await page.getByTestId('stepfwd-t').click();
    await expect.poll(async () => (await state(page)).t).toBeCloseTo(1.5, 12); // the position after 1.485 on the grid k·0.02
  });
  test('dragging the locator in the LocatorPane sets the switching times; it stays in the square [0, T]²; a click moves it there', async ({ page }) => {
    const problems = await openDemo(page, URL);
    const x0 = (await view(page)).xd;
    await drag(page, [1, 0], [2, 1.5]);
    let s = await state(page);
    expect(s.tRtT[0]).toBeCloseTo(2, 1);
    expect(s.tRtT[1]).toBeCloseTo(1.5, 1);
    const v = await view(page);
    expect(v.tR).toBe(s.tRtT[0]);
    expect(v.xd).not.toBeCloseTo(x0, 3);
    // beyond the square: kept at T (Max[0, Min[T, …]])
    await drag(page, s.tRtT, [3.6, 3.8]);
    s = await state(page);
    expect(s.tRtT).toEqual([3, 3]);
    // a click elsewhere in the pane moves the locator there (LocatorPane)
    const at = await page.evaluate(() => window.__demo.worldToClient([0.5, 2.5], 1));
    await page.mouse.click(at.x, at.y);
    s = await state(page);
    expect(s.tRtT[0]).toBeCloseTo(0.5, 1);
    expect(s.tRtT[1]).toBeCloseTo(2.5, 1);
    // after a new T the pane is made again and its locator still works
    await page.evaluate(() => window.__demo.setState({ T: 2 }));
    expect((await state(page)).tRtT[1]).toBe(2); // 2.5 > T: clamped
    await drag(page, (await state(page)).tRtT, [1, 1]);
    s = await state(page);
    expect(s.tRtT[0]).toBeCloseTo(1, 1);
    expect(s.tRtT[1]).toBeCloseTo(1, 1);
    expect(problems).toEqual([]);
  });
  test('the IntervalSlider U min/max pushes the other end (Method -> Push, MinIntervalSize -> 0.1); a new thrust range makes the region again', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('islider-r1-hi').focus();
    await page.keyboard.press('Home'); // the upper end to 0 pushes the lower one: {0., 0.1}
    await expect.poll(async () => (await state(page)).r1).toEqual([0, 0.1]);
    await expect(page.getByTestId('value-r1')).toHaveText('{0., 0.1}');
    let s = await state(page), v = await view(page);
    expect(s.r1old).toEqual([0, 0.1]);
    expect(v.regionRange[1][1]).toBeCloseTo(-0.9 * 4.5, 10); // the thrust cannot lift the drone: the top (0.1 − 1)·3²/2
    expect(v.axes).toEqual([false, true]); // z = 0 only at the start of the path: no horizontal axis, no x̂ (Q-DR-04)
    await expect(page.getByTestId('scene-svg').getByTestId('axes-label-x')).toHaveCount(0);
    await page.getByTestId('islider-r1-lo').focus();
    await page.keyboard.press('End'); // the lower end to 5 pushes the upper one to the end: {4.9, 5.}
    await expect.poll(async () => (await state(page)).r1).toEqual([4.9, 5]);
    await expect(page.getByTestId('value-r1')).toHaveText('{4.9, 5.}');
    s = await state(page); v = await view(page);
    expect(v.umin).toBe(4.9);
    expect(v.regionRange[1][1]).toBeCloseTo(4 * 4.5, 10);
  });
  test('the drone and optimum checkboxes draw the drone and the control sequences of the boundary', async ({ page }) => {
    await openDemo(page, URL);
    const pic = page.getByTestId('scene-svg');
    await page.getByTestId('check-Drone').check();
    await expect.poll(async () => (await state(page)).Drone).toBe(true);
    await expect(pic.getByTestId('drone')).toHaveCount(1);
    await expect(pic.getByTestId('drone-point')).toHaveCount(0);
    await expect(pic.getByTestId('drone').locator('ellipse')).toHaveCount(4); // the propellers
    await page.getByTestId('check-Optimum').check();
    await expect.poll(async () => (await state(page)).Optimum).toBe(true);
    for (const id of ['optimum-blue', 'optimum-green', 'optimum-magenta', 'optimum-brown', 'optimum-red']) await expect(pic.getByTestId(id), id).toHaveCount(1);
    await expect(pic.getByTestId('optimum-red').locator('polyline').first()).toHaveAttribute('stroke', 'rgb(255,0,0)');
    await page.getByTestId('check-Drone').uncheck();
    await expect(pic.getByTestId('drone-point')).toHaveCount(1);
  });
  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ T: 5, t: 2, r1: [1, 3], Drone: true, Optimum: true, tRtT: [2, 4] }));
    expect((await state(page)).tfold).toBe(5);
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening); // the specs (tfold, r1old = −1) evaluated once give the saved state
    await expect(page.getByTestId('value-T')).toHaveValue('3');
    await expect(page.getByTestId('value-t')).toHaveValue('3');
    await expect(page.getByTestId('value-r1')).toHaveText('{0.102, 2.04}');
    await expect(page.getByTestId('check-Drone')).not.toBeChecked();
  });
  test('review screenshots at the six snapshot settings', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/drone-reachable-set.original-states.json', 'utf8'));
    const shown = { 1: ['3', '{0.102, 2.04}'], 2: ['2.82', '{0.102, 2.04}'], 3: ['2.82', '{0.102, 2.04}'], 4: ['2.82', '{0.102, 2.04}'], 5: ['2.82', '{0.1, 4.}'], 6: ['2.82', '{3., 4.6}'] };
    for (const k of Object.keys(fx.snapshots)) {
      const s = snapshotSettings(fx.snapshots[k]);
      await page.evaluate((st) => window.__demo.setState(st), s);
      await expect(page.getByTestId('value-T')).toHaveValue(shown[k][0]);
      await expect(page.getByTestId('value-t')).toHaveValue(shown[k][0]); // t = T
      await expect(page.getByTestId('value-r1')).toHaveText(shown[k][1]);
      expect(await state(page)).toEqual(s);
      await expect(page.getByTestId('scene-svg').getByTestId(s.Drone ? 'drone' : 'drone-point')).toHaveCount(1);
      await reviewShot(page, testInfo, `drone-reachable-set-snapshot-${k}`);
    }
    expect(problems).toEqual([]);
  });
});
