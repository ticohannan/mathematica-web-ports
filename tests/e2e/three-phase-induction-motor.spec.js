// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Harley H. Hartman
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/three-phase-induction-motor.spec.js — browser tests of the "Operating an AC Three-Phase Induction Motor"
// page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). The animation
// runs on the page clock, which the tests fix with window.__demo.setClock.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/three-phase-induction-motor/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/three-phase-induction-motor.original-states.json', 'utf8'));
/** The rotor angle by hand: −a + √(m² sin²(a + p° + 0.7) + sin²(a + 2π/3 + 0.7) + sin²(a − 2π/3 + 0.7))/1.3. */
const rotor = ({ a, m, p }) => -a + Math.sqrt((m * Math.sin(a + (p * Math.PI) / 180 + 0.7)) ** 2
  + Math.sin(a + (2 * Math.PI) / 3 + 0.7) ** 2 + Math.sin(a - (2 * Math.PI) / 3 + 0.7) ** 2) / 1.3;
const near = (x, y, tol = 1e-9) => Math.abs(x - y) <= tol;

test.describe('three-phase-induction-motor', () => {
  test('loads without errors and draws both pictures: the motor in 3D and the plot of the supply', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas')).toBeVisible();
    await expect(page.getByTestId('plot-svg')).toBeVisible();
    expect(await page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.1);
    await expect(page.getByTestId('axis-y')).toContainText('relative flux');
    await expect(page.getByTestId('axis-x')).toContainText('time');
    // the two pictures side by side (Grid[{{Graphics3D, Plot}}])
    const g1 = await page.getByTestId('graphic').boundingBox(), g2 = await page.getByTestId('graphic2').boundingBox();
    expect(g2.x).toBeGreaterThan(g1.x + g1.width - 2);
  });

  test('has the five controls of the original with the saved values; the animator is paused', async ({ page }) => {
    await openDemo(page, URL);
    for (const label of ['animate', 'phase position', 'magnitude (±40%)', 'phase shift (±80°)', 'skew (% bar pitch)']) {
      await expect(page.locator('#controls')).toContainText(label);
    }
    await expect(page.getByTestId('value-a')).toHaveValue('5.63');
    await expect(page.getByTestId('value-m')).toHaveValue('1');
    await expect(page.getByTestId('value-p')).toHaveValue('0');
    await expect(page.getByTestId('value-f')).toHaveValue('50');
    // AppearanceElements -> {"PlayPauseButton", "FasterSlowerButtons"}: no progress slider, no reset or direction button
    await expect(page.getByTestId('animator-play-a')).toBeVisible();
    await expect(page.getByTestId('animator-faster-a')).toBeVisible();
    await expect(page.getByTestId('animator-slower-a')).toBeVisible();
    await expect(page.getByTestId('animator-a')).toHaveCount(0);
    await expect(page.getByTestId('animator-reset-a')).toHaveCount(0);
    await expect(page.getByTestId('animator-play-a')).toHaveAttribute('aria-pressed', 'false');
    expect(await state(page)).toEqual(fx.states[0]);
  });

  test('the animator runs a at AnimationRate 30 per second on the fixed page clock and wraps at 2π', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setClock(1000));
    await page.getByTestId('animator-play-a').click();
    await expect(page.getByTestId('animator-play-a')).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(100); // a few frames at the fixed time: nothing moves
    expect((await state(page)).a).toBe(5.63);
    await page.evaluate(() => window.__demo.setClock(1000.1)); // 0.1 s: 3 units, past 2π
    const want = Math.round((5.63 + 3 - 2 * Math.PI) / 0.01) * 0.01; // the Animator's step .01
    await expect.poll(async () => (await state(page)).a).toBeCloseTo(want, 9);
    await expect(page.getByTestId('value-a')).toHaveValue(String(Number(want.toFixed(2))));
    expect(near((await view(page)).b, rotor({ ...(await state(page)) }), 1e-9)).toBe(true);
    await page.getByTestId('animator-play-a').click(); // pause
    await expect(page.getByTestId('animator-play-a')).toHaveAttribute('aria-pressed', 'false');
    const a1 = (await state(page)).a;
    await page.evaluate(() => window.__demo.setClock(1001));
    await page.waitForTimeout(100);
    expect((await state(page)).a).toBe(a1);
  });

  test('the faster button raises the rate by a quarter: 37.5 units per second', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('reset').click();
    await page.getByTestId('animator-faster-a').click();
    await page.evaluate(() => window.__demo.setClock(2000));
    await page.getByTestId('animator-play-a').click();
    await page.waitForTimeout(100);
    await page.evaluate(() => window.__demo.setClock(2000.1));
    await expect.poll(async () => (await state(page)).a).toBeCloseTo(3.75, 9);
    await page.getByTestId('animator-play-a').click();
  });

  test('the phase position slider by keyboard and mouse turns the rotor and keeps the animator in step', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-a').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).a).toBeLessThan(5.63);
    const s = await state(page);
    expect(near((await view(page)).b, rotor(s), 1e-9)).toBe(true);
    // a click near the left end of the track: a small phase
    const box = await page.getByTestId('slider-a').boundingBox();
    await page.mouse.click(box.x + box.width * 0.1, box.y + box.height / 2);
    await expect.poll(async () => (await state(page)).a).toBeLessThan(1.5);
    // the animator then runs on from the new value
    const a0 = (await state(page)).a;
    await page.evaluate(() => window.__demo.setClock(3000));
    await page.getByTestId('animator-play-a').click();
    await page.waitForTimeout(100);
    await page.evaluate(() => window.__demo.setClock(3000.02));
    await expect.poll(async () => (await state(page)).a).toBeCloseTo(Math.round((a0 + 0.6) / 0.01) * 0.01, 9);
    await page.getByTestId('animator-play-a').click();
  });

  test('magnitude, phase shift and skew by keyboard change the rotor, the bars and the plot', async ({ page }) => {
    await openDemo(page, URL);
    const before = await view(page);
    const curve = async () => page.getByTestId('plot-svg').innerHTML();
    const c0 = await curve();
    await page.getByTestId('slider-m').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).m).toBeGreaterThan(1);
    await expect.poll(curve).not.toBe(c0);
    expect((await view(page)).b).not.toBe(before.b);
    await page.getByTestId('slider-p').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).p).toBeGreaterThan(0);
    await page.getByTestId('value-f').fill('100');
    await page.getByTestId('value-f').press('Enter');
    await expect.poll(async () => (await state(page)).f).toBe(100);
    const v = await view(page);
    expect(near(v.d - v.e, Math.PI / 6, 1e-12)).toBe(true); // one bar pitch
    expect(near(v.b, rotor(await state(page)), 1e-9)).toBe(true);
  });

  test('Initial settings goes to the Manipulate\'s initial values (a = 0)', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ a: 2, m: 1.4, p: -80, f: 0 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual({ a: 0, m: 1, p: 0, f: 50 });
    await expect(page.getByTestId('value-a')).toHaveValue('0');
    await expect(page.getByTestId('value-p')).toHaveValue('0');
  });

  test('at each snapshot\'s settings: the rotor angle, the lit bands with the rims of the dark ones, and a review screenshot', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const bandCenter = [27 * Math.cos(-Math.PI / 3), 27 * Math.sin(-Math.PI / 3), -4]; // the front band at 5π/3 (orange)
    const orange = {};
    for (const k of Object.keys(fx.snapshots)) {
      const s = fx.snapshots[k];
      await page.evaluate((st) => window.__demo.setState(st), s);
      await expect.poll(async () => (await state(page)).a).toBe(s.a);
      const v = await view(page);
      expect(near(v.b, rotor(s), 1e-9)).toBe(true);
      // the port draws the rims of the bands whose Opacity is negative as lines (D-TB-05): two per such band
      const dark = v.bands.filter((o) => o <= 0).length;
      const lines = await page.evaluate(() => JSON.stringify(window.__demo.graphics(0)).split('"prim":"line"').length - 1);
      expect(lines).toBe(2 * dark);
      const [r, , b] = await page.evaluate((p) => window.__demo.pixelAt(p), bandCenter);
      orange[k] = r - b;
      await reviewShot(page, testInfo, `three-phase-induction-motor-snapshot-${k}`);
    }
    // snapshot 3 (Sin[a + 2π/3] < 0): the front orange band is lit; snapshot 1 (> 0): it is not
    expect(orange[3]).toBeGreaterThan(orange[1] + 20);
    await expect(page.getByTestId('value-p')).toHaveValue('0');
    await expect(page.getByTestId('value-f')).toHaveValue('100');
  });

  test('dragging the motor turns the view', async ({ page }) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('scene-canvas').boundingBox();
    const where = () => page.evaluate(() => window.__demo.sceneToClient([27, 0, 0]));
    const p0 = await where();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => { const p1 = await where(); return Math.hypot(p1.x - p0.x, p1.y - p0.y); }).toBeGreaterThan(5);
    expect(await state(page)).toEqual(fx.states[0]); // the view turns, the variables stay
  });
});
