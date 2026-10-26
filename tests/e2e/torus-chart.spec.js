// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/torus-chart.spec.js — browser tests of the "Chart for a Torus" page with the real mouse and keyboard.
// Expected values: the TESTPLAN rows T-TC-31 … T-TC-41 (hand-derived; the saved state and snapshot 1 for the defaults
// and the colour). Angles are compared to ~1e-12 or to the pointer's pixel resolution, never to the last bit.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot, inkAfterContextRestore } from './helpers.js';

const URL = '/demos/torus-chart/';
const TWO_PI = 2 * Math.PI;
const getState = (page) => page.evaluate(() => window.__demo.getState());
const getView = (page) => page.evaluate(() => window.__demo.view());
const dialAngle = (page, name) => page.locator(`[data-testid=dial-svg-${name}] [data-layer=hand]`).getAttribute('data-ang').then(Number);
const ctlToClient = (page, name, p) => page.evaluate(([n, q]) => window.__demo.controlToClient(n, q), [name, p]);
const near = (a, b, tol, what = '') => expect(Math.abs(a - b), `${what} ${a} vs ${b}`).toBeLessThanOrEqual(tol);

test.describe('chart for a torus', () => {
  test('loads without errors and draws the surface, the ball and both dials', async ({ page }, testInfo) => {
    test.slow();
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => window.__demo.inkFraction())).toBeGreaterThan(0.02);
    const v = await getView(page);
    expect(v.surface).toMatchObject({ n: 72, vertices: 73 * 73, triangles: 2 * 72 * 72, meshLines: 0 }); // the flat square
    expect(v.radius).toBe(0.2);
    for (const n of ['p1', 'p2']) {
      await expect(page.getByTestId(`dial-${n}`)).toHaveCount(1);
      await expect(page.locator(`[data-testid=dial-svg-${n}] [data-layer=hand] polygon`)).toHaveCount(2); // hand + arrowhead
      await expect(page.locator(`[data-testid=dial-svg-${n}] [data-layer=hand] polyline, [data-testid=dial-svg-${n}] [data-layer=hand] path`).first()).toBeAttached();
      await expect(page.getByTestId(`locator-${n}`)).toHaveCount(1);
    }
    await expect(page.locator('[data-testid=requirements-notice]')).toHaveCount(0);
    await reviewShot(page, testInfo, 'torus-chart-initial');
  });

  test('has the controls of the original with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    const order = await page.locator('#controls > [data-testid^=ctl-]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    expect(order).toEqual(['ctl-lambda', 'ctl-p1', 'ctl-p2']);
    await expect(page.getByTestId('ctl-lambda').locator('.ctl-label')).toHaveText('Torus → Plane');
    await expect(page.getByTestId('value-lambda')).toHaveValue('2.'); // the saved machine real 2. (D-TC-06)
    await expect(page.getByTestId('plus-lambda')).toBeVisible();
    expect(Number(await page.getByTestId('slider-lambda').inputValue())).toBe(2);
    near(await dialAngle(page, 'p1'), -0.9917220574271659, 1e-12, 'θ hand'); // −56.8°
    near(await dialAngle(page, 'p2'), 0.9575889779203874, 1e-12, 'ϕ hand'); // 54.9°
    await expect(page.getByTestId('ctl-p1').locator('.ctl-label')).toHaveText('θ');
    await expect(page.getByTestId('ctl-p2').locator('.ctl-label')).toHaveText('ϕ');
    await expect(page.getByTestId('plot-label')).toHaveText('Plane');
    // ControlPlacement -> Left
    const c = await page.locator('#controls').boundingBox(), g = await page.getByTestId('graphic').boundingBox();
    expect(c.x + c.width).toBeLessThanOrEqual(g.x + 1);
  });

  test('dragging the theta dial locator with the mouse turns the hand and moves the green ball', async ({ page }) => {
    await openDemo(page, URL);
    const s0 = await getState(page);
    // from the locator (−56.8°) counterclockwise along the rim to the top (90°), through 0
    await page.mouse.move(...Object.values(await ctlToClient(page, 'p1', s0.p1)));
    await page.mouse.down();
    for (let a = -50; a <= 90; a += 10) {
      const p = await ctlToClient(page, 'p1', [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)]);
      await page.mouse.move(p.x, p.y, { steps: 2 });
    }
    await page.mouse.up();
    const v = await getView(page);
    near(v.θ, Math.PI / 2, 0.03, 'θ');
    near(await dialAngle(page, 'p1'), Math.PI / 2, 0.03, 'hand');
    near(v.ball[0], v.φ, 1e-12, 'ball x = φ');
    near(v.ball[1], 1.5 * Math.PI, 0.03, 'ball y = 2π − θ');
    expect(v.ball[2]).toBe(0);
    near(Math.hypot(...(await getState(page)).p1), 1, 1e-15, '|p1|');
  });

  test('a press anywhere in a dial moves its locator there, normalised to the rim', async ({ page }) => {
    await openDemo(page, URL);
    const a = (2 * Math.PI) / 3;
    const c = await ctlToClient(page, 'p2', [0.3 * Math.cos(a), 0.3 * Math.sin(a)]);
    await page.mouse.click(c.x, c.y);
    const s = await getState(page);
    near(Math.hypot(...s.p2), 1, 1e-15, '|p2|');
    near((await getView(page)).φ, a, 0.05, 'φ');
    const loc = await page.getByTestId('locator-p2').boundingBox();
    const rim = await ctlToClient(page, 'p2', s.p2);
    near(loc.x + loc.width / 2, rim.x, 3, 'locator x');
    near(loc.y + loc.height / 2, rim.y, 3, 'locator y');
  });

  test('dragging the lambda slider changes the plot label from Plane to Cylinder to 2-Torus', async ({ page }) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('slider-lambda').boundingBox();
    // f < 0: past the left end of the track (λ = 0 without aiming at the thumb's end position)
    const at = (f) => [f < 0 ? box.x - 20 : box.x + 8 + f * (box.width - 16), box.y + box.height / 2];
    await page.mouse.move(...at(1));
    await page.mouse.down();
    const seen = [];
    for (const f of [0.85, 0.42, 0.1, -1]) {
      await page.mouse.move(...at(f), { steps: 4 });
      seen.push([(await getState(page)).λ, await page.getByTestId('plot-label').textContent(), (await getView(page)).surface.zRange[1]]);
    }
    await page.mouse.up();
    expect(seen.map((x) => x[1])).toEqual(['Plane', 'Cylinder', '2-Torus', '2-Torus']);
    expect(seen[0][0]).toBeGreaterThan(1.2);
    expect(seen[1][0]).toBeGreaterThan(0.5);
    expect(seen[1][0]).toBeLessThan(1.2);
    expect(seen[3][0]).toBe(0);
    expect(seen[1][2]).toBeGreaterThan(0.5); // the surface was re-sampled (z range of the funnel / cylinder)
    await expect(page.getByTestId('value-lambda')).toHaveValue('0.');
  });

  test('the play button of lambda animates the morph', async ({ page }) => {
    await openDemo(page, URL);
    // the page clock fixed (v0.1.25): one second of clock time moves λ by 2/6 from 2, wrapping to 1/3
    const T = 3.8e9;
    await page.evaluate((t) => window.__demo.setClock(t), T);
    await page.getByTestId('plus-lambda').click();
    await page.getByTestId('play-lambda').click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); // the animation's first frame has run
    expect((await getState(page)).λ).toBe(2);
    await page.evaluate((t) => window.__demo.setClock(t), T + 1);
    await expect.poll(async () => (await getState(page)).λ).toBeCloseTo(1 / 3, 12);
    await page.getByTestId('play-lambda').click(); // pause
    await page.evaluate(() => window.__demo.setClock(null));
    const λ1 = (await getState(page)).λ;
    await expect(page.getByTestId('plot-label')).toHaveText(λ1 < 0.5 ? '2-Torus' : λ1 < 1.2 ? 'Cylinder' : 'Plane');
    await page.waitForTimeout(400);
    expect((await getState(page)).λ).toBe(λ1);
  });

  test('arrow keys turn a focused dial (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('reset').click();
    await page.getByTestId('locator-p1').focus();
    await page.keyboard.press('ArrowUp');
    near((await getView(page)).θ, 0.04995839572194276, 1e-12, 'θ after ArrowUp'); // ArcTan of Normalize[{1, 0.05}]
    const p = (await getState(page)).p1;
    await page.keyboard.press('Shift+ArrowUp');
    near((await getView(page)).θ, Math.atan2(p[1] + 0.25, p[0]), 1e-12, 'θ after Shift+ArrowUp');
    near(await dialAngle(page, 'p1'), Math.atan2(p[1] + 0.25, p[0]), 1e-12, 'hand');
  });

  test('dragging in the 3D picture rotates the view', async ({ page }) => {
    await openDemo(page, URL);
    const c0 = await page.evaluate(() => window.__demo.camera());
    const box = await page.getByTestId('scene-canvas').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.45, { steps: 6 });
    await page.mouse.up();
    const c1 = await page.evaluate(() => window.__demo.camera());
    expect(Math.hypot(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2])).toBeGreaterThan(0.5);
    const d = await ctlToClient(page, 'p2', [0, -0.8]);
    await page.mouse.click(d.x, d.y);
    near((await getView(page)).φ, 1.5 * Math.PI, 0.05, 'φ');
    expect(await page.evaluate(() => window.__demo.camera())).toEqual(c1); // kept (K-TC-07)
  });

  test('Initial settings restores lambda 0 and both dials at 0', async ({ page }) => {
    await openDemo(page, URL);
    const c = await ctlToClient(page, 'p1', [-0.5, 0.5]);
    await page.mouse.click(c.x, c.y);
    await page.getByTestId('reset').click();
    expect(await getState(page)).toEqual({ λ: 0, p1: [1, 0], p2: [1, 0] });
    await expect(page.getByTestId('value-lambda')).toHaveValue('0');
    expect(await dialAngle(page, 'p1')).toBe(0);
    expect(await dialAngle(page, 'p2')).toBe(0);
    await expect(page.getByTestId('plot-label')).toHaveText('2-Torus');
    const v = await getView(page);
    near(v.ball[0], TWO_PI, 1e-15);
    near(v.ball[1], Math.PI, 1e-15);
    expect(v.ball[2]).toBe(0);
    expect(v.surface.meshLines).toBeGreaterThan(15);
  });

  test('the flat square at lambda 2 is blue from above as in snapshot 1', async ({ page }) => {
    test.slow();
    await openDemo(page, URL);
    const px = await page.evaluate(() => window.__demo.pixelAt([4, 3, 0]));
    [133, 169, 255].forEach((c, i) => near(px[i], c, 20, `channel ${i}`));
  });

  test('the view redraws after a WebGL context loss', async ({ page }) => {
    test.slow();
    await openDemo(page, URL);
    const r = await inkAfterContextRestore(page);
    test.skip(!r.supported, 'WEBGL_lose_context not offered by this browser');
    expect(r.ink).toBeGreaterThan(0.02);
  });

  test('without WebGL 2 the notice is shown and the dials still work', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return type === 'webgl2' ? null : orig.call(this, type, ...rest); };
    });
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('requirements-notice')).toContainText('WebGL 2');
    await expect(page.getByTestId('scene-canvas')).toHaveCount(0);
    const c = await ctlToClient(page, 'p1', [0, 0.9]);
    await page.mouse.click(c.x, c.y);
    near((await getView(page)).θ, Math.PI / 2, 0.03, 'θ');
  });

  test('review screenshots at the four snapshot states', async ({ page }, testInfo) => {
    test.slow();
    await openDemo(page, URL);
    const fx = JSON.parse(fs.readFileSync('tests/golden/torus-chart.original-states.json', 'utf8'));
    for (const k of ['1', '2', '3', '4']) {
      const after = await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      expect(after).toEqual(fx.snapshots[k]);
      await expect(page.getByTestId('plot-label')).toHaveText(['Plane', '2-Torus', 'Cylinder', 'Plane'][Number(k) - 1]);
      await reviewShot(page, testInfo, `torus-chart-snapshot-${k}`);
    }
  });
});
