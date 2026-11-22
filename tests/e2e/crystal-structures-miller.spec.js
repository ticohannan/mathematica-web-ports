// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Yunfeng Shi and Adam Bross
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/crystal-structures-miller.spec.js — browser tests of the "Simple Crystal Structures and Miller Indices" page
// (attribution, the generic start-up notices, UI inventory and bundle are in site.spec.js and bundle.spec.js; the errors
// switch in errata-mode.spec.js)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/crystal-structures-miller/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const camera = (page) => page.evaluate(() => window.__demo.camera());
const ink = (page) => page.evaluate(() => window.__demo.inkFraction());
/** the text of a popup's selected option (the option values are indices) */
const shown = (page, v) => page.getByTestId(`popup-${v}`).evaluate((e) => e.selectedOptions[0].textContent);
const pixel = (page, p) => page.evaluate((q) => window.__demo.pixelAt(q), p);
const saved = JSON.parse(fs.readFileSync('tests/golden/crystal-structures-miller.original-states.json', 'utf8'));
const dir = (c) => { const d = c.position.map((v, i) => v - c.target[i]); const n = Math.hypot(...d); return d.map((v) => v / n); };
/** the plot range box's eight corners are inside the canvas */
async function boxInsideCanvas(page) {
  const { plotRange: box } = await view(page);
  const r = await page.getByTestId('scene-canvas').boundingBox();
  for (const x of box[0]) for (const y of box[1]) for (const z of box[2]) {
    const p = await page.evaluate((q) => window.__demo.sceneToClient(q), [x, y, z]);
    expect(p.x).toBeGreaterThan(r.x); expect(p.x).toBeLessThan(r.x + r.width);
    expect(p.y).toBeGreaterThan(r.y); expect(p.y).toBeLessThan(r.y + r.height);
  }
}

test.describe('crystal-structures-miller', () => {
  test('loads without errors and draws the opening picture: eight small spheres of the simple cubic crystal in the box', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas')).toBeVisible();
    const r = await page.getByTestId('scene-canvas').boundingBox();
    expect(Math.round(r.width)).toBe(400); expect(Math.round(r.height)).toBe(400);
    expect(await view(page)).toMatchObject({ atoms: 8, cell: null, planes: null, plotRange: [[-1, 2], [-1, 2], [-1, 2]] });
    const a = await ink(page);
    expect(a).toBeGreaterThan(0.005);
    expect(a).toBeLessThan(0.2);
    // between the spheres: white
    const bg = await pixel(page, [0.5, 0.5, 0.5]);
    for (const c of bg.slice(0, 3)) expect(c).toBeGreaterThanOrEqual(253);
    await boxInsideCanvas(page);
  });

  test('has the original\'s controls with their labels and defaults, in the original\'s order', async ({ page }) => {
    await openDemo(page, URL);
    const order = await page.locator('#controls [data-testid^=ctl-]').evaluateAll((els) => els.map((e) => e.dataset.testid));
    expect(order).toEqual(['ctl-CrystalType', 'ctl-rp', 'ctl-radius', 'ctl-radius2', 'ctl-sx', 'ctl-sy', 'ctl-sz', 'ctl-DrawCell', 'ctl-DrawCubeFace', 'ctl-DrawPlanes', 'ctl-m', 'ctl-n', 'ctl-r']);
    const texts = await page.locator('#controls').innerText();
    for (const t of ['crystal structure', 'repeats', 'radius (red)', 'radius (blue)', 'cell shifts', 'unit cell', 'unit cell face', 'Miller planes', 'Miller h', 'Miller k', 'Miller l']) expect(texts).toContain(t);
    expect(await shown(page, 'CrystalType')).toBe('SC');
    expect(await page.getByTestId('popup-CrystalType').locator('option').allTextContents()).toEqual(['SC', 'BCC', 'FCC', 'HCP', 'CsCl', 'Diamond', 'NaCl', 'ZnS']);
    for (const [v, val, min, max] of [['rp', '1', '0', '5'], ['radius', '0.1', '0.1', '1'], ['radius2', '0.1', '0.1', '1'], ['sx', '0', '0', '0'], ['sy', '0', '0', '0'], ['sz', '0', '0', '0']]) {
      await expect(page.getByTestId(`value-${v}`)).toHaveValue(val);
      await expect(page.getByTestId(`slider-${v}`)).toHaveAttribute('min', min);
      await expect(page.getByTestId(`slider-${v}`)).toHaveAttribute('max', max);
    }
    for (const v of ['DrawCell', 'DrawCubeFace', 'DrawPlanes']) await expect(page.getByTestId(`check-${v}`)).not.toBeChecked();
    await expect(page.getByTestId('check-DrawCubeFace')).toBeDisabled();
    for (const v of ['m', 'n', 'r']) {
      expect(await shown(page, v)).toBe('1');
      await expect(page.getByTestId(`popup-${v}`)).toBeDisabled();
      expect(await page.getByTestId(`popup-${v}`).locator('option').allTextContents()).toEqual(['-4', '-3', '-2', '-1', '0', '1', '2', '3', '4']);
    }
  });

  test('the crystal structure popup chosen with the keyboard draws the body-centred cubic crystal', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('popup-CrystalType').focus();
    await page.keyboard.press('ArrowDown'); // SC → BCC
    await expect.poll(async () => (await state(page)).CrystalType).toBe('BCC');
    expect((await view(page)).atoms).toBe(16);
    await page.getByTestId('popup-CrystalType').selectOption({ label: 'Diamond' });
    await expect.poll(async () => (await view(page)).atoms).toBe(64);
  });

  test('a keyboard step of repeats builds 3 × 3 × 3 cells and widens the cell-shift ranges', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-rp').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).rp).toBe(2);
    expect(await view(page)).toMatchObject({ atoms: 27, plotRange: [[-1, 3], [-1, 3], [-1, 3]] });
    for (const v of ['sx', 'sy', 'sz']) await expect(page.getByTestId(`slider-${v}`)).toHaveAttribute('max', '1');
    await boxInsideCanvas(page);
  });

  test('dragging the red radius slider with the mouse makes the spheres larger', async ({ page }) => {
    await openDemo(page, URL);
    const before = await ink(page);
    const r = await page.getByTestId('slider-radius').boundingBox();
    await page.mouse.move(r.x + 4, r.y + r.height / 2);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width * 0.3, r.y + r.height / 2, { steps: 5 });
    await page.mouse.move(r.x + r.width * 0.45, r.y + r.height / 2, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).radius).toBeGreaterThan(0.3);
    expect(await ink(page)).toBeGreaterThan(before * 3);
  });

  test('a typed blue radius changes the NaCl blue spheres only', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('popup-CrystalType').selectOption({ label: 'NaCl' });
    await page.getByTestId('value-radius2').fill('0.25');
    await page.getByTestId('value-radius2').press('Enter');
    await expect.poll(async () => (await view(page)).groups.map((g) => g.radius)).toEqual([0.1, 0.1, 0.1, 0.1, 0.25, 0.25, 0.25, 0.25]);
  });

  test('unit cell and unit cell face checkboxes clicked with the mouse draw the cell with a blue face', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('check-DrawCell').click();
    await expect.poll(async () => (await view(page)).cell).toEqual({ corners: [[0, 0, 0], [1, 1, 1]], face: false });
    await expect(page.getByTestId('check-DrawCubeFace')).toBeEnabled();
    // the front edge x from 0 to 1 at y = 0, z = 0: thick black
    const edge = await pixel(page, [0.5, 0, 0]);
    expect(Math.max(...edge.slice(0, 3))).toBeLessThan(120);
    await page.getByTestId('check-DrawCubeFace').click();
    await expect.poll(async () => (await view(page)).cell.face).toBe(true);
    const face = await pixel(page, [0.5, 0, 0.5]); // Lighter[Blue], lit
    expect(face[2]).toBeGreaterThan(face[0] + 60);
    expect(face[2]).toBeGreaterThan(face[1] + 60);
    // a cell shift moves the cell by one along x
    await page.getByTestId('slider-rp').focus();
    await page.keyboard.press('ArrowRight');
    await page.getByTestId('slider-sx').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await view(page)).cell.corners).toEqual([[1, 0, 0], [2, 1, 1]]);
    // the face checkbox follows unit cell (Enabled -> DrawCell)
    await page.getByTestId('check-DrawCell').click();
    await expect(page.getByTestId('check-DrawCubeFace')).toBeDisabled();
  });

  test('Miller planes: the (1 1 1) family as Plot3D squashes the box to {1, 1, 0.4}; (1 1 0) and (0 0 0) as ParametricPlot3D', async ({ page }) => {
    await openDemo(page, URL);
    const cube = await camera(page);
    await page.getByTestId('check-DrawPlanes').click();
    await expect.poll(async () => (await view(page)).planes).toEqual({ kind: 'Plot3D', ds: [-3, -2, -1, 0, 1, 2, 3] });
    expect((await view(page)).boxRatios).toEqual([1, 1, 0.4]);
    for (const v of ['m', 'n', 'r']) await expect(page.getByTestId(`popup-${v}`)).toBeEnabled();
    // the plane x + y + z = 1 through (1/3, 1/3, 1/3) is drawn in the default surface colour (not white, not the background)
    const onPlane = await pixel(page, [1.6, 0.2, -0.8]);
    expect(Math.min(...onPlane.slice(0, 3))).toBeLessThan(245);
    // the camera was fitted again to the flatter box, from the same direction
    const flat = await camera(page);
    expect(dir(flat)[0]).toBeCloseTo(dir(cube)[0], 6);
    await page.getByTestId('popup-r').selectOption({ label: '0' });
    await expect.poll(async () => (await view(page)).planes.kind).toBe('y');
    expect((await view(page)).boxRatios).toEqual([1, 1, 1]);
    await page.getByTestId('popup-m').selectOption({ label: '0' });
    await page.getByTestId('popup-n').selectOption({ label: '0' });
    await expect.poll(async () => (await view(page)).planes.kind).toBe('x000');
    await page.getByTestId('popup-m').selectOption({ label: '-2' });
    await expect.poll(async () => (await view(page)).planes.kind).toBe('x');
    await page.getByTestId('check-DrawPlanes').click();
    await expect.poll(async () => (await view(page)).planes).toBeNull();
    await expect(page.getByTestId('popup-m')).toBeDisabled();
  });

  test('rotating the picture with the mouse keeps the view when a control changes', async ({ page }) => {
    await openDemo(page, URL);
    const c0 = await camera(page);
    const r = await page.getByTestId('scene-canvas').boundingBox();
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width / 2 + 80, r.y + r.height / 2 + 10, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => Math.abs(dir(await camera(page))[0] - dir(c0)[0])).toBeGreaterThan(0.05);
    const c1 = await camera(page);
    await page.getByTestId('slider-rp').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).rp).toBe(2);
    const c2 = await camera(page);
    for (let k = 0; k < 3; k++) expect(dir(c2)[k]).toBeCloseTo(dir(c1)[k], 6);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    const a = await ink(page);
    await page.getByTestId('popup-CrystalType').selectOption({ label: 'FCC' });
    await page.getByTestId('check-DrawCell').click();
    await page.getByTestId('check-DrawPlanes').click();
    await page.getByTestId('popup-m').selectOption({ label: '3' });
    await page.getByTestId('slider-rp').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).rp).toBe(2);
    await page.getByTestId('reset').click();
    await expect.poll(async () => state(page)).toEqual(opening);
    expect(await view(page)).toMatchObject({ atoms: 8, cell: null, planes: null });
    await expect(page.getByTestId('popup-m')).toBeDisabled();
    expect(Math.abs((await ink(page)) - a)).toBeLessThan(0.002);
  });

  for (const k of ['1', '2', '3', '4']) {
    test(`at snapshot ${k}'s settings the picture shows the snapshot's crystal`, async ({ page }, testInfo) => {
      await openDemo(page, URL);
      await page.evaluate((s) => window.__demo.setState(s), saved.snapshots[k]);
      const s = saved.snapshots[k];
      const v = await view(page);
      expect(v.atoms).toBe({ 1: 8, 2: 27, 3: 54, 4: 216 }[k]);
      expect(v.cell === null).toBe(!s.DrawCell);
      await boxInsideCanvas(page);
      if (k === '2') { // the blue face of the cell between the corner spheres
        const face = await pixel(page, [0.5, 0, 0.5]);
        expect(face[2]).toBeGreaterThan(face[0] + 60);
      }
      if (k === '3') { // the cell's front bottom edge, black, between the spheres
        const edge = await pixel(page, [0.5, 0, 0]);
        expect(Math.max(...edge.slice(0, 3))).toBeLessThan(120);
      }
      if (k === '4') { // the front red corner atom and a blue neighbour
        const red = await pixel(page, [2.5, 0, 2.5]);
        expect(red[0]).toBeGreaterThan(red[1] + 80); expect(red[0]).toBeGreaterThan(red[2] + 80);
        const blue = await pixel(page, [2.5, 0, 2]);
        expect(blue[2]).toBeGreaterThan(blue[0] + 80); expect(blue[2]).toBeGreaterThan(blue[1] + 80);
      }
      await reviewShot(page, testInfo, `crystal-structures-miller-snapshot-${k}`);
    });
  }
});
