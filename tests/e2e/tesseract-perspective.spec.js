// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alexander Perepelitsa
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/tesseract-perspective.spec.js — browser tests of the "Rotating a Tesseract in Perspective" page (attribution,
// start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). The slider's animation runs on the
// page clock, which the tests fix with window.__demo.setClock.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/tesseract-perspective/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/tesseract-perspective.original-states.json', 'utf8'));
const MAX = 2 * 3.1416;
/** the projection of a vertex (x, y, z, w) of the tesseract {±1}^4 at angle a, by hand */
const project = ([x, y, z, w], a) => {
  const z1 = z * Math.cos(a) - w * Math.sin(a), w1 = z * Math.sin(a) + w * Math.cos(a);
  return [x, y, z1].map((c) => c / (3 - w1));
};
/** the largest distance between the drawn edge points and the hand projection of the same vertices */
async function worstEdgeError(page, a) {
  const { edges } = await view(page);
  let worst = 0;
  const hand = (p3) => {
    let best = Infinity;
    for (let i = 0; i < 16; i++) {
      const v = [0, 1, 2, 3].map((k) => ((i >> (3 - k)) & 1 ? 1 : -1));
      best = Math.min(best, Math.hypot(...project(v, a).map((c, k) => c - p3[k])));
    }
    return best;
  };
  for (const seg of edges) for (const p of seg) worst = Math.max(worst, hand(p));
  return { worst, count: edges.length };
}
const bluish = ([r, g, b]) => Math.abs(r - g) <= 2 && b > r + 60;

/** snapshot k: its saved Settings give the hand-projected edges, the value text the snapshot shows beside the slider
 *  and blue tubes at a vertex */
async function checkSnapshot(page, testInfo, k, text) {
  await openDemo(page, URL);
  const a = fx.snapshots[k].a;
  await page.evaluate((s) => window.__demo.setState(s), fx.snapshots[k]);
  await expect.poll(async () => (await state(page)).a).toBe(a);
  const { worst, count } = await worstEdgeError(page, a);
  expect(count).toBe(32);
  expect(worst).toBeLessThan(1e-12);
  await expect(page.getByTestId('value-a')).toHaveValue(text);
  const { edges } = await view(page);
  expect(bluish(await page.evaluate((q) => window.__demo.pixelAt(q), edges[0][0]))).toBe(true);
  await reviewShot(page, testInfo, `tesseract-perspective-snapshot-${k}`);
}

test.describe('tesseract-perspective', () => {
  test('loads without errors and draws the opening picture: two nested cubes joined at the corners, a = 0', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    const canvas = page.getByTestId('scene-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(Math.round(box.width)).toBe(440); // ImageSize -> 1.1 {400, 400}
    expect(Math.round(box.height)).toBe(440);
    const g = await page.getByTestId('graphic').boundingBox();
    expect(g.width).toBeLessThan(446); // the white box fits the image
    expect(await page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.08);
    expect(await state(page)).toEqual(fx.states[0]);
    const { worst, count } = await worstEdgeError(page, 0);
    expect(count).toBe(32);
    expect(worst).toBeLessThan(1e-12);
    // the tubes are drawn blue at the corners of both cubes; 32 open cylinders and 64 round caps
    for (const p of [[0.5, 0.5, 0.5], [-0.5, -0.5, -0.5], [0.25, -0.25, 0.25]]) expect(bluish(await page.evaluate((q) => window.__demo.pixelAt(q), p))).toBe(true);
    expect(await page.evaluate(() => window.__demo.meshCount())).toBe(96);
    // the controls on top of the picture (ControlPlacement Top, Mathematica's default)
    const c = await page.getByTestId('slider-a').boundingBox();
    expect(c.y + c.height).toBeLessThan(box.y);
    await reviewShot(page, testInfo, 'tesseract-perspective-opening');
  });

  test('has the slider rotate of the original: 0 to 2·3.1416 in steps of 0.0001, value field showing 0', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.locator('#controls')).toContainText('rotate');
    await expect(page.getByTestId('value-a')).toHaveValue('0');
    const slider = page.getByTestId('slider-a');
    // the slider runs on the grid index (62832 steps of 0.0001)
    await slider.focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).a).toBeCloseTo(MAX, 9);
    await expect(page.getByTestId('value-a')).toHaveValue('6.2832');
    await page.keyboard.press('Home');
    await expect.poll(async () => (await state(page)).a).toBe(0);
  });

  test('an arrow key moves a by one step of 0.0001 and turns the tesseract', async ({ page }) => {
    await openDemo(page, URL);
    const before = (await view(page)).edges;
    await page.getByTestId('slider-a').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).a).toBeCloseTo(0.0001, 12);
    const after = (await view(page)).edges;
    expect(after).not.toEqual(before);
    expect((await worstEdgeError(page, 0.0001)).worst).toBeLessThan(1e-12);
  });

  test('dragging the slider with the mouse sets a from the pointer position', async ({ page }) => {
    await openDemo(page, URL);
    const s = await page.getByTestId('slider-a').boundingBox();
    await page.mouse.move(s.x + 8, s.y + s.height / 2);
    await page.mouse.down();
    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => Math.abs((await state(page)).a - MAX / 2)).toBeLessThan(0.2);
    const a = (await state(page)).a;
    expect(Math.abs(a * 1e4 - Math.round(a * 1e4))).toBeLessThan(1e-6); // on the 0.0001 grid
    expect((await worstEdgeError(page, a)).worst).toBeLessThan(1e-12);
  });

  test('a value typed into the field is used: a = 1.5', async ({ page }) => {
    await openDemo(page, URL);
    const field = page.getByTestId('value-a');
    await field.fill('1.5');
    await field.press('Enter');
    await expect.poll(async () => (await state(page)).a).toBeCloseTo(1.5, 12);
    expect((await worstEdgeError(page, 1.5)).worst).toBeLessThan(1e-12);
  });

  test('the ⊕ panel: a step forward and play on the fixed page clock move a', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('plus-a').click();
    await page.getByTestId('stepfwd-a').click();
    await expect.poll(async () => (await state(page)).a).toBeCloseTo(0.0001, 12);
    await page.getByTestId('stepback-a').click();
    await expect.poll(async () => (await state(page)).a).toBe(0);
    await page.evaluate(() => window.__demo.setClock(5000));
    await page.getByTestId('play-a').click();
    // two animation frames at the fixed time (the first frame records the start time): nothing moves
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect((await state(page)).a).toBe(0);
    await page.evaluate(() => window.__demo.setClock(5001));
    await expect.poll(async () => (await state(page)).a).toBeGreaterThan(0.001);
    await page.getByTestId('play-a').click(); // pause
    const a1 = (await state(page)).a;
    await page.evaluate(() => window.__demo.setClock(5003));
    await page.waitForTimeout(100);
    expect((await state(page)).a).toBe(a1);
    expect((await worstEdgeError(page, a1)).worst).toBeLessThan(1e-12);
  });

  test('dragging the picture turns the 3D view and leaves a unchanged', async ({ page }) => {
    await openDemo(page, URL);
    const cam0 = await page.evaluate(() => window.__demo.camera());
    const b = await page.getByTestId('scene-canvas').boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 80, b.y + b.height / 2 + 20, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => {
      const cam = await page.evaluate(() => window.__demo.camera());
      return Math.hypot(...cam.position.map((x, k) => x - cam0.position[k]));
    }).toBeGreaterThan(0.1);
    expect((await state(page)).a).toBe(0);
  });

  test('Initial settings restores the opening state a = 0', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ a: 2.5 }));
    await expect(page.getByTestId('value-a')).not.toHaveValue('0');
    await page.getByTestId('reset').click();
    await expect.poll(() => state(page)).toEqual(opening);
    await expect(page.getByTestId('value-a')).toHaveValue('0');
    expect((await worstEdgeError(page, 0)).worst).toBeLessThan(1e-12);
  });

  // one test per snapshot (the titles are written out: the design document refers to them)
  test('snapshot 1: the saved setting gives the hand-projected tesseract and the value text of the snapshot', async ({ page }, testInfo) => {
    await checkSnapshot(page, testInfo, '1', '0');
  });
  test('snapshot 2: the saved setting gives the hand-projected tesseract and the value text of the snapshot', async ({ page }, testInfo) => {
    await checkSnapshot(page, testInfo, '2', '3.88301');
  });
  test('snapshot 3: the saved setting gives the hand-projected tesseract and the value text of the snapshot', async ({ page }, testInfo) => {
    await checkSnapshot(page, testInfo, '3', '0.992743');
  });
  test('snapshot 4: the saved setting gives the hand-projected tesseract and the value text of the snapshot', async ({ page }, testInfo) => {
    await checkSnapshot(page, testInfo, '4', '4.1846');
  });
});
