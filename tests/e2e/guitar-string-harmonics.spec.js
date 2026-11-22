// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Connor Davenport and Edmon Perkins
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/guitar-string-harmonics.spec.js — browser tests of the "Guitar String Harmonics: Standing Waves" page
// (attribution, start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). Review screenshots at
// the snapshot settings (compare: docs/original-snapshots/guitar-string-harmonics-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/guitar-string-harmonics/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const plain = (v) => JSON.parse(JSON.stringify(v), (k, x) => (x && typeof x === 'object' && !Array.isArray(x) && typeof x.wl === 'string' && 'n' in x ? x.n : x));
const fx = plain(JSON.parse(fs.readFileSync('tests/golden/guitar-string-harmonics.original-states.json', 'utf8')));
const L = 25.5;
const YELLOW = [217, 217, 0], ORANGE = [255, 128, 0], BLACK = [0, 0, 0], GRAY = [128, 128, 128];

/** The colours of the drawn picture at world points (a screenshot of the SVG, read back through a canvas). */
async function coloursAt(page, pts) {
  const svg = page.getByTestId('scene-svg');
  const box = await svg.boundingBox();
  const png = (await svg.screenshot()).toString('base64');
  return page.evaluate(async ({ png, pts, box }) => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const sx = img.width / box.width, sy = img.height / box.height;
    return pts.map((p) => {
      const q = window.__demo.worldToClient(p);
      const d = g.getImageData(Math.floor((q.x - box.x) * sx), Math.floor((q.y - box.y) * sy), 1, 1).data;
      return [d[0], d[1], d[2]];
    });
  }, { png, pts, box });
}
const expectColour = (got, want, what) => got.forEach((v, i) => expect(Math.abs(v - want[i]), `${what}: ${got} vs ${want}`).toBeLessThanOrEqual(2));
/** The wave's horizontal displacements as drawn (the polyline's points with 0 ≤ height ≤ L). */
const drawnWave = (page) => page.getByTestId('wave').evaluate((el) => el.getAttribute('points').trim().split(/\s+/)
  .map((p) => p.split(',').map(Number)).filter(([, y]) => y <= 25.5));

test.describe('guitar-string-harmonics', () => {
  test('loads without errors and draws the picture beside the text column', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['fretboard', 'nut', 'bridge', 'fret-1', 'fret-12', 'sound-hole', 'string-1', 'string-5', 'string-end-0', 'wave', 'forced-node']) {
      await expect(page.getByTestId(id), id).toHaveCount(1);
    }
    const svg = await page.getByTestId('scene-svg').boundingBox();
    expect(Math.abs(svg.width - 157)).toBeLessThan(2); // PlotRange 8 × 25.5 fitted into ImageSize {263, 500}
    expect(Math.abs(svg.height - 500)).toBeLessThan(2);
    const text = await page.getByTestId('text-panel').boundingBox();
    expect(text.x).toBeGreaterThan(svg.x + svg.width); // Row[{picture, text}]
  });

  test('has its controls with their defaults (the live state n = 1, t = 0.27)', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toEqual({ n: 1, t: 0.27 });
    const popup = page.getByTestId('popup-n');
    await expect(popup.locator('option')).toHaveText(['1st', '2nd', '3rd', '4th', '5th']);
    expect(await popup.evaluate((s) => s.selectedOptions[0].textContent)).toBe('1st');
    await expect(page.getByTestId('ctl-n')).toContainText('harmonic');
    await expect(page.getByTestId('ctl-t')).toContainText('time');
    await expect(page.getByTestId('trigger-play-t')).toBeVisible();
    await expect(page.getByTestId('trigger-reset-t')).toBeVisible();
    // the opening picture: the string is almost straight (cos(2π · 0.27 · 82.4) = 0.0077), the node on the bridge
    const wave = await drawnWave(page);
    expect(wave).toHaveLength(26);
    expect(Math.max(...wave.map(([d]) => Math.abs(d)))).toBeLessThan(0.005);
    const node = page.getByTestId('forced-node');
    expect(Number(await node.getAttribute('cx'))).toBe(0);
    expect(Number(await node.getAttribute('cy'))).toBe(0);
  });

  test('the harmonic popup changes the wave and the forced node', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('trigger-reset-t').click(); // t = 0: full amplitude
    await expect.poll(async () => (await state(page)).t).toBe(0);
    for (const [label, n] of [['3rd', 3], ['5th', 5], ['2nd', 2], ['4th', 4], ['1st', 1]]) {
      await page.getByTestId('popup-n').selectOption({ label });
      await expect.poll(async () => (await state(page)).n).toBe(n);
      const v = await view(page);
      expect(v.node[1]).toBeCloseTo(L - L / n, 12);
      expect(v.points).toBe(51 * n + 1);
      await expect.poll(async () => Number(await page.getByTestId('forced-node').getAttribute('cy'))).toBeCloseTo(L - L / n, 9);
      // the drawn wave: 0.5 sin(n π y / L) at the integer heights y (n half waves: the /. n -> 1 rules change nothing)
      for (const [d, y] of await drawnWave(page)) expect(d).toBeCloseTo(0.5 * Math.sin((n * Math.PI * y) / L), 9);
    }
  });

  test('the time Trigger plays at 0.05 per second in steps of 0.01, stops at 1 and resets to 0', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setClock(0));
    await page.getByTestId('trigger-play-t').click();
    // let the animation's first frame run before the clock moves (it records the start time)
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate(() => window.__demo.setClock(2.1)); // 0.27 + 0.05 · 2.1 = 0.375 → 0.37
    await expect.poll(async () => (await state(page)).t, { timeout: 5000 }).toBeCloseTo(0.37, 9);
    const v = await view(page);
    expect(v.timeFactor).toBeCloseTo(Math.cos(2 * Math.PI * 0.37 * 82.40288602348828), 6); // the picture follows t
    await page.evaluate(() => window.__demo.setClock(40)); // past the end: t stops at 1
    await expect.poll(async () => (await state(page)).t, { timeout: 5000 }).toBe(1);
    await expect(page.getByTestId('trigger-play-t')).toHaveText('▶');
    await page.getByTestId('trigger-reset-t').click();
    await expect.poll(async () => (await state(page)).t).toBe(0);
    expect((await view(page)).timeFactor).toBe(1);
    const wave = await drawnWave(page); // n = 1 at t = 0: one half wave of amplitude 0.5
    expect(Math.max(...wave.map(([d]) => d))).toBeCloseTo(0.5 * Math.sin((13 * Math.PI) / L), 9);
    await page.evaluate(() => window.__demo.setClock(null));
  });

  test('Initial settings restores n = 1, t = 0', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('popup-n').selectOption({ label: '4th' });
    await expect.poll(async () => (await state(page)).n).toBe(4);
    await page.getByTestId('reset').click();
    await expect.poll(async () => state(page)).toEqual({ n: 1, t: 0 });
    expect(await page.getByTestId('popup-n').evaluate((s) => s.selectedOptions[0].textContent)).toBe('1st');
    expect((await view(page)).node).toEqual([0, 0]);
  });

  test('the text column: equations, forced nodes and harmonic frequencies', async ({ page }) => {
    await openDemo(page, URL);
    const panel = page.getByTestId('text-panel');
    for (const h of ['standing wave equation', 'wavelength equation', 'frequency equation', 'forced nodes', 'harmonic frequencies']) await expect(panel).toContainText(h);
    await expect(page.getByTestId('eq-wave')).toHaveText(/y = 2 A sin\(\s*2 π x\s*λ\s*\) cos\(ω t\)/);
    await expect(page.getByTestId('eq-wavelength')).toHaveText(/λ = \s*2 L\s*n/);
    await expect(page.getByTestId('eq-frequency')).toHaveText(/ω = \s*n π\s*L\s*√\s*T\s*ρ/);
    const rows = (id) => page.getByTestId(id).locator('tr').evaluateAll((trs) => trs.map((tr) => [...tr.cells].map((c) => c.textContent)));
    expect(await rows('forced-nodes')).toEqual([['2nd harmonic', '12th fret'], ['3rd harmonic', '7th fret'], ['4th harmonic', '5th fret'], ['5th harmonic', 'just before 4th fret']]);
    expect(await rows('harmonic-frequencies')).toEqual([
      ['1st harmonic', '82.4', 'Hz'], ['2nd harmonic', '164.8', 'Hz'], ['3rd harmonic', '247.2', 'Hz'], ['4th harmonic', '329.6', 'Hz'], ['5th harmonic', '412.0', 'Hz'],
    ]);
  });

  test('the snapshot settings: forced node, wave and colours + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      const s = fx.snapshots[k];
      await page.evaluate((st) => window.__demo.setState(st), s);
      const v = await view(page);
      expect(v.n).toBe(s.n);
      expect(v.node[1]).toBeCloseTo(L - L / s.n, 12);
      const where = [[4.5, 23.4], [2.5, 7], [4.5, 25.4], [0, L - L / s.n]];
      const want = [YELLOW, BLACK, ORANGE, BLACK];
      if (s.n === 3) { where.push([0.5 * Math.sin((3 * Math.PI * 4) / L), 4]); want.push(GRAY); } // the wave near its first crest
      const got = await coloursAt(page, where);
      got.forEach((c, i) => expectColour(c, want[i], `snapshot ${k} at ${where[i]}`));
      await reviewShot(page, testInfo, `guitar-string-harmonics-snapshot-${k}`);
    }
  });
});
