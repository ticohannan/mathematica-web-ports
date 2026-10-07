// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Ravi Patel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/unit-balls.spec.js — browser tests of the unit-ball page (WebGL 2)
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot, inkAfterContextRestore } from './helpers.js';

const URL = '/demos/unit-balls/';
const SETTER = ['1/4', '1/2', '1', '2', '3', '4', '9', '16', 'Infinity'];
const HYPHEN = '‐';
const ink = (page) => page.evaluate(() => window.__demo.inkFraction());
const view = (page) => page.evaluate(() => window.__demo.view());
const state = (page) => page.evaluate(() => window.__demo.getState());
/** wait until the canvas shows a drawing with at least `min` ink (the page draws on the next animation frame) */
const drawn = (page, min) => expect.poll(() => ink(page), { timeout: 10_000 }).toBeGreaterThan(min);

test.describe('unit balls', () => {
  test('loads without errors and draws the unit ball (non-blank canvas)', async ({ page }, testInfo) => {
    const problems = await openDemo(page, URL);
    await drawn(page, 0.04);
    expect(problems).toEqual([]);
    const s = await page.evaluate(() => window.__demo.stats());
    expect(s.mode).toBe('3D');
    expect(s.triangles).toBeGreaterThan(10000);
    expect(s.meshSegments).toBeGreaterThan(1000);
    await reviewShot(page, testInfo, 'unit-balls-3D-p0.5-initial');
  });

  test('has the controls of the original with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    await expect(page.getByTestId('setter-dimension-3D')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-dimension-2D')).toHaveAttribute('aria-pressed', 'false');
    for (const v of SETTER) await expect(page.getByTestId(`setter-p-${v}`)).toBeVisible();
    // the initial p is the machine real 0.5: the 1/2 button is shown selected (as in the original snapshot)
    await expect(page.getByTestId('setter-p-1/2')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('slider-p')).toHaveValue('0.5');
    await expect(page.getByTestId('value-p')).toHaveValue('0.5');
    await expect(page.getByTestId('plot-label')).toContainText(`0.5${HYPHEN}norm`);
    await expect(page.getByTestId('formula')).toContainText('z');
    await expect(page.getByTestId('plus-p')).toBeVisible();
    expect(await state(page)).toEqual({ dimension: '3D', p: 0.5 });
  });

  test('every setter value draws in both modes and shows its label', async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const dim of ['3D', '2D']) {
      await page.getByTestId(`setter-dimension-${dim}`).click();
      for (const v of SETTER) {
        await page.getByTestId(`setter-p-${v}`).click();
        await expect(page.getByTestId(`setter-p-${v}`)).toHaveAttribute('aria-pressed', 'true');
        const st = await state(page);
        expect(st).toEqual({ dimension: dim, p: v });
        const shown = v === 'Infinity' ? '∞' : v.replace('/', '');
        await expect(page.getByTestId('plot-label')).toContainText(`${shown}${HYPHEN}norm`);
        await drawn(page, dim === '2D' ? 0.2 : 0.02);
        const s = await page.evaluate(() => window.__demo.stats());
        expect(s.mode).toBe(dim);
        if (['1/2', '1', '2', 'Infinity'].includes(v)) await reviewShot(page, testInfo, `unit-balls-${dim}-p${v.replace('/', '-')}`);
      }
    }
  });

  test('the formula switches with the dimension', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-dimension-2D').click();
    await expect(page.getByTestId('formula')).not.toContainText('z');
    await expect(page.getByTestId('formula')).toContainText('y');
    expect((await view(page)).kind).toBe('Plot3D');
    await page.getByTestId('setter-dimension-3D').click();
    await expect(page.getByTestId('formula')).toContainText('z');
    expect((await view(page)).kind).toBe('RegionPlot3D');
  });

  test('moving the slider with the mouse sets p to a machine real', async ({ page }) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('slider-p').boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 9, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.45, y, { steps: 6 });
    await page.mouse.up();
    const st = await state(page);
    expect(typeof st.p).toBe('number');
    expect(st.p).toBeGreaterThan(3);
    expect(st.p).toBeLessThan(10);
    const v = await view(page);
    expect(v.valueText).toBe(String(st.p).includes('.') ? String(st.p) : `${st.p}.`);
    await expect(page.getByTestId('plot-label')).toContainText(`${v.valueText}${HYPHEN}norm`);
    // keyboard on the focused slider: one step of 0.01
    await page.getByTestId('slider-p').press('ArrowRight');
    expect((await state(page)).p).toBeCloseTo(st.p + 0.01, 9);
    // the slider at exactly 2 gives the real 2. — shown "2." — and selects the 2 button (numeric comparison)
    await page.evaluate(() => window.__demo.setState({ p: 2 }));
    await expect(page.getByTestId('plot-label')).toContainText(`2.${HYPHEN}norm`);
    await expect(page.getByTestId('setter-p-2')).toHaveAttribute('aria-pressed', 'true');
  });

  test('choosing infinity puts the slider at its left end and shows ∞', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-p-Infinity').click();
    await expect(page.getByTestId('slider-p')).toHaveValue('0.1');
    await expect(page.getByTestId('value-p')).toHaveValue('∞');
    await expect(page.getByTestId('plot-label')).toContainText(`∞${HYPHEN}norm`);
    const v = await view(page);
    expect(v.plotPoints).toBe(23);
    // the setter's exact values move the slider to their position
    await page.getByTestId('setter-p-9').click();
    await expect(page.getByTestId('slider-p')).toHaveValue('9');
    await expect(page.getByTestId('value-p')).toHaveValue('9');
  });

  test('typing a value into the value field sets p (exact or real)', async ({ page }) => {
    await openDemo(page, URL);
    const field = page.getByTestId('value-p');
    await field.fill('1/4');
    await field.press('Enter');
    expect((await state(page)).p).toBe('1/4');
    await expect(page.getByTestId('setter-p-1/4')).toHaveAttribute('aria-pressed', 'true');
    await field.fill('2.5');
    await field.press('Enter');
    expect((await state(page)).p).toBe(2.5);
    await expect(page.getByTestId('plot-label')).toContainText(`2.5${HYPHEN}norm`);
    await expect(page.getByTestId('slider-p')).toHaveValue('2.5');
    for (const refused of ['abc', '1e1', '0.0005']) {
      await field.fill(refused);
      await field.press('Enter');
      expect((await state(page)).p).toBe(2.5);
      await expect(field).toHaveValue('2.5');
    }
  });

  test('mouse drag rotates the view, and a control change shows the default view again', async ({ page }) => {
    await openDemo(page, URL);
    await drawn(page, 0.04);
    const p0 = await page.evaluate(() => window.__demo.cameraPosition());
    const box = await page.getByTestId('scene-canvas').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.6);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5, { steps: 8 });
    await page.mouse.up();
    const p1 = await page.evaluate(() => window.__demo.cameraPosition());
    expect(Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])).toBeGreaterThan(0.3);
    // a new evaluation of the Manipulate body makes a new graphic with the default ViewPoint (Q-UB-03)
    await page.getByTestId('setter-p-2').click();
    const p2 = await page.evaluate(() => window.__demo.cameraPosition());
    for (let i = 0; i < 3; i++) expect(p2[i]).toBeCloseTo(p0[i], 9);
    expect(p0[0]).toBeCloseTo(1.3, 9); // ViewPoint {1.3, -2.4, 2} in the scaled box
    expect(p0[1]).toBeCloseTo(-2.4, 9);
    expect(p0[2]).toBeCloseTo(2, 9);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('setter-dimension-2D').click();
    await page.getByTestId('setter-p-Infinity').click();
    await page.getByTestId('reset').click();
    expect(await state(page)).toEqual({ dimension: '3D', p: 0.5 });
    await expect(page.getByTestId('setter-p-1/2')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('setter-dimension-3D')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('slider-p')).toHaveValue('0.5');
    await expect(page.getByTestId('plot-label')).toContainText(`0.5${HYPHEN}norm`);
  });

  test('redraws after a WebGL context loss (port addition)', async ({ page }) => {
    await openDemo(page, URL);
    await drawn(page, 0.04);
    const r = await inkAfterContextRestore(page);
    test.skip(!r.supported, 'WEBGL_lose_context not offered by this browser');
    expect(r.ink).toBeGreaterThan(0.04);
  });
});
