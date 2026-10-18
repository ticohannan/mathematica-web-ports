// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/camera-lasers.spec.js — browser tests of the camera-lasers page (real mouse and keyboard)
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';

const URL = '/demos/camera-lasers/';
const snapshots = loadStates('tests/golden/camera-lasers.original-states.json').snapshots.map((s) => plain(s));
const toClient = (page, p) => page.evaluate((q) => window.__demo.worldToClient(q), p);
const dialClient = (page, deg, r = 0.8) => page.evaluate((q) => window.__demo.dialToClient(q), [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)]);
const getState = (page) => page.evaluate(() => window.__demo.getState());
const getView = (page) => page.evaluate(() => window.__demo.view());
const theta = async (page) => (await getView(page)).theta;
async function drag(page, a, b, steps = 10) {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}

test.describe('camera and lasers', () => {
  test('loads without errors and draws the top view and the camera image of snapshot 1', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    expect((await getState(page)).p).toEqual([3, -0.2]);
    const v = await getView(page);
    expect(Math.abs(v.InterPt3D1[0] + 0.2)).toBeLessThan(0.01);
    expect(Math.abs(v.InterPt3D2[0] - 0.2)).toBeLessThan(0.01);
    await expect(page.getByTestId('dot-1')).toHaveCount(1);
    await expect(page.getByTestId('dot-2')).toHaveCount(1);
    await expect(page.getByTestId('face')).toHaveCount(1);
    await expect(page.locator('[data-testid=object]')).toHaveCount(1);
    expect(await page.evaluate(() => window.__demo.tickLabels())).toEqual(['−0.8', '−1', '−1.2', '−1.5', '−2', '−3', '−5', '−10', '10', '5', '3', '2', '1.5', '1.2', '1', '0.8']);
    await expect(page.getByTestId('locator-icon')).toHaveCount(1);
    await reviewShot(page, testInfo, 'camera-lasers-snapshot-1');
  });

  test('has the controls of the original with their defaults: dial at 0, s 1, λ 0.5', async ({ page }) => {
    await openDemo(page, URL);
    for (const h of ['object orientation', 'laser spacing', 'camera focal length']) await expect(page.locator('.ctl-heading', { hasText: h })).toHaveCount(1);
    expect((await getState(page)).p1).toEqual([1, 0]);
    await expect(page.getByTestId('locator-p1')).toHaveCount(1);
    await expect(page.getByTestId('dial-p1')).toBeVisible();
    await expect(page.getByTestId('value-s')).toHaveText('1');
    await expect(page.getByTestId('vslider-s')).toHaveValue('1');
    await expect(page.getByTestId('value-lambda')).toHaveValue('0.5');
    await expect(page.getByTestId('plus-lambda')).toBeVisible();
  });

  test('dragging the object locator with the mouse moves the object and the laser dots', async ({ page }) => {
    await openDemo(page, URL);
    await drag(page, await toClient(page, [3, -0.2]), await toClient(page, [6.94, -0.04]));
    const s = await getState(page);
    expect(Math.abs(s.p[0] - 6.94)).toBeLessThan(0.05);
    expect(Math.abs(s.p[1] + 0.04)).toBeLessThan(0.05);
    const v = await getView(page);
    expect(Math.abs(v.InterPt3D1[0] + 0.0776)).toBeLessThan(0.002);
    expect(Math.abs(v.InterPt3D2[0] - 0.0776)).toBeLessThan(0.002);
  });

  test('a press in the top view away from the object moves it there (LocatorPane)', async ({ page }) => {
    await openDemo(page, URL);
    const c = await toClient(page, [10, 2]);
    await page.mouse.click(c.x, c.y);
    const p = (await getState(page)).p;
    expect(Math.abs(p[0] - 10)).toBeLessThan(0.05);
    expect(Math.abs(p[1] - 2)).toBeLessThan(0.05);
  });

  test('dragging below the top view leaves the object at its last position', async ({ page }) => {
    await openDemo(page, URL);
    const a = await toClient(page, [3, -0.2]);
    const mid = await toClient(page, [3, -2]);
    const camRect = await page.getByTestId('camera-svg').boundingBox();
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    // first inside the top view: the object follows to y = -2
    await page.mouse.move(mid.x, mid.y, { steps: 10 });
    // the locator applies pointer moves once per animation frame (shared/svg-plot.js): wait for that frame instead
    // of reading the state at once (WebKit had not drawn it yet and showed an earlier sample, -1.29)
    await expect.poll(async () => Math.abs((await getState(page)).p[1] + 2)).toBeLessThan(0.05);
    // then on below the bottom edge (y = -4) into the camera image
    await page.mouse.move(mid.x, camRect.y + camRect.height / 2, { steps: 20 });
    await page.mouse.up();
    const s = await getState(page);
    // F-CL-10: a position at or below the bottom edge is undone (p = pFixed), so p stays at the last accepted position
    // above it: y = -2 or a later pointer sample between -2 and -4 (which samples arrive depends on the engine; WebKit
    // may deliver only the last one)
    expect(s.p[1]).toBeGreaterThan(-4);
    expect(s.p[1]).toBeLessThan(-1.95);
    expect(s.p[0]).toBeCloseTo(3, 1);
    expect(s.pFixed).toEqual(s.p);
  });

  test('clicking the dial at 45 degrees turns the object by π/4 and shows the θ label', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('theta-label')).toHaveCount(0);
    const c = await dialClient(page, 45);
    await page.mouse.click(c.x, c.y);
    expect(Math.abs((await theta(page)) - Math.PI / 4)).toBeLessThan(1e-12);
    await expect(page.getByTestId('theta-label')).toHaveCount(1);
    await reviewShot(page, testInfo, 'camera-lasers-dial-45');
  });

  test('the dial snaps to multiples of π/32', async ({ page }) => {
    await openDemo(page, URL);
    // aim at the middle of each π/32 sector (11.25° → π/16, 45° → 8π/32) so that a pixel of layout difference between
    // engines cannot cross a sector boundary; the drag ends inside the 8π/32 sector after passing others
    const a = await dialClient(page, 11.25), b = await dialClient(page, 45);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await expect.poll(async () => Math.abs((await theta(page)) - Math.PI / 16)).toBeLessThan(1e-12);
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up();
    expect(Math.abs((await theta(page)) - (8 * Math.PI) / 32)).toBeLessThan(1e-12);
  });

  test('laser spacing 0.65 switches the reticule to halves with fraction labels', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.getByTestId('vslider-s').focus();
    for (let i = 0; i < 35; i++) await page.keyboard.press('ArrowDown');
    await expect(page.getByTestId('value-s')).toHaveText('0.65');
    expect((await getState(page)).s).toBe(0.65);
    expect((await getView(page)).sc).toEqual({ num: 1, den: 2 });
    const labels = await page.evaluate(() => window.__demo.tickLabels());
    for (const t of ['1/2', '3/2', '5/2', '0.75']) expect(labels).toContain(t);
    // stacked: a fraction label is drawn as numerator, bar and denominator
    const parts = await page.locator('[data-testid=tick-label][data-text="3/2"]').first().locator('text').allTextContents();
    expect(parts).toEqual(['3', '2']);
    await reviewShot(page, testInfo, 'camera-lasers-s-0.65');
  });

  test('λ 1.2 draws 5 converging ground lines (Round half to even)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('value-lambda').fill('1.2');
    await page.getByTestId('value-lambda').press('Enter');
    await expect(page.getByTestId('ground-ray')).toHaveCount(5);
    await expect(page.getByTestId('ground-row')).toHaveCount(24);
  });

  test('the λ ⊕ panel animates the focal length', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('plus-lambda').click();
    await page.getByTestId('play-lambda').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('play-lambda').click();
    const l1 = (await getState(page)).lambda;
    expect(l1).not.toBe(0.5);
    await expect(page.getByTestId('value-lambda')).not.toHaveValue('0.5');
    await page.waitForTimeout(300);
    expect((await getState(page)).lambda).toBe(l1);
    const rows = await page.getByTestId('ground-row').count();
    expect(rows).toBe((await getView(page)).gridCounts[0]);
  });

  test('the four snapshot settings load through the automation hook', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const expected = [[-0.2, 0.2], [-0.0776, 0.0776], [-0.0455, 0.0652], [-0.1108, 0.00005]];
    for (let k = 1; k <= 4; k++) {
      await page.evaluate((s) => window.__demo.loadState(s), snapshots[k - 1]);
      const v = await getView(page);
      expect(Math.abs(v.InterPt3D1[0] - expected[k - 1][0]), `snapshot ${k}`).toBeLessThan(0.001);
      expect(Math.abs(v.InterPt3D2[0] - expected[k - 1][1]), `snapshot ${k}`).toBeLessThan(0.001);
      await expect(page.getByTestId('face')).toHaveCount(k <= 2 ? 1 : 2);
      await reviewShot(page, testInfo, `camera-lasers-snapshot-${k}`);
    }
    expect((await getState(page)).p1).toEqual(snapshots[3].p1); // off-grid dial value kept (K-CL-08)
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const c = await toClient(page, [10, 2]);
    await page.mouse.click(c.x, c.y);
    const d = await dialClient(page, 45);
    await page.mouse.click(d.x, d.y);
    await page.getByTestId('vslider-s').focus();
    await page.keyboard.press('ArrowDown');
    await page.getByTestId('value-lambda').fill('1.2');
    await page.getByTestId('value-lambda').press('Enter');
    await page.getByTestId('reset').click();
    expect(await getState(page)).toEqual({ p: [3, -0.2], pFixed: [3, -0.2], p1: [1, 0], s: 1, lambda: 0.5 });
    await expect(page.getByTestId('value-lambda')).toHaveValue('0.5');
    await expect(page.getByTestId('value-s')).toHaveText('1');
    await expect(page.getByTestId('face')).toHaveCount(1);
    await expect(page.getByTestId('theta-label')).toHaveCount(0);
  });

  test('arrow keys move the object locator and turn the dial (port additions)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-p').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const p = (await getState(page)).p;
    expect(p[0]).toBeCloseTo(3.2, 12);
    expect(p[1]).toBe(-0.2);
    await page.getByTestId('locator-p1').focus();
    await page.keyboard.press('ArrowUp');
    expect(Math.abs((await theta(page)) - Math.PI / 32)).toBeLessThan(1e-12);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(Math.abs((await theta(page)) - (63 * Math.PI) / 32)).toBeLessThan(1e-12);
    await page.keyboard.press('Shift+ArrowUp');
    expect(Math.abs((await theta(page)) - (3 * Math.PI) / 32)).toBeLessThan(1e-12);
  });
});
