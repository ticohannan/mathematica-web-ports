// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by D. Meliga, S. Z. Lavagnino and A. Ratti
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/catch-a-standing-wave.spec.js — browser tests of the "How to Catch a Standing Wave" page (attribution, start-up
// notice, UI inventory and bundle are in site.spec.js and bundle.spec.js). Review screenshots at the snapshot settings
// (compare: docs/original-snapshots/catch-a-standing-wave-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/catch-a-standing-wave/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/catch-a-standing-wave.original-states.json', 'utf8'));
const toClient = (page, p, k) => page.evaluate(([q, i]) => { const c = window.__demo.worldToClient(q, i); return [c.x, c.y]; }, [p, k]);
const pressed = (page, id) => page.getByTestId(id).getAttribute('aria-pressed');

test.describe('catch-a-standing-wave', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['waves-plot', 'standing-plot', 'cavity-line-top', 'cavity-line', 'nodes', 'end-0', 'end-1']) {
      await expect(page.getByTestId(id).first(), id).toBeAttached();
    }
    const v = await view(page);
    expect(v.cavity).toBeCloseTo(Math.PI / 0.18, 12); // the opening picture: the first harmonic at f = 0.18
    expect(v.nodes.length).toBe(1);
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    const s = await state(page);
    expect([s.f, s.t, s.a, s.ptExpr]).toEqual([0.18, 1, 1, 'Pi/f']);
    await expect(page.getByTestId('value-f')).toHaveText('0.18');
    expect(await pressed(page, 'setter-a-1')).toBe('true');
    expect(await pressed(page, 'setter-pt-first-harmonic')).toBe('true');
    for (const id of ['trigger-play-t', 'trigger-reset-t', 'trigger-faster-t', 'trigger-slower-t']) await expect(page.getByTestId(id)).toBeVisible();
    await expect(page.locator('#controls')).toContainText('click and drag the line');
    await expect(page.locator('#controls')).toContainText('to change the cavity length');
  });

  test('the frequency slider: 0.18 at the top, 1.4 at the bottom; the cavity end follows π/f until it is moved', async ({ page }) => {
    await openDemo(page, URL);
    const slider = page.getByTestId('vslider-f');
    await slider.focus();
    await page.keyboard.press('ArrowDown'); // one step down from the top: 1.4 − 121·0.01
    await expect.poll(async () => (await state(page)).f).toBe(1.4 - 121 * 0.01);
    await expect(page.getByTestId('value-f')).toHaveText('0.19');
    expect((await view(page)).cavity).toBe(Math.PI / (1.4 - 121 * 0.01));
    expect(await pressed(page, 'setter-pt-first-harmonic')).toBe('true');
    await page.keyboard.press('Home');
    await expect.poll(async () => (await state(page)).f).toBe(1.4);
    await expect(page.getByTestId('value-f')).toHaveText('1.4');
    // the slider's bottom end is 1.4: a pointer at the bottom of the track gives the largest frequency
    const box = await slider.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + 2);
    await expect.poll(async () => (await state(page)).f).toBeLessThan(0.25);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height - 2);
    await expect.poll(async () => (await state(page)).f).toBeGreaterThan(1.3);
  });

  test('dragging the line in the waves plot moves the cavity end, which then stays when f changes', async ({ page }) => {
    await openDemo(page, URL);
    const a = await toClient(page, [6, 1.2], 0);
    const b = await toClient(page, [12, 1.2], 0);
    await page.mouse.move(a[0], a[1]);
    await page.mouse.down();
    await expect.poll(async () => (await state(page)).pt[0]).toBeCloseTo(6, 1);
    await page.mouse.move(b[0], b[1], { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).pt[0]).toBeCloseTo(12, 1);
    const s = await state(page);
    expect(s.pt[1]).toBeCloseTo(1.2, 1);
    expect(s.ptExpr).toBe(null);
    expect(await pressed(page, 'setter-pt-first-harmonic')).toBe('false');
    const g = await page.evaluate(() => window.__demo.graphics(1));
    expect(JSON.stringify(g)).toContain(JSON.stringify([s.pt[0], -2]));
    await page.getByTestId('vslider-f').focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(async () => (await state(page)).f).toBeCloseTo(0.19, 12);
    expect((await state(page)).pt).toEqual(s.pt);
  });

  test('a press in the standing-wave plot moves the cavity end there, with y held at −2.1 (LocatorPane over the Column)', async ({ page }) => {
    await openDemo(page, URL);
    const a = await toClient(page, [8, 1], 1);
    const b = await toClient(page, [14.5, -0.5], 1);
    // The press is read in the upper plot's coordinates (K-CA-01). The two plots' x scales agree in Chromium but can
    // differ by a pixel or two where the tick-label fonts are wider (Firefox, WebKit), so the expected x is the
    // pointer's x in the upper plot, within 1.5 px; it is also near the lower plot's x.
    const u0 = await toClient(page, [0, 0], 0), u20 = await toClient(page, [20, 0], 0);
    const pxPerUnit = (u20[0] - u0[0]) / 20;
    const upperX = (cx) => (cx - u0[0]) / pxPerUnit;
    const near = (v, x) => expect(Math.abs(v - x)).toBeLessThan(1.5 / pxPerUnit);
    await page.mouse.move(a[0], a[1]);
    await page.mouse.down();
    await expect.poll(async () => Math.abs((await state(page)).pt[0] - upperX(a[0])) < 1.5 / pxPerUnit).toBe(true);
    expect((await state(page)).pt[0]).toBeCloseTo(8, 0);
    expect((await state(page)).pt[1]).toBe(-2.1);
    await page.mouse.move(b[0], b[1], { steps: 4 });
    await page.mouse.up();
    await expect.poll(async () => Math.abs((await state(page)).pt[0] - upperX(b[0])) < 1.5 / pxPerUnit).toBe(true);
    near((await state(page)).pt[0], upperX(b[0]));
    expect((await state(page)).pt[0]).toBeCloseTo(14.5, 0);
    expect((await state(page)).pt[1]).toBe(-2.1);
    near((await view(page)).cavity, (await state(page)).pt[0]);
    // past the right end: held at x = 20
    const c = await toClient(page, [10, 0], 1), d = await toClient(page, [24, 0], 1);
    await page.mouse.move(c[0], c[1]);
    await page.mouse.down();
    await page.mouse.move(d[0], d[1], { steps: 3 });
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).pt).toEqual([20, -2.1]);
  });

  test('arrow keys move the focused cavity locator', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-pt').focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).pt[0]).toBeCloseTo(Math.PI / 0.18 - 0.05, 9);
    expect((await state(page)).ptExpr).toBe(null);
  });

  test('"first harmonic" sets the cavity end to π/f at the current frequency', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ pt: [15, -2.1], f: 1.4 - 90 * 0.01 }));
    expect(await pressed(page, 'setter-pt-first-harmonic')).toBe('false');
    await page.getByTestId('setter-pt-first-harmonic').click();
    await expect.poll(async () => (await state(page)).pt).toEqual([Math.PI / (1.4 - 90 * 0.01), 0]);
    expect(await pressed(page, 'setter-pt-first-harmonic')).toBe('true');
    expect((await state(page)).ptExpr).toBe(null);
    // a number: another frequency leaves it where it is, and the button is no longer pressed
    await page.getByTestId('vslider-f').focus();
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await state(page)).f).toBeCloseTo(0.49, 12);
    expect((await state(page)).pt).toEqual([Math.PI / (1.4 - 90 * 0.01), 0]);
    expect(await pressed(page, 'setter-pt-first-harmonic')).toBe('false');
  });

  test('the harmonics setter multiplies the frequency of the waves', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-a-3').click();
    await expect.poll(async () => (await view(page)).k).toBeCloseTo(0.54, 12);
    const v = await view(page);
    expect(v.nodes.length).toBe(3); // 3rd harmonic of the cavity π/f: nodes at π/(3f), 2π/(3f) and the end
    expect(v.nodes[0]).toBeCloseTo(Math.PI / 0.54, 12);
    expect(await pressed(page, 'setter-a-3')).toBe('true');
    expect(await pressed(page, 'setter-a-1')).toBe('false');
  });

  test('the Trigger plays, goes faster or slower, and resets the time to 0', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setClock(0));
    await page.getByTestId('trigger-play-t').click();
    // let the animation's first frame run before the clock moves (it records the start time)
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate(() => window.__demo.setClock(2));
    await expect.poll(async () => (await state(page)).t, { timeout: 5000 }).toBeCloseTo(3, 6); // from 1 at 1 unit per second
    await page.getByTestId('trigger-play-t').click(); // pause
    const t = (await state(page)).t;
    await page.evaluate(() => window.__demo.setClock(5));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect((await state(page)).t).toBe(t);
    await page.getByTestId('trigger-faster-t').click();
    await page.getByTestId('trigger-slower-t').click();
    await page.getByTestId('trigger-reset-t').click();
    await expect.poll(async () => (await state(page)).t).toBe(0);
    const v = await view(page);
    expect(Math.abs(v.standingAtEnd)).toBeLessThan(1e-2); // t = 0: still a node at the end of the first harmonic
    await page.evaluate(() => window.__demo.setClock(null));
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.evaluate(() => window.__demo.setState({ f: 0.5, t: 7.5, a: 4, pt: [3, -2.1] }));
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual(opening);
    await expect(page.getByTestId('value-f')).toHaveText('0.18');
    expect(await pressed(page, 'setter-pt-first-harmonic')).toBe('true');
  });

  test('the snapshot settings + screenshots for review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    const expected = { // read from the snapshot pictures: cavity end, nodes (black and under the red points), button
      1: { cavity: Math.PI / 0.18, nodes: [17.45], pressed: 'true', label: '0.18' },
      2: { cavity: 19.26, nodes: [11.64], pressed: 'false', label: '0.27' },
      3: { cavity: 12.566370614359183, nodes: [4.19, 8.38, 12.57], pressed: 'true', label: '0.25' },
      4: { cavity: 11.82, nodes: [5.82, 11.64], pressed: 'false', label: '0.54' },
    };
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      const v = await view(page);
      expect(v.cavity, k).toBeCloseTo(expected[k].cavity, 12);
      expect(v.nodes.map((x) => +x.toFixed(2)), k).toEqual(expected[k].nodes);
      expect(await pressed(page, 'setter-pt-first-harmonic'), k).toBe(expected[k].pressed);
      await expect(page.getByTestId('value-f')).toHaveText(expected[k].label);
      await reviewShot(page, testInfo, `catch-a-standing-wave-snapshot-${k}`);
    }
  });
});
