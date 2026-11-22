// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Kenneth E. Caviness
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/longitudinal-standing-waves.spec.js — browser tests of the "Longitudinal Standing Waves" page (attribution,
// start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js; the errata switch in
// errata-mode.spec.js). Review screenshots at the snapshot settings (compare: docs/original-snapshots/longitudinal-standing-waves-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/longitudinal-standing-waves/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/longitudinal-standing-waves.original-states.json', 'utf8'));
const pressed = (page, id) => page.getByTestId(id).getAttribute('aria-pressed');
const svg = (page) => page.getByTestId('scene-svg');
// the number of contour lines drawn (each an SVG line or polyline inside the "contours" group)
const drawnLines = (page) => page.locator('[data-testid="contours"] :is(line, polyline, path)').count();

test.describe('longitudinal-standing-waves', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(svg(page)).toBeVisible();
    for (const id of ['pipe-cap', 'contours', 'density', 'end-display', 'longitudinal-envelope']) await expect(page.getByTestId(id), id).toHaveCount(1);
    await expect(page.getByTestId('displacement-labels')).toHaveCount(0);
  });

  test('the opening picture: contour lines of the standing wave, the grey envelope, the arrows', async ({ page }) => {
    await openDemo(page, URL);
    const v = await view(page);
    expect(v.transverseShown).toEqual([4, 5, 6, 7]);
    expect(v.λ).toBeCloseTo(14 / 3, 12);
    expect(await drawnLines(page)).toBe(v.contourX[0].length);
    expect(v.contourX[0].length).toBeGreaterThan(90);
    // the filling between the envelope curves: grey at opacity 0.2 (229 on white, as in the snapshots)
    await expect(page.locator('[data-testid="scene-svg"] [fill-opacity="0.2"]')).toHaveCount(1);
    // arrows: 5 rows of double-headed grey arrows and points
    expect(await page.locator('[data-testid="longitudinal-envelope"] polygon').count()).toBeGreaterThan(50);
    const box = await svg(page).boundingBox();
    expect(box.width / box.height).toBeCloseTo(7.28 / 2, 1);
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toMatchObject(fx.specs);
    expect(await pressed(page, 'setter-n-3')).toBe('true');
    expect(await pressed(page, 'setter-end-open')).toBe('true');
    const on = [];
    for (let k = 1; k <= 10; k++) if ((await pressed(page, `toggler-options-${k}`)) === 'true') on.push(k);
    expect(on).toEqual([1, 4, 7, 8]);
    await expect(page.getByTestId('trigger-play-t')).toBeVisible();
    await expect(page.getByTestId('trigger-faster-t')).toBeVisible();
    await expect(page.getByTestId('trigger-slower-t')).toBeVisible();
    await expect(page.getByTestId('trigger-reset-t')).toHaveCount(0); // AppearanceElements without "ResetButton"
    await expect(page.locator('#controls')).toContainText('harmonic n');
    await expect(page.locator('#controls')).toContainText('pipe end');
    await expect(page.locator('#controls')).toContainText('options');
    await expect(page.locator('#controls')).toContainText('time t');
  });

  test('the option buttons: tooltips, labels and the transverse icon', async ({ page }) => {
    await openDemo(page, URL);
    const tips = ['standing wave: sum of left and right waves', 'wave moving right', 'wave reflected back left', 'longitudinal contours',
      'longitudinal density', 'transverse wave', 'longitudinal envelope', 'transverse envelope', 'show displacement nodes and antinodes',
      'show pressure nodes and antinodes'];
    for (let k = 1; k <= 10; k++) await expect(page.getByTestId(`toggler-options-${k}`)).toHaveAttribute('title', tips[k - 1]);
    await expect(page.getByTestId('toggler-options-9')).toHaveText('displacement nodes');
    await expect(page.getByTestId('toggler-options-2')).toContainText('→');
    await expect(page.getByTestId('transverse-icon').locator('svg polyline')).toHaveCount(1);
    const ib = await page.getByTestId('transverse-icon').locator('svg').boundingBox();
    expect(ib.width).toBeCloseTo(19, 0);
  });

  test('a harmonic button changes the wavelength and the picture', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-n-7').click();
    await expect.poll(async () => (await state(page)).n).toBe(7);
    expect(await pressed(page, 'setter-n-7')).toBe('true');
    expect(await pressed(page, 'setter-n-3')).toBe('false');
    expect((await view(page)).λ).toBeCloseTo(2, 12);
    await page.getByTestId('setter-n-1').click();
    await expect.poll(async () => (await view(page)).λ).toBeCloseTo(14, 12);
  });

  test('pipe end: closed draws the end line, none the zigzag and neither arrows nor labels', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('toggler-options-9').click();
    await expect(page.getByTestId('displacement-labels')).toHaveCount(1);
    await page.getByTestId('setter-end-closed').click();
    await expect.poll(async () => (await view(page)).λ).toBeCloseTo(28 / 5, 12);
    await expect(page.locator(':is(line, polyline, path)[data-testid="pipe-cap"]')).toHaveCount(1); // one Line: the element itself
    await expect(page.getByTestId('displacement-labels')).toContainText('Nd');
    await page.getByTestId('setter-end-none').click();
    await expect.poll(async () => (await state(page)).end).toBe('none');
    await expect(page.getByTestId('longitudinal-envelope')).toHaveCount(0);
    await expect(page.getByTestId('displacement-labels')).toHaveCount(0);
    expect((await view(page)).transverseShown).toEqual([6, 7]); // no transverse envelope for an endless pipe
    await expect(page.getByTestId('pipe-cap').locator(':is(line, polyline, path)')).toHaveCount(12);
  });

  test('the option buttons toggle with the mouse and the keyboard, in toggle order', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('toggler-options-5').click();
    await expect.poll(async () => (await state(page)).options).toEqual([1, 4, 7, 8, 5]);
    expect(await pressed(page, 'toggler-options-5')).toBe('true');
    const v = await view(page);
    expect(v.densityShown).toEqual([1]);
    expect(await page.locator('[data-testid="density"] circle').count()).toBe(v.densityCounts[0]);
    await page.getByTestId('toggler-options-4').click();
    await expect.poll(async () => (await state(page)).options).toEqual([1, 7, 8, 5]);
    expect(await drawnLines(page)).toBe(0);
    // keyboard: focus the "→" button and press Space, then Enter on "+"
    await page.getByTestId('toggler-options-2').focus();
    await page.keyboard.press('Space');
    await expect.poll(async () => (await state(page)).options).toEqual([1, 7, 8, 5, 2]);
    await page.getByTestId('toggler-options-1').focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await state(page)).options).toEqual([7, 8, 5, 2]);
    expect((await view(page)).densityShown).toEqual([2]);
    await expect(page.locator('[data-testid="density"] circle').first()).toHaveAttribute('fill', /rgb\(0,\s*0,\s*255\)|#00f|blue/i);
  });

  test('the time Trigger plays, loops past 1 and goes faster', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setClock(0));
    await page.getByTestId('trigger-play-t').click();
    // let the animation's first frame run before the clock moves (it records the start time)
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate(() => window.__demo.setClock(2.5));
    await expect.poll(async () => (await state(page)).t, { timeout: 5000 }).toBeCloseTo(0.5, 6); // 1 per 5 s
    const x0 = (await view(page)).contourX[0][0];
    // AnimationRepetitions -> ∞: past 1 the Trigger starts again from 0 (shared/ui-extra.js: at the frame that passes 1)
    await page.evaluate(() => window.__demo.setClock(6));
    await expect.poll(async () => (await state(page)).t, { timeout: 5000 }).toBe(0);
    await page.evaluate(() => window.__demo.setClock(7));
    await expect.poll(async () => (await state(page)).t, { timeout: 5000 }).toBeCloseTo(0.2, 6);
    expect((await view(page)).contourX[0][0]).not.toBeCloseTo(x0, 6);
    await page.getByTestId('trigger-play-t').click(); // pause
    const t = (await state(page)).t;
    await page.evaluate(() => window.__demo.setClock(8));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect((await state(page)).t).toBe(t);
    await page.getByTestId('trigger-faster-t').click();
    await page.getByTestId('trigger-play-t').click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate(() => window.__demo.setClock(9));
    await expect.poll(async () => (await state(page)).t, { timeout: 5000 }).toBeCloseTo(t + 0.25, 6); // 1.25 × 0.2 per s
    await page.getByTestId('trigger-play-t').click();
    await page.evaluate(() => window.__demo.setClock(null));
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.getByTestId('setter-n-5').click();
    await page.getByTestId('setter-end-closed').click();
    await page.getByTestId('toggler-options-10').click();
    await page.evaluate(() => window.__demo.setState({ t: 0.4 }));
    await page.getByTestId('reset').click();
    await expect.poll(() => state(page)).toEqual(opening);
    expect(await pressed(page, 'setter-n-3')).toBe('true');
    expect(await pressed(page, 'toggler-options-10')).toBe('false');
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const want = { 1: [[1], [], 'open'], 2: [[2], [], 'closed'], 3: [[1], [], 'closed'], 4: [[], [1], 'closed'], 5: [[1], [], 'open'], 6: [[], [], 'open'], 7: [[1], [], 'closed'] };
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      const v = await view(page);
      expect([v.longitudinalShown, v.densityShown], `snapshot ${k}`).toEqual(want[k].slice(0, 2));
      expect(v.λWaves, `snapshot ${k}`).toBeCloseTo(28 / 9, 12);
      expect(await pressed(page, `setter-end-${want[k][2]}`), `snapshot ${k}`).toBe('true');
      expect(await drawnLines(page), `snapshot ${k}`).toBe(v.contourX.reduce((a, l) => a + l.length, 0));
      expect(await page.locator('[data-testid="density"] circle').count(), `snapshot ${k}`).toBe(v.densityCounts.reduce((a, b) => a + b, 0));
      const labels = fx.snapshots[k].options.includes(9);
      await expect(page.getByTestId('displacement-labels'), `snapshot ${k}`).toHaveCount(labels ? 1 : 0);
      await reviewShot(page, testInfo, `longitudinal-standing-waves-snapshot-${k}`);
    }
  });
});
