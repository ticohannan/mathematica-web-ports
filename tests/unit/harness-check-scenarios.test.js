// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/harness-check-scenarios.test.js — the static scenario checker tools/harness/check-scenarios.py (HW-62)
// on the original notebooks. The notebooks are private (git-ignored _internal/originals/, or the folders in the
// environment variable HARNESS_ORIGINALS); without them, or without Python, these tests are skipped.
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { HARNESS_APPS } from '../../tools/harness/apps.mjs';

const python = ['python3', 'python'].find((p) => spawnSync(p, ['--version'], { encoding: 'utf8' }).status === 0);
const dirs = [...(process.env.HARNESS_ORIGINALS ?? '').split(path.delimiter).filter(Boolean), '_internal/originals', '_internal/originals/batch-ab'];
const findNb = (name) => dirs.map((d) => path.join(d, name)).find((p) => fs.existsSync(p)) ?? null;
const withNb = HARNESS_APPS.filter((a) => !a.parity && findNb(a.notebook));
const scenarioApps = withNb.filter((a) => !a.structureOnly);
const tmpDirs = [];
const mkTmp = (p) => { const d = fs.mkdtempSync(p); tmpDirs.push(d); return d; };
afterAll(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });
const out = mkTmp(path.join(os.tmpdir(), 'check-scenarios-'));
const run = (args) => spawnSync(python, ['tools/harness/check-scenarios.py', ...args], { encoding: 'utf8' });

describe.skipIf(!python)('check-scenarios.py without notebooks', () => {
  it('prints its usage', () => {
    const r = run(['--help']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/static check of Mathematica-harness scenario files/);
  });
});

describe.skipIf(!python || !scenarioApps.length)('check-scenarios.py on the notebooks (private)', () => {
  it.each(scenarioApps.map((a) => a.dir))('%s: no errors', (dir) => {
    const app = HARNESS_APPS.find((a) => a.dir === dir);
    const target = path.join(out, `${dir}.index.json`);
    const r = run([dir, findNb(app.notebook), '--out', target]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const index = JSON.parse(fs.readFileSync(target, 'utf8'));
    expect(index.counts.ERROR).toBe(0);
    expect(index.structure.manipulateCopies).toBe(1);
    expect(index.structure.variables.length).toBeGreaterThan(0);
  });
  it('resolution examples from HARNESS-WL: DP aliases, P3 path clash, TK \\[CapitalSigma], FB φ (U+03C6)', () => {
    const idx = (dir) => {
      const app = HARNESS_APPS.find((a) => a.dir === dir);
      if (!findNb(app.notebook)) return null;
      const target = path.join(out, `${dir}.index.json`);
      run([dir, findNb(app.notebook), '--out', target]);
      return JSON.parse(fs.readFileSync(target, 'utf8'));
    };
    const dp = idx('dubins-path');
    if (dp) {
      const r = dp.scenarios.flatMap((s) => Object.entries(s.resolved));
      expect(r.find(([k]) => k === 'goalThetaloc')[1]).toMatchObject({ kind: 'manipulate', symbol: 'goalθloc' });
      expect(r.find(([k, v]) => k === 'distTrav' && v.kind === 'local')[1].scope).toBe(2);
    }
    const p3 = idx('prm-3d');
    if (p3) {
      const s1 = p3.scenarios.find((s) => s.id === 'H-P3-01');
      expect(s1.resolved.path).toMatchObject({ kind: 'local', scope: 1 });
      expect(s1.resolved['path$$']).toMatchObject({ kind: 'manipulate' });
      expect(s1.issues.some((i) => /HW-13/.test(i.msg))).toBe(true);
      expect(p3.structure.buttons).toEqual(['add 100 vertices', 'restart', 'new goal']);
    }
    const tk = idx('two-link-kinematics');
    if (tk) expect(tk.scenarios.find((s) => s.id === 'H-TK-02').resolved['\\[CapitalSigma]']).toMatchObject({ kind: 'local', symbol: 'Σ' });
    const fb = idx('four-bar-linkage');
    if (fb) expect(fb.scenarios.find((s) => s.id === 'H-FB-01').resolved['φv'].alias).toMatch(/unicode-variant/);
  });
  it('a broken scenario is reported: unknown variable, bad label, ctl: index, snapshot k, sibling-scope capture', () => {
    const rt = HARNESS_APPS.find((a) => a.dir === 'rrt');
    if (!findNb(rt.notebook)) return;
    const bad = { schema: 'manipulate-harness/scenarios-1', app: 'rrt', notebook: rt.notebook, scenarios: [
      { id: 'H-RT-90', steps: [{ set: { nosuch: 1 } }, { press: '7' }, { set: { treeType: 'ctl:treeType#9' } }, { setFrom: 'snapshot:9' }],
        capture: ['parent', 'nosuch2', '%bogus'], why: 'broken on purpose' }] };
    const f = path.join(out, 'rrt.bad.scenarios.json');
    fs.writeFileSync(f, JSON.stringify(bad));
    const r = run(['rrt', findNb(rt.notebook), '--scenarios', f, '--out', path.join(out, 'rrt.bad.index.json')]);
    expect(r.status).toBe(1);
    const msgs = JSON.parse(fs.readFileSync(path.join(out, 'rrt.bad.index.json'), 'utf8')).scenarios[0].issues.map((i) => i.msg).join('\n');
    expect(msgs).toMatch(/nosuch is not a Manipulate variable/);
    expect(msgs).toMatch(/no button labelled '7'/);
    expect(msgs).toMatch(/index 9 out of range 1\.\.3/);
    expect(msgs).toMatch(/snapshot 9 does not exist/);
    expect(msgs).toMatch(/capture parent is declared by sibling scopes/);
    expect(msgs).toMatch(/nosuch2 does not resolve/);
    expect(msgs).toMatch(/unknown special capture/);
  });
});

describe.skipIf(!python || !withNb.length)('check-scenarios.py --structure on every notebook found', () => {
  it.each(withNb.map((a) => a.dir))('%s: one Manipulate output cell, variables and snapshots read', (dir) => {
    const app = HARNESS_APPS.find((a) => a.dir === dir);
    const r = run(['--structure', findNb(app.notebook)]);
    expect(r.status, r.stderr).toBe(0);
    const s = JSON.parse(r.stdout);
    expect(s.manipulateCopies).toBe(1);
    expect(s.bodyDistinct).toBe(1);
    expect(s.snapshots.length).toBeGreaterThan(2);
    for (const sn of s.snapshots) expect(sn.extraSettings, `${dir} snapshot ${sn.k}`).toEqual([]);
  });
});
