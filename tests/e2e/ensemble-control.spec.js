// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/ensemble-control.spec.js — browser tests of the "Ensemble Control of Robots with Unicycle Kinematics" page
// (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/ensemble-control/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
// the saved states write exact numbers as {wl, n}: their doubles
const num = (x) => (Array.isArray(x) ? x.map(num) : x && typeof x === 'object' && 'n' in x ? x.n : x);
const settings = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, num(v)]));

test.describe('ensemble-control', () => {
  test('loads without errors and draws the robots and the error plot', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['workspace', 'robot-1', 'robot-2', 'error-plot', 'best-line', 'best-point', 'command-point', 'frame']) {
      await expect(page.getByTestId(id)).toHaveCount(1);
    }
    await expect(page.getByTestId('robot-3')).toHaveCount(0);
    await expect(page.getByTestId('graphic').locator('svg')).toBeVisible();
    await expect(page.getByTestId('graphic2').locator('svg')).toBeVisible();
  });
  test('has the controls of the original with their defaults: n = 2, forward command 0, the button', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-n')).toHaveValue('2');
    await expect(page.getByTestId('value-vin')).toHaveValue('0');
    await expect(page.getByTestId('button-turn')).toHaveText('turn counter‐clockwise');
    await expect(page.locator('#controls')).toContainText('number of robots');
    await expect(page.locator('#controls')).toContainText('forward command');
  });
  test('the forward command slider (keyboard) moves every robot along its heading and the blue point along the curve', async ({ page }) => {
    await openDemo(page, URL);
    const s0 = await state(page);
    await page.getByTestId('slider-vin').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).vin).toBe(10);
    const v = await view(page);
    v.moved.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(s0.xinit[i] + 10 * Math.cos(s0.θinit[i]), 10);
      expect(y).toBeCloseTo(s0.yinit[i] + 10 * Math.sin(s0.θinit[i]), 10);
    });
    expect(v.errIn).toBeGreaterThan(v.errBest);
    // the positions themselves move only with the button
    expect((await state(page)).xinit).toEqual(s0.xinit);
  });
  test('the number of robots slider makes n new robots with goals on the circle (seeded)', async ({ page }) => {
    await openDemo(page, `${URL}?seed=3`);
    await page.getByTestId('slider-n').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).n).toBe(3);
    const s = await state(page);
    expect(s.nold).toBe(3);
    expect(s.xinit.length).toBe(3);
    expect(s.xpath).toEqual([s.xinit]);
    expect(s.xGoal[0]).toBe(10);
    expect(s.yGoal[1]).toBeCloseTo(10 * Math.sin((2 * Math.PI) / 3), 12);
    await expect(page.getByTestId('robot-3')).toHaveCount(1);
    // the same seed gives the same robots
    await page.evaluate(() => window.__demo.setRng({ seed: 3 }));
    await page.evaluate(() => window.__demo.setState({ n: 2 }));
    await page.evaluate(() => window.__demo.setRng({ seed: 3 }));
    await page.evaluate(() => window.__demo.setState({ n: 3 }));
    expect((await state(page)).xinit).toEqual(s.xinit);
  });
  test('the turn button moves the robots, extends the paths, resets the command and turns by π/3…2π/3', async ({ page }) => {
    await openDemo(page, `${URL}?seed=7`);
    await page.evaluate(() => window.__demo.setState({ vin: -1.0297905670194805 }));
    const s0 = await state(page);
    const before = (await view(page)).errIn;
    await page.getByTestId('button-turn').click();
    const s = await state(page);
    expect(s.vin).toBe(0);
    expect(s.xpath.length).toBe(2);
    expect(s.xinit[0]).toBeCloseTo(s0.xinit[0] + s0.vin * Math.cos(s0.θinit[0]), 12);
    s.θinit.forEach((t, i) => {
      expect(t - s0.θinit[i]).toBeGreaterThanOrEqual(Math.PI / 3);
      expect(t - s0.θinit[i]).toBeLessThanOrEqual((2 * Math.PI) / 3);
    });
    expect((await view(page)).errIn).toBeCloseTo(before, 10); // the error at v = 0 after the move = the error before at vin
    await expect(page.getByTestId('robot-1').locator('polyline').first()).toBeVisible();
  });
  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ n: 9, vin: 4 }));
    await page.getByTestId('button-turn').click();
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.getByTestId('robot-3')).toHaveCount(0);
  });
  test('review screenshots at the four snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/ensemble-control.original-states.json', 'utf8'));
    for (const k of Object.keys(fx.snapshots)) {
      const s = settings(fx.snapshots[k]);
      await page.evaluate((st) => window.__demo.setState(st), s);
      const after = await state(page);
      expect(after.xinit).toEqual(s.xinit); // nold = n: the saved robots are kept
      await expect(page.locator('[data-testid^="robot-"]')).toHaveCount(s.n);
      await reviewShot(page, testInfo, `ensemble-control-snapshot-${k}`);
    }
  });
});
