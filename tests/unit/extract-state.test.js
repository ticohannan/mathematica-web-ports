// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/extract-state.test.js — the notebook extraction tools and the fixtures they wrote:
//  * runs the Python self-test of tools/extract_state.py (synthetic notebook, no private notebook needed) when a
//    Python 3 interpreter is found, and skips it otherwise;
//  * checks the committed snapshot fixtures tests/golden/<dir>.original-states.json (format in docs/TESTING.md)
//    against the snapshot pictures and the older single-state fixtures.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { loadStates, plain, isExact, exactPaths, isIntegerLiteral } from '../../tools/lib/wl-json.mjs';

const APPS = ['art-gallery', 'prm', 'prm-robot-arm', 'prm-seven-link', 'robot-singularities', 'car-paths', 'unit-balls'];

/** a command that runs Python 3, or null */
function findPython() {
  for (const cmd of ['python3', 'python', 'py']) {
    const r = spawnSync(cmd, ['-c', 'import sys; print(sys.version_info[0])'], { encoding: 'utf8', timeout: 20000 });
    if (r.status === 0 && r.stdout.trim() === '3') return cmd;
  }
  return null;
}
const python = findPython();

describe('extraction tools', () => {
  it.skipIf(!python)('extract_state.py --self-test passes (exact numbers, Greek names, byte arrays, legacy output unchanged)', () => {
    const r = spawnSync(python, ['tools/extract_state.py', '--self-test'], { encoding: 'utf8', timeout: 60000 });
    expect(r.stdout + r.stderr).toMatch(/extract_state self-test: (\d+) of \1 checks passed/);
    expect(r.status).toBe(0);
  });
  it('isIntegerLiteral tells an exact integer from a machine real written with a point', () => {
    const text = '{"a": [2, 2.0, 1e-05, -3]}';
    expect([0, 1, 2, 3].map((i) => isIntegerLiteral(text, ['a', i]))).toEqual([true, false, false, true]);
  });
  it('plain replaces exact numbers by their doubles and Infinity by the given value', () => {
    const v = { p: { wl: 'Infinity' }, q: [{ wl: '1/2', n: 0.5 }, 3], s: 'x', big: { wl: '9007199254740993' } };
    expect(plain(v)).toEqual({ p: Infinity, q: [0.5, 3], s: 'x', big: 9007199254740992 });
    expect(plain(v, { infinity: 'Infinity' }).p).toBe('Infinity');
    expect(exactPaths(v)).toEqual([['p'], ['q', 0], ['big']]);
    // the older encoding {wl, value} is read too
    expect(plain({ a: { wl: '1/2', value: 0.5 }, b: { wl: 'Infinity', value: null } })).toEqual({ a: 0.5, b: Infinity });
  });
});

describe.each(APPS)('snapshot fixture of %s', (dir) => {
  const file = `tests/golden/${dir}.original-states.json`;
  const fx = loadStates(file);
  const pictures = fs.readdirSync('docs/original-snapshots').filter((f) => new RegExp(`^${dir}-\\d+\\.png$`).test(f));

  it('has one snapshot state per snapshot picture, with distinct cell ids', () => {
    expect(fx.count).toBe(pictures.length);
    expect(fx.cellIds.every((c) => Number.isInteger(c))).toBe(true);
    expect(new Set(fx.cellIds).size).toBe(fx.count);
  });
  it('has the live state and the initial settings, and every snapshot sets the same variables as the live state', () => {
    expect(fx.raw.states.length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(fx.specs).sort()).toEqual(Object.keys(fx.live).sort());
    for (const s of fx.snapshots) expect(Object.keys(s).sort()).toEqual(Object.keys(fx.live).sort());
  });
  it('the live state agrees with the older single-state fixture (tests/golden/<dir>.original-state.json)', () => {
    const old = JSON.parse(fs.readFileSync(`tests/golden/${dir}.original-state.json`, 'utf8')).state;
    const live = plain(fx.live);
    for (const [k, v] of Object.entries(old)) expect(live[k], k).toEqual(v);
  });
  it('holds no element the parser could not read, and every exact number has its Wolfram text and its double where one exists', () => {
    const text = fs.readFileSync(file, 'utf8');
    expect(text).not.toMatch(/"unparsed"/);
    const get = (v, path) => path.reduce((o, k) => o[k], v);
    for (const path of exactPaths(fx.raw)) {
      const e = get(fx.raw, path);
      expect(isExact(e)).toBe(true);
      expect(typeof e.wl).toBe('string');
      expect(Object.keys(e).every((k) => k === 'wl' || k === 'n'), path.join('.')).toBe(true); // harness encoding
      if (!('n' in e)) expect(e.wl).toMatch(/^-?(Infinity|\d+)$/); // no double: Infinity or an integer above 2^53 - 1
      else expect(typeof e.n).toBe('number');
    }
  });
});
