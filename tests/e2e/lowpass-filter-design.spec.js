// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/lowpass-filter-design.spec.js — browser tests of the "Lowpass Filter Design by Pole Placement" page
// (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). Review screenshots at
// the four snapshot settings (compare: docs/original-snapshots/lowpass-filter-design-1…4.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/lowpass-filter-design/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const client = (page, p) => page.evaluate((q) => window.__demo.worldToClient(q), p);

test.describe('lowpass-filter-design', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['pole-plot', 'magnitude-plot']) await expect(page.getByTestId(id), id).toHaveCount(1);
    await expect(page.getByTestId('pole-plot').locator('g[transform^="translate"]')).toHaveCount(3); // three × markers
    await expect(page.locator('[data-testid^="locator-p-"]')).toHaveCount(3);
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toEqual({ type: 'vertical line', n: 3, α: -1, p: [[-1, -1], [-1, 0], [-1, 1]] });
    await expect(page.getByTestId('setter-type-vertical-line')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('value-n')).toHaveValue('3');
    await expect(page.getByTestId('value-α')).toHaveValue('-1');
    // Enabled is evaluated once in the original: the sliders stay enabled in every type (Q-LF-01)
    await page.getByTestId('setter-type-manual').click();
    await expect(page.getByTestId('slider-n')).toBeEnabled();
    await expect(page.getByTestId('slider-α')).toBeEnabled();
  });

  test('each type gives its pole arrangement', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ n: 4, α: -0.5 }));
    const poles = async () => (await view(page)).poles;
    await page.getByTestId('setter-type-triangle').click();
    expect((await poles()).map((p) => p[0])).toEqual([-0.5 * 0.05, -0.5 * (1 - 0.95 / 3), -0.5 * (1 - 0.95 / 3), -0.5 * 0.05].map((x) => expect.closeTo(x, 12)));
    await page.getByTestId('setter-type-Butterworth').click();
    for (const [x, y] of await poles()) expect(Math.hypot(x, y)).toBeCloseTo(1, 12);
    await page.getByTestId('setter-type-elliptical').click();
    for (const [x, y] of await poles()) expect((x / 0.5) ** 2 + y ** 2).toBeCloseTo(1, 12);
    await page.getByTestId('setter-type-vertical-line').click();
    expect(await poles()).toEqual([[-0.5, -1], [-0.5, -1 / 3], [-0.5, 1 / 3], [-0.5, 1]].map(([x, y]) => [x, expect.closeTo(y, 12)]));
    // the locators follow the poles (p = poles): a drag springs back (Q-LF-02)
    await page.evaluate(() => window.__demo.moveLocator('p-1', [-1.5, 0.2]));
    expect((await state(page)).p[0]).toEqual([-0.5, -1]);
  });

  test('manual: drag, add and delete a pole (Alt-click)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-type-manual').click();
    await page.evaluate(() => window.__demo.moveLocator('p-2', [-0.4, 0.1]));
    expect((await state(page)).p[1]).toEqual([-0.4, 0.1]);
    expect((await state(page)).α).toBe(-1);
    // Alt-click on empty space adds a pole at the end of the list
    const a = await client(page, [-1.6, 0.5]);
    await page.keyboard.down('Alt');
    await page.mouse.click(a.x, a.y);
    await page.keyboard.up('Alt');
    await expect.poll(async () => (await state(page)).n).toBe(4);
    const p = (await state(page)).p;
    expect(p[3][0]).toBeCloseTo(-1.6, 1);
    expect(p[3][1]).toBeCloseTo(0.5, 1);
    expect((await state(page)).α).toBeCloseTo(p[3][0], 12); // α = the smallest real part
    await expect(page.locator('[data-testid^="locator-p-"]')).toHaveCount(4);
    await expect(page.getByTestId('value-n')).toHaveValue('4');
    // Alt-click on a pole deletes it
    const b = await client(page, [-0.4, 0.1]);
    await page.keyboard.down('Alt');
    await page.mouse.click(b.x, b.y);
    await page.keyboard.up('Alt');
    await expect.poll(async () => (await state(page)).n).toBe(3);
    expect((await state(page)).p.some(([x, y]) => x === -0.4 && y === 0.1)).toBe(false);
  });

  test('the four snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/lowpass-filter-design.original-states.json', 'utf8'));
    expect(Object.keys(fx.snapshots)).toHaveLength(4);
    for (const k of Object.keys(fx.snapshots)) {
      const s = { ...fx.snapshots[k] };
      if (Array.isArray(s.type)) s.type = s.type[0]; // snapshot 1 saved the setter's list (the first value is shown)
      await page.evaluate((st) => window.__demo.setState(st), s);
      const v = await view(page);
      expect(v.type).toBe(s.type);
      expect(v.poles.length).toBe(v.n);
      await reviewShot(page, testInfo, `lowpass-filter-design-snapshot-${k}`);
    }
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ type: 'Butterworth', n: 9 }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
