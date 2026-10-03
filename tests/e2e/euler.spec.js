// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Adapted from Wolfram Demonstrations Project content (see LICENSE.md)
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/euler.spec.js — Euler Angles: Precession, Nutation, and Spin (browser tests)
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/euler-angles/';
const DEG = Math.PI / 180;

test.describe('Euler angles demo', () => {
  test('loads without errors and draws a non-blank 3D scene', async ({ page }) => {
    const problems = await openDemo(page, URL);
    await page.waitForTimeout(300);
    const ink = await page.evaluate(() => { window.__demo.renderNow(); return window.__demo.inkFraction(); });
    expect(ink).toBeGreaterThan(0.02); // something other than white background is drawn
    expect(problems).toEqual([]);
  });

  test('has the three labelled sliders of the original (0..360, step 1, default 0)', async ({ page }) => {
    await openDemo(page, URL);
    for (const [name, label] of [['a1', 'precession angle'], ['a2', 'nutation angle'], ['a3', 'spin angle']]) {
      const s = page.getByTestId(`slider-${name}`);
      await expect(s).toHaveAttribute('min', '0');
      await expect(s).toHaveAttribute('max', '360');
      await expect(s).toHaveAttribute('step', '1');
      await expect(s).toHaveValue('0');
      await expect(page.getByTestId(`ctl-${name}`)).toContainText(label);
    }
  });

  test('keyboard on a slider changes the angle by one step and the rendered rotor follows', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-a2').focus();
    for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('value-a2')).toHaveValue('30');
    const axis = await page.evaluate(() => window.__demo.renderedSpinAxis());
    expect(axis[2]).toBeCloseTo(Math.cos(30 * DEG), 6); // tilted 30° from Z
  });

  test('typing a value in the field sets the angle', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('value-a1').fill('45');
    await page.getByTestId('value-a1').press('Enter');
    await expect(page.getByTestId('slider-a1')).toHaveValue('45');
    expect((await page.evaluate(() => window.__demo.getState())).a1).toBe(45);
  });

  test('bookmark pos3 = (45, 30, 15): three.js scene agrees with the analytic spin axis', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.getByTestId('bookmarks').selectOption('pos3');
    const st = await page.evaluate(() => window.__demo.getState());
    expect(st).toEqual({ a1: 45, a2: 30, a3: 15 });
    const axis = await page.evaluate(() => window.__demo.renderedSpinAxis());
    const expected = [Math.sin(30 * DEG) * Math.cos(45 * DEG), Math.sin(30 * DEG) * Math.sin(45 * DEG), Math.cos(30 * DEG)];
    axis.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 6));
    await reviewShot(page, testInfo, 'euler-pos3-45-30-15');
  });

  test('screenshots of all original snapshot states (for side-by-side review)', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const s of [{ a1: 0, a2: 0, a3: 0 }, { a1: 45, a2: 0, a3: 0 }, { a1: 45, a2: 30, a3: 0 }, { a1: 45, a2: 30, a3: 15 }]) {
      await page.evaluate((x) => window.__demo.setState(x), s);
      await page.waitForTimeout(150);
      await reviewShot(page, testInfo, `euler-${s.a1}-${s.a2}-${s.a3}`);
    }
  });

  test('"Animate bookmarks" moves through the bookmarks and can be stopped', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('animate-bookmarks').click();
    await page.waitForTimeout(2500);
    const mid = await page.evaluate(() => window.__demo.getState());
    expect(mid.a1 + mid.a2 + mid.a3).toBeGreaterThan(0);
    await page.getByTestId('animate-bookmarks').click();
    const a = await page.evaluate(() => window.__demo.getState());
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.__demo.getState())).toEqual(a);
  });

  test('slider animation (⊕ panel ▶) advances the angle', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('plus-a3').click();
    await expect(page.getByTestId('anim-a3')).toBeVisible();
    await page.getByTestId('play-a3').click();
    await page.waitForTimeout(1200);
    await page.getByTestId('play-a3').click();
    expect((await page.evaluate(() => window.__demo.getState())).a3).toBeGreaterThan(0);
  });

  test('"Initial settings" resets all angles', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ a1: 100, a2: 200, a3: 300 }));
    await page.getByTestId('reset').click();
    expect(await page.evaluate(() => window.__demo.getState())).toEqual({ a1: 0, a2: 0, a3: 0 });
    await expect(page.getByTestId('slider-a1')).toHaveValue('0');
  });

  test('mouse drag on the scene rotates the view (Rotate and Zoom in 3D)', async ({ page }) => {
    await openDemo(page, URL);
    const before = await page.evaluate(() => window.__demo.frames());
    const box = await page.getByTestId('scene-canvas').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 20, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__demo.frames())).toBeGreaterThan(before);
  });
});
