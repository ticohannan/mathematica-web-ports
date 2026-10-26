// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/clock.js — the page's one clock (v0.1.25), for everything that moves with time: a Manipulate body that reads
// AbsoluteTime[] (shared/manipulate.js `clock`), the sliders' ⊕ animation (shared/ui.js) and app animations such as
// euler-angles' bookmark tour. Tests fix the time with setClock(t) (window.__demo.setClock) and step it, so that
// animations become deterministic.
//
//   absoluteTime()        Mathematica's AbsoluteTime[]: seconds since 1900-01-01 00:00 (UTC here; Mathematica counts
//                         in the local time zone — only differences are used)
//   setClock(t | null)    fix the clock at t (seconds, as absoluteTime) or return to the real clock
//   animate(step)         call step(t, dt, elapsed) once per animation frame, t = absoluteTime(), dt = seconds since the
//                         last frame (0 on the first, never negative, 0 when the clock switched between real and fixed),
//                         elapsed = the sum of the dt; step returning false stops it; returns stop()

const UNIX_TO_1900 = 2208988800;
let fixed = null;
let mode = 0; // changes when the clock switches between real and fixed: animations then restart their step from there

export const absoluteTime = () => fixed ?? (typeof performance !== 'undefined' && performance.timeOrigin
  ? performance.timeOrigin + performance.now() : Date.now()) / 1000 + UNIX_TO_1900;

export const setClock = (t) => {
  const next = t ?? null;
  if ((next === null) !== (fixed === null)) mode++;
  fixed = next;
};

export function animate(step) {
  let raf = 0, last = null, elapsed = 0, seen = mode, stopped = false;
  const frame = () => {
    raf = 0;
    if (stopped) return;
    const t = absoluteTime();
    // dt ≥ 0, and 0 across a switch between the real and a fixed clock (their times are unrelated); elapsed is the sum
    let dt = last === null || seen !== mode ? 0 : Math.max(0, t - last);
    seen = mode; last = t; elapsed += dt;
    if (step(t, dt, elapsed) === false) { stopped = true; return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { stopped = true; if (raf) cancelAnimationFrame(raf); raf = 0; };
}
