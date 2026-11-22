// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alain Goriely
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/rectangular-membrane.spec.js — browser tests of the "Vibrations of a Rectangular Membrane" page
// (attribution, the generic start-up notices, UI inventory and bundle are in site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/rectangular-membrane/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const camera = (page) => page.evaluate(() => window.__demo.camera());
const pixel = (page, p) => page.evaluate((q) => window.__demo.pixelAt(q), p);
const saved = JSON.parse(fs.readFileSync('tests/golden/rectangular-membrane.original-states.json', 'utf8'));
const NAMES = { $9: 'B11', $10: 'B21', $11: 'B12', $12: 'B22' };
const snapshot = (k) => Object.fromEntries(Object.entries(saved.snapshots[k]).map(([n, v]) => [NAMES[n] ?? n, v]));
const u = ({ a, b, B11, B21, B12, B22 }, x, y) => { // the membrane at t = 0
  const s = (m, n) => Math.sin((m * Math.PI * x) / a) * Math.sin((n * Math.PI * y) / b);
  return B11 * s(1, 1) + B21 * s(2, 1) + B12 * s(1, 2) + B22 * s(2, 2);
};
/** the box's eight corners are inside the canvas */
async function boxInsideCanvas(page) {
  const { box } = await view(page);
  const r = await page.getByTestId('scene-canvas').boundingBox();
  for (const x of box[0]) for (const y of box[1]) for (const z of box[2]) {
    const p = await page.evaluate((q) => window.__demo.sceneToClient(q), [x, y, z]);
    expect(p.x).toBeGreaterThan(r.x); expect(p.x).toBeLessThan(r.x + r.width);
    expect(p.y).toBeGreaterThan(r.y); expect(p.y).toBeLessThan(r.y + r.height);
  }
}
const dir = (c) => { const d = c.position.map((v, i) => v - c.target[i]); const n = Math.hypot(...d); return d.map((v) => v / n); };

test.describe('rectangular-membrane', () => {
  test('loads without errors and draws the membrane: red at rest and at the top, cyan half-way up', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas')).toBeVisible();
    expect(await page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.1);
    // the canvas is ImageSize {390, 350}
    const r = await page.getByTestId('scene-canvas').boundingBox();
    expect(Math.round(r.width)).toBe(390); expect(Math.round(r.height)).toBe(350);
    const s = await state(page);
    const top = await pixel(page, [2.125, 2.125, u(s, 2.125, 2.125)]); // Hue[0.98]: red
    expect(top[0]).toBeGreaterThan(top[1] + 60); expect(top[0]).toBeGreaterThan(top[2] + 60);
    const edge = await pixel(page, [2.125, 0.1, u(s, 2.125, 0.1)]); // near the boundary: Hue[0.08], red-orange
    expect(edge[0]).toBeGreaterThan(200); expect(edge[2]).toBeLessThan(40);
    const half = await pixel(page, [1.125, 0.8953, u(s, 1.125, 0.8953)]); // z = S/2: Hue[1/2], cyan
    expect(half[1]).toBeGreaterThan(half[0] + 60); expect(half[2]).toBeGreaterThan(half[0] + 60);
    await boxInsideCanvas(page);
  });

  test('has the original\'s controls with their labels, defaults and ranges, in the original\'s order', async ({ page }) => {
    await openDemo(page, URL);
    const controls = [
      ['a', 'length', '4', 1, 10], ['b', 'width', '4', 1, 10],
      ['B11', 'm=1, n=1', '0.5', -2, 2], ['B21', 'm=2, n=1', '0', -2, 2], ['B12', 'm=1, n=2', '0', -2, 2], ['B22', 'm=2, n=2', '0', -2, 2],
      ['t', 'time', '0', 0, 10], ['c', 'wave speed', '1', 0, 2], ['zrange', 'reduce box height', '0', 0, 2],
    ];
    const order = await page.locator('#controls [data-testid^=ctl-]').evaluateAll((els) => els.map((e) => e.dataset.testid));
    expect(order).toEqual(controls.map(([n]) => `ctl-${n}`));
    await expect(page.locator('#controls')).toContainText('mode');
    for (const [n, label, value, lo, hi] of controls) {
      await expect(page.getByTestId(`ctl-${n}`)).toContainText(label);
      await expect(page.getByTestId(`value-${n}`)).toHaveValue(value);
      await page.getByTestId(`slider-${n}`).focus();
      await page.keyboard.press('End');
      await expect.poll(async () => (await state(page))[n]).toBeCloseTo(hi, 9);
      await page.keyboard.press('Home');
      await expect.poll(async () => (await state(page))[n]).toBeCloseTo(lo, 9);
    }
    // the controls are on the left of the picture (ControlPlacement -> Left)
    const c = await page.locator('#controls').boundingBox(), g = await page.getByTestId('scene-canvas').boundingBox();
    expect(c.x + c.width).toBeLessThanOrEqual(g.x + 1);
  });

  test('a keyboard step of m=1, n=1 raises the membrane and its box', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-B11').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).B11).toBeCloseTo(0.51, 12);
    const v = await view(page);
    expect(v.center).toBeCloseTo(0.51, 12);
    expect(v.box[2][1]).toBeCloseTo(0.51, 12);
  });

  test('dragging the length slider with the mouse makes the membrane longer and fits the new box to the image', async ({ page }) => {
    await openDemo(page, URL);
    const before = await camera(page);
    const r = await page.getByTestId('slider-a').boundingBox();
    await page.mouse.move(r.x + r.width * ((4 - 1) / 9), r.y + r.height / 2);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width * 0.6, r.y + r.height / 2, { steps: 5 });
    await page.mouse.move(r.x + r.width * 0.85, r.y + r.height / 2, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).a).toBeGreaterThan(7);
    const s = await state(page), v = await view(page);
    expect(v.box[0]).toEqual([0, s.a]);
    expect((await camera(page)).target[0]).toBeCloseTo(s.a / 2, 9);
    expect(dir(await camera(page))).toEqual(dir(before).map((x) => expect.closeTo(x, 9)));
    await boxInsideCanvas(page);
  });

  test('a typed time inverts the (1,1) mode after 2√2 (wave speed 1, a 4 × 4 membrane)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('value-t').fill('2.83');
    await page.getByTestId('value-t').press('Enter');
    await expect.poll(async () => (await state(page)).t).toBeCloseTo(2.83, 12);
    const expected = 0.5 * Math.cos(Math.sqrt(1 / 16 + 1 / 16) * Math.PI * 2.83);
    await expect.poll(async () => (await view(page)).center).toBeCloseTo(expected, 9);
    expect(expected).toBeLessThan(-0.49);
    // the trough is coloured as the original's Hue[z/S] gives it: Hue[-0.99] = Hue[0.01], red
    const p = await pixel(page, [2.125, 2.125, expected * Math.sin((Math.PI * 2.125) / 4) ** 2]);
    expect(p[0]).toBeGreaterThan(p[1] + 60); expect(p[0]).toBeGreaterThan(p[2] + 60);
  });

  test('reduce box height: up to S the box gets flatter; at S it is flat; beyond S the range turns round and is used sorted', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-zrange').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await view(page)).box[2][1]).toBeCloseTo(0.4, 12);
    for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).zrange).toBeCloseTo(0.5, 12);
    let v = await view(page);
    expect(v.box[2][0]).toBeCloseTo(0, 12); expect(v.box[2][1]).toBeCloseTo(0, 12);
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).zrange).toBe(2);
    v = await view(page);
    expect(v.zRange).toEqual([1.5, -1.5]);
    expect(v.box[2]).toEqual([-1.5, 1.5]);
    await boxInsideCanvas(page);
  });

  test('all four amplitudes 0: the page keeps working and draws a white membrane in a flat box', async ({ page }) => {
    const problems = await openDemo(page, URL);
    await page.getByTestId('value-B11').fill('0');
    await page.getByTestId('value-B11').press('Enter');
    await expect.poll(async () => (await view(page)).S).toBe(0);
    const v = await view(page);
    expect(v.box[2]).toEqual([0, 0]);
    expect(v.uncolored).toBe(v.vertices);
    const p = await pixel(page, [2.125, 2.125, 0]);
    expect(Math.min(...p)).toBeGreaterThan(150); // grey-white, no hue
    expect(Math.max(...p) - Math.min(...p)).toBeLessThanOrEqual(2);
    expect(problems).toEqual([]);
  });

  test('rotating the picture with the mouse keeps the view when a slider moves', async ({ page }) => {
    await openDemo(page, URL);
    const before = dir(await camera(page));
    const r = await page.getByTestId('scene-canvas').boundingBox();
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width / 2 + 80, r.y + r.height / 2 + 10, { steps: 6 });
    await page.mouse.up();
    const rotated = dir(await camera(page));
    expect(Math.hypot(...rotated.map((x, i) => x - before[i]))).toBeGreaterThan(0.1);
    await page.getByTestId('slider-B21').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).B21).toBeCloseTo(0.01, 12);
    expect(dir(await camera(page))).toEqual(rotated.map((x) => expect.closeTo(x, 9)));
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate((s) => window.__demo.setState(s), snapshot('4'));
    await expect.poll(async () => (await state(page)).a).toBe(7.48);
    await page.getByTestId('reset').click();
    await expect.poll(async () => state(page)).toEqual(opening);
    expect((await view(page)).box).toEqual([[0, 4], [0, 4], [-0.5, 0.5]]);
    await expect(page.getByTestId('value-B11')).toHaveValue('0.5');
  });

  test('start-up notice without WebGL 2, instead of an empty page', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return type === 'webgl2' ? null : orig.call(this, type, ...rest); };
    });
    await page.goto(URL);
    await expect(page.getByTestId('requirements-notice')).toContainText('WebGL 2');
  });

  for (const k of ['1', '2', '3', '4']) {
    test(`snapshot ${k}: the original's settings give its box, ticks and colours`, async ({ page }, testInfo) => {
      await openDemo(page, URL);
      const st = snapshot(k);
      await page.evaluate((s) => window.__demo.setState(s), st);
      await expect.poll(async () => (await state(page)).a).toBe(st.a);
      const S = Math.abs(st.B11) + Math.abs(st.B21) + Math.abs(st.B12) + Math.abs(st.B22);
      const v = await view(page);
      expect(v.S).toBeCloseTo(S, 12);
      expect(v.box[2][0]).toBeCloseTo(-S + st.zrange, 12);
      const labels = await page.locator('.lbl.ra-tick').allTextContents();
      const z = { 1: ['-0.5', '0.0', '0.5'], 2: ['-2', '-1', '0', '1', '2'], 3: ['-0.5', '0.0', '0.5'], 4: ['-2', '-1', '0', '1', '2'] }[k];
      for (const l of z) expect(labels).toContain(l);
      await boxInsideCanvas(page);
      // a point at rest height near the boundary is red (Hue[0]) in every snapshot
      const p = await pixel(page, [st.a / 2 + 0.07, 0.04, u(st, st.a / 2 + 0.07, 0.04)]);
      expect(p[0]).toBeGreaterThan(p[1] + 60); expect(p[0]).toBeGreaterThan(p[2] + 60);
      await reviewShot(page, testInfo, `rectangular-membrane-snapshot-${k}`);
    });
  }
});
