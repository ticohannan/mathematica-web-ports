// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/e2e/shared-controls.spec.js — the generic shared controls in a real browser, on a test page
// (tests/e2e/fixtures/shared-controls.html): shared/ui.js slider options plus / steps 'mma' / labeled 'text' /
// format / parse, shared/ui-interval.js (pointer and keyboard), shared/svg-frame.js, the non-square viewer of
// shared/three-helpers.js. Expected values: k·step products in IEEE doubles (the same arithmetic in the page) and the
// drafts' texts (rrt T-RT-78, dubins-isochrons T-DI-38, four-bar-linkage T-FB-57, dh-parameters T-DH-09).
import { test, expect } from '@playwright/test';

const URL = '/tests/e2e/fixtures/shared-controls.html';

async function open(page) {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.location()?.url ?? '')) problems.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__fixture && window.__fixture.ready === true);
  return problems;
}
const value = (page, name) => page.evaluate((n) => window.__fixture.controls.get(n).get(), name);

test.describe('shared/ui.js slider options', () => {
  test('steps mma: keys and the panel land on min + k step; the field shows Mathematica text', async ({ page }) => {
    const problems = await open(page);
    const s = page.getByTestId('slider-sep');
    await expect(page.getByTestId('value-sep')).toHaveValue('0.75');
    await s.focus();
    await page.keyboard.press('Home');
    expect(await value(page, 'sep')).toBe(0);
    await expect(page.getByTestId('value-sep')).toHaveValue('0.');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    expect(await value(page, 'sep')).toBe(0.15000000000000002); // 3 * 0.05
    await expect(page.getByTestId('value-sep')).toHaveValue('0.15');
    await page.getByTestId('plus-sep').click();
    await page.getByTestId('stepfwd-sep').click();
    expect(await value(page, 'sep')).toBe(4 * 0.05);
    await s.focus();
    await page.keyboard.press('End');
    expect(await value(page, 'sep')).toBe(1.5);
    expect(problems).toEqual([]);
  });

  test('steps mma: a mouse drag lands exactly on a grid value', async ({ page }) => {
    await open(page);
    const box = await page.getByTestId('slider-sep').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.37, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    const v = await value(page, 'sep');
    const k = Math.round(v / 0.05);
    expect(v).toBe(k * 0.05);
    expect(k).toBeGreaterThan(5);
    expect(k).toBeLessThan(15);
  });

  test('the sliders show their values as text: 0 at start, 0.05 after one step (plus: false)', async ({ page }) => {
    await open(page);
    await expect(page.getByTestId('plus-bias')).toHaveCount(0);
    await expect(page.getByTestId('anim-bias')).toHaveCount(0);
    await expect(page.getByTestId('value-bias')).toHaveValue('0');
    await page.getByTestId('slider-bias').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('value-bias')).toHaveValue('0.05');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('value-bias')).toHaveValue('0.');
  });

  test('labeled text with a format hook: π fractions as plain text, no field and no panel', async ({ page }) => {
    await open(page);
    const t = page.getByTestId('value-n');
    expect(await t.evaluate((n) => n.tagName)).toBe('SPAN');
    await expect(t).toHaveText('0');
    await page.getByTestId('slider-n').focus();
    await page.keyboard.press('ArrowRight');
    await expect(t).toHaveText('π/32');
    await page.keyboard.press('End');
    await expect(t).toHaveText('π');
    for (let i = 0; i < 26; i++) await page.keyboard.press('ArrowLeft');
    await expect(t).toHaveText('3π/16');
    await expect(page.getByTestId('plus-n')).toHaveCount(0);
  });

  test('parse hook: typing 5 Pi/32 or −13π/16 sets the integer position; a bad entry is rejected', async ({ page }) => {
    await open(page);
    const f = page.getByTestId('value-theta');
    await expect(f).toHaveValue('5π/32');
    await f.fill('-13π/16');
    await f.press('Enter');
    expect(await value(page, 'theta')).toBe(-26);
    await expect(f).toHaveValue('−13π/16');
    await f.fill('5 Pi/32');
    await f.press('Enter');
    expect(await value(page, 'theta')).toBe(5);
    await f.fill('hello');
    await f.press('Enter');
    expect(await value(page, 'theta')).toBe(5);
    await expect(f).toHaveValue('5π/32');
  });

  test('a typed 4.27 becomes 0 + 427·0.01 = 4.2700000000000005, shown 4.27; off-grid ends and no-field sliders', async ({ page }) => {
    await open(page);
    const f = page.getByTestId('value-tau');
    await f.fill('4.27');
    await f.press('Enter');
    expect(await value(page, 'tau')).toBe(4.2700000000000005);
    await expect(f).toHaveValue('4.27');
    await page.getByTestId('slider-off').focus();
    await page.keyboard.press('End');
    expect(await value(page, 'off')).toBe(2.49);
    await page.keyboard.press('ArrowLeft');
    expect(await value(page, 'off')).toBe(2.45);
    await expect(page.getByTestId('value-progress')).toHaveCount(0);
    await expect(page.getByTestId('plus-progress')).toHaveCount(0);
  });

  test('a typed whole number stays exact: "3" shows 3 (not 3.) until the next drag or key', async ({ page }) => {
    await open(page);
    const f = page.getByTestId('value-tau');
    await f.fill('3');
    await f.press('Enter');
    expect(await value(page, 'tau')).toBe(3);
    await expect(f).toHaveValue('3');
    await f.fill('3.');
    await f.press('Enter');
    await expect(f).toHaveValue('3.');
    await f.fill('3');
    await f.press('Enter');
    await expect(f).toHaveValue('3');
    await page.getByTestId('slider-tau').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    expect(await value(page, 'tau')).toBe(3);
    await expect(f).toHaveValue('3.');
  });
});

test.describe('shared/ui-interval.js', () => {
  test('dragging a thumb of the link-lengths slider into the other pushes it (Push, MinIntervalSize 0.1)', async ({ page }) => {
    const problems = await open(page);
    await expect(page.getByTestId('value-links')).toHaveText('{1.35, 2}');
    await expect(page.getByTestId('islider-links-lo')).toHaveAttribute('role', 'slider');
    const track = await page.getByTestId('islider-links').boundingBox();
    const hi = await page.getByTestId('islider-links-hi').boundingBox();
    const xOf = (v) => track.x + (v / 2.49) * track.width;
    await page.mouse.move(hi.x + hi.width / 2, hi.y + hi.height / 2);
    await page.mouse.down();
    await page.mouse.move(xOf(1.0), hi.y + hi.height / 2, { steps: 8 });
    await page.mouse.up();
    expect(await value(page, 'links')).toEqual([18 * 0.05, 20 * 0.05]);
    await expect(page.getByTestId('value-links')).toHaveText('{0.9, 1.}');
    expect(problems).toEqual([]);
  });

  test('arrow keys move a focused thumb by one position with the Push rule; the bar moves both', async ({ page }) => {
    await open(page);
    await page.getByTestId('islider-r1-lo').focus();
    await page.keyboard.press('ArrowRight');
    expect(await value(page, 'r1')).toEqual([-3.1 + 37 * 0.1, 1.5]);
    await page.getByTestId('islider-r1-hi').focus();
    await page.keyboard.press('End');
    expect(await value(page, 'r1')).toEqual([-3.1 + 37 * 0.1, 3.1]);
    await page.getByTestId('islider-r1-lo').focus();
    await page.keyboard.press('End'); // pushes the upper thumb: both stop at the end, 0.1 apart
    expect(await value(page, 'r1')).toEqual([-3.1 + 61 * 0.1, 3.1]);
    await page.keyboard.press('Home');
    expect((await value(page, 'r1'))[0]).toBe(-3.1);
    await page.getByTestId('islider-r1-hi').focus();
    await page.keyboard.press('PageDown'); // ten positions down: k 62 → 52
    expect(await value(page, 'r1')).toEqual([-3.1, -3.1 + 52 * 0.1]);
    // the bar between the thumbs drags both by whole steps, keeping their distance in positions
    const bar = await page.getByTestId('islider-r1-bar').boundingBox();
    const track = await page.getByTestId('islider-r1').boundingBox();
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
    await page.mouse.down();
    await page.mouse.move(bar.x + bar.width / 2 + track.width * 0.1, bar.y + bar.height / 2, { steps: 5 });
    await page.mouse.up();
    const after = await value(page, 'r1');
    const d = Math.round((after[0] + 3.1) / 0.1);
    expect(d).toBeGreaterThanOrEqual(5);
    expect(d).toBeLessThanOrEqual(7);
    expect(after).toEqual([-3.1 + d * 0.1, -3.1 + (52 + d) * 0.1]);
    await expect(page.getByTestId('value-r1')).toHaveCount(0);
  });
});

test.describe('shared/svg-frame.js and the non-square viewer', () => {
  test('frame, ticks, labels and axes are drawn; content is clipped at the frame', async ({ page }) => {
    await open(page);
    const labels = await page.getByTestId('dn-labels').locator('text').allTextContents();
    expect(labels).toEqual(['−2', '−1', '0', '1', '2', '−2', '−1', '0', '1', '2']);
    await expect(page.getByTestId('dn-frame').locator('polyline')).toHaveCount(1);
    await expect(page.getByTestId('dn-ticks').locator('polyline')).toHaveCount(100);
    expect(await page.locator('[data-layer=content]').getAttribute('clip-path')).toMatch(/^url\(#svgframe-clip-\d+\)$/);
    const fb = await page.getByTestId('fb-axis-x').locator('text').allTextContents();
    expect(fb).toEqual(['−3', '−2', '−1', '1', '2', '3', 'θ']);
  });

  test('a non-square viewer (ImageSize {440, 420}) has a 440 × 420 canvas', async ({ page }) => {
    await open(page);
    const err = await page.evaluate(() => window.__fixture.viewerError);
    test.skip(!!err, `no WebGL here: ${err}`);
    const size = await page.getByTestId('scene-canvas').evaluate((c) => [c.clientWidth, c.clientHeight]);
    expect(size).toEqual([440, 420]);
    expect(await page.evaluate(() => window.__fixture.viewer.camera.aspect)).toBeCloseTo(440 / 420, 12);
  });
});
