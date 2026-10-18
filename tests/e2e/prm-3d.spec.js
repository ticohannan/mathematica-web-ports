// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/prm-3d.spec.js — browser tests of the "Probabilistic Roadmap Method in 3D" page (real mouse and keyboard).
// Expected values: the original's saved state and snapshots, the independent Python of the TESTPLAN (101 / 317 edges,
// path length 6.25), hand derivations — never the port. Cross-engine rules: trig results compared to 1e-9, pointers
// never aimed at a snapping boundary, intermediate pointer events not relied upon.
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot, inkAfterContextRestore } from './helpers.js';
import { createRng } from '../../shared/random.js';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';

const URL = '/demos/prm-3d/';
const TWO_PI = 2 * Math.PI;
const demo = (page, fn, arg) => page.evaluate(fn, arg);
const state = (page) => demo(page, () => window.__demo.getState());
const view = (page) => demo(page, () => window.__demo.view());
const near = (a, b, tol, what = '') => expect(Math.abs(a - b), `${what} ${a} vs ${b}`).toBeLessThanOrEqual(tol);
const pathLabel = (page) => page.getByTestId('path-label');

/**
 * press on a horizontal slider's thumb and move the mouse to the position of `target` (a value of the slider's range
 * min … max, `kmax` positions), or `beyond` px past the end of the track; few intermediate events (WebKit may deliver
 * only the last one)
 */
async function dragSlider(page, name, { target = null, min = 0, max = 1, beyond = 0 } = {}) {
  const range = page.getByTestId(`slider-${name}`);
  const box = await range.boundingBox();
  const frac = await range.evaluate((el) => (Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min)));
  const y = box.y + box.height / 2;
  const xAt = (f) => box.x + 8 + f * (box.width - 16); // the thumb (about 16 px wide) travels inside the track
  await page.mouse.move(xAt(frac), y);
  await page.mouse.down();
  const x = target === null ? box.x + box.width + beyond : xAt((target - min) / (max - min));
  await page.mouse.move(x, y, { steps: 4 });
  await page.mouse.up();
}
async function dragCanvas(page, testid, dx, dy) {
  const box = await page.getByTestId(testid).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 8 });
  await page.mouse.up();
}
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test.describe('prm 3d', () => {
  test('loads without errors and draws the workspace and the phase space', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-canvas-workspace')).toBeVisible();
    await expect(page.getByTestId('scene-canvas-phase')).toBeVisible();
    expect(await demo(page, () => window.__demo.inkFraction('workspace'))).toBeGreaterThan(0.02);
    expect(await demo(page, () => window.__demo.inkFraction('phase'))).toBeGreaterThan(0.05);
    const v = await view(page);
    expect(v.counts).toEqual({ pts: 100, good: 80, bad: 20, edges: 180 }); // the saved state
    expect(v.path).toEqual([71, 78, 72, 64, 70, 34]);
    expect(await demo(page, () => window.__demo.webgl)).toBe(true);
    await reviewShot(page, testInfo, 'prm-3d-initial');
  });

  test('has the controls of the original with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    for (const k of [1, 2, 3]) {
      await expect(page.getByTestId(`slider-Theta${k}`)).toBeVisible();
      await expect(page.getByTestId(`plus-Theta${k}`)).toBeVisible();
      await expect(page.getByTestId(`value-Theta${k}`)).toHaveCount(0); // no value field (ImageSize -> Small control)
      expect((await state(page))[`θ${k}`]).toBe(0.25);
    }
    await expect(page.getByTestId('value-Obstaxy-x')).toHaveValue('1');
    await expect(page.getByTestId('value-Obstaxy-y')).toHaveValue('0');
    await expect(page.getByTestId('value-Obstbxy-x')).toHaveValue('0');
    await expect(page.getByTestId('value-Obstbxy-y')).toHaveValue('-1');
    expect(Number(await page.getByTestId('vslider-Obstaz').inputValue())).toBe(0);
    expect(Number(await page.getByTestId('vslider-Obstbz').inputValue())).toBe(0.5);
    await expect(page.getByTestId('check-showConfigObs')).not.toBeChecked();
    await expect(page.getByTestId('ctl-showConfigObs')).toContainText('show configuration space obstacles');
    await expect(page.getByTestId('button-addPoints')).toHaveText('add 100 vertices');
    await expect(page.getByTestId('button-restart')).toHaveText('restart');
    await expect(page.getByTestId('button-newgoal')).toHaveText('new goal');
    await expect(page.getByTestId('value-r')).toHaveValue('1.5');
    await expect(page.getByTestId('plus-r')).toBeVisible();
    await expect(page.getByTestId('slider-progress')).toBeVisible();
    await expect(page.getByTestId('plus-progress')).toHaveCount(0);
    await expect(page.getByTestId('value-progress')).toHaveCount(0);
    await expect(page.locator('[data-testid^=plus-]')).toHaveCount(4);
    await expect(page.getByTestId('plotlabel-workspace')).toHaveText('robot workspace');
    await expect(page.getByTestId('plotlabel-phase')).toContainText('robot phase space');
    await expect(pathLabel(page)).toHaveText('path length = 8.09');
    // ControlPlacement -> Top: the controls above the pictures
    const c = await page.locator('#controls').boundingBox();
    const g = await page.getByTestId('scene-canvas-workspace').boundingBox();
    expect(c.y + c.height).toBeLessThanOrEqual(g.y + 1);
  });

  test('dragging the theta1 slider with the mouse turns the robot and moves the start point', async ({ page }) => {
    await openDemo(page, URL);
    const v0 = await view(page);
    await dragSlider(page, 'Theta1', { target: 1.55, min: -0.1, max: 6.3 });
    await expect.poll(async () => (await view(page)).qs[0]).toBeGreaterThan(1.3);
    const s = await state(page);
    expect(s['θ1']).toBeGreaterThan(1.3);
    expect(s['θ1']).toBeLessThan(1.8);
    // a slider value: -0.1 + k 0.01
    const k = Math.round((s['θ1'] + 0.1) / 0.01);
    near(s['θ1'], -0.1 + k * 0.01, 1e-12, 'grid');
    const v = await view(page);
    expect(v.qs).toEqual([s['θ1'], 0.25, 0.25]);
    expect(v.qs).not.toEqual(v0.qs);
    // the robot turned about z: link 1 of the moving robot points along (Cos θ1, Sin θ1)
    const link1 = await demo(page, () => {
      const g = window.__demo.view().workspace;
      return JSON.stringify(g).length; // the graphic was rebuilt
    });
    expect(link1).toBeGreaterThan(1000);
    const tip = await demo(page, () => {
      const prims = [];
      const walk = (x, M) => { if (Array.isArray(x)) x.forEach((y) => walk(y, M)); else if (x && x.transform) walk(x.content, x.transform); else if (x && x.prim === 'cylinder' && x.radius === 0.05) prims.push({ M, p2: x.p2 }); };
      walk(window.__demo.view().workspace.content[2], null); // drawRobot[robotq] (after the If[inCollision, Red, Brown] directive)
      const { M, p2 } = prims[0];
      return [0, 1, 2].map((i) => M[i][0] * p2[0] + M[i][1] * p2[1] + M[i][2] * p2[2] + M[i][3]);
    });
    near(tip[0], 1.05 * Math.cos(s['θ1']), 1e-9, 'link 1 x');
    near(tip[1], 1.05 * Math.sin(s['θ1']), 1e-9, 'link 1 y');
  });

  test('a theta slider pushed to its end wraps by 2π (original quirk)', async ({ page }) => {
    await openDemo(page, URL);
    await dragSlider(page, 'Theta2', { beyond: 200 });
    await expect.poll(async () => (await state(page))['θ2']).toBeLessThan(1);
    near((await state(page))['θ2'], 6.3 - TWO_PI, 1e-12, 'θ2 = 6.3 - 2π');
    // the thumb is written back to the left end of the track (position of 0.0168 on the -0.1 … 6.3 grid)
    const pos = Number(await page.getByTestId('slider-Theta2').inputValue());
    expect(pos).toBeLessThanOrEqual(13);
    expect((await view(page)).qs[1]).toBe((await state(page))['θ2']);
  });

  test('dragging the blue_xy pad moves the blue sphere and re-classifies the samples', async ({ page }) => {
    test.slow(); // several evaluations and page loads with two WebGL pictures (software rendering in CI)
    await openDemo(page, URL);
    // blue_z to 1: a press in the middle of the vertical slider (0 … 2)
    const zb = await page.getByTestId('vslider-Obstaz').boundingBox();
    await page.mouse.click(zb.x + zb.width / 2, zb.y + zb.height / 2);
    await expect.poll(async () => Math.abs((await view(page)).pObs3a[2] - 1)).toBeLessThan(0.1);
    // the pad spans {-3, -3} … {1, 1} (Q-P3-13): {0, 0} is 3/4 from the left, 3/4 from the bottom
    // a press anywhere in the pad moves the sphere there (Slider2D); press well inside the pad at {0.5, 0}, not at its
    // edge, then drag to {0, 0}
    const pad = await page.getByTestId('pad-Obstaxy').boundingBox();
    await page.mouse.move(pad.x + pad.width * (3.5 / 4), pad.y + pad.height * (1 - 3 / 4));
    await page.mouse.down();
    await page.mouse.move(pad.x + pad.width * 0.75, pad.y + pad.height * 0.25, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => (await view(page)).counts.good).toBe(0);
    const s = await state(page);
    expect(Math.hypot(s.Obstaxy[0], s.Obstaxy[1])).toBeLessThan(0.1);
    const v = await view(page);
    expect([v.counts.good, v.counts.bad]).toEqual([0, 100]); // every sample red
    // the roadmap of the last rebuild (made while more than 5 samples were free) is kept: at {0, 0} no sample is
    // free, so the rebuild that would clear it does not run (Q-P3-07); its edges stay drawn, all now stale
    expect(v.counts.edges).toBeGreaterThan(0);
    expect(s.rold).toBe(-1);
    expect(v.pObs3a[0]).toBe(s.Obstaxy[0]);
    // back to {1, 0, 0}: typed into the pad's fields, blue_z to 0 with the Home key
    // each change is evaluated in the next animation frame (D-P3-06): wait for each one before the next, and check
    // the state reached the typed value, so a failure says which control did not arrive (WebKit run of 2026-10-18:
    // 81 free samples instead of 80, i.e. the sphere was not exactly at {1, 0, 0})
    for (const [f, val, k] of [['x', '1', 0], ['y', '0', 1]]) {
      const field = page.getByTestId(`value-Obstaxy-${f}`);
      await field.fill(val);
      await field.press('Enter');
      await expect.poll(async () => (await state(page)).Obstaxy[k], `Obstaxy ${f} after typing ${val}`).toBe(Number(val));
    }
    await page.getByTestId('vslider-Obstaz').focus();
    await page.keyboard.press('Home');
    await expect.poll(async () => (await state(page)).Obstaz, 'Obstaz after Home').toBe(0);
    // (Home = minimum in every engine: shared/ui-extra.js handles it, WebKit's native vertical slider would go to the
    // maximum; see the test "Home and End put a vertical slider at its minimum and maximum")
    await expect.poll(async () => (await view(page)).pObs3a, 'blue sphere drawn at {1, 0, 0}').toEqual([1, 0, 0]);
    await expect.poll(async () => (await view(page)).counts.good).toBe(80);
    expect((await view(page)).counts.edges).toBe(180);
    expect((await state(page)).rold).toBe(1.5);
  });

  test('show configuration space obstacles draws the blue and yellow volumes', async ({ page }, testInfo) => {
    test.slow(); // several evaluations and page loads with two WebGL pictures (software rendering in CI)
    await openDemo(page, URL);
    const ink0 = await demo(page, () => window.__demo.inkFraction('phase'));
    await page.getByTestId('check-showConfigObs').check();
    await expect.poll(() => demo(page, () => window.__demo.volumeCount()), { timeout: 20000 }).toBe(4); // two volumes with their caps
    const v = await view(page);
    expect(v.volumes.a).toEqual({ c: [1, 0, 0], quality: 'quality' });
    expect(v.volumes.b).toEqual({ c: [0, -1, 0.5], quality: 'quality' });
    expect(await demo(page, () => window.__demo.inkFraction('phase'))).toBeGreaterThan(ink0 + 0.05);
    await reviewShot(page, testInfo, 'prm-3d-volumes');
    // recomputed after a sphere move (yellow_z one step up with the keyboard)
    await page.getByTestId('vslider-Obstbz').focus();
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await view(page)).volumes.b.c[2]).toBeGreaterThan(0.5);
    expect((await view(page)).volumes.a).toEqual({ c: [1, 0, 0], quality: 'quality' });
    await page.getByTestId('check-showConfigObs').uncheck();
    await expect.poll(() => demo(page, () => window.__demo.volumeCount())).toBe(0);
  });

  test('add 100 vertices with a seed gives reproducible samples (port addition)', async ({ page }) => {
    test.slow(); // several evaluations and page loads with two WebGL pictures (software rendering in CI)
    const runOnce = async () => {
      await openDemo(page, `${URL}?seed=7`);
      await page.getByTestId('button-restart').click();
      await page.getByTestId('button-addPoints').click();
      await page.getByTestId('button-addPoints').click();
      await expect.poll(async () => (await view(page)).counts.pts).toBe(200);
      const s = await state(page);
      return { pts: s.pts, edges: s.edgesNN, good: s.goodPts.length };
    };
    const a = await runOnce();
    const b = await runOnce();
    expect(b).toEqual(a);
    expect(a.pts.every((p) => p.length === 3 && p.every((x) => x >= 0 && x <= TWO_PI))).toBe(true);
    // the samples are the generator's numbers row by row (RandomReal[{0, 2π}, {100, 3}])
    const g = createRng({ seed: 7 });
    expect(a.pts.slice(0, 100)).toEqual(g.randomReal([0, TWO_PI], [100, 3]));
  });

  test('restart removes the samples and the roadmap', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('button-restart').click();
    await expect(pathLabel(page)).toHaveText('No path possible');
    const v = await view(page);
    expect(v.counts).toEqual({ pts: 0, good: 0, bad: 0, edges: 0 });
    expect(v.robotq).toEqual([0.25, 0.25, 0.25]); // the robot at the start
    expect((await state(page)).qf).toEqual([3.84, 4.86, 1.62]);
    await expect(pathLabel(page)).toHaveCSS('color', 'rgb(255, 0, 0)');
  });

  test('new goal moves the goal (seeded)', async ({ page }) => {
    await openDemo(page, `${URL}?seed=7`);
    await page.getByTestId('button-newgoal').click();
    const expected = createRng({ seed: 7 }).randomReal([0, TWO_PI], 3);
    await expect.poll(async () => (await state(page)).qf).toEqual(expected);
    const v = await view(page);
    expect(v.qf).toEqual(expected);
    // the goal robot is redrawn at qf: its link-1 cylinder points along (Cos qf1, Sin qf1)
    const tip = await demo(page, () => {
      const prims = [];
      const walk = (x, M) => { if (Array.isArray(x)) x.forEach((y) => walk(y, M)); else if (x && x.transform) walk(x.content, x.transform); else if (x && x.prim === 'cylinder' && x.radius === 0.05) prims.push({ M, p2: x.p2 }); };
      walk(window.__demo.view().workspace.content[0], null);
      const { M, p2 } = prims[1];
      return [0, 1, 2].map((i) => M[i][0] * p2[0] + M[i][1] * p2[1] + M[i][2] * p2[2] + M[i][3]);
    });
    near(tip[0], 1.05 * Math.cos(expected[0]), 1e-9, 'goal link 1 x');
    near(tip[1], 1.05 * Math.sin(expected[0]), 1e-9, 'goal link 1 y');
  });

  test('the radius slider rebuilds the roadmap: 1.19 gives No path possible and 1.86 a path', async ({ page }) => {
    await openDemo(page, URL);
    const field = page.getByTestId('value-r');
    await field.fill('1.19');
    await field.press('Enter');
    await expect(pathLabel(page)).toHaveText('No path possible');
    expect((await view(page)).counts.edges).toBe(101); // independent Python
    expect((await state(page)).rold).toBe(1.19);
    await field.fill('1.86');
    await field.press('Enter');
    await expect(pathLabel(page)).toHaveText('path length = 6.25');
    const v = await view(page);
    expect(v.counts.edges).toBe(317);
    expect(v.path).toEqual([71, 78, 62, 34]);
    near(v.totdist, 6.249367797545131, 1e-12, 'totdist');
  });

  test('the progress slider moves the robot along the path', async ({ page }) => {
    await openDemo(page, URL);
    const start = (await view(page)).robotq;
    expect(start).toEqual([0.25, 0.25, 0.25]);
    await dragSlider(page, 'progress', { beyond: 200 });
    await expect.poll(async () => dist3((await view(page)).robotq, [3.84, 4.86, 1.62])).toBeLessThan(1e-9);
    expect((await state(page)).progress).toBe(1);
    const v = await view(page);
    expect(dist3(v.robotq, [3.84, 4.86, 1.62])).toBeLessThan(1e-9); // at the goal (N-P3-05)
    // the blue cube follows the robot: Cuboid[robotq - .1{1,1,1}, robotq + .1{1,1,1}]
    const cub = v.phase.content[v.phase.content.length - 1].find((x) => x && x.prim === 'cuboid');
    cub.min.forEach((m, i) => near(m, v.robotq[i] - 0.1, 1e-12, 'cube min'));
    // half way: on the path, away from both ends
    await page.getByTestId('slider-progress').focus();
    for (let i = 0; i < 50; i++) await page.keyboard.press('ArrowLeft');
    // wait for the LAST key's evaluation (an intermediate progress already lies on segment 4)
    await expect.poll(async () => (await state(page)).progress).toBeCloseTo(0.5, 12);
    const want = [2.0865392601981254, 5.1017467996397725, 2.794532688302591]; // independent Python
    await expect.poll(async () => dist3((await view(page)).robotq, want)).toBeLessThan(1e-9);
    expect((await view(page)).segment).toBe(4);
  });

  test('a start configuration in collision turns the start and moving robots red', async ({ page }) => {
    await openDemo(page, URL);
    expect(await demo(page, () => window.__demo.robotColors())).toMatchObject({ start: [0.6, 0.4, 0.2], moving: [0.6, 0.4, 0.2] });
    // θ2 towards 3π/2 = 4.71: link 2 hangs down through the blue sphere at (1, 0, 0)
    await dragSlider(page, 'Theta2', { target: 4.7, min: -0.1, max: 6.3 }); // collision for θ2 in 4.2 … 5.15
    await expect.poll(async () => (await view(page)).inCollision).toBe(true);
    const c = await demo(page, () => window.__demo.robotColors());
    expect(c.start).toEqual([1, 0, 0]);
    expect(c.moving).toEqual([1, 0, 0]); // coloured by the START's state (Q-P3-03)
    expect(c.goal).toEqual([0.6, 0.4, 0.2]);
    expect(c.startOpacity).toBe(0.2);
    // the start point in the phase space is red; no connection from the start
    const v = await view(page);
    expect(v.qsn).toBe(null);
    const c0 = v.phase.content;
    const iqs = c0.findIndex((x) => x && x.prim === 'point' && JSON.stringify(x.points) === JSON.stringify([v.qs]));
    expect(c0[iqs - 1]).toEqual({ directive: 'color', value: [1, 0, 0] }); // If[inCollision, Red, Brown], Point[qs]
    await expect(pathLabel(page)).toHaveText(/No path possible|path length = /);
  });

  test('a rotated view stays rotated after a control change (Dynamic view points)', async ({ page }) => {
    await openDemo(page, URL);
    const ws0 = await demo(page, () => window.__demo.camera('workspace'));
    const ph0 = await demo(page, () => window.__demo.camera('phase'));
    await dragCanvas(page, 'scene-canvas-phase', 90, 15);
    const ph1 = await demo(page, () => window.__demo.camera('phase'));
    expect(dist3(ph1.position, ph0.position)).toBeGreaterThan(0.5);
    const s1 = await state(page);
    ph1.viewPoint.forEach((x, i) => near(x, s1.viewPoint2[i], 1e-9, 'viewPoint2 written back'));
    // a control change re-evaluates the body; the phase view keeps its rotation, the workspace view its own
    await page.getByTestId('slider-Theta1').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page))['θ1']).not.toBe(0.25);
    const ph2 = await demo(page, () => window.__demo.camera('phase'));
    expect(dist3(ph2.position, ph1.position)).toBeLessThan(1e-9);
    const ws2 = await demo(page, () => window.__demo.camera('workspace'));
    expect(dist3(ws2.position, ws0.position)).toBeLessThan(1e-9);
  });

  test('Initial settings restores the opening state and the view points', async ({ page }) => {
    test.slow(); // several evaluations and page loads with two WebGL pictures (software rendering in CI)
    await openDemo(page, URL);
    const field = page.getByTestId('value-r');
    await field.fill('2');
    await field.press('Enter');
    await page.getByTestId('button-restart').click();
    await page.getByTestId('check-showConfigObs').check();
    await dragCanvas(page, 'scene-canvas-workspace', -80, 20);
    await dragCanvas(page, 'scene-canvas-phase', 70, -20);
    await page.getByTestId('reset').click();
    await expect(pathLabel(page)).toHaveText('path length = 8.09');
    const v = await view(page);
    expect(v.counts).toEqual({ pts: 100, good: 80, bad: 20, edges: 180 });
    const s = await state(page);
    expect([s.r, s.rold, s.showConfigObs, s['θ1'], s.progress]).toEqual([1.5, 1.5, false, 0.25, 0]);
    for (const w of ['workspace', 'phase']) {
      const vp = (await demo(page, (x) => window.__demo.camera(x), w)).viewPoint;
      [1.3, -2.4, 2].forEach((x, i) => near(vp[i], x, 1e-9, `${w} viewPoint`));
    }
    await expect(page.getByTestId('value-r')).toHaveValue('1.5');
    await expect(page.getByTestId('check-showConfigObs')).not.toBeChecked();
  });

  test('review screenshots at the five snapshot states', async ({ page }, testInfo) => {
    test.slow(); // several evaluations and page loads with two WebGL pictures (software rendering in CI)
    await openDemo(page, URL);
    const fx = loadStates('tests/golden/prm-3d.original-states.json');
    for (let k = 1; k <= 5; k++) {
      await demo(page, (st) => window.__demo.loadSettings(st), plain(fx.snapshots[k - 1]));
      await expect(pathLabel(page)).toHaveText([null, 'path length = 8.09', 'No path possible', 'No path possible', 'path length = 8.51', 'path length = 8.51'][k]);
      if (k === 3 || k === 4) await expect.poll(() => demo(page, () => window.__demo.volumeCount()), { timeout: 20000 }).toBe(4);
      await reviewShot(page, testInfo, `prm-3d-snapshot-${k}`);
    }
  });

  test('the views redraw after a WebGL context loss', async ({ page }) => {
    await openDemo(page, URL);
    for (const w of ['workspace', 'phase']) {
      // polls THIS canvas until it is drawn again (0.02 < ink < 0.5): an empty restored canvas reads as ink 1
      const r = await inkAfterContextRestore(page, `[data-testid=scene-canvas-${w}]`, { which: w });
      test.skip(!r.supported, 'WEBGL_lose_context not offered by this browser');
      expect(r.ink).toBeGreaterThan(0.02);
      expect(r.ink).toBeLessThan(0.5);
    }
  });
  test('Home and End put a vertical slider at its minimum and maximum (every engine)', async ({ page }) => {
    await openDemo(page, URL);
    const z = page.getByTestId('vslider-Obstbz');
    await z.focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).Obstbz).toBe(2);
    await page.keyboard.press('Home');
    await expect.poll(async () => (await state(page)).Obstbz).toBe(0);
  });
});
