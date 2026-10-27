// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Javier Garcia
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/homicidal-chauffeur.spec.js — browser tests of "The Homicidal Chauffeur Problem" page (attribution,
// start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). Everything driven by time runs at a
// fixed page clock (window.__demo.setClock): with the clock standing, every evaluation is the minimum step of 0.01 s.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/homicidal-chauffeur/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const setClock = (page, t) => page.evaluate((x) => window.__demo.setClock(x), t);
const textOf = (page, id) => page.getByTestId(id).evaluate((n) => n.textContent); // with its spaces
const frames = (page, n = 3) => page.evaluate((k) => new Promise((done) => { const f = (i) => (i ? requestAnimationFrame(() => f(i - 1)) : done()); f(k); }), n);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const locators = (page) => page.locator('[data-testid^="locator-loc-"]');
const T0 = 3800000000; // the fixed page clock (seconds since 1900, as AbsoluteTime[])

test.describe('homicidal-chauffeur', () => {
  test('loads without errors and draws the saved state: pedestrian, car, turning circles, texts, three locators', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['run-path', 'runner', 'car-path', 'car', 'turn-circles', 'status', 'running-time']) await expect(page.getByTestId(id)).toHaveCount(1);
    await expect(page.getByTestId('countdown')).toHaveCount(0);
    await expect(locators(page)).toHaveCount(3);
    await expect(page.getByTestId('status')).toHaveText('pedestrian missed.');
    expect(await textOf(page, 'running-time')).toBe('running time   0.0 s');
    await expect(page.getByTestId('car').locator('polygon')).toHaveCount(3); // two headlight beams and the arrowhead
    await expect(page.getByTestId('car').locator('rect')).toHaveCount(5); // body and four wheels
    await expect(page.getByTestId('turn-circles').locator('circle')).toHaveCount(2);
    await expect(page.getByTestId('runner').locator('rect')).toHaveCount(1); // standing: shoulders only
    await expect(page.getByTestId('scene-svg')).toBeVisible();
  });

  test('has the controls of the original with their saved values', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-minRadius')).toHaveValue('3');
    await expect(page.getByTestId('value-vcar')).toHaveValue('2');
    await expect(page.getByTestId('setter-state-setup')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-state-running')).toHaveAttribute('aria-pressed', 'false');
    for (const [id, min, max] of [['slider-minRadius', '0.001', '5'], ['slider-vcar', '1.1', '5']]) {
      await expect(page.getByTestId(id)).toHaveAttribute('min', min);
      await expect(page.getByTestId(id)).toHaveAttribute('max', max);
      await expect(page.getByTestId(id)).toBeEnabled();
    }
    const labels = await page.locator('#controls .ctl-label').evaluateAll((ns) => ns.map((n) => n.innerHTML));
    expect(labels).toEqual(['<i>r</i><sub>min</sub>', '<i>v</i><sub>car</sub>/<i>v</i><sub>pedestrian</sub>', 'mode']);
  });

  test('setup: dragging the locators with the mouse moves the pedestrian and the car; the handle turns the car', async ({ page }) => {
    await openDemo(page, URL);
    const drag = async (from, to) => {
      const a = await page.evaluate((p) => window.__demo.worldToClient(p), from);
      const b = await page.evaluate((p) => window.__demo.worldToClient(p), to);
      await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 6 }); await page.mouse.up();
    };
    const s0 = await state(page);
    await drag(s0.loc[0], [-6, -2]); // the pedestrian
    const s1 = await state(page);
    expect(dist(s1.runner, [-6, -2])).toBeLessThan(0.15);
    expect(s1.runner).toEqual(s1.loc[0]);
    await drag(s1.loc[1], [2, -3]); // the car (its rear axle): the handle follows, the heading stays
    const s2 = await state(page);
    expect(dist(s2.carXYold, [2, -3])).toBeLessThan(0.15);
    expect(s2.carθ).toBeCloseTo(s0.carθ, 12);
    expect(dist(s2.loc[2], s2.carXYold)).toBeCloseTo(2, 10);
    await drag(s2.loc[2], [s2.carXYold[0], s2.carXYold[1] + 3]); // the handle straight up: heading π/2, back to 2 units
    const s3 = await state(page);
    expect(s3.carθ).toBeCloseTo(Math.PI / 2, 1);
    expect(dist(s3.loc[2], s3.carXYold)).toBeCloseTo(2, 10);
    expect((await view(page)).ceL[0]).toBeCloseTo(s3.carXYold[0] - 3 * Math.sin(s3.carθ), 10); // the left turning circle turned along
  });

  test('a slider step by keyboard changes r_min and the turning circles, and v_car', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-minRadius').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).minRadius).toBeGreaterThan(3);
    const s = await state(page), v = await view(page);
    expect(dist(v.ceL, s.carXYold)).toBeCloseTo(s.minRadius, 10);
    expect(Number(await page.getByTestId('turn-circles').locator('circle').first().getAttribute('r'))).toBeCloseTo(s.minRadius, 10);
    await expect(page.getByTestId('value-minRadius')).not.toHaveValue('3');
    await page.getByTestId('slider-vcar').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).vcar).toBeLessThan(2);
  });

  test('running: the countdown 3, 2, 1 at a fixed page clock; the pedestrian runs to the locator; the car starts after three seconds', async ({ page }) => {
    await openDemo(page, URL);
    await setClock(page, T0);
    await page.getByTestId('setter-state-running').click();
    const s0 = await state(page);
    expect(s0.state).toBe('running');
    expect(s0.timer).toBe(T0);
    expect(s0.carPath).toEqual([]);
    await expect(locators(page)).toHaveCount(1);
    await expect(page.getByTestId('countdown')).toHaveText('3');
    await expect(page.getByTestId('setter-state-running')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('slider-minRadius')).toBeDisabled();
    await expect(page.getByTestId('slider-vcar')).toBeDisabled();
    // the goal far to the left: the pedestrian runs there (0.01 per evaluation while the clock stands) with swinging arms
    await page.evaluate(() => window.__demo.moveLocator('loc-1', [-12, 0]));
    await expect.poll(async () => (await state(page)).runner[0]).toBeLessThan(-2.1);
    await expect(page.getByTestId('runner').locator('rect')).toHaveCount(3);
    expect(Math.cos((await view(page)).runnerθ)).toBeCloseTo(-1, 12); // facing its goal on the left (±π)
    await setClock(page, T0 + 1.2);
    await expect(page.getByTestId('countdown')).toHaveText('2');
    await setClock(page, T0 + 2.5);
    await expect(page.getByTestId('countdown')).toHaveText('1');
    await expect.poll(() => textOf(page, 'running-time')).toBe('running time   2.5 s');
    expect((await state(page)).carPath).toEqual([]);
    await setClock(page, T0 + 3.2);
    await expect(page.getByTestId('countdown')).toHaveCount(0);
    await expect.poll(async () => (await state(page)).carPath.length).toBeGreaterThan(1);
    await expect.poll(() => textOf(page, 'running-time')).toBe('running time   3.2 s');
    const s = await state(page);
    expect(dist(s.carXYold, [2, 2])).toBeGreaterThan(0.5);
    expect(s.runPath.length).toBeGreaterThan(s.carPath.length);
  });

  test('the car runs over the pedestrian: Collision, "pedestrian hit!", one locator on the pedestrian, sliders disabled; setup again', async ({ page }) => {
    await openDemo(page, URL);
    // setup: the pedestrian 4 units ahead of the car (heading 0), v_car 5
    await page.evaluate(() => window.__demo.setState({ loc: [[6, 2], [2, 2], [4, 2]], vcar: 5 }));
    expect((await state(page)).carθ).toBe(0);
    await setClock(page, T0);
    await page.getByTestId('setter-state-running').click();
    await setClock(page, T0 + 2.9);
    await expect(page.getByTestId('countdown')).toHaveText('1');
    await setClock(page, T0 + 3.2); // the car drives on in steps of 0.05 until it hits
    await expect.poll(async () => (await state(page)).state).toBe('Collision');
    await expect(page.getByTestId('status')).toHaveText('pedestrian hit!');
    expect(await textOf(page, 'running-time')).toBe('running time   3.2 s');
    await expect(locators(page)).toHaveCount(1);
    await expect.poll(async () => (await state(page)).stateP).toBe('Collision');
    const s = await state(page);
    expect(s.loc).toEqual([s.runner]);
    for (const id of ['setter-state-setup', 'setter-state-running']) await expect(page.getByTestId(id)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('slider-vcar')).toBeDisabled();
    await frames(page); // the body has stopped
    expect((await state(page)).runPath.length).toBe(s.runPath.length);
    await page.getByTestId('setter-state-setup').click();
    await expect(locators(page)).toHaveCount(3);
    await expect(page.getByTestId('slider-vcar')).toBeEnabled();
    expect((await state(page)).runPath.length).toBe(s.runPath.length); // the paths stay
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ minRadius: 1.5, vcar: 4, loc: [[-6, -3], [5, 5], [5, 7]] }));
    await page.getByTestId('setter-state-running').click();
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.getByTestId('value-minRadius')).toHaveValue('3');
    await expect(page.getByTestId('value-vcar')).toHaveValue('2');
    await expect(page.getByTestId('setter-state-setup')).toHaveAttribute('aria-pressed', 'true');
    await expect(locators(page)).toHaveCount(3);
    await frames(page);
    expect(await state(page)).toEqual(opening); // not running any more
  });

  test('review screenshots at the five snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/homicidal-chauffeur.original-states.json', 'utf8'));
    const expected = {
      1: ['setup', 'pedestrian missed.', 'running time   0.0 s', 3, '3', '2'],
      2: ['Collision', 'pedestrian hit!', 'running time  23.8 s', 1, '3', '1.168'],
      3: ['Setup', 'pedestrian missed.', 'running time  26.9 s', 3, '3', '1.168'],
      4: ['Collision', 'pedestrian hit!', 'running time   6.2 s', 1, '5', '2.282'], // Mathematica shows "5." (K-HC-01)
      5: ['Setup', 'pedestrian missed.', 'running time  10.7 s', 3, '5', '4.496'],
    };
    for (const k of Object.keys(fx.snapshots)) {
      const [mode, status, time, n, r, v] = expected[k];
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]); // the settings as saved
      const s = await state(page);
      expect(s.state).toBe(mode);
      expect(s.runPath.length).toBe(fx.snapshots[k].runPath.length);
      await expect(locators(page)).toHaveCount(n);
      await expect(page.getByTestId('status')).toHaveText(status);
      expect(await textOf(page, 'running-time')).toBe(time);
      await expect(page.getByTestId('value-minRadius')).toHaveValue(r);
      await expect(page.getByTestId('value-vcar')).toHaveValue(v);
      await expect(page.getByTestId('setter-state-setup')).toHaveAttribute('aria-pressed', String(mode === 'setup'));
      await reviewShot(page, testInfo, `homicidal-chauffeur-snapshot-${k}`);
    }
  });
});
