// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alain Goriely and Mark Robertson-Tessi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/vibrating-string.spec.js — browser tests of "The Vibrating String" (attribution, start-up notice, UI
// inventory and bundle are in site.spec.js and bundle.spec.js). Real mouse and keyboard; the Trigger with a fixed page
// clock; LocatorAutoCreate -> {All, {1, 10}} (shared/manipulate.js, v0.1.41).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/vibrating-string/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const client = (page, p) => page.evaluate((q) => window.__demo.worldToClient(q), p);
const curves = (page) => page.evaluate(() => window.__demo.graphics(0).list.length);
const fx = JSON.parse(fs.readFileSync('tests/golden/vibrating-string.original-states.json', 'utf8'));
const num = (v) => (v && typeof v === 'object' && 'n' in v ? v.n : v);
const settings = (s) => ({ ...s, points: s.points.map((p) => p.map(num)) });
const PI = Math.PI;

test.describe('vibrating-string', () => {
  test('loads without errors and draws the opening picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-svg')).toBeVisible();
    for (const id of ['axis-x', 'axis-y', 'locator-points-1']) await expect(page.getByTestId(id), id).toHaveCount(1);
    expect(await curves(page)).toBe(2); // initial string and evolving string (the waves are off)
    await expect(page.getByTestId('modes')).toBeHidden();
    const v = await view(page);
    expect(v.Bn[0]).toBeCloseTo(192 / PI ** 4 - 32 / PI ** 3, 6);
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('setter-idpolynom-1')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('value-c')).toHaveValue('0.5');
    await expect(page.getByTestId('value-a')).toHaveValue('0');
    for (const [id, on] of [['id', true], ['string', true], ['ltw', false], ['rtw', false], ['modedisp', false]]) {
      if (on) await expect(page.getByTestId(`check-${id}`), id).toBeChecked(); else await expect(page.getByTestId(`check-${id}`), id).not.toBeChecked();
    }
    await expect(page.getByTestId('trigger-play-t')).toBeVisible();
    await expect(page.getByTestId('trigger-reset-t')).toBeVisible();
    expect((await state(page)).points).toEqual([[0.5, 1]]);
  });

  test('the setter bar chooses the piecewise-linear initial data', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-idpolynom-2').click();
    await expect.poll(async () => (await state(page)).idpolynom).toBe(2);
    const v = await view(page);
    expect(v.Bn[0]).toBeCloseTo(8 / PI ** 2, 6); // the tent: 8/π²
    expect(v.samples[2][1]).toBeCloseTo(0.4, 6); // x = 0.2 on the line from (0, 0) to (1/2, 1)
  });

  test('the sliders set the velocity and the x interval', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-a').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).a).toBe(1);
    const g = await page.evaluate(() => window.__demo.graphics(0).options.PlotRange);
    expect(g).toEqual([[-1, 2], [-2, 2]]);
    await page.getByTestId('value-c').fill('2');
    await page.getByTestId('value-c').press('Enter');
    await expect.poll(async () => (await state(page)).c).toBe(2);
  });

  test('the checkboxes show and hide the four curves', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('check-ltw').click();
    await page.getByTestId('check-rtw').click();
    await expect.poll(() => curves(page)).toBe(4);
    await page.getByTestId('check-id').click();
    await expect.poll(() => curves(page)).toBe(3);
    const s = await state(page);
    expect([s.id, s.string, s.ltw, s.rtw]).toEqual([false, true, true, true]);
    // the evolving string keeps its colour (ColorData[97, 2]) when the initial string is off: If[False, …] is Null
    const colour = await page.evaluate(() => window.__demo.graphics(0).list[0][0].rgb);
    expect(colour).toEqual([0.880722, 0.611041, 0.142051]);
  });

  test('dragging a point with the mouse changes the string', async ({ page }) => {
    await openDemo(page, URL);
    const a = await client(page, [0.5, 1]), b = await client(page, [0.3, 1.5]);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2);
    await page.mouse.move(b.x, b.y);
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).points[0][0]).toBeCloseTo(0.3, 1);
    const v = await view(page);
    expect(v.points[0][1]).toBeCloseTo(1.5, 1);
    expect(v.atData[0]).toBeCloseTo(v.points[0][1], 9); // the string passes through the point
  });

  test('LocatorAutoCreate -> {All, {1, 10}}: a click beside the points adds one and drags it, Alt-click deletes, one stays', async ({ page }) => {
    await openDemo(page, URL);
    // a plain click away from the point adds a point there (no jump of the existing point)
    const p = await client(page, [0.25, -1]);
    await page.mouse.click(p.x, p.y);
    await expect.poll(async () => (await state(page)).points.length).toBe(2);
    let pts = (await state(page)).points;
    expect(pts[0]).toEqual([0.5, 1]);
    expect(pts[1][0]).toBeCloseTo(0.25, 1);
    expect(pts[1][1]).toBeCloseTo(-1, 1);
    await expect(page.locator('[data-testid^="locator-points-"]')).toHaveCount(2);
    // press, drag and release: the new point follows the mouse
    const q0 = await client(page, [0.8, 0.5]), q1 = await client(page, [0.8, 1.2]);
    await page.mouse.move(q0.x, q0.y);
    await page.mouse.down();
    await page.mouse.move(q1.x, (q0.y + q1.y) / 2);
    await page.mouse.move(q1.x, q1.y);
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).points.length).toBe(3);
    await expect.poll(async () => (await state(page)).points[2][1]).toBeCloseTo(1.2, 1);
    expect((await state(page)).points[2][0]).toBeCloseTo(0.8, 1);
    // Alt-click on a point deletes it
    for (const pt of [[0.5, 1], [0.25, -1]]) {
      const c = await client(page, pt);
      await page.keyboard.down('Alt');
      await page.mouse.click(c.x, c.y);
      await page.keyboard.up('Alt');
    }
    await expect.poll(async () => (await state(page)).points.length).toBe(1);
    pts = (await state(page)).points;
    expect(pts[0][0]).toBeCloseTo(0.8, 1);
    // the last point stays (at least 1)
    const last = await client(page, pts[0]);
    await page.keyboard.down('Alt');
    await page.mouse.click(last.x, last.y);
    await page.keyboard.up('Alt');
    await page.waitForTimeout(100);
    expect((await state(page)).points).toEqual(pts);
  });

  test('LocatorAutoCreate -> {All, {1, 10}}: with 10 points a click beside them has no effect', async ({ page }) => {
    await openDemo(page, URL);
    const ten = Array.from({ length: 10 }, (_, i) => [0.05 + 0.09 * i, i % 2 ? 0.5 : -0.5]);
    await page.evaluate((pts) => window.__demo.setState({ points: pts }), ten);
    await expect(page.locator('[data-testid^="locator-points-"]')).toHaveCount(10);
    const p = await client(page, [0.5, 1.8]);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(100);
    expect((await state(page)).points).toEqual(ten);
  });

  test('a point moved to either end of its range is removed (the body\'s rules)', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ points: [[0.5, 1], [0.7, -0.5]] }));
    await page.evaluate(() => window.__demo.moveLocator('points-2', [1.3, -0.5])); // clamped to x = 1 − 0.001
    await expect.poll(async () => (await state(page)).points).toEqual([[0.5, 1]]);
    await expect(page.locator('[data-testid^="locator-points-"]')).toHaveCount(1);
  });

  test('the Trigger runs the string: after 1/c seconds it is upside down; reset returns to t = 0', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setClock(0));
    await page.getByTestId('trigger-play-t').click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate(() => window.__demo.setClock(2)); // 1 unit per second: t = 2, c t = 1
    await expect.poll(async () => (await state(page)).t, { timeout: 5000 }).toBeCloseTo(2, 6);
    await page.getByTestId('trigger-play-t').click(); // pause
    const v = await view(page);
    expect(v.samples[5][2]).toBeCloseTo(-1, 6); // x = 1/2: the evolving string at −1
    expect(v.samples[5][1]).toBeCloseTo(1, 6); // the initial string stays
    await page.getByTestId('trigger-reset-t').click();
    await expect.poll(async () => (await state(page)).t).toBe(0);
    await page.evaluate(() => window.__demo.setClock(null));
  });

  test('display modes shows the first three Fourier modes in the control column', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('check-modedisp').click();
    await expect(page.getByTestId('modes')).toBeVisible();
    for (const m of [1, 2, 3]) await expect(page.getByTestId(`mode-svg-${m}`)).toBeVisible();
    await expect(page.getByTestId('mode-1')).toContainText('First mode');
    // the first mode's curve: Bn[[1]] Sin[π x] at t = 0, its top at x = 1/2
    const top = await page.evaluate(() => Math.max(...window.__demo.graphics(1).list[0].at(-1).pts.map((p) => p[1])));
    expect(top).toBeCloseTo(192 / PI ** 4 - 32 / PI ** 3, 3);
    await page.getByTestId('check-modedisp').click();
    await expect(page.getByTestId('modes')).toBeHidden();
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ idpolynom: 2, c: 2, a: 2, points: [[0.2, 1], [0.6, -1]], ltw: true, t: 3, modedisp: true }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.locator('[data-testid^="locator-points-"]')).toHaveCount(1);
    await expect(page.getByTestId('modes')).toBeHidden();
  });

  test('the four snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    expect(Object.keys(fx.snapshots)).toHaveLength(4);
    for (const [k, snap] of Object.entries(fx.snapshots)) {
      const s = settings(snap);
      await page.evaluate((st) => window.__demo.setState(st), s);
      const v = await view(page);
      expect(v.points, `snapshot ${k}`).toEqual(s.points);
      await expect(page.locator('[data-testid^="locator-points-"]')).toHaveCount(s.points.length);
      expect(await curves(page), `snapshot ${k}`).toBe([s.id, s.string, s.ltw, s.rtw].filter(Boolean).length);
      v.points.forEach(([, y], i) => expect(v.atData[i], `snapshot ${k}, point ${i + 1}`).toBeCloseTo(y, 9));
      await reviewShot(page, testInfo, `vibrating-string-snapshot-${k}`);
    }
  });
});
