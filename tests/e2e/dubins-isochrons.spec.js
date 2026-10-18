// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/dubins-isochrons.spec.js — browser tests of the isochron page (real mouse and keyboard; window.__demo only
// reads values, except to show the snapshot states for the review screenshots).
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/dubins-isochrons/';
const getState = (page) => page.evaluate(() => window.__demo.getState());
const getView = (page) => page.evaluate(() => window.__demo.view());
async function typeInto(page, name, text) {
  await page.getByTestId(`value-${name}`).fill(text);
  await page.getByTestId(`value-${name}`).press('Enter');
}
/** click a slider at the position of value v (range input from min to max) */
async function clickSlider(page, name, v, min, max) {
  const box = await page.getByTestId(`slider-${name}`).boundingBox();
  const thumb = 16; // the thumb's travel is the track minus the thumb width
  const x = box.x + thumb / 2 + ((v - min) / (max - min)) * (box.width - thumb);
  await page.mouse.move(x, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
}
function distToPath(p, pg) {
  let best = Infinity;
  for (const q of pg.pieces) {
    if (q.kind === 'line') {
      const [a, b] = [q.from, q.to], dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
    } else {
      for (let i = 0; i <= 4000; i++) {
        const a = q.a1 + ((q.a2 - q.a1) * i) / 4000;
        best = Math.min(best, Math.hypot(p[0] - q.c[0] - q.r * Math.cos(a), p[1] - q.c[1] - q.r * Math.sin(a)));
      }
    }
  }
  return best;
}

test.describe('dubins isochrons', () => {
  test('dubins-isochrons loads without errors and draws four isochrons, the grey band, the axes and both cars', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['isochron-RS', 'isochron-LS', 'isochron-LR', 'isochron-RL', 'grey-band-1', 'grey-band-2', 'axis-x', 'axis-y',
      'start-car', 'moving-car', 'turning-circle-right', 'turning-circle-left']) await expect(page.getByTestId(id), id).toHaveCount(1);
    await expect(page.getByTestId('grey-band-1')).toHaveAttribute('data-points', '153');
    await expect(page.getByTestId('grey-band-2')).toHaveAttribute('data-points', '153');
    await expect(page.getByTestId('grey-band-1')).toHaveAttribute('fill-rule', 'evenodd');
    await expect(page.getByTestId('path-graphics')).toHaveAttribute('data-path', 'RS');
    const labels = await page.getByTestId('axis-x').locator('text').allTextContents();
    for (const l of ['−15', '−10', '−5', '5', '10', '15']) expect(labels).toContain(l);
    expect(await page.getByTestId('axis-y').locator('text').allTextContents()).toEqual(expect.arrayContaining(['−15', '−10', '−5', '5', '10', '15']));
    await reviewShot(page, testInfo, 'dubins-isochrons-snapshot1');
  });

  test('dubins-isochrons has the controls of the original with their defaults: r 2, t 10, set =, path RS, tau 0.5, p 100', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDemo(page, URL);
    await expect(page.getByTestId('value-r')).toHaveValue('2');
    await expect(page.getByTestId('value-t')).toHaveValue('10');
    await expect(page.getByTestId('setter-set-=')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-set-≤')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('setter-path-RS')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('value-tau')).toHaveValue('0.5');
    await expect(page.getByTestId('value-p')).toHaveValue('100');
    await expect(page.locator('#controls .ctl-heading')).toHaveText(['plot parameters', 'move car']);
    // ControlPlacement -> Left
    const c = await page.getByTestId('slider-p').boundingBox(), g = await page.getByTestId('graphic').boundingBox();
    expect(c.x + c.width).toBeLessThan(g.x);
  });

  test('the set setter switches between isochrons and reachable regions', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-set-≤').click();
    for (const w of ['RS', 'LS', 'LR', 'RL']) {
      await expect(page.getByTestId(`region-${w}`)).toHaveCount(1);
      await expect(page.getByTestId(`region-boundary-${w}`)).toHaveCount(1);
      await expect(page.getByTestId(`isochron-${w}`)).toHaveCount(0);
    }
    await expect(page.locator('[data-testid^=grey-band-]')).toHaveCount(0);
    await expect(page.getByTestId('region-RS')).toHaveAttribute('opacity', '0.3');
    expect((await getState(page)).setold).toBe('≤');
    await reviewShot(page, testInfo, 'dubins-isochrons-regions');
    await page.getByTestId('setter-set-=').click();
    await expect(page.locator('[data-testid^=region-]')).toHaveCount(0);
    await expect(page.getByTestId('grey-band-1')).toHaveAttribute('data-points', '153');
    await expect(page.getByTestId('isochron-RS')).toHaveCount(1);
  });

  test('the path setter and the tau slider move the green car to the selected boundary point', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-path-RL').click();
    await typeInto(page, 'tau', '4.27');
    const s = await getState(page);
    expect(s.tau).toBe(4.2700000000000005); // 0 + 427 · 0.01, as snapshot 3's Settings
    await expect(page.getByTestId('value-tau')).toHaveValue('4.27');
    const v = await getView(page);
    expect(Math.abs(v.cxy[0] - 5.629321115832841)).toBeLessThan(1e-12);
    expect(Math.abs(v.cxy[1] - 4.71379806419473)).toBeLessThan(1e-12);
    expect(Math.abs(v.cTheta - 2.300796326794896)).toBeLessThan(1e-12);
    await expect(page.getByTestId('path-graphics')).toHaveAttribute('data-path', 'RL');
  });

  test('moving the p slider with the mouse drives the car from the origin along the thick path', async ({ page }) => {
    await openDemo(page, URL);
    await clickSlider(page, 'p', 50, 0, 100);
    const s = await getState(page);
    expect(Number.isInteger(s.p)).toBe(true);
    expect(Math.abs(s.p - 50)).toBeLessThanOrEqual(3);
    const v = await getView(page);
    expect(distToPath(v.cxy, v.pathGraphics)).toBeLessThan(0.01);
    await typeInto(page, 'p', '50');
    const v2 = await getView(page);
    expect(Math.abs(v2.cxy[0] - 1.1754929732240638)).toBeLessThan(1e-12);
    expect(Math.abs(v2.cxy[1] - 4.854913816206946)).toBeLessThan(1e-12);
    expect(Math.abs(v2.cTheta - 1.3207963267948966)).toBeLessThan(1e-12);
  });

  test('dragging the t and r sliders recomputes the isochrons', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await clickSlider(page, 't', 5, 0.1, 14);
    const s = await getState(page);
    expect(Math.abs(s.t - 5)).toBeLessThan(0.3);
    expect(s.told).toBe(s.t);
    let v = await getView(page);
    expect(v.plot.firstPoints.RS).toEqual([0, s.t]);
    expect(v.plot.polygonPoints).toEqual([63, 63]); // 3 × 21 values (polySteps 0.05, t < 10)
    await expect(page.getByTestId('grey-band-1')).toHaveAttribute('data-points', '63');
    await clickSlider(page, 'r', 4, 0.5, 10);
    const s2 = await getState(page);
    expect(Math.abs(s2.r - 4)).toBeLessThan(0.3);
    expect(s2.rold).toBe(s2.r);
    await expect(page.getByTestId('turning-circle-right')).toHaveAttribute('r', String(s2.r));
    await expect(page.getByTestId('turning-circle-left')).toHaveAttribute('cx', String(-s2.r));
    v = await getView(page);
    expect(v.plot.r).toBe(s2.r);
    await reviewShot(page, testInfo, 'dubins-isochrons-t5-r4');
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await typeInto(page, 'r', '3');
    await typeInto(page, 't', '7');
    await page.getByTestId('setter-set-≤').click();
    await page.getByTestId('setter-path-LR').click();
    await typeInto(page, 'tau', '2');
    await typeInto(page, 'p', '40');
    await page.getByTestId('reset').click();
    const s = await getState(page);
    expect(s).toEqual({ r: 2, rold: 2, t: 10, told: 10, set: '=', setold: '=', path: 'RS', tau: 0.5, p: 100 });
    for (const [n, v] of [['r', '2'], ['t', '10'], ['tau', '0.5'], ['p', '100']]) await expect(page.getByTestId(`value-${n}`)).toHaveValue(v);
    await expect(page.getByTestId('setter-set-=')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-path-RS')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('grey-band-1')).toHaveAttribute('data-points', '153');
  });

  test('dubins-isochrons review screenshots of the snapshot settings 2 to 5', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const snaps = { 2: ['≤', 'LR', 5.57], 3: ['≤', 'RL', 4.2700000000000005], 4: ['≤', 'RL', 1.2], 5: ['=', 'RS', 1.2] };
    for (const [k, [set, path, tau]] of Object.entries(snaps)) {
      await page.evaluate((x) => window.__demo.setState(x), { set, path, tau, p: 100, r: 2, t: 10 });
      await expect(page.getByTestId('path-graphics')).toHaveAttribute('data-path', path);
      // snapshots 2–4 show the reachable regions (set ≤), snapshot 5 the isochrons
      await expect(page.getByTestId('region-RS')).toHaveCount(set === '≤' ? 1 : 0);
      await reviewShot(page, testInfo, `dubins-isochrons-snapshot${k}`);
    }
  });
});
