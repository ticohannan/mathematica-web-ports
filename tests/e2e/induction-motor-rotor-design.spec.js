// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Harley H. Hartman
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/induction-motor-rotor-design.spec.js — browser tests of the "AC Induction Motor Rotor Design" page (attribution,
// start-up notice, UI inventory and bundle are in site.spec.js and bundle.spec.js; the errata switch in errata-mode.spec.js).
// Review screenshots at the snapshot settings (compare: docs/original-snapshots/induction-motor-rotor-design-*.png).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';
import { evaluate } from '../../demos/induction-motor-rotor-design/model.js';

const URL = '/demos/induction-motor-rotor-design/';
const state = (page) => page.evaluate(() => window.__demo.getState());
const view = (page) => page.evaluate(() => window.__demo.view());
const fx = JSON.parse(fs.readFileSync('tests/golden/induction-motor-rotor-design.original-states.json', 'utf8'));
// the labels printed in the snapshot pictures (read off docs/original-snapshots/induction-motor-rotor-design-k.png)
const PRINTED = {
  1: ['149 % full load', '313 % full load', '1344 rpm', '1725'],
  2: ['94 % full load', '313 % full load', '1523 rpm', '1754'],
  3: ['113 % full load', '313 % full load', '1462 rpm', '1745'],
  4: ['311 % full load', '313 % full load', '162 rpm', '1531'],
};
// the drawn text of a label: its lines (text nodes) joined by single spaces
const drawn = (page, id) => page.getByTestId(id).evaluate((g) => {
  const parts = [], w = document.createTreeWalker(g, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) parts.push(w.currentNode.nodeValue);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
});
// the page's labels agree with the model evaluated here, in Node, at the page's own state
const agrees = async (page) => {
  const s = await state(page);
  return JSON.stringify((await view(page)).labels) === JSON.stringify(evaluate(s).view.labels);
};

test.describe('induction-motor-rotor-design', () => {
  test('loads without errors and draws the picture', async ({ page }) => {
    const problems = await openDemo(page, URL);
    expect(problems).toEqual([]);
    for (const id of ['locked-arrow', 'locked-label', 'max-arrow', 'max-label', 'full-load-arrow', 'full-load-label', 'axis-x', 'axis-y']) {
      await expect(page.getByTestId(id).first(), id).toBeAttached();
    }
    expect(await drawn(page, 'locked-label')).toBe('locked rotor torque 149 % full load');
    expect(await drawn(page, 'max-label')).toBe('max torque 313 % full load 1344 rpm');
    expect(await drawn(page, 'full-load-label')).toBe('full load torque 1725 rpm');
    await expect(page.getByTestId('axis-x')).toContainText('speed');
    await expect(page.getByTestId('axis-y')).toContainText('% full load');
  });

  test('has its controls with their defaults', async ({ page }) => {
    await openDemo(page, URL);
    expect(await state(page)).toMatchObject({ e: 150, r: 0.107, x: 0.422 });
    await expect(page.getByTestId('value-e')).toHaveValue('150');
    await expect(page.getByTestId('value-r')).toHaveValue('0.107');
    await expect(page.getByTestId('value-x')).toHaveValue('0.422');
    for (const k of ['A', 'B', 'D']) await expect(page.getByTestId(`button-${k}`)).toBeVisible();
    await expect(page.locator('#controls')).toContainText('NEMA design');
    await expect(page.locator('#controls')).toContainText('blocked rotor voltage (EBR)');
  });

  test('the arrow keys move the blocked rotor voltage and the picture follows', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('slider-e').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).e).toBeGreaterThan(150);
    await expect.poll(() => agrees(page)).toBe(true);
    await expect.poll(() => drawn(page, 'max-label')).not.toBe('max torque 313 % full load 1344 rpm');
  });

  test('a mouse press on the rotor resistance slider sets r and the labels', async ({ page }) => {
    await openDemo(page, URL);
    const box = await page.getByTestId('slider-r').boundingBox();
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height / 2);
    await expect.poll(async () => (await state(page)).r).toBeGreaterThan(0.4);
    await expect.poll(() => agrees(page)).toBe(true);
    const r = (await state(page)).r;
    expect(r).toBeLessThan(0.8);
    // r > x = 0.422: the maximum is off the plot, the label says 0 rpm (E-IM-02, kept)
    await expect.poll(() => drawn(page, 'max-label')).toBe('max torque 313 % full load 0 rpm');
  });

  test('a value typed into the reactance field is used, and one outside the range is kept within it', async ({ page }) => {
    await openDemo(page, URL);
    const field = page.getByTestId('value-x');
    await field.fill('0.3');
    await field.press('Enter');
    await expect.poll(async () => (await state(page)).x).toBeCloseTo(0.3, 9);
    await expect.poll(() => drawn(page, 'max-label')).toBe('max torque 440 % full load 1158 rpm');
    await field.fill('5');
    await field.press('Enter');
    await expect.poll(async () => (await state(page)).x).toBeCloseTo(0.85, 9); // D-IM-03
    await expect.poll(() => agrees(page)).toBe(true);
  });

  test('the NEMA design buttons set r, x and e', async ({ page }) => {
    await openDemo(page, URL);
    await page.getByTestId('button-B').click();
    await expect.poll(() => state(page)).toMatchObject({ r: 0.0792, x: 0.405, e: 158 });
    await expect(page.getByTestId('value-e')).toHaveValue('158');
    expect(await drawn(page, 'locked-label')).toBe('locked rotor torque 136 % full load');
    await page.getByTestId('button-D').click();
    await expect.poll(() => state(page)).toMatchObject({ r: 0.384, x: 0.384, e: 150 });
    expect(await drawn(page, 'max-label')).toBe('max torque 344 % full load 0 rpm');
    await page.getByTestId('button-A').click();
    await expect.poll(() => state(page)).toMatchObject({ r: 0.065, x: 0.3263, e: 150 });
    await expect.poll(() => drawn(page, 'full-load-label')).toBe('full load torque 1755 rpm');
  });

  test('Initial settings restores the opening state', async ({ page }) => {
    await openDemo(page, URL);
    const opening = await state(page);
    await page.getByTestId('button-D').click();
    await page.evaluate(() => window.__demo.setState({ e: 200 }));
    await page.getByTestId('reset').click();
    await expect.poll(() => state(page)).toEqual(opening);
    expect(await drawn(page, 'locked-label')).toBe('locked rotor torque 149 % full load');
  });

  test("the snapshot settings show the snapshots' labels + screenshots for review", async ({ page }, testInfo) => {
    await openDemo(page, URL);
    for (const k of Object.keys(fx.snapshots)) {
      await page.evaluate((st) => window.__demo.setState(st), fx.snapshots[k]);
      const [locked, max, rpm, fl] = PRINTED[k];
      await expect.poll(() => drawn(page, 'locked-label'), `snapshot ${k}`).toBe(`locked rotor torque ${locked}`);
      expect(await drawn(page, 'max-label')).toBe(`max torque ${max} ${rpm}`);
      expect(await drawn(page, 'full-load-label')).toBe(`full load torque ${fl} rpm`);
      await reviewShot(page, testInfo, `induction-motor-rotor-design-snapshot-${k}`);
    }
  });
});
