// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/e2e/plot-regions.spec.js — the v0.1.26 additions of shared/plot.js and shared/graphics.js on the Manipulate layer
// in a real browser (tests/e2e/fixtures/plot-regions.html): RegionPlot, a folding ParametricPlot region, DensityPlot,
// a framed RegionPlot inset with an Epilog and LabelStyle, and an Arrow along a BSplineCurve; review screenshot.
import { test, expect } from '@playwright/test';
import { openDemo, reviewShot } from './helpers.js';

const pointsOf = (s) => s.trim().split(/\s+/).map((p) => p.split(',').map(Number));

test('region, parametric region and density plots: seamless faces, boundaries, a smoothed raster', async ({ page }) => {
  const problems = await openDemo(page, '/tests/e2e/fixtures/plot-regions.html');
  // RegionPlot: one <path> face (nonzero rule, ColorData[97, 1] at 0.3), two boundary curves (outer circle and hole)
  const region = page.getByTestId('region-svg');
  const face = region.getByTestId('region-face').locator('path');
  await expect(face).toHaveCount(1);
  await expect(face).toHaveAttribute('fill-rule', 'nonzero');
  await expect(face).toHaveAttribute('fill', 'rgb(94,129,181)');
  await expect(face).toHaveAttribute('fill-opacity', '0.3');
  await expect(region.getByTestId('region-boundary').locator('polyline')).toHaveCount(2);
  await expect(region.getByTestId('frame-label-bottom')).toHaveText('x');
  await expect(region.getByTestId('plot-label')).toHaveText('RegionPlot');
  const d0 = await face.getAttribute('d');
  await page.evaluate(() => window.__demo.setState({ r: 0.8 }));
  expect(await region.getByTestId('region-face').locator('path').getAttribute('d')).not.toBe(d0);
  // ParametricPlot region: PlotStyle Blue faces; the folding map gives each region two shapes; boundaries ColorData[97, i]
  const par = page.getByTestId('parametric-svg');
  for (const i of [1, 2]) {
    const shapes = par.getByTestId(`region-face-${i}`).locator('path');
    await expect(shapes).toHaveCount(2);
    await expect(shapes.first()).toHaveAttribute('fill', 'rgb(0,0,255)');
    await expect(shapes.first()).toHaveAttribute('fill-opacity', '0.3');
  }
  await expect(par.getByTestId('region-boundary-1').locator('polyline').first()).toHaveAttribute('stroke', 'rgb(94,129,181)');
  await expect(par.getByTestId('region-boundary-2').locator('polyline').first()).toHaveAttribute('stroke', 'rgb(225,156,36)');
  await expect(par.getByTestId('axis-x')).toContainText('x̂');
  expect(await par.getByTestId('axis-x').locator('text').first().getAttribute('fill')).toBe('rgb(0,0,0)'); // LabelStyle -> {Black}
  // DensityPlot: a 150 × 150 image, not pixelated, exactly over the plot range (the frame)
  const raster = page.getByTestId('density-svg').getByTestId('density-raster');
  await expect(raster).toHaveAttribute('data-width', '150');
  await expect(raster).toHaveAttribute('data-height', '150');
  await expect(raster).toHaveAttribute('data-smooth', 'true');
  expect(await raster.getAttribute('style')).toBe(null);
  const box = await raster.boundingBox();
  const [tl, br] = await page.evaluate(() => [window.__demo.worldToClient([-3, 3], 2), window.__demo.worldToClient([3, -3], 2)]);
  for (const [a, b] of [[box.x, tl.x], [box.y, tl.y], [box.x + box.width, br.x], [box.y + box.height, br.y]]) expect(Math.abs(a - b)).toBeLessThan(1);
  const href0 = await raster.getAttribute('href');
  await page.evaluate(() => window.__demo.setState({ a: 1 }));
  expect(await page.getByTestId('density-svg').getByTestId('density-raster').getAttribute('href')).not.toBe(href0);
  expect(problems).toEqual([]);
});

test('a framed RegionPlot inset: frame where ImageSize and the margins put it, bold black labels, clipped Epilog; a B-spline arrow', async ({ page }, testInfo) => {
  const problems = await openDemo(page, '/tests/e2e/fixtures/plot-regions.html');
  const outer = page.getByTestId('inset-svg');
  const inset = outer.getByTestId('inset-plot');
  await expect(inset).toHaveCount(1);
  const frame = inset.getByTestId('frame');
  await expect(frame).toContainText('−1.0');
  await expect(frame).toContainText('0.5');
  const tick = frame.locator('text').first();
  expect(await tick.getAttribute('font-weight')).toBe('bold'); // LabelStyle -> Directive[Black, Bold]
  expect(await tick.getAttribute('fill')).toBe('rgb(0,0,0)');
  expect(await frame.locator('polyline').first().getAttribute('stroke')).toBe('rgb(102,102,102)'); // the frame stays grey
  await expect(inset.getByTestId('frame-label-bottom')).toHaveText('Δx');
  await expect(inset.getByTestId('frame-label-left')).toHaveText('Δy');
  await expect(inset.locator('[clip-path]')).toHaveCount(1); // PlotRangeClipping (the clipPath lives inside the inset)
  await expect(inset.locator('[clip-path] rect')).toHaveCount(3); // the Epilog's two rectangles and the red square, clipped
  // ImageSize 230 px of the 520 px outer picture (2.08 units: u = 0.004) including the labels, centred at {1.38, 0.45};
  // margins left 60, right 10, bottom 42, top 8 px → the frame from {1.16, 0.198} to {1.80, 0.838}
  const [f0, f1, b0, b1] = await page.evaluate(() => [[1.16, 0.198], [1.8, 0.838], [0.92, 0.03], [1.84, 0.87]].map((p) => window.__demo.worldToClient(p, 3)));
  const fb = await frame.locator('polyline').first().boundingBox();
  for (const [a, b] of [[fb.x, f0.x], [fb.y + fb.height, f0.y], [fb.x + fb.width, f1.x], [fb.y, f1.y]]) expect(Math.abs(a - b)).toBeLessThan(1.5);
  const ib = await inset.boundingBox(); // everything drawn (ticks, labels) lies inside the 230 px box
  expect(ib.x).toBeGreaterThanOrEqual(b0.x - 1); expect(ib.x + ib.width).toBeLessThanOrEqual(b1.x + 1);
  expect(ib.y).toBeGreaterThanOrEqual(b1.y - 1); expect(ib.y + ib.height).toBeLessThanOrEqual(b0.y + 1);
  // Arrow[BSplineCurve[…]]: from the first control point to the last, the head at the end along the end tangent
  const arrowAt = async () => {
    const g = outer.getByTestId('bspline-arrow');
    const [line, head] = await Promise.all([g.locator('polyline').getAttribute('points'), g.locator('polygon').getAttribute('points')]);
    return { line: pointsOf(line), head: pointsOf(head), arc: (await page.evaluate(() => window.__demo.view())).arc };
  };
  let { line, head, arc } = await arrowAt();
  expect(line.length).toBeGreaterThan(100); // sampled finely
  expect(line[0][0]).toBeCloseTo(arc[0][0], 9); expect(line[0][1]).toBeCloseTo(arc[0][1], 9);
  expect(head[0][0]).toBeCloseTo(arc.at(-1)[0], 9); expect(head[0][1]).toBeCloseTo(arc.at(-1)[1], 9);
  const tangent = Math.atan2(arc.at(-1)[1] - arc.at(-2)[1], arc.at(-1)[0] - arc.at(-2)[0]);
  const axis = Math.atan2(head[0][1] - (head[1][1] + head[2][1]) / 2, head[0][0] - (head[1][0] + head[2][0]) / 2);
  expect(Math.abs(axis - tangent)).toBeLessThan(0.05);
  await page.evaluate(() => window.__demo.setState({ ang: 5 }));
  ({ head, arc } = await arrowAt());
  expect(head[0][0]).toBeCloseTo(arc.at(-1)[0], 9); expect(head[0][1]).toBeCloseTo(arc.at(-1)[1], 9);
  await page.evaluate(() => window.__demo.setState({ ang: 3, r: 0.5, a: 0 }));
  await reviewShot(page, testInfo, 'plot-regions');
  expect(problems).toEqual([]);
});
