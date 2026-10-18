// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/four-bar-linkage.spec.js — browser tests of the four-bar page (real mouse and keyboard input).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openDemo, reviewShot } from './helpers.js';

const URL = '/demos/four-bar-linkage/';
const TABLE = JSON.parse(fs.readFileSync('demos/four-bar-linkage/recorded-samples.json', 'utf8'));
const snapshots = JSON.parse(fs.readFileSync('tests/golden/four-bar-linkage.original-states.json', 'utf8')).snapshots;
const toClient = (page, p) => page.evaluate((q) => window.__demo.worldToClient(q), p);
const getState = (page) => page.evaluate(() => window.__demo.getState());
const getView = (page) => page.evaluate(() => window.__demo.view());
const mod2pi = (t) => Math.atan2(Math.sin(t), Math.cos(t));
/** independent nearest sample: plain Euclidean search over Flatten[pvals, 1], first of equals */
const nearestOf = (pvals, x) => {
  let best = null, bd = Infinity;
  for (const q of pvals.flat(1)) { const d = Math.hypot(q[0] - x[0], q[1] - x[1]); if (d < bd) { bd = d; best = q; } }
  return best;
};
/** client x of a value on the interval slider's track */
async function trackX(page, v) {
  const r = await page.getByTestId('islider-links').boundingBox();
  return r.x + (v / 2.49) * r.width;
}

test.describe('four-bar linkage', () => {
  test('four-bar: loads without errors and draws the configuration space and the linkage', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    const v = await getView(page);
    expect(v.lines).toEqual([[50], [50]]); // the original's samples, replayed
    await expect(page.locator('[data-testid=curve-1] polyline')).toHaveCount(1);
    await expect(page.locator('[data-testid=curve-2] polyline')).toHaveCount(1);
    const labels = await page.locator('[data-testid=axis-x] text').allTextContents();
    for (const t of ['−3', '−2', '−1', '1', '2', '3', 'θ']) expect(labels).toContain(t);
    expect(await page.locator('[data-testid=axis-y] text').allTextContents()).toContain('φ');
    await expect(page.locator('.plot-label', { hasText: 'configuration space' })).toHaveCount(1);
    await expect(page.locator('.plot-label', { hasText: 'four‐bar linkage' })).toHaveCount(1);
    for (const id of ['text-L1', 'text-L2', 'text-L3', 'text-L4', 'text-theta', 'text-phi', 'crank', 'rocker', 'coupler']) await expect(page.getByTestId(id)).toHaveCount(1);
    await reviewShot(page, testInfo, 'four-bar-linkage-snapshot1');
  });

  test('four-bar: has the controls of the original with their defaults: separation 0.75 and link lengths {1.35, 2}', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('value-spacing')).toHaveValue('0.75');
    await expect(page.getByTestId('value-links')).toHaveText('{1.35, 2}');
    await expect(page.getByTestId('islider-links-lo')).toHaveAttribute('aria-valuenow', '1.35');
    await expect(page.getByTestId('islider-links-hi')).toHaveAttribute('aria-valuenow', '2');
    const s = await getState(page);
    expect(s.pnear).toEqual([-0.8877458382200738, -0.9960977669686768]);
    await expect(page.getByTestId('glyph')).toHaveAttribute('transform', 'translate(-0.8877458382200738,-0.9960977669686768)');
    await expect(page.getByTestId('ctl-spacing')).toContainText('separation (L4)');
    await expect(page.getByTestId('ctl-links')).toContainText('link lengths (L1,L2,L3)');
  });

  test('four-bar: the link-lengths slider has the snapshot colours: grey track, white between the thumbs', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('islider-links-bar')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('[data-testid=islider-links] .islider-track')).toHaveCSS('background-color', 'rgb(164, 164, 164)');
  });

  test('four-bar: a press in the configuration-space plot snaps the locator glyph to the nearest sample and moves the linkage', async ({ page }) => {
    await openDemo(page, URL);
    const c = await toClient(page, [0, 1]);
    await page.mouse.click(c.x, c.y);
    const s = await getState(page);
    expect(Math.abs(s.p[0])).toBeLessThan(0.02);
    expect(Math.abs(s.p[1] - 1)).toBeLessThan(0.02);
    const want = nearestOf(TABLE.settings[0].pvals, s.p.map(mod2pi));
    expect(s.pnear).toEqual(want);
    const v = await getView(page);
    expect(v.Thetav).toBe(want[0]);
    expect(v.crankTip[0]).toBeCloseTo(1.35 * Math.cos(want[0]), 12);
    await expect(page.getByTestId('crank')).toHaveAttribute('transform', new RegExp(`^rotate\\(${(want[0] * 180) / Math.PI}`.replace('.', '\\.')));
  });

  test('four-bar: dragging the locator along the curve moves the crank and rocker', async ({ page }) => {
    await openDemo(page, URL);
    const a = await toClient(page, [-0.9, -1]), b = await toClient(page, [0.5, 1.7]);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    const samples = await page.evaluate(() => window.__demo.samples());
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10);
      await page.waitForTimeout(30);
      const s = await getState(page), v = await getView(page);
      expect(samples.some((q) => q[0] === s.pnear[0] && q[1] === s.pnear[1])).toBe(true);
      expect([v.Thetav, v.Phiv]).toEqual(s.pnear);
    }
    await page.mouse.up();
    const s = await getState(page);
    expect(Math.abs(s.p[0] - 0.5)).toBeLessThan(0.05);
    expect(Math.abs(s.p[1] - 1.7)).toBeLessThan(0.05);
  });

  test('four-bar: moving the separation slider redraws the curve and the base', async ({ page }) => {
    await openDemo(page, URL);
    const before = await getView(page);
    const slider = page.getByTestId('slider-spacing');
    await slider.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft'); // 0.75 → 0.5 in steps of 0.05
    const s = await getState(page);
    expect(s.spacing).toBe(0.5);
    const v = await getView(page);
    expect(v.lenlengths).toEqual([1.35, 0.6499999999999999, 0.5, 0.5]);
    expect(v.resampled.recorded).toBe(null); // the port's sampler (no recorded samples for this setting)
    expect(v.lines).not.toEqual(before.lines);
    await expect(page.getByTestId('pivot-2')).toHaveAttribute('x', '0.4');
    const samples = await page.evaluate(() => window.__demo.samples());
    expect(samples.some((q) => q[0] === s.pnear[0] && q[1] === s.pnear[1])).toBe(true);
  });

  test('four-bar: dragging a thumb of the link-lengths slider into the other pushes it (Push, MinIntervalSize 0.1)', async ({ page }) => {
    await openDemo(page, URL);
    const hi = await page.getByTestId('islider-links-hi').boundingBox();
    await page.mouse.move(hi.x + hi.width / 2, hi.y + hi.height / 2);
    await page.mouse.down();
    await page.mouse.move(await trackX(page, 1.0), hi.y + hi.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId('value-links')).toHaveText('{0.9, 1.}');
    const s = await getState(page);
    expect(s.links).toEqual([0.9, 1]);
    expect((await getView(page)).resampled).not.toBe(null);
  });

  test('four-bar: invalid link lengths show the red message', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    await page.evaluate(() => window.__demo.setState({ spacing: 0.1, links: [2.3000000000000003, 2.45] }));
    await expect(page.getByTestId('cspace-message')).toHaveText('invalid link lengths,no configuration possible');
    await expect(page.getByTestId('cspace-message').locator('tspan')).toHaveCount(2);
    await expect(page.locator('[data-testid^=curve-] polyline')).toHaveCount(0);
    const s = await getState(page), v = await getView(page);
    expect(s.pnear).toEqual([Math.PI / 2, Math.PI / 2]);
    expect(v.Alpha).toBe(0);
    expect(Math.abs(v.crankTip[0])).toBeLessThan(1e-15); // crank vertical
    await reviewShot(page, testInfo, 'four-bar-linkage-invalid');
  });

  test('four-bar: arrow keys move the focused locator (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('locator-p').focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    const s = await getState(page);
    expect(s.p[0]).toBeCloseTo(-0.9 + 0.15, 12);
    expect(s.p[1]).toBe(-1);
    expect(s.pnear).toEqual(nearestOf(TABLE.settings[0].pvals, s.p.map(mod2pi)));
  });

  test('four-bar: Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await getState(page);
    await page.getByTestId('slider-spacing').focus();
    await page.keyboard.press('ArrowRight');
    await page.getByTestId('islider-links-lo').focus();
    await page.keyboard.press('ArrowLeft');
    const c = await toClient(page, [1, 1]);
    await page.mouse.click(c.x, c.y);
    expect(await getState(page)).not.toEqual(opening);
    await page.getByTestId('reset').click();
    expect(await getState(page)).toEqual(opening);
    await expect(page.getByTestId('value-links')).toHaveText('{1.35, 2}');
    await expect(page.getByTestId('value-spacing')).toHaveValue('0.75');
    expect(opening.pnear).toEqual([-0.8877458382200738, -0.9960977669686768]);
  });

  test('four-bar: a press on the link-lengths track moves the nearer thumb there (D-FB-05)', async ({ page }) => {
    await openDemo(page, URL);
    const r = await page.getByTestId('islider-links').boundingBox();
    await page.mouse.click(await trackX(page, 0.5), r.y + 2);
    expect((await getState(page)).links).toEqual([0.5, 2]);
    await expect(page.getByTestId('value-links')).toHaveText('{0.5, 2}');
  });

  test('four-bar: the snapshot Settings 2 to 4 drawn for side-by-side review', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of ['2', '3', '4']) {
      const s = snapshots[k];
      await page.evaluate((st) => window.__demo.setState({ p: st.p, spacing: st.spacing, links: st.links }, { linksExact: [false, false] }), s);
      const st = await getState(page);
      expect(st.pnear).toEqual(s.pnear);
      expect((await getView(page)).resampled.recorded).toBe(Number(k));
      await reviewShot(page, testInfo, `four-bar-linkage-snapshot${k}`);
    }
    await expect(page.getByTestId('value-links')).toHaveText('{1.2, 1.7}');
  });
});
