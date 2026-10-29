// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Adapted from Wolfram Demonstrations Project content (see LICENSE.md)
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/motion-planning.spec.js — Motion Planning for Robot Path around Obstacles (browser tests)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/motion-planning/';
const golden = JSON.parse(fs.readFileSync('tests/golden/motion-planning.original-states.json', 'utf8'));
const scene = (page) => page.evaluate(() => window.__demo.scene());
const state = (page) => page.evaluate(() => window.__demo.getState());
const polyPoints = async (page, testid) => (await page.getByTestId(testid).getAttribute('points')).trim().split(/\s+/).map((p) => p.split(',').map(Number));

test.describe('Motion planning demo', () => {
  test('loads without errors with the original default scene and path', async ({ page }) => {
    const problems = await openDemo(page, URL);
    const sc = await scene(page);
    expect(sc.path.length).toBe(3);
    expect(sc.discretePath.length).toBe(golden.states[0].discretePath.length);
    // the drawn path polyline is the computed path
    const drawn = await polyPoints(page, 'path');
    drawn.forEach((p, i) => { expect(p[0]).toBeCloseTo(sc.path[i][0], 6); expect(p[1]).toBeCloseTo(sc.path[i][1], 6); });
    await expect(page.getByTestId('no-path')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('controls of the original are present', async ({ page }) => {
    await openDemo(page, URL);
    for (const id of ['setter-configOrWork-workspace', 'setter-configOrWork-configuration-space', 'setter-x-3', 'setter-x-4', 'setter-x-5', 'setter-n-3', 'setter-n-4', 'setter-n-5', 'slider-s']) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    for (const id of ['r1', 'r2', 'o1', 'o2', 'o3', 'o4']) await expect(page.getByTestId(`locator-${id}`)).toBeVisible();
    await expect(page.getByTestId('setter-x-4')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-n-3')).toHaveAttribute('aria-pressed', 'true');
  });

  test('dragging the start locator with the mouse moves the robot and replans', async ({ page }) => {
    await openDemo(page, URL);
    const from = await page.evaluate(() => window.__demo.locatorClientPoint('r1'));
    const to = await page.evaluate(() => window.__demo.worldToClient([-3, 1]));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const st = await state(page);
    expect(st.r1[0]).toBeCloseTo(-3, 1);
    expect(st.r1[1]).toBeCloseTo(1, 1);
    const sc = await scene(page);
    expect(sc.path[0][0]).toBeCloseTo(st.r1[0], 9);
    const robot = await polyPoints(page, 'robot-start');
    const cx = robot.reduce((s, p) => s + p[0], 0) / robot.length;
    expect(cx).toBeCloseTo(st.r1[0], 6);
  });

  test('locators stay inside their ranges (obstacles ±3.75, robot −4.25..4.15)', async ({ page }) => {
    await openDemo(page, URL);
    for (const [name, target, lim] of [['o1', [9, 9], [3.75, 3.75]], ['r2', [9, -9], [4.15, -4.25]]]) {
      const from = await page.evaluate((n) => window.__demo.locatorClientPoint(n), name);
      const to = await page.evaluate((p) => window.__demo.worldToClient(p), target);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(Math.min(to.x, 1095), Math.max(Math.min(to.y, 895), 5), { steps: 10 });
      await page.mouse.up();
      const p = (await state(page))[name];
      expect(Math.abs(p[0])).toBeLessThanOrEqual(Math.abs(lim[0]) + 1e-9);
      expect(Math.abs(p[1])).toBeLessThanOrEqual(Math.abs(lim[1]) + 1e-9);
    }
  });

  test('start inside an obstacle: robot drawn red and "No path exists." shown', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ r1: [-1, -0.5] }));
    await expect(page.getByTestId('no-path')).toBeVisible();
    await expect(page.getByTestId('robot-start')).toHaveAttribute('fill', '#ff0000');
    await page.getByTestId('setter-configOrWork-configuration-space').click();
    await expect(page.getByTestId('background')).toHaveAttribute('fill', '#ff0000');
    await reviewShot(page, testInfo, 'motion-start-inside-obstacle-config');
  });

  test('robot sides setter changes the robot polygon and resets progress', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ s: 20 }));
    for (const n of [4, 5, 3]) {
      await page.getByTestId(`setter-n-${n}`).click();
      expect((await polyPoints(page, 'robot-start')).length).toBe(n);
      expect((await state(page)).s).toBe(1);
    }
  });

  test('boundary sides setter changes the boundary polygon', async ({ page }) => {
    await openDemo(page, URL);
    for (const x of [3, 5, 4]) {
      await page.getByTestId(`setter-x-${x}`).click();
      expect((await polyPoints(page, 'boundary')).length).toBe(x);
    }
  });

  test('progress slider moves the robot along the path from start to end', async ({ page }) => {
    await openDemo(page, URL);
    const sc = await scene(page);
    const slider = page.getByTestId('slider-s');
    await expect(slider).toHaveAttribute('max', String(sc.discretePath.length));
    await slider.focus();
    await page.keyboard.press('End');
    const st = await state(page);
    expect(st.s).toBe(sc.discretePath.length);
    const moving = await polyPoints(page, 'robot-moving');
    const c = moving.reduce((a, p) => [a[0] + p[0] / moving.length, a[1] + p[1] / moving.length], [0, 0]);
    expect(c[0]).toBeCloseTo(st.r2[0], 6);
    expect(c[1]).toBeCloseTo(st.r2[1], 6);
  });

  test('configuration space view shows C-obstacles and the path, hides robot/obstacle bodies', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-configOrWork-configuration-space').click();
    for (let i = 1; i <= 4; i++) await expect(page.getByTestId(`cobstacle-fill-${i}`)).toHaveCount(1);
    await expect(page.getByTestId('obstacle-1')).toHaveCount(0);
    await expect(page.getByTestId('robot-start')).toHaveCount(0);
    await expect(page.getByTestId('path')).toHaveCount(1);
    await reviewShot(page, testInfo, 'motion-default-config-space');
  });

  test('a scene can be opened from a link (URL parameters)', async ({ page }) => {
    await openDemo(page, `${URL}?r1=-0.06,2.61&r2=2.895,-3.1&o1=-0.47,0.05&o2=1.375,-1.8&o3=0.53,1.41&o4=-0.68,-1.76&n=4&x=3`);
    const st = await state(page);
    expect(st.n).toBe(4);
    expect(st.x).toBe(3);
    expect((await scene(page)).discretePath.length).toBe(golden.states[3].discretePath.length);
  });

  test('keyboard: arrow keys move a focused locator', async ({ page }) => {
    await openDemo(page, URL);
    const before = (await state(page)).o3;
    await page.getByTestId('locator-o3').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    const after = (await state(page)).o3;
    expect(after[0]).toBeCloseTo(before[0] + 0.05, 9);
    expect(after[1]).toBeCloseTo(before[1] + 0.05, 9);
  });

  // ---- PA2 fixes (v0.1.28); the Tab-order and "beyond a shorter path" tests guard against regressions, the others fail on v0.1.27 ----------------------------------------------------------
  const tabTo = async (page, testid, max = 60) => {
    const seen = [];
    for (let i = 0; i < max; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => document.activeElement?.closest('[data-testid]')?.getAttribute('data-testid') ?? null);
      seen.push(id);
      if (id === testid) return seen;
    }
    return seen;
  };

  test('F-11: Tab focus on a locator draws a thin blue ring and leaves the picture around it unchanged (P-MP-02)', async ({ page }) => {
    await openDemo(page, URL);
    const g = page.getByTestId('locator-o2');
    const box = await g.boundingBox(); // the glyph: ring and hairs
    const svgBox = await page.locator('svg.scene').first().boundingBox();
    const pad = 6; // the ring's own 2 px stroke and antialiasing
    const [x0, y0, x1, y1] = [box.x - pad, box.y - pad, box.x + box.width + pad, box.y + box.height + pad];
    // four bands of the picture around the glyph, before and after the focus
    const bands = [
      { x: svgBox.x, y: svgBox.y, width: svgBox.width, height: y0 - svgBox.y },
      { x: svgBox.x, y: y1, width: svgBox.width, height: svgBox.y + svgBox.height - y1 },
      { x: svgBox.x, y: y0, width: x0 - svgBox.x, height: y1 - y0 },
      { x: x1, y: y0, width: svgBox.x + svgBox.width - x1, height: y1 - y0 },
    ].filter((b) => b.width > 1 && b.height > 1);
    const shots = async () => {
      // relative to the picture's box at the time of the shot: a scroll during the Tab walk moves everything alike
      const s = await page.locator('svg.scene').first().boundingBox();
      return Promise.all(bands.map((b) => page.screenshot({ clip: { ...b, x: b.x - svgBox.x + s.x, y: b.y - svgBox.y + s.y } })));
    };
    const before = await shots();
    await page.mouse.click(5, 5); // start the Tab walk at the top of the page
    const walk = await tabTo(page, 'locator-o2');
    expect(walk.at(-1)).toBe('locator-o2');
    expect(await g.evaluate((n) => getComputedStyle(n).outlineStyle)).toBe('none');
    expect(await g.locator('.ring').evaluate((n) => getComputedStyle(n).stroke)).toBe('rgb(47, 111, 181)');
    const after = await shots();
    // pixels changed by more than 32 in a channel: none (Chrome's old focus outline was a band about 5 world units wide;
    // re-rasterizing may move antialiased line pixels by a few levels, which is allowed)
    for (const [i, b] of after.entries()) {
      const changed = await page.evaluate(async ([x, y]) => {
        // an <img> and a plain canvas: Playwright's WebKit on Windows has neither OffscreenCanvas nor every createImageBitmap form
        const px = async (s) => {
          const im = new Image(); im.src = `data:image/png;base64,${s}`; await im.decode();
          const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
          const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height).data;
        };
        const [p, q] = [await px(x), await px(y)];
        let n = 0; for (let k = 0; k < p.length; k++) if (Math.abs(p[k] - q[k]) > 32) n++;
        return n;
      }, [b.toString('base64'), before[i].toString('base64')]);
      expect(changed, `picture band ${i} changed by the focus`).toBe(0);
    }
  });

  test('F-11: the Tab order reaches every setter, the progress slider, its ⊕ button and all six locators (P-MP-02)', async ({ page, browserName }) => {
    await openDemo(page, URL);
    await page.mouse.click(5, 5);
    const seen = new Set(await tabTo(page, '__none__', 40));
    const locators = ['r1', 'r2', 'o1', 'o2', 'o3', 'o4'].map((k) => `locator-${k}`);
    const controls = ['setter-configOrWork-workspace', 'setter-configOrWork-configuration-space', 'setter-x-3', 'setter-x-4', 'setter-x-5',
      'setter-n-3', 'setter-n-4', 'setter-n-5', 'slider-s', 'plus-s'];
    // WebKit as Safari by default: Tab reaches only elements with a tabindex unless "Press Tab to highlight each item"
    // is on (M-GEN-04); the locators are reached in every engine
    for (const id of browserName === 'webkit' ? locators : [...controls, ...locators]) expect(seen.has(id), id).toBe(true);
  });

  test('F-02: closing the ⊕ panel pauses the animation, opening it resumes it still playing (P-MP-03)', async ({ page }) => {
    await openDemo(page, URL);
    const T = 3.8e9;
    const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate((t) => window.__demo.setClock(t), T);
    await page.getByTestId('plus-s').click();
    await page.getByTestId('play-s').click();
    await frames();
    await page.evaluate((t) => window.__demo.setClock(t), T + 1);
    await expect.poll(async () => (await state(page)).s).toBeGreaterThan(1);
    await frames();
    const s1 = (await state(page)).s;
    await page.getByTestId('plus-s').click(); // close the panel
    await frames();
    await page.evaluate((t) => window.__demo.setClock(t), T + 2);
    await frames(); await frames();
    expect((await state(page)).s).toBe(s1); // stood still while closed
    await page.getByTestId('plus-s').click(); // open again
    await expect(page.getByTestId('play-s')).toHaveAttribute('aria-pressed', 'true'); // still playing (pause shown)
    await frames();
    await page.evaluate((t) => window.__demo.setClock(t), T + 3);
    await expect.poll(async () => (await state(page)).s).toBeGreaterThan(s1);
    await page.getByTestId('play-s').click();
    await page.evaluate(() => window.__demo.setClock(null));
  });

  test('F-09: progress at the end survives boundary 4 → 3 → 5 → 4 (no path in between), as in the original (P-MP-04)', async ({ page }) => {
    await openDemo(page, URL);
    const len = (await scene(page)).discretePath.length;
    await page.getByTestId('slider-s').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).s).toBe(len);
    for (const x of [3, 5]) {
      await page.getByTestId(`setter-x-${x}`).click();
      await expect(page.getByTestId('no-path')).toHaveCount(1);
      await expect(page.getByTestId('slider-s')).toHaveValue('1'); // the slider at the left while there is no path
    }
    await page.getByTestId('setter-x-4').click();
    await expect(page.getByTestId('no-path')).toHaveCount(0);
    expect((await state(page)).s).toBe(len);
    await expect(page.getByTestId('slider-s')).toHaveValue(String(len));
    const st = await state(page), moving = await polyPoints(page, 'robot-moving');
    const c = moving.reduce((a, p) => [a[0] + p[0] / moving.length, a[1] + p[1] / moving.length], [0, 0]);
    expect(c[0]).toBeCloseTo(st.r2[0], 6); // the orange robot at the goal
    expect(c[1]).toBeCloseTo(st.r2[1], 6);
    await page.getByTestId('setter-n-4').click(); // a robot-sides click still restarts
    expect((await state(page)).s).toBe(1);
  });

  test('F-09: a progress value beyond a shorter path is shown at the end; step and play start from there (P-MP-04)', async ({ page }) => {
    await openDemo(page, URL);
    const len = (await scene(page)).discretePath.length;
    await page.evaluate(() => window.__demo.setState({ s: 500 })); // kept as stored, as after a path got shorter
    await expect(page.getByTestId('slider-s')).toHaveValue(String(len));
    await page.getByTestId('plus-s').click();
    await page.getByTestId('stepback-s').click();
    expect((await state(page)).s).toBe(len - 1);
    await page.evaluate(() => window.__demo.setState({ s: 500 }));
    const T = 3.8e9;
    await page.evaluate((t) => window.__demo.setClock(t), T);
    await page.getByTestId('play-s').click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate((t) => window.__demo.setClock(t), T + 0.05); // a short step: at the end, so it loops to the start
    await expect.poll(async () => (await state(page)).s).toBeLessThan(5);
    await page.getByTestId('play-s').click();
    await page.evaluate(() => window.__demo.setClock(null));
  });

  test('F-09: a playing animation stops when the path disappears (the slider is disabled) (P-MP-04)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('plus-s').click();
    await page.getByTestId('play-s').click();
    await expect(page.getByTestId('play-s')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('setter-x-3').click(); // no path: the slider is disabled
    await expect(page.getByTestId('play-s')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('play-s')).toBeDisabled();
    await page.getByTestId('setter-x-4').click();
    await expect(page.getByTestId('play-s')).toHaveAttribute('aria-pressed', 'false');
  });

  test('F-03: the red progress point is half transparent, as the original draws it (P-MP-05)', async ({ page }) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ s: 10 }));
    const op = await page.getByTestId('progress-point').evaluate((n) => {
      let o = 1; // the drawn opacity: opacity and fill-opacity of the point and every group around it
      for (let e = n; e && e.tagName !== 'svg'; e = e.parentElement) {
        const cs = getComputedStyle(e);
        o *= Number(cs.opacity) * (e === n ? Number(cs.fillOpacity) : 1);
      }
      return o;
    });
    expect(op).toBeCloseTo(0.5, 6);
  });

  for (const [i, g] of golden.states.entries()) {
    test(`original snapshot state ${i}: same trajectory as the original + screenshot for review`, async ({ page }, testInfo) => {
      await openDemo(page, URL);
      await page.evaluate((s) => window.__demo.setState({ configOrWork: s.configOrWork, x: s.x, n: s.n, r1: s.r1, r2: s.r2, o1: s.o1, o2: s.o2, o3: s.o3, o4: s.o4, s: s.s }), g);
      const sc = await scene(page);
      expect(sc.discretePath.length).toBe(g.discretePath.length);
      sc.discretePath.forEach((p, k) => { expect(p[0]).toBeCloseTo(g.discretePath[k][0], 8); expect(p[1]).toBeCloseTo(g.discretePath[k][1], 8); });
      expect((await state(page)).s).toBe(g.s);
      await reviewShot(page, testInfo, `motion-snapshot-${i}-${g.configOrWork.replace(' ', '-')}`);
    });
  }
});
