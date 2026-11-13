// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/e2e-lint.test.js — patterns in the browser tests that make them fail by timing (v0.1.39, selective testing
// §6). A clock race: a test presses an animation's play button and then moves the fixed page clock (setClock) before
// the animation's first frame has run; that frame records the start time, so when it comes late (a busy machine) the
// animation starts at the moved time and, with the clock fixed, never advances (quarter-car-suspension, v0.1.38a).
// The wait is two animation frames (requestAnimationFrame, or a helper defined with it, e.g. `frames()`). Within a test the
// clicks on one play button alternate between start and pause; only a start counts.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const specs = fs.readdirSync('tests/e2e').filter((f) => f.endsWith('.spec.js'));

/** [line numbers (1-based) of a play click followed by a non-null setClock without a frame wait between] */
export function clockRaces(src) {
  const lines = src.split('\n');
  const helpers = [...src.matchAll(/const (\w+)\s*=\s*\([^)]*\)\s*=>[^\n]*requestAnimationFrame/g)].map((m) => m[1]);
  const waits = (l) => l.includes('requestAnimationFrame') || helpers.some((h) => new RegExp(`\\b${h}\\(`).test(l));
  const out = [];
  let clicks = new Map(); // per test: clicks per play button (odd: starts the animation, even: pauses it)
  lines.forEach((l, i) => {
    if (/^\s*test\(/.test(l)) clicks = new Map();
    const m = l.match(/getByTestId\(\s*['"`]((?:play|trigger-play)-[^'"`]*)['"`]\s*\)\.click\(/);
    if (!m) return;
    clicks.set(m[1], (clicks.get(m[1]) ?? 0) + 1);
    if (clicks.get(m[1]) % 2 === 0) return; // a pause
    for (let j = i + 1; j < lines.length; j++) {
      if (waits(lines[j]) || /getByTestId\(\s*['"`](?:play|trigger-play)-/.test(lines[j])) return;
      if (/setClock\(\s*(?!null)[^)\s]/.test(lines[j])) { out.push(i + 1); return; }
      if (/^\s*\}\);?\s*$/.test(lines[j])) return; // end of the test
    }
  });
  return out;
}

describe('browser-test lint', () => {
  it('the detector: a race, a wait, a helper wait, setClock(null)', () => {
    const play = "    await page.getByTestId('trigger-play-time').click();";
    expect(clockRaces([play, '    await page.evaluate(() => window.__demo.setClock(1.1));', '  });'].join('\n'))).toEqual([1]);
    expect(clockRaces([play, '    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));', '    await page.evaluate(() => window.__demo.setClock(1.1));'].join('\n'))).toEqual([]);
    expect(clockRaces(['const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));', play, '    await frames();', '    await page.evaluate((t) => window.__demo.setClock(t), T + 1);'].join('\n'))).toEqual([]);
    expect(clockRaces([play, '    await page.evaluate(() => window.__demo.setClock(null));'].join('\n'))).toEqual([]);
    // the second click pauses: a setClock after it is no race
    expect(clockRaces(['  test(\'x\', async () => {', play, '    await frames();', play, '    await page.evaluate((t) => window.__demo.setClock(t), T + 10);'].join('\n').replace('await frames();', 'await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));'))).toEqual([]);
  });
  it.each(specs)('%s: no play click followed by setClock without waiting for the first frame', (spec) => {
    expect(clockRaces(fs.readFileSync(`tests/e2e/${spec}`, 'utf8'))).toEqual([]);
  });
});
