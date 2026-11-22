// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Whasington Silvestre
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/three-charges-electrostatics.spec.js — browser tests of the "Electrostatics of a Linear System of Three
// Charged Particles" page with real mouse and keyboard (attribution, start-up notice, UI inventory and bundle are in
// site.spec.js and bundle.spec.js)
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openDemo } from './helpers.js';

const PAGE = '/demos/three-charges-electrostatics/';
const golden = JSON.parse(readFileSync(new URL('../golden/three-charges-electrostatics.original-states.json', import.meta.url), 'utf8'));
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const attr = (page, id, name) => page.getByTestId(id).getAttribute(name);

/** Drag a slider's thumb with the mouse to the fraction f of its track. */
async function dragSlider(page, name, f) {
  const box = await page.getByTestId(`slider-${name}`).boundingBox();
  const v0 = await page.getByTestId(`slider-${name}`).inputValue();
  const min = Number(await page.getByTestId(`slider-${name}`).getAttribute('min')), max = Number(await page.getByTestId(`slider-${name}`).getAttribute('max'));
  const y = box.y + box.height / 2, x0 = box.x + 8 + ((Number(v0) - min) / (max - min)) * (box.width - 16);
  await page.mouse.move(x0, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 8 + f * (box.width - 16), y, { steps: 8 });
  await page.mouse.up();
}

test.describe('three-charges-electrostatics', () => {
  test('loads without errors and draws the opening picture', async ({ page }) => {
    const problems = await openDemo(page, PAGE);
    expect(problems).toEqual([]);
    await expect(page.getByTestId('scene-svg')).toBeVisible();
    for (const id of ['charge-1', 'charge-2', 'charge-t', 'sign-1', 'sign-2', 'sign-t', 'equilibrium-point', 'arrow-f1t', 'arrow-f2t', 'arrow-e1', 'arrow-e2', 'icon-qt', 'icon-xt', 'axis-arrowheads', 'force-curve', 'field-curve']) {
      await expect(page.getByTestId(id)).toHaveCount(1);
    }
    expect(await attr(page, 'charge-1', 'data-color')).toBe('red');
    expect(await attr(page, 'charge-t', 'data-color')).toBe('black');
    expect(await attr(page, 'force-curve', 'data-visible')).toBe('false');
    await expect(page.getByTestId('table-xt')).toHaveCount(0);
    await expect(page.getByTestId('table-eq')).toHaveCount(0);
    await expect(page.getByTestId('sign-t')).toHaveText('-');
    await expect(page.getByTestId('sign-1')).toHaveText('+');
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, PAGE);
    await expect(page.getByTestId('value-q1')).toHaveValue('5');
    await expect(page.getByTestId('value-q2')).toHaveValue('5');
    await expect(page.getByTestId('value-qt')).toHaveValue('-5');
    await expect(page.getByTestId('value-x1')).toHaveValue('0');
    await expect(page.getByTestId('value-x2')).toHaveValue('5');
    await expect(page.getByTestId('value-xt')).toHaveValue('-8.');
    for (const c of ['force', 'field', 'status', 'edata']) await expect(page.getByTestId(`check-${c}`)).not.toBeChecked();
    expect(await state(page)).toMatchObject(golden.specs);
  });

  test('a charge slider skips 0 with the keyboard', async ({ page }) => {
    await openDemo(page, PAGE);
    await page.getByTestId('slider-q1').focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).q1).toBe(-1);
    await expect(page.getByTestId('value-q1')).toHaveValue('-1');
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).q1).toBe(1);
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).q1).toBe(20);
    await page.keyboard.press('Home');
    await expect.poll(async () => (await state(page)).q1).toBe(-20);
    expect(await attr(page, 'charge-1', 'data-color')).toBe('black');
    await expect(page.getByTestId('sign-1')).toHaveText('-');
  });

  test('a typed charge goes to the nearest value of the list', async ({ page }) => {
    await openDemo(page, PAGE);
    await page.getByTestId('value-q2').fill('-7');
    await page.getByTestId('value-q2').press('Enter');
    await expect.poll(async () => (await state(page)).q2).toBe(-7);
    await page.getByTestId('value-qt').fill('0');
    await page.getByTestId('value-qt').press('Enter');
    await expect.poll(async () => (await state(page)).qt).toBe(-1);
    await expect(page.getByTestId('value-qt')).toHaveValue('-1');
  });

  test('dragging the position sliders with the mouse moves the charges', async ({ page }) => {
    await openDemo(page, PAGE);
    await dragSlider(page, 'x2', 0);
    await expect.poll(async () => (await state(page)).x2).toBe(-10);
    await dragSlider(page, 'x1', 1);
    await expect.poll(async () => (await state(page)).x1).toBe(10);
    await dragSlider(page, 'xt', 0.5);
    await expect.poll(async () => Math.abs((await state(page)).xt)).toBeLessThan(1);
    const s = await state(page);
    // F1t: q1 = 5 at 10 attracts qt = −5 towards +x
    const v = await view(page);
    expect(v.f1t).toBeCloseTo((8.99e9 * 25e-12) / (10 - s.xt) ** 2, 9);
  });

  test('the checkboxes show the curves and the tables', async ({ page }) => {
    await openDemo(page, PAGE);
    await page.getByTestId('check-force').click();
    await expect.poll(() => attr(page, 'force-curve', 'data-visible')).toBe('true');
    expect(await attr(page, 'field-curve', 'data-visible')).toBe('false');
    await page.getByTestId('check-field').click();
    await expect.poll(() => attr(page, 'field-curve', 'data-visible')).toBe('true');
    await page.getByTestId('check-status').click();
    await expect(page.getByTestId('table-xt')).toHaveCount(1);
    await expect(page.getByTestId('table-xt')).toContainText('−8.0000');
    await page.getByTestId('check-edata').click();
    await expect(page.getByTestId('table-eq')).toHaveCount(1);
    await expect(page.getByTestId('table-eq')).toContainText('2.5000');
    await expect.poll(() => attr(page, 'equilibrium-point', 'data-x')).toBe('2.5');
    await page.getByTestId('check-edata').click();
    await expect(page.getByTestId('table-eq')).toHaveCount(0);
  });

  test('equal and opposite charges: ±∞, and everywhere when they coincide', async ({ page }) => {
    await openDemo(page, PAGE);
    await page.getByTestId('check-edata').click();
    await page.getByTestId('value-q2').fill('-5');
    await page.getByTestId('value-q2').press('Enter');
    await expect(page.getByTestId('table-eq')).toContainText('±∞');
    await page.getByTestId('value-x2').fill('0');
    await page.getByTestId('value-x2').press('Enter');
    await expect(page.getByTestId('table-eq')).toContainText('everywhere');
    expect(await attr(page, 'equilibrium-point', 'data-x')).toBe('20');
  });

  test('xt typed onto x1 shows Indeterminate and no icon arrows', async ({ page }) => {
    await openDemo(page, PAGE);
    await page.getByTestId('check-status').click();
    await page.getByTestId('value-xt').fill('0');
    await page.getByTestId('value-xt').press('Enter');
    await expect(page.getByTestId('table-xt')).toContainText('Indeterminate');
    for (const id of ['arrow-f1t', 'arrow-f2t', 'arrow-e1', 'arrow-e2']) await expect(page.getByTestId(id)).toHaveCount(0);
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, PAGE);
    const opening = await state(page);
    await page.getByTestId('check-force').click();
    await page.getByTestId('slider-qt').focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await state(page)).qt).toBe(20);
    await page.getByTestId('reset').click();
    await expect.poll(() => state(page)).toEqual(opening);
    await expect(page.getByTestId('value-qt')).toHaveValue('-5');
    await expect(page.getByTestId('check-force')).not.toBeChecked();
  });

  /** The settings of snapshot k (saved states) give its tables and curves. */
  async function checkSnapshot(page, k) {
    await openDemo(page, PAGE);
    const snap = golden.snapshots[k];
    await page.evaluate((s) => window.__demo.setState(s), snap);
    await expect.poll(async () => (await state(page)).xt).toBe(snap.xt);
    const v = await view(page);
    await expect(page.getByTestId('table-xt')).toHaveCount(snap.status ? 1 : 0);
    await expect(page.getByTestId('table-eq')).toHaveCount(snap.edata ? 1 : 0);
    expect(await attr(page, 'force-curve', 'data-visible')).toBe(String(snap.force));
    expect(await attr(page, 'charge-t', 'data-color')).toBe(snap.qt < 0 ? 'black' : 'red');
    return v;
  }
  test("snapshot 1: the settings give the snapshot's picture and tables", async ({ page }) => {
    await checkSnapshot(page, '1');
    expect(await attr(page, 'equilibrium-point', 'data-x')).toBe('20');
  });
  test("snapshot 2: the settings give the snapshot's picture and tables", async ({ page }) => {
    await checkSnapshot(page, '2');
    await expect(page.getByTestId('table-xt')).toContainText('−0.0099');
  });
  test("snapshot 3: the settings give the snapshot's picture and tables", async ({ page }) => {
    const v = await checkSnapshot(page, '3');
    expect(v.xe).toBeCloseTo(-4, 12);
    await expect(page.getByTestId('table-eq')).toContainText('−4.0000');
  });
  test("snapshot 4: the settings give the snapshot's picture and tables", async ({ page }) => {
    await checkSnapshot(page, '4');
    await expect(page.getByTestId('table-eq')).toContainText('−1.6321');
    await expect(page.getByTestId('table-xt')).toContainText('−0.1224');
  });
});
