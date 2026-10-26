// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/clock.test.js — shared/clock.js: AbsoluteTime[], the fixed clock for tests, and animate() with a stand-in
// for the browser's animation frames.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { absoluteTime, setClock, animate } from '../../shared/clock.js';

describe('clock', () => {
  let frames;
  beforeEach(() => {
    frames = [];
    globalThis.requestAnimationFrame = (f) => { frames.push(f); return frames.length; };
    globalThis.cancelAnimationFrame = (id) => { frames[id - 1] = null; };
  });
  afterEach(() => { setClock(null); delete globalThis.requestAnimationFrame; delete globalThis.cancelAnimationFrame; });
  const runFrame = () => { const f = frames.pop(); frames.length = 0; f?.(); };

  it('absoluteTime() is AbsoluteTime[]: seconds since 1900-01-01 (2208988800 s before the Unix epoch)', () => {
    expect(Math.abs(absoluteTime() - (Date.now() / 1000 + 2208988800))).toBeLessThan(5);
  });
  it('setClock(t) fixes the clock; setClock(null) returns to the real one', () => {
    setClock(1234.5);
    expect(absoluteTime()).toBe(1234.5);
    setClock(null);
    expect(absoluteTime()).toBeGreaterThan(3e9);
  });
  it('animate: step(t, dt, elapsed) once per frame from the clock; false or stop() ends it', () => {
    const calls = [];
    setClock(100);
    const stop = animate((t, dt, elapsed) => { calls.push([t, dt, elapsed]); return t < 103; });
    runFrame(); setClock(101.5); runFrame(); setClock(103); runFrame(); setClock(104); runFrame();
    expect(calls).toEqual([[100, 0, 0], [101.5, 1.5, 1.5], [103, 1.5, 3]]); // the third returned false: no fourth call
    const more = [];
    const stop2 = animate((t) => { more.push(t); });
    runFrame(); stop2(); runFrame();
    expect(more).toEqual([104]);
    stop();
  });
  it('animate: no negative step when the clock goes back, and no jump when it switches between real and fixed', () => {
    const calls = [];
    const stop = animate((t, dt, elapsed) => { calls.push([dt, elapsed]); });
    runFrame(); // real clock
    setClock(5); runFrame(); // switched to a fixed time far in the past: step 0
    setClock(6); runFrame(); // fixed clock stepped: 1
    setClock(4); runFrame(); // backwards: 0
    setClock(null); runFrame(); // back to the real clock: 0
    stop();
    expect(calls).toEqual([[0, 0], [0, 0], [1, 1], [0, 1], [0, 1]]);
  });
});
