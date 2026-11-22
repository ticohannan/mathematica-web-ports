// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Gerard Balmens
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/hypercube-4d-rotation.spec.js — browser tests of the "Rotating a Hypercube in 4D" page (attribution,
// start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). Two Animators run from the start
// (W-Z and X-Y, AnimationRunning -> True); the tests fix the page clock with window.__demo.setClock and step it.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/hypercube-4d-rotation/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const pixel = (page, p) => page.evaluate((q) => window.__demo.pixelAt(q), p);
const fx = JSON.parse(fs.readFileSync('tests/golden/hypercube-4d-rotation.original-states.json', 'utf8'));
const ANGLES = ['a', 'b', 'c', 'd', 'e', 'f'];
const zero = Object.fromEntries(ANGLES.map((k) => [k, 0]));
/** open the page and fix the clock at once (the two running Animators stop moving) */
async function open(page, t = 1000) {
  const problems = await openDemo(page, URL);
  await page.evaluate((x) => window.__demo.setClock(x), t);
  await page.waitForTimeout(50);
  return problems;
}

test.describe('hypercube-4d-rotation', () => {
  test('loads without errors and draws the opening picture: the hypercube with coloured faces', async ({ page }) => {
    const problems = await open(page);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas')).toBeVisible();
    expect(await page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.1);
    // the live state of the notebook, c and d a little further on (their Animators ran until the clock was fixed)
    const s = await state(page);
    expect({ ...s, c: 0, d: 0 }).toEqual({ ...fx.states[0], c: 0, d: 0 });
    expect(s.c).toBeGreaterThanOrEqual(fx.states[0].c);
    expect(s.c).toBeLessThan(fx.states[0].c + 1.5);
    // the outer cube's front-top corner (vertex 5 of the w = -1 cube, red) is drawn in black (its edges); the centre
    // of the front face shows the colours of the faces (red over blue, no green dominance)
    const [r, g, b] = await pixel(page, [0, 0, 0]);
    expect(r + g + b).toBeLessThan(700);
  });

  test('has the controls of the original with their saved values; W-Z and X-Y play, the others are paused', async ({ page }) => {
    await open(page);
    for (const label of ['hypercube', 'full', '1 hole', '3 holes', 'faces', 'color', 'blue', 'edges only', 'opacity', 'axes',
      'stereographic projection', 'rotations 4D', 'duration', 'W‐X', 'W‐Y', 'W‐Z', 'X‐Y', 'X‐Z', 'Y‐Z', 'reset rotations']) {
      await expect(page.locator('#controls')).toContainText(label);
    }
    await expect(page.getByTestId('radio-hyp-1')).toBeChecked();
    await expect(page.getByTestId('radio-graph-1')).toBeChecked();
    await expect(page.getByTestId('value-op')).toHaveValue('0.4');
    await expect(page.getByTestId('check-axe')).not.toBeChecked();
    await expect(page.getByTestId('value-pw')).toHaveValue('1');
    await expect(page.getByTestId('value-dur')).toHaveValue('20');
    for (const k of ANGLES) {
      await expect(page.getByTestId(`animator-${k}`)).toBeVisible();
      await expect(page.getByTestId(`animator-reset-${k}`)).toBeVisible();
      await expect(page.getByTestId(`animator-direction-${k}`)).toHaveText('→');
      await expect(page.getByTestId(`animator-play-${k}`)).toHaveAttribute('aria-pressed', k === 'c' || k === 'd' ? 'true' : 'false');
    }
    // AppearanceElements -> {ProgressSlider, PlayPauseButton, DirectionButton, ResetButton}: no faster/slower buttons
    await expect(page.getByTestId('animator-faster-c')).toHaveCount(0);
    await expect(page.getByTestId('angle-a')).toHaveText('0');
  });

  test('the running Animators turn W-Z and X-Y by 2π in "duration" seconds on the page clock', async ({ page }) => {
    await open(page, 1000);
    await page.evaluate(() => window.__demo.setState({ c: 0.5, d: 1 }));
    await page.waitForTimeout(100); // frames at the fixed time: nothing moves
    expect((await state(page)).c).toBe(0.5);
    await page.evaluate(() => window.__demo.setClock(1002)); // 2 s of 20: a tenth of a turn
    await expect.poll(async () => (await state(page)).c).toBeCloseTo(0.5 + (2 * Math.PI) / 10, 9);
    expect((await state(page)).d).toBeCloseTo(1 + (2 * Math.PI) / 10, 9);
    expect((await state(page)).a).toBe(0);
    await expect(page.getByTestId('angle-c')).toHaveText(`${Math.round((0.5 + Math.PI / 5) * 180 / Math.PI)}.`);
    // duration 40 by keyboard: half the speed
    await page.getByTestId('slider-dur').focus();
    for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).dur).toBe(40);
    expect((await page.evaluate(() => window.__demo.animator('c'))).speed).toBeCloseTo((2 * Math.PI) / 40, 12);
    const c1 = (await state(page)).c;
    await page.evaluate(() => window.__demo.setClock(1006)); // 4 s of 40
    await expect.poll(async () => (await state(page)).c).toBeCloseTo(c1 + (2 * Math.PI) / 10, 9);
  });

  test('play/pause, direction and reset buttons of an Animator', async ({ page }) => {
    await open(page, 2000);
    await page.getByTestId('animator-play-a').click();
    await expect(page.getByTestId('animator-play-a')).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => window.__demo.setClock(2001)); // 1 s: 2π/20
    await expect.poll(async () => (await state(page)).a).toBeCloseTo(Math.PI / 10, 9);
    await page.getByTestId('animator-direction-a').click();
    await expect(page.getByTestId('animator-direction-a')).toHaveText('←');
    await page.evaluate(() => window.__demo.setClock(2001.5)); // half a second back
    await expect.poll(async () => (await state(page)).a).toBeCloseTo(Math.PI / 20, 9);
    await page.getByTestId('animator-play-a').click(); // pause
    await expect(page.getByTestId('animator-play-a')).toHaveAttribute('aria-pressed', 'false');
    await page.evaluate(() => window.__demo.setClock(2005));
    await page.waitForTimeout(100);
    expect((await state(page)).a).toBeCloseTo(Math.PI / 20, 9);
    await page.getByTestId('animator-reset-a').click();
    await expect.poll(async () => (await state(page)).a).toBe(0);
    await expect(page.getByTestId('angle-a')).toHaveText('0');
    // the progress slider by keyboard
    await page.getByTestId('animator-e').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).e).toBeCloseTo(2 * Math.PI, 12);
  });

  test('the hypercube and faces radio buttons change the faces drawn: colours, blue, edges only with red vertices', async ({ page }) => {
    await open(page);
    await page.evaluate((z) => window.__demo.setState(z), zero);
    await page.getByTestId('radio-hyp-2').click();
    await expect.poll(async () => (await view(page)).faces).toBe(20);
    await page.getByTestId('radio-hyp-3').click();
    await expect.poll(async () => (await view(page)).faces).toBe(12);
    await page.getByTestId('radio-hyp-1').click();
    await expect.poll(async () => (await view(page)).faces).toBe(24);
    // the front face of the outer cube (y = -1, w = -1) at its centre: colours, then blue, then nothing but white
    const front = [0, -0.5, 0.25];
    const [r1, , b1] = await pixel(page, front);
    expect(Math.max(r1, b1)).toBeGreaterThan(150);
    await page.getByTestId('radio-graph-2').click();
    await expect.poll(async () => (await state(page)).graph).toBe(2);
    await expect.poll(async () => { const [r, g, b] = await pixel(page, front); return b > r + 60 && g > r; }).toBe(true);
    const ink2 = await page.evaluate(() => window.__demo.inkFraction());
    await page.getByTestId('radio-graph-3').click();
    await expect.poll(() => page.evaluate(() => window.__demo.inkFraction())).toBeLessThan(ink2 / 3);
    // edges only: the red spheres at the vertices
    const v1 = (await view(page)).vertices[0];
    const [r, g, b] = await pixel(page, v1);
    expect(r).toBeGreaterThan(200);
    expect(g + b).toBeLessThan(60);
  });

  test('the opacity slider by keyboard and the axes checkbox by mouse', async ({ page }) => {
    await open(page);
    await page.evaluate((z) => window.__demo.setState(z), zero);
    const front = [0, -0.5, 0.25];
    const before = await pixel(page, front);
    await page.getByTestId('slider-op').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).op).toBe(1);
    await expect.poll(async () => { const p = await pixel(page, front); return p[0] + p[1] + p[2]; }).toBeLessThan(before[0] + before[1] + before[2] - 30);
    // the axes: invisible at Opacity[0], Darker[Red] etc. when checked
    const xEnd = [0.95, 0, 0];
    const off = await pixel(page, xEnd);
    expect(off.slice(0, 3).every((c) => c >= 250)).toBe(true);
    await page.getByTestId('check-axe').click();
    await expect.poll(async () => (await view(page)).opt1).toBe(1);
    await expect.poll(async () => { const [r, g, b] = await pixel(page, xEnd); return r > 120 && g < 60 && b < 60; }).toBe(true);
    await expect(page.locator('.lbl-text3d')).toHaveCount(3);
    await page.getByTestId('check-axe').click();
    await expect.poll(async () => (await view(page)).opt1).toBe(0);
    await expect.poll(async () => { const p = await pixel(page, xEnd); return p.slice(0, 3).every((c) => c >= 250); }).toBe(true);
  });

  test('the projection slider: a typed pw scales the picture by 1/(1 + pw (w + 2)) and the axes to ±(2 - pw)', async ({ page }) => {
    await open(page);
    await page.evaluate((z) => window.__demo.setState(z), zero);
    await page.getByTestId('value-pw').fill('0.5');
    await page.getByTestId('value-pw').press('Enter');
    await expect.poll(async () => (await state(page)).pw).toBe(0.5);
    const v = await view(page);
    expect(v.ptr1).toBeCloseTo(1.5, 15);
    expect(v.vertices[0][0]).toBeCloseTo(-1 / 1.5, 14);
    expect(v.vertices[8][0]).toBeCloseTo(-1 / 2.5, 14);
  });

  test('the reset rotations button sets the six angles to 0', async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.__demo.setState({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }));
    await expect(page.getByTestId('angle-f')).toHaveText('344.');
    await page.getByTestId('button-reset-rotations').click();
    await expect.poll(async () => { const s = await state(page); return ANGLES.map((k) => s[k]); }).toEqual([0, 0, 0, 0, 0, 0]);
    for (const k of ANGLES) await expect(page.getByTestId(`angle-${k}`)).toHaveText('0');
    await expect(page.getByTestId('animator-play-c')).toHaveAttribute('aria-pressed', 'true'); // it does not stop them
  });

  test('Initial settings goes to the Manipulate\'s initial values (all angles 0)', async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.__demo.setState({ hyp: 3, graph: 2, op: 0.8, pw: 0.3, dur: 10, a: 1, e: 2 }));
    await page.getByTestId('reset').click();
    await expect.poll(() => state(page)).toEqual({ hyp: 1, graph: 1, op: 0.4, axe: 0, pw: 1, dur: 20, ...zero });
    await expect(page.getByTestId('radio-hyp-1')).toBeChecked();
    await expect(page.getByTestId('value-pw')).toHaveValue('1');
  });

  test('at each snapshot\'s settings: the faces, the angle column, the vertices drawn, and a review screenshot', async ({ page }, testInfo) => {
    await open(page);
    for (const k of Object.keys(fx.snapshots)) {
      const s = fx.snapshots[k];
      await page.evaluate((st) => window.__demo.setState(st), s);
      await expect.poll(async () => (await state(page)).c).toBe(s.c);
      const v = await view(page);
      expect(v.faces).toBe([24, 20, 12][s.hyp - 1]);
      for (const [i, a] of ANGLES.entries()) await expect(page.getByTestId(`angle-${a}`)).toHaveText(v.angles[i]);
      // the outermost vertex (largest distance from the centre of the picture) is drawn: black edge ends or a red sphere
      const far = v.vertices.reduce((best, p) => (Math.hypot(...p) > Math.hypot(...best) ? p : best));
      const [r, g, b] = await pixel(page, far);
      if (s.graph === 3) expect(r - (g + b) / 2).toBeGreaterThan(120);
      else expect(r + g + b).toBeLessThan(450); // black, or black under a translucent face (a face alone is lighter: > 600)
      await reviewShot(page, testInfo, `hypercube-4d-rotation-snapshot-${k}`);
    }
    await expect(page.getByTestId('value-pw')).toHaveValue('1');
    await expect(page.getByTestId('value-op')).toHaveValue('0.85');
  });

  test('dragging the hypercube turns the view', async ({ page }) => {
    await open(page);
    const box = await page.getByTestId('scene-canvas').boundingBox();
    const where = () => page.evaluate(() => window.__demo.sceneToClient([0.5, 0.5, 0.5]));
    const p0 = await where();
    const s0 = await state(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => { const p1 = await where(); return Math.hypot(p1.x - p0.x, p1.y - p0.y); }).toBeGreaterThan(5);
    expect(await state(page)).toEqual(s0); // the view turns, the variables stay
  });
});
