// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Li Huang
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/packing-spheres-into-a-thin-cylinder.spec.js — browser tests of the "Packing Spheres into a Thin Cylinder"
// page (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/packing-spheres-into-a-thin-cylinder/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const num = (x) => (x && typeof x === 'object' && 'n' in x ? x.n : x);

test.describe('packing-spheres-into-a-thin-cylinder', () => {
  test('loads without errors and draws both pictures: the plot with its legend icons and the packing in 3D', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('plot-svg')).toBeVisible();
    await expect(page.getByTestId('scene-canvas')).toBeVisible();
    expect(await page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.02);
    // five legend entries, each a line and an icon: a circle with one to five red disks
    for (let i = 1; i <= 5; i++) await expect(page.getByTestId(`legend-${i}`).locator('circle, ellipse')).toHaveCount(1 + i);
    // the plot above the 3D picture (Column)
    const a = await page.getByTestId('plot-svg').boundingBox(), b = await page.getByTestId('scene-canvas').boundingBox();
    expect(a.y + a.height).toBeLessThanOrEqual(b.y + 1);
  });

  test('has the four controls of the original with their saved values, in two rows', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-R')).toHaveValue('1');
    await expect(page.getByTestId('value-θ')).toHaveValue('0');
    await expect(page.getByTestId('value-SphereOpacity')).toHaveValue('0.6');
    await expect(page.getByTestId('value-NumSpheres')).toHaveValue('8');
    await expect(page.locator('#controls .frac')).toContainText('tube radius');
    await expect(page.locator('#controls')).toContainText('stacking plane angle');
    await expect(page.getByTestId('row-first').locator('input[type=range]')).toHaveCount(2);
    await expect(page.getByTestId('row-second').locator('input[type=range]')).toHaveCount(2);
    // the ranges: R 1 … 3, θ 0 … 3.14159, opacity 0 … 1, spheres 8 … 32
    for (const [n, lo, hi] of [['R', 1, 3], ['θ', 0, 3.14159], ['SphereOpacity', 0, 1], ['NumSpheres', 8, 32]]) {
      await page.getByTestId(`slider-${n}`).focus();
      await page.keyboard.press('End');
      await expect.poll(async () => (await state(page))[n]).toBeCloseTo(hi, 9);
      await page.keyboard.press('Home');
      await expect.poll(async () => (await state(page))[n]).toBeCloseTo(lo, 9);
    }
  });

  test('a slider step of R moves the marker on the plot and changes the packing', async ({ page }) => {
    await openDemo(page, URL);
    expect((await view(page)).z).toBe(1);
    await page.getByTestId('slider-R').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).R).toBeCloseTo(1.01, 12);
    const v = await view(page);
    expect(v.z).toBeCloseTo(Math.sqrt((4 - 2.02) * 2.02) / 2, 12); // the zigzag: √((4r − W) W)/2
    expect(v.centers[1][1]).toBeCloseTo(-0.01, 12); // off the axis by w/2 − r, on alternate sides
    await expect(page.getByTestId('epilog')).toContainText(`compression ratio = ${v.caption.split('= ')[1]}`);
    // the marker point at {w/2r, z} in the plot
    const g = await page.evaluate(() => window.__demo.graphics(0));
    expect(JSON.stringify(g.list.at(-1))).toContain(`[1.01,${v.z}]`);
    await page.keyboard.press('End');
    await expect.poll(async () => (await view(page)).numsides).toBe(6); // three at a time, twisted (sets of six)
  });

  test('the caption under the 3D picture: centred near its bottom, size 20', async ({ page }) => {
    await openDemo(page, URL);
    const cap = page.getByTestId('epilog');
    await expect(cap).toContainText('compression ratio = 1');
    const c = await page.getByTestId('scene-canvas').boundingBox();
    const t = await cap.locator('div > div').first().boundingBox();
    expect(Math.abs(t.x + t.width / 2 - (c.x + c.width / 2))).toBeLessThan(3);
    expect(t.y + t.height).toBeLessThanOrEqual(c.y + c.height + 1);
    expect(t.y + t.height).toBeGreaterThan(c.y + c.height - 40);
    expect(await cap.locator('div').first().evaluate((n) => n.style.fontSize)).toBe('20px');
    // a narrower window: the caption follows the canvas without a new evaluation
    await page.setViewportSize({ width: 480, height: 900 });
    await expect.poll(async () => {
      const c2 = await page.getByTestId('scene-canvas').boundingBox(), t2 = await cap.locator('div > div').first().boundingBox();
      return Math.abs(t2.x + t2.width / 2 - (c2.x + c2.width / 2));
    }).toBeLessThan(3);
  });

  test('the tube fills the width of the 3D picture (SphericalRegion -> False, as in snapshot 1)', async ({ page }) => {
    await openDemo(page, URL);
    const c = await page.getByTestId('scene-canvas').boundingBox();
    const [a, b] = await page.evaluate(() => [window.__demo.sceneToClient([-2, 0, 0]), window.__demo.sceneToClient([18, 0, 0])]);
    expect(b.x - a.x).toBeGreaterThan(0.7 * c.width);
    expect(a.x).toBeGreaterThan(c.x);
    expect(b.x).toBeLessThan(c.x + c.width);
  });

  test('the sphere opacity and the spheres sliders by keyboard', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-NumSpheres').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await view(page)).spheres).toBe(9);
    await page.getByTestId('slider-SphereOpacity').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).SphereOpacity).toBeCloseTo(0.59, 12);
    const g = await page.evaluate(() => window.__demo.graphics(1));
    expect(JSON.stringify(g)).toContain('0.59');
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ R: 2.5, θ: 1, SphereOpacity: 0.2, NumSpheres: 30 }));
    await expect.poll(async () => (await view(page)).numsides).toBe(4);
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.getByTestId('epilog')).toContainText('compression ratio = 1');
  });

  test('review screenshots at the four snapshot settings', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/packing-spheres-into-a-thin-cylinder.original-states.json', 'utf8'));
    const captions = { 1: '1', 2: '0.238794', 3: '0.172977', 4: '0.461848' };
    const spheres = { 1: 8, 2: 20, 3: 20, 4: 18 };
    for (const k of Object.keys(fx.snapshots)) {
      const s = Object.fromEntries(Object.entries(fx.snapshots[k]).map(([n, v]) => [n, num(v)]));
      await page.evaluate((st) => window.__demo.setState(st), s);
      await expect(page.getByTestId('epilog')).toContainText(`compression ratio = ${captions[k]}`);
      expect((await view(page)).spheres).toBe(spheres[k]);
      await reviewShot(page, testInfo, `packing-spheres-into-a-thin-cylinder-snapshot-${k}`);
    }
  });
});
