// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Brendon O'Leary
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/light-through-acoustic-wave.spec.js — browser tests of the "Path of Light through an Acoustic Wave" page
// (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). Review screenshots at
// the four snapshot settings (compare: docs/original-snapshots/light-through-acoustic-wave-1…4.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/light-through-acoustic-wave/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/light-through-acoustic-wave.original-states.json', 'utf8'));

/** Press on a slider's track at fraction f of its width and drag past its end (dx < 0: left, > 0: right). */
async function dragSlider(page, testid, f, dx) {
  const box = await page.getByTestId(testid).boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * f, y);
  await page.mouse.down();
  await page.mouse.move(dx < 0 ? box.x + dx : box.x + box.width + dx, y, { steps: 6 });
  await page.mouse.up();
}

test.describe('light-through-acoustic-wave', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['light-path', 'sound-wave']) await expect(page.getByTestId(id), id).toHaveCount(1);
    await expect(page.locator('#graphic svg').first()).toBeVisible();
  });

  test("has its controls with their defaults (the notebook's live state)", async ({ page }) => {
    await openDemo(page, URL);
    for (const [k, v] of Object.entries({ n: '1', m: '0.7', w: '0.5', θ: '0.01' })) await expect(page.getByTestId(`value-${k}`), k).toHaveValue(v);
    expect(await state(page)).toEqual({ n: 1, m: 0.7, w: 0.5, θ: 0.01 });
    await expect(page.getByTestId('slider-m')).toHaveAttribute('max', '0.9');
    expect((await view(page)).yEnd).toBeCloseTo(0.701, 3);
  });

  test('the keyboard moves a slider to its ends and the picture follows', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-θ').focus();
    await page.keyboard.press('Home');
    await expect.poll(async () => (await state(page)).θ).toBe(-0.02);
    await expect.poll(async () => (await view(page)).yEnd).toBeLessThan(0); // the path now falls
    const before = (await view(page)).yEnd;
    await page.getByTestId('slider-w').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).w).toBe(2);
    await expect.poll(async () => Math.abs((await view(page)).yEnd - before)).toBeGreaterThan(1e-3);
  });

  test('typing a value: w = 1.302 (snapshot 3)', async ({ page }) => {
    await openDemo(page, URL);
    const field = page.getByTestId('value-w');
    await field.fill('1.302');
    await field.press('Enter');
    await expect.poll(async () => (await state(page)).w).toBe(1.302);
  });

  test('the mouse: the maximum of m follows n, and lowering n lowers m (If[m > n − .1, m = n − .1])', async ({ page }) => {
    await openDemo(page, URL);
    // m to its maximum n − .1 = 0.9 with the mouse (past the right end of the track)
    await dragSlider(page, 'slider-m', 0.5, 40);
    await expect.poll(async () => (await state(page)).m).toBe(0.9);
    // n to its minimum 0.8: the body sets m = 0.8 − .1, the m slider's maximum follows
    await dragSlider(page, 'slider-n', 0.04, -40);
    await expect.poll(async () => (await state(page)).n).toBe(0.8);
    await expect.poll(async () => (await state(page)).m).toBe(0.8 - 0.1);
    await expect(page.getByTestId('slider-m')).toHaveAttribute('max', String(0.8 - 0.1));
    await expect(page.getByTestId('value-m')).toHaveValue(/^0\.7/);
    // n to its maximum 5: m stays, its slider reaches 4.9
    await dragSlider(page, 'slider-n', 0.02, 40);
    await expect.poll(async () => (await state(page)).n).toBe(5);
    await expect(page.getByTestId('slider-m')).toHaveAttribute('max', '4.9');
    expect((await state(page)).m).toBe(0.8 - 0.1);
    // the light path stays continuous (no spike) at the new settings
    const s = await state(page), v = await view(page);
    expect(v.steepest).toBeLessThanOrEqual((s.n * Math.tan(s.θ)) / (s.n - s.m) * (1 + 1e-6));
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ n: 3, m: 2.5, w: 1.7, θ: -0.015 }));
    await expect(page.getByTestId('slider-m')).toHaveAttribute('max', '2.9');
    await page.getByTestId('reset').click();
    await expect.poll(() => state(page)).toEqual(opening);
    await expect(page.getByTestId('slider-m')).toHaveAttribute('max', '0.9');
    await expect(page.getByTestId('value-w')).toHaveValue('0.5');
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    // the end of the light path at x = 50, read off the snapshots: about 0.70, 0.70, −1.0 and 2.0
    const ends = { 1: 0.7, 2: 0.7, 3: -1.0, 4: 2.0 };
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      await expect.poll(async () => (await state(page)).w).toBe(fx.snapshots[k].w);
      const s = await state(page), v = await view(page);
      expect(s).toEqual(fx.snapshots[k]);
      expect(Math.abs(v.yEnd - ends[k]), `snapshot ${k}`).toBeLessThan(0.03);
      expect(v.steepest).toBeLessThanOrEqual((s.n * Math.abs(Math.tan(s.θ))) / (s.n - s.m) * (1 + 1e-6));
      await expect(page.getByTestId('value-θ')).toHaveValue(String(fx.snapshots[k].θ));
      await reviewShot(page, testInfo, `light-through-acoustic-wave-snapshot-${k}`);
    }
  });
});
