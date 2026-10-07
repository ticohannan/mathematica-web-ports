// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/random.js — injectable random source for ports of Wolfram code that calls RandomReal /
// RandomInteger. JavaScript cannot reproduce Mathematica's random stream, so a port either
//   * uses a seeded generator (reproducible tests, but different numbers from the original), or
//   * REPLAYS numbers recorded from the original (wolframscript with SeedRandom, or a saved state),
//     which makes bit-level comparisons with the original possible.
// Model code takes an `rng` object with the two methods below and never calls Math.random itself.

/** mulberry32: small, fast, seedable 32-bit generator (uniform in [0, 1)). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random source with Mathematica-like calls.
 *   randomReal([a, b])            one real in [a, b]
 *   randomReal([a, b], [n, m])    n×m array (row-major, like RandomReal[{a, b}, {n, m}])
 *   randomInteger([a, b], n?)     integer(s) in a..b inclusive
 * `uniform` is any () => [0,1) function; default: seeded mulberry32 (seed 1) or Math.random if seed is null.
 */
export function createRng({ seed = 1, uniform } = {}) {
  const u = uniform ?? (seed === null ? Math.random : mulberry32(seed));
  const real = ([a, b]) => a + (b - a) * u();
  const fill = (dims, f) => (dims.length === 0 ? f() : Array.from({ length: dims[0] }, () => fill(dims.slice(1), f)));
  return {
    kind: 'generated',
    randomReal(range, dims) {
      if (dims === undefined) return real(range);
      return fill(Array.isArray(dims) ? dims : [dims], () => real(range));
    },
    randomInteger([a, b], n) {
      const one = () => a + Math.floor(u() * (b - a + 1));
      return n === undefined ? one() : fill(Array.isArray(n) ? n : [n], one);
    },
  };
}

/**
 * Replay source: returns recorded values in order. `reals` is a flat list consumed by randomReal
 * (shaped as requested), `integers` likewise for randomInteger. Throws when it runs out, so a test
 * never silently mixes recorded and generated numbers.
 */
export function replayRng({ reals = [], integers = [] } = {}) {
  let ri = 0, ii = 0;
  const nextReal = () => {
    if (ri >= reals.length) throw new Error('replayRng: recorded reals exhausted');
    return reals[ri++];
  };
  const nextInt = () => {
    if (ii >= integers.length) throw new Error('replayRng: recorded integers exhausted');
    return integers[ii++];
  };
  const fill = (dims, f) => (dims.length === 0 ? f() : Array.from({ length: dims[0] }, () => fill(dims.slice(1), f)));
  return {
    kind: 'replay',
    randomReal(range, dims) { return dims === undefined ? nextReal() : fill(Array.isArray(dims) ? dims : [dims], nextReal); },
    randomInteger(range, n) { return n === undefined ? nextInt() : fill(Array.isArray(n) ? n : [n], nextInt); },
    remaining: () => ({ reals: reals.length - ri, integers: integers.length - ii }),
  };
}
