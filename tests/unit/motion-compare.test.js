// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/motion-compare.test.js — the port-vs-original comparison tooling
// (tools/lib/motion-compare.mjs, tools/wolfram/mp-original.wls). Mathematica itself is not needed:
// these tests check the comparison logic, the exact number transfer and that the Wolfram script
// refers to variables that really exist in the original code.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  exactRational, sceneForWolfram, compareNumeric, compareLines, compareScene, portRecord,
  referenceFor, referenceFlags, goldenSelfCheck, randomScenes, withHistory, clampScene,
} from '../../tools/lib/motion-compare.mjs';

const golden = JSON.parse(fs.readFileSync('tests/golden/motion-planning.original-states.json', 'utf8')).states;
const named = JSON.parse(fs.readFileSync('tools/data/motion-scenes.json', 'utf8')).scenes;
const fromRational = (s) => { const [a, b] = s.split('/'); return b ? Number(BigInt(a)) / Number(BigInt(b)) : Number(a); };
const stateOf = (s) => ({ x: Math.round(s.x), n: Math.round(s.n), r1: s.r1, r2: s.r2, o1: s.o1, o2: s.o2, o3: s.o3, o4: s.o4 });

describe('exact number transfer to Mathematica', () => {
  it('writes every double as an exact m/2^k that reads back identically', () => {
    for (const x of [0, -0, 1, -2, 2.75, 0.1, 0.1 + 0.2, -1 / Math.sqrt(2), 2.895, 1e-17, 4.15, -4.25, 123456.789]) {
      const s = exactRational(x);
      expect(s).toMatch(/^-?\d+(\/\d+)?$/);
      expect(fromRational(s)).toBe(x === 0 ? 0 : x);
    }
    expect(exactRational(0.5)).toBe('1/2');
    expect(exactRational(-2.75)).toBe('-11/4');
  });
  it('named scenes survive the transfer bit for bit (alignment scenes depend on it)', () => {
    for (const s of named) {
      const w = sceneForWolfram(s);
      for (const k of ['r1', 'r2', 'o1', 'o2', 'o3', 'o4']) expect(w[k].map(fromRational)).toEqual(s[k]);
    }
  });
  it('history variant carries a prelude with the default robot position', () => {
    const h = sceneForWolfram(withHistory({ ...named[2] }));
    expect(h.id).toBe(`${named[2].id}~h`);
    expect(h.prelude.r1).toEqual(['-2', '11/4']);
  });
});

describe('comparison verdicts', () => {
  it('identical / last-bit / DIFFERENT', () => {
    expect(compareNumeric([[1, 2]], [[1, 2]]).status).toBe('identical');
    expect(compareNumeric([[1, 2]], [[1 + 2e-16, 2]]).status).toBe('last-bit');
    expect(compareNumeric([[1, 2]], [[1.001, 2]]).status).toBe('DIFFERENT');
    expect(compareNumeric([[1, 2]], [[1, 2], [3, 4]]).status).toBe('DIFFERENT');
  });
  it('line lists: same lines in another order are "reordered", missing lines are reported', () => {
    const a = [[[0, 0], [1, 1]], [[0, 0], [2, 0]]];
    expect(compareLines(a, [a[1], a[0]]).status).toBe('reordered');
    const d = compareLines(a, [a[0]]);
    expect(d.status).toBe('DIFFERENT');
    expect(d.onlyOrig).toEqual([a[1]]);
  });
  it('a scene compared with itself is identical; a changed route is DIFFERENT', () => {
    const st = stateOf(named[0]);
    const port = portRecord(st);
    const orig = { status: 'ok', messages: [], ...structuredClone(port) };
    expect(compareScene(orig, port).verdict).toBe('identical');
    orig.path = [port.path[0], [0, 0], port.path.at(-1)];
    const c = compareScene(orig, port);
    expect(c.verdict).toBe('DIFFERENT');
    expect(c.fields.path.status).toBe('DIFFERENT');
  });
  it('an unevaluated original path is reported, not crashed on', () => {
    const st = stateOf(named[0]);
    const port = portRecord(st);
    const orig = { status: 'ok', messages: ['First::normal'], ...structuredClone(port), path: 'WL:foo[]' };
    const c = compareScene(orig, port);
    expect(c.verdict).toBe('DIFFERENT');
    expect(c.notes.join(' ')).toMatch(/not a list of points/);
    expect(referenceFlags(st, referenceFor(st), orig)).toContain('path-undefined');
  });
  it('timeouts become original-error', () => {
    expect(compareScene({ status: 'timeout' }, portRecord(stateOf(named[0]))).verdict).toBe('original-error');
  });
});

describe('harness self-check against the original\'s saved states', () => {
  it('the port\'s own numbers pass the self-check (so the check can pass at all)', () => {
    for (const g of golden) {
      const orig = { status: 'ok', ...portRecord(stateOf(g)) };
      expect(goldenSelfCheck(orig, g).ok).toBe(true);
    }
  });
  it('a perturbed C-obstacle fails the self-check', () => {
    const g = golden[0];
    const orig = { status: 'ok', ...portRecord(stateOf(g)) };
    orig.robotobstconfig[0][0] = [orig.robotobstconfig[0][0][0] + 1e-6, orig.robotobstconfig[0][0][1]];
    expect(goldenSelfCheck(orig, g).ok).toBe(false);
  });
});

describe('reference flags', () => {
  it('flags the pass-through scene B1 (path enters a C-obstacle)', () => {
    const st = stateOf(named.find((s) => s.id === 'B1'));
    expect(referenceFlags(st, referenceFor(st), portRecord(st))).toContain('crosses-obstacle');
  });
  it('no flags on the default scene', () => {
    const st = stateOf(named.find((s) => s.id === 'A1'));
    expect(referenceFlags(st, referenceFor(st), portRecord(st))).toEqual([]);
  });
});

describe('scene generation', () => {
  it('random scenes are reproducible and inside the locator ranges', () => {
    const a = randomScenes(5, 7), b = randomScenes(5, 7);
    expect(a).toEqual(b);
    for (const s of a) expect(clampScene(s)).toEqual(s);
  });
});

describe('the Wolfram script refers to the original\'s real variables', () => {
  const wls = fs.readFileSync('tools/wolfram/mp-original.wls', 'utf8');
  const src = fs.readFileSync('docs/original-source/motion-planning.txt', 'utf8');
  it('has an SPDX header and no translated planner code', () => {
    expect(wls.split('\n').slice(0, 4).join('\n')).toMatch(/SPDX-License-Identifier: MIT/);
    expect(wls).not.toMatch(/ConvexMinkowskiSumRev3\[[^\]]*\]\s*:=/);
  });
  it('every captured Module local exists in the original Manipulate body', () => {
    const body = src.slice(src.indexOf('Quiet@Module[{'));
    const locals = body.slice(0, body.indexOf('},')).replace('Quiet@Module[{', '');
    const names = [...wls.matchAll(/\$CellContext`(\w+)\$(?!\$)/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(10);
    for (const n of new Set(names)) expect(locals, n).toMatch(new RegExp(`(^|[,{\\s])${n}(\\s*=|\\s*,|$)`, 'm'));
  });
  it('every Manipulate variable it sets exists in the original', () => {
    const names = [...wls.matchAll(/\$CellContext`(\w+)\$\$/g)].map((m) => m[1]);
    for (const n of new Set(names)) expect(src, n).toContain(n);
  });
  const nb = '_internal/originals/MotionPlanningForRobotPathAroundObstacles-author.nb';
  it.skipIf(!fs.existsSync(nb))('the private notebook stores Body/Initialization as the script expects', () => {
    const t = fs.readFileSync(nb, 'utf8');
    const starts = [...t.matchAll(/"Body" :> Quiet\[/g)].map((m) => m.index);
    expect(starts.length).toBeGreaterThan(0);
    for (const i of starts) {
      const body = t.slice(i, t.indexOf('"Specifications" :>', i));
      expect((body.match(/\bGraphics\[/g) || []).length).toBe(1);
      expect(body).toContain('$CellContext`robotobstconfig$');
    }
    expect(t).toMatch(/Initialization:>\(\{\$CellContext`ConvexMinkowskiSumRev3\[/);
  });
});

describe('tool scripts parse (catches syntax errors in scripts no other test imports)', () => {
  const scripts = fs.readdirSync('tools').filter((f) => f.endsWith('.mjs')).map((f) => `tools/${f}`);
  it.each(scripts)('%s', async (f) => {
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });
});
