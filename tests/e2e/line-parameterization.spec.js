// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original (ECE 6311 Lecture 18 notebook) by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/line-parameterization.spec.js — browser tests of the "Line Parameterization" page (attribution, start-up
// notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). Review screenshots at the settings of the
// owner's screenshots of the original (docs/original-snapshots/line-parameterization-1…3.png).
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/line-parameterization/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const dialClient = (page, deg, r = 0.8) => page.evaluate((q) => window.__demo.dialToClient(q), [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)]);
const IDS = ['marker', 'arc', 'rho-arrow', 'rho-label', 'line', 'equation', 'foot', 'axis-x', 'axis-y'];

test.describe('line-parameterization', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of IDS) await expect(page.getByTestId(id), id).toHaveCount(1);
    await expect(page.getByTestId('theta-label')).toHaveCount(0); // θ = 0: no label (k < 2)
    await expect(page.getByTestId('scene-svg')).toBeVisible();
  });

  test('has its controls with their defaults: ρ 1 (blue label), the θ dial at 0 (red label)', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-rho')).toHaveValue('1');
    expect(await state(page)).toEqual({ rho: 1, p1: [1, 0] });
    await expect(page.getByTestId('dial-p1')).toBeVisible();
    await expect(page.getByTestId('locator-p1')).toHaveCount(1);
    const colors = await page.evaluate(() => [...document.querySelectorAll('#controls .ctl-label')].map((n) => [n.textContent, getComputedStyle(n.querySelector('*') ?? n).color]));
    expect(colors).toEqual([['ρ', 'rgb(0, 0, 255)'], ['θ', 'rgb(255, 0, 0)']]);
  });

  test('the slider moves the line: ρ 1.1 puts the foot point at 1.1 on the x axis', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-rho').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).rho).toBeCloseTo(1.1, 12);
    const v = await view(page);
    expect(v.foot[0]).toBeCloseTo(1.1, 12);
    expect(v.foot[1]).toBeCloseTo(0, 12);
  });

  test('the dial sets θ in steps of π/32 (a press at 45° gives π/4; at 100° the nearest step 18π/32)', async ({ page }) => {
    await openDemo(page, URL);
    const a = await dialClient(page, 45);
    await page.mouse.click(a.x, a.y);
    await expect.poll(async () => (await view(page)).k).toBe(8);
    await expect(page.getByTestId('theta-label')).toHaveCount(1);
    const b = await dialClient(page, 101.25); // the middle of the 18π/32 step
    await page.mouse.click(b.x, b.y);
    await expect.poll(async () => (await view(page)).k).toBe(18);
    const c = await dialClient(page, -90); // below the x axis: θ = 3π/2 in the picture (Q-LP-01)
    await page.mouse.click(c.x, c.y);
    await expect.poll(async () => (await view(page)).k).toBe(48);
  });

  test('keyboard: arrow keys turn the dial by π/32', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-p1').focus();
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await view(page)).k).toBe(1);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect.poll(async () => (await view(page)).k).toBe(63); // −π/32 + 2π
  });

  test('the equation label is rotated with the line (θ − π/2) and turned about its own position', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ rho: 1.8, p1: [Math.SQRT1_2, Math.SQRT1_2] }));
    const t = await page.getByTestId('equation').evaluate((n) => {
      const g = n.closest('[transform]') ?? n.querySelector('[transform]');
      return (n.getAttribute('transform') ?? g?.getAttribute('transform') ?? '');
    });
    expect(t).toMatch(/rotate\(-45 /);
  });

  test('the saved state of the notebook (ρ = 1.8, θ = π/4) + screenshot for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ rho: 1.8, p1: [Math.SQRT1_2, Math.SQRT1_2] }));
    await expect(page.getByTestId('value-rho')).toHaveValue('1.8');
    expect((await view(page)).k).toBe(8);
    await expect(page.getByTestId('theta-label')).toHaveCount(1);
    await reviewShot(page, testInfo, 'line-parameterization-saved-state'); // compare: docs/original-snapshots/line-parameterization-1.png
  });

  test('ρ = 1.8 and θ = 9π/32 (the owner\u2019s screenshot 2): the line crosses the axes at 2.84 and 2.33 + screenshot for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const a = (9 * Math.PI) / 32;
    await page.evaluate((p1) => window.__demo.setState({ rho: 1.8, p1 }), [Math.cos(a), Math.sin(a)]);
    const v = await view(page);
    expect(v.k).toBe(9);
    expect(1.8 / Math.cos(a)).toBeCloseTo(2.84, 2); // x-axis crossing (about 2.9 read off the screenshot)
    expect(1.8 / Math.sin(a)).toBeCloseTo(2.33, 2);
    await reviewShot(page, testInfo, 'line-parameterization-9pi32'); // compare: docs/original-snapshots/line-parameterization-2.png
  });

  test('ρ = 0.1 and θ = 3π/2: the equation upside down, the dial at −π/2 + screenshot for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ rho: 0.1, p1: [0, -1] }));
    expect((await view(page)).k).toBe(48);
    await reviewShot(page, testInfo, 'line-parameterization-small-rho'); // compare: docs/original-snapshots/line-parameterization-3.png
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ rho: 2.5, p1: [0, 1] }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
  });
});
