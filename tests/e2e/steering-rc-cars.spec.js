// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Javier Garcia
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/steering-rc-cars.spec.js — browser tests of the "Steering Multiple Radio Control (RC) Cars with One
// Joystick" page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/steering-rc-cars/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const num = (x) => (Array.isArray(x) ? x.map(num) : x && typeof x === 'object' && 'n' in x ? x.n : x);
// the first three snapshots store robot as the setter's value list (not yet set): its first value
const settings = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, k === 'robot' && Array.isArray(v) ? v[0] : num(v)]));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test.describe('steering-rc-cars', () => {
  test('loads without errors and draws the saved state: six collision disks, four cars, eight locators', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['collision-1-2', 'collision-1-3', 'collision-3-4', 'robot-1', 'robot-4', 'path-1']) await expect(page.getByTestId(id)).toHaveCount(1);
    await expect(page.getByTestId('robot-5')).toHaveCount(0);
    await expect(page.locator('[data-testid^="locator-loc-"]')).toHaveCount(8);
    await expect(page.getByTestId('robot-1')).toContainText('1');
    await expect(page.getByTestId('collision-1-3')).toContainText('1,3');
    await expect(page.getByTestId('scene-svg')).toBeVisible();
  });
  test('has the controls of the original with their saved values', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-n')).toHaveValue('4');
    await expect(page.getByTestId('value-rad')).toHaveValue('0.143');
    await expect(page.getByTestId('value-range')).toHaveValue('1');
    await expect(page.getByTestId('setter-mode-setup')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-robot-RC-car')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('pad-offset')).toBeVisible();
    for (const t of ['radius', 'mode', 'robot', 'range', 'offset']) await expect(page.locator('#controls')).toContainText(t);
  });
  test('setup: dragging a car moves it and its handle; dragging a handle turns the car', async ({ page }) => {
    await openDemo(page, URL);
    const s0 = await state(page);
    const at = await page.evaluate((p) => window.__demo.worldToClient(p), s0.loc[1]);
    await page.mouse.move(at.x, at.y); await page.mouse.down(); await page.mouse.move(at.x + 30, at.y - 20, { steps: 5 }); await page.mouse.up();
    const s1 = await state(page);
    expect(s1.ps[1][0]).toBeGreaterThan(s0.ps[1][0] + 0.05);
    expect(s1.θs[1]).toBeCloseTo(s0.θs[1], 12);
    expect(dist(s1.loc[5], s1.ps[1])).toBeCloseTo(0.5 * Math.sqrt(10) * 0.143, 10); // the handle went along
    // a handle: the car turns to it and the handle snaps back to its distance
    await page.evaluate((p) => window.__demo.moveLocator('loc-6', p), [s1.ps[1][0], s1.ps[1][1] + 0.6]);
    const s2 = await state(page);
    expect(s2.θs[1]).toBeCloseTo(Math.PI / 2, 12);
    expect(dist(s2.loc[5], s2.ps[1])).toBeCloseTo(0.5 * Math.sqrt(10) * 0.143, 10);
  });
  test('running: one locator (the joystick); the cars drive toward it in real time and stop there; n is disabled', async ({ page }) => {
    await openDemo(page, URL);
    const s0 = await state(page);
    await page.getByTestId('setter-mode-running').click();
    await expect(page.getByTestId('locator-loc')).toHaveCount(1);
    await expect(page.locator('[data-testid^="locator-loc-"]')).toHaveCount(0);
    await expect(page.getByTestId('slider-n')).toBeDisabled();
    expect((await state(page)).runner).toEqual(s0.ps[0]);
    const goal = [s0.ps[0][0] + 0.4, s0.ps[0][1] + 0.3];
    await page.evaluate((p) => window.__demo.moveLocator('loc', p), goal);
    // speed 1 per second: about half a second to arrive; the body keeps evaluating itself
    await expect.poll(async () => dist((await state(page)).runner, goal), { timeout: 5000 }).toBeLessThan(1e-12);
    const s = await state(page), v = await view(page);
    expect(s.runPath.length).toBeGreaterThan(4);
    expect(s.runnerθ).toBeCloseTo(Math.atan2(0.3, 0.4), 10);
    // every car moved by the same command turned by its heading difference
    for (let k = 0; k < 4; k++) expect(dist(v.centres[k], s0.ps[k])).toBeCloseTo(0.5, 10);
    await expect(page.getByTestId('path-3').locator('polyline, path')).toHaveCount(1);
    // back to setup: the cars stay where they are, eight locators again
    await page.getByTestId('setter-mode-setup').click();
    await expect(page.locator('[data-testid^="locator-loc-"]')).toHaveCount(8);
    const back = await state(page);
    for (let k = 0; k < 4; k++) expect(dist(back.ps[k], v.centres[k])).toBeLessThan(1e-12);
    await expect(page.getByTestId('slider-n')).toBeEnabled();
  });
  test('the robot setter draws cells and Janus particles', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-robot-particle').click();
    expect((await state(page)).robot).toBe('particle');
    await expect(page.getByTestId('robot-1').locator('circle')).toHaveCount(1); // the red disk (the green half is a polygon)
    await page.getByTestId('setter-robot-cell').click();
    expect((await state(page)).robot).toBe('cell');
    await expect(page.getByTestId('robot-2').locator('rect')).toHaveCount(1); // the cell's rounded body
  });
  test('the n slider makes new random cars (seeded); range and offset change the plot range', async ({ page }) => {
    await openDemo(page, `${URL}?seed=5`);
    await page.getByTestId('slider-n').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).n).toBe(5);
    const s = await state(page);
    expect(s.nold).toBe(5);
    expect(s.loc.length).toBe(10);
    await expect(page.locator('[data-testid^="locator-loc-"]')).toHaveCount(10);
    await expect(page.getByTestId('collision-4-5')).toHaveCount(1);
    const vb = await page.getByTestId('scene-svg').getAttribute('viewBox');
    await page.evaluate(() => window.__demo.setState({ range: 2, offset: [0.5, 0] }));
    expect((await view(page)).PlotRange[0][0]).toBeCloseTo(-6, 10);
    expect(await page.getByTestId('scene-svg').getAttribute('viewBox')).not.toBe(vb); // the picture is made again
    await expect(page.locator('[data-testid^="locator-loc-"]')).toHaveCount(10);
  });
  test("Initial settings: the Manipulate's initial values — four new random cars in setup (as in Mathematica)", async ({ page }) => {
    await openDemo(page, `${URL}?seed=9`);
    await page.evaluate(() => window.__demo.setState({ n: 6, rad: 0.3, robot: 'cell', range: 1.5 }));
    await page.getByTestId('reset').click();
    const s = await state(page);
    expect(s.n).toBe(4); expect(s.nold).toBe(4);
    expect(s.rad).toBe(0.143); expect(s.robot).toBe('RC car'); expect(s.range).toBe(1); expect(s.mode).toBe('setup');
    expect(s.ps.flat().every((x) => Math.abs(x) <= 0.9)).toBe(true);
    expect(s.loc.length).toBe(8);
    await expect(page.getByTestId('value-n')).toHaveValue('4');
    await expect(page.locator('[data-testid^="locator-loc-"]')).toHaveCount(8);
  });
  test('review screenshots at the five snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/steering-rc-cars.original-states.json', 'utf8'));
    for (const k of Object.keys(fx.snapshots)) {
      const s = settings(fx.snapshots[k]);
      await page.evaluate((st) => window.__demo.setState(st), s);
      const after = await state(page);
      expect(after.mode).toBe(s.mode);
      expect(after.ps).toEqual(s.ps); // nold = n: the saved cars are kept
      await expect(page.locator('[data-testid^="locator-loc"]')).toHaveCount(s.mode === 'setup' ? 8 : 1);
      await reviewShot(page, testInfo, `steering-rc-cars-snapshot-${k}`);
    }
  });
});
