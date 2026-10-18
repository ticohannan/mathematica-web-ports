// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by their authors, see demos/common/dial-control.js and LICENSE.md
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/dial-control.spec.js — demos/common/dial-control.js in a real browser (owner two-link-kinematics), on a
// test page with one dial per variant (tests/e2e/fixtures/dial-control.html): test ids, LocatorPane picking with the
// mouse (a press anywhere moves the locator there, then the setter), the clamp to the plot range during a drag far
// outside, arrow keys (keyStep 0.05 and 'grid'), the image sizes and the drawing. Expected values: the setters worked
// by hand (atan2, kπ/32), as in tests/unit/dial-control.test.js; pointer positions are rounded to pixels, so angles
// from presses are compared within 0.02 rad.
import { test, expect } from '@playwright/test';

const URL = '/tests/e2e/fixtures/dial-control.html';

async function open(page) {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.location()?.url ?? '')) problems.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__fixture && window.__fixture.ready === true);
  return problems;
}
const pt = (page, name) => page.evaluate((n) => window.__fixture.dials[n].get(), name);
const ang = (p) => Math.atan2(p[1], p[0]);
const client = (page, name, p) => page.evaluate(([n, q]) => window.__fixture.client(n, q), [name, p]);
const kOf = (p) => Math.round(ang(p) / (Math.PI / 32));

test.describe('dial-control.js in the browser', () => {
  test('test ids: dial-<name> containers (not focusable), locator-<name> locators (focusable), stacked and inline labels', async ({ page }) => {
    const problems = await open(page);
    for (const n of ['p1', 'c1', 't1', 'm1', 'n1']) {
      const box = page.getByTestId(`dial-${n}`);
      await expect(box).toBeVisible();
      expect(await box.evaluate((e) => e.tabIndex)).toBe(-1);
      const loc = page.getByTestId(`locator-${n}`);
      await expect(loc).toHaveCount(1);
      expect(await loc.getAttribute('tabindex')).toBe('0');
    }
    // 'stacked': −3π/4 drawn as "3π" over "4" with a minus sign; 'inline': one text "−3π/4"
    const stacked = await page.getByTestId('dial-p1').locator('text').allTextContents();
    expect(stacked).toEqual(expect.arrayContaining(['−', '3π', '4', 'π', '2', '0']));
    expect(stacked).not.toContain('−3π/4');
    const inline = await page.getByTestId('dial-n1').locator('text').allTextContents();
    expect(inline).toEqual(['−3π/4', '−π/2', '−π/4', '0', 'π/4', 'π/2', '3π/4', 'π']);
    // image sizes: 140, 120, 160, automatic (180), 120 px wide
    const widths = {};
    for (const n of ['p1', 'c1', 't1', 'm1', 'n1']) widths[n] = Math.round((await page.getByTestId(`dial-svg-${n}`).boundingBox()).width);
    expect(widths).toEqual({ p1: 140, c1: 120, t1: 160, m1: 180, n1: 120 });
    expect(problems).toEqual([]);
  });

  test('a press anywhere on a dial moves its locator there and the setter normalises it (normalize)', async ({ page }) => {
    await open(page);
    const c = await client(page, 'p1', [0, 0.5]); // halfway between the centre and the top
    await page.mouse.click(c.x, c.y);
    const p = await pt(page, 'p1');
    expect(Math.hypot(...p)).toBeCloseTo(1, 12);
    expect(Math.abs(ang(p) - Math.PI / 2)).toBeLessThan(0.02);
    const inputs = await page.evaluate(() => window.__fixture.inputs);
    expect(inputs.at(-1)).toEqual(['p1', p, 'pointer']);
    // the hand and the arc follow: the hand layer records ArcTan[pt]
    const a = Number(await page.getByTestId('dial-p1').locator('[data-layer=hand]').getAttribute('data-ang'));
    expect(a).toBeCloseTo(ang(p), 12);
  });

  test('nearest32: a press snaps to a multiple of π/32; a drag keeps snapping', async ({ page }) => {
    await open(page);
    const c = await client(page, 'c1', [0.3, 0.95]);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    let p = await pt(page, 'c1');
    expect(kOf(p)).toBeGreaterThanOrEqual(12);
    expect(kOf(p)).toBeLessThanOrEqual(14);
    expect(Math.abs(ang(p) - (kOf(p) * Math.PI) / 32)).toBeLessThan(1e-15);
    const d = await client(page, 'c1', [-0.6, -0.6]);
    await page.mouse.move(d.x, d.y, { steps: 6 });
    await page.mouse.up();
    p = await pt(page, 'c1');
    expect(kOf(p)).toBe(-24); // −3π/4
  });

  test('clamp: a drag far outside a dial gives the angle of the clamped pointer (45° at the far corner); clamp false does not', async ({ page }) => {
    await open(page);
    // p1 (clamp on): to (10, −3) in dial units, far right and below → clamped to (1.04, −1.04): −45°
    // n1 (clamp off): to (10, 3) → the pointer's own direction atan2(3, 10)
    for (const [n, target, expected] of [['p1', [10, -3], -Math.PI / 4], ['n1', [10, 3], Math.atan2(3, 10)]]) {
      const c = await client(page, n, [0.9, 0]);
      const far = await client(page, n, target);
      await page.mouse.move(c.x, c.y);
      await page.mouse.down();
      await page.mouse.move(far.x, far.y, { steps: 8 });
      await page.mouse.up();
      const p = await pt(page, n);
      expect(Math.abs(ang(p) - expected), n).toBeLessThan(0.02);
    }
  });

  test('arrow keys: keyStep 0.05 moves the locator then normalises (2.86° per key), keyStep grid turns by π/32 (Shift π/8)', async ({ page }) => {
    await open(page);
    await page.getByTestId('locator-p1').focus();
    await page.keyboard.press('ArrowUp');
    let p = await pt(page, 'p1');
    expect(ang(p)).toBeCloseTo(0.04995839572194276, 14);
    expect((await page.evaluate(() => window.__fixture.inputs)).at(-1)).toEqual(['p1', p, 'key']);
    await page.getByTestId('locator-c1').focus();
    const ks = [];
    for (const k of ['ArrowUp', 'ArrowRight', 'ArrowLeft', 'ArrowLeft', 'Shift+ArrowDown']) {
      await page.keyboard.press(k);
      ks.push(kOf(await pt(page, 'c1')));
    }
    expect(ks).toEqual([1, 2, 1, 0, -4]);
    // the automatic-size dial starts at π/4 (k = 8): Shift+ArrowUp → 3π/8
    await page.getByTestId('locator-m1').focus();
    await page.keyboard.press('Shift+ArrowUp');
    expect(kOf(await pt(page, 'm1'))).toBe(12);
  });

  test("torus-chart arc: in the lower half the black arc runs clockwise from 0 and the head points counter-clockwise", async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.__fixture.dials.t1.set([Math.cos(-1), Math.sin(-1)]));
    const g = await page.evaluate(() => { const d = window.__fixture.dials.t1.graphics(); return { kind: d.arc.kind, end: d.arc.circle.end, dir: d.arc.direction }; });
    expect(g.kind).toBe('ArrowArc');
    expect(g.end).toBeCloseTo(-1, 15);
    expect(g.dir[0]).toBeCloseTo(Math.sin(1), 15);
    // set() is programmatic: no onInput
    expect((await page.evaluate(() => window.__fixture.inputs)).filter((r) => r[0] === 't1')).toEqual([]);
    const fills = await page.getByTestId('dial-t1').locator('[data-layer=hand] polygon').evaluateAll((ns) => ns.map((n) => n.getAttribute('fill')));
    expect(fills).toEqual(['rgb(0,0,255)', 'rgb(0,0,0)']); // the blue hand, then the black arrowhead
  });
});
