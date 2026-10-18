// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/harness-runner-e2e.test.js — tools/run-harness.mjs end to end with a fake wolframscript
// (tests/unit/fixtures/fake-wolframscript.mjs): smoke run, scenario run with the input-echo check, a crashed run
// assembled from the .partial.jsonl file, --diff and --accept refusal. POSIX only (the fake is a shebang script).
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseLexical } from '../../tools/lib/json-lexical.mjs';

// the fixture is a plain (non-executable) .mjs file; each test run makes a tiny executable wrapper in a temporary
// folder that starts it with this Node (process.execPath), so no file in the repository needs an executable bit
const FAKE_SCRIPT = path.resolve('tests/unit/fixtures/fake-wolframscript.mjs');
const posix = process.platform !== 'win32';
const nbName = parseLexical(fs.readFileSync('tests/harness/rrt.scenarios.json', 'utf8')).notebook;

const tmpDirs = [];
afterAll(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });
let FAKE = null;
function fakeWrapper() {
  if (FAKE) return FAKE;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-e2e-bin-'));
  tmpDirs.push(dir);
  FAKE = path.join(dir, 'wolframscript');
  fs.writeFileSync(FAKE, `#!/bin/sh\nexec "${process.execPath}" "${FAKE_SCRIPT}" "$@"\n`, { mode: 0o755 });
  return FAKE;
}
function setup(extraNotebooks = []) {
  fakeWrapper();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-e2e-'));
  const nbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-e2e-nb-'));
  tmpDirs.push(out, nbDir);
  for (const n of [nbName, ...extraNotebooks]) fs.writeFileSync(path.join(nbDir, n), '(* stand-in *)');
  return { out, nbDir };
}
const run = (args, env = {}) => spawnSync(process.execPath, ['tools/run-harness.mjs', ...args], { encoding: 'utf8', env: { ...process.env, ...env } });

describe.skipIf(!posix)('run-harness.mjs with a fake wolframscript', () => {
  it('the fixture has no executable bit (a Windows checkout would hash differently)', () => {
    expect(fs.statSync(FAKE_SCRIPT).mode & 0o111).toBe(0);
    expect(fs.readFileSync(FAKE_SCRIPT, 'utf8').startsWith('#!')).toBe(false);
  });
  it('smoke: runs, writes the result, the log and the summary', () => {
    const { out, nbDir } = setup();
    const r = run(['rrt', '--smoke', `--wolframscript=${FAKE}`, `--out=${out}`, `--originals=${nbDir}`]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(fs.existsSync(path.join(out, 'rrt.smoke.json'))).toBe(true);
    expect(fs.readFileSync(path.join(out, 'rrt.smoke.log'), 'utf8')).toMatch(/mode: smoke/);
    const sum = fs.readFileSync(path.join(out, 'summary.smoke.txt'), 'utf8');
    expect(sum).toMatch(/rrt\s+ok/);
    expect(sum).toMatch(/initial\s+ok\s+Graphics/);
  });
  it('scenario run: 18 scenarios, input echo bit-identical, summary', () => {
    const { out, nbDir } = setup();
    const r = run(['rrt', `--wolframscript=${FAKE}`, `--out=${out}`, `--originals=${nbDir}`]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const res = parseLexical(fs.readFileSync(path.join(out, 'rrt.harness.json'), 'utf8'));
    expect(res.scenarios.length).toBe(18);
    const sum = fs.readFileSync(path.join(out, 'summary.run.txt'), 'utf8');
    expect(sum).toMatch(/scenarios 18: ok 18/);
    expect(sum).not.toMatch(/INPUT ECHO MISMATCH/);
  });
  it('--only runs one scenario', () => {
    const { out, nbDir } = setup();
    const r = run(['rrt', '--only=H-RT-03', `--wolframscript=${FAKE}`, `--out=${out}`, `--originals=${nbDir}`]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(parseLexical(fs.readFileSync(path.join(out, 'rrt.harness.json'), 'utf8')).scenarios.map((s) => s.id)).toEqual(['H-RT-03']);
  });
  it('a crash keeps the finished scenarios (assembled from the partial file) and is reported', () => {
    const { out, nbDir } = setup();
    const r = run(['rrt', `--wolframscript=${FAKE}`, `--out=${out}`, `--originals=${nbDir}`], { FAKE_CRASH_AFTER: '4' });
    expect(r.status).toBe(1);
    const res = parseLexical(fs.readFileSync(path.join(out, 'rrt.harness.json'), 'utf8'));
    expect(res.assembledFromPartial).toBe(true);
    expect(res.scenarios.length).toBe(4);
    const sum = fs.readFileSync(path.join(out, 'summary.run.txt'), 'utf8');
    expect(sum).toMatch(/exited with status 1/);
    expect(sum).toMatch(/MISSING H-RT-05/);
  });
  it('--fresh-kernel runs one kernel per scenario and merges', () => {
    const { out, nbDir } = setup();
    const r = run(['rrt', '--fresh-kernel', '--jobs=3', '--only=H-RT-01,H-RT-02,H-RT-03', `--wolframscript=${FAKE}`, `--out=${out}`, `--originals=${nbDir}`]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(parseLexical(fs.readFileSync(path.join(out, 'rrt.harness.json'), 'utf8')).scenarios.map((s) => s.id)).toEqual(['H-RT-01', 'H-RT-02', 'H-RT-03']);
  });
  it('--diff against another run, --accept refused without a self-check', () => {
    const { out, nbDir } = setup();
    run(['rrt', `--wolframscript=${FAKE}`, `--out=${out}`, `--originals=${nbDir}`]);
    fs.copyFileSync(path.join(out, 'rrt.harness.json'), path.join(out, 'first.json'));
    const d = run(['rrt', `--diff=${path.join(out, 'first.json')}`, `--out=${out}`]);
    expect(d.stdout).toMatch(/identical/);
    const a = run(['rrt', '--accept', `--out=${out}`]);
    expect(a.status).toBe(1);
    expect(a.stderr).toMatch(/refused — run --self-check/);
  });
  it('the wall-clock limit kills a hanging kernel and reports it (--app-timeout)', () => {
    const { out, nbDir } = setup();
    const t0 = Date.now();
    const r = run(['rrt', '--smoke', '--app-timeout=0.03', `--wolframscript=${FAKE}`, `--out=${out}`, `--originals=${nbDir}`], { FAKE_HANG: '1' });
    expect(Date.now() - t0).toBeLessThan(20000);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/TIMEOUT: no result after/);
    expect(fs.readFileSync(path.join(out, 'summary.smoke.txt'), 'utf8')).toMatch(/TIMED OUT/);
  });
  it('a failure before "read notebook" stops the remaining apps (decided from the log)', () => {
    const torus = parseLexical(fs.readFileSync('tests/harness/torus-chart.scenarios.json', 'utf8')).notebook;
    const { out, nbDir } = setup([torus]);
    const r = run(['rrt', 'torus-chart', '--smoke', `--wolframscript=${FAKE}`, `--out=${out}`, `--originals=${nbDir}`], { FAKE_EARLY_FAIL: '1' });
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/failed before reading the notebook; not starting the other apps/);
    expect(fs.existsSync(path.join(out, 'torus-chart.smoke.log'))).toBe(false);
  });
  it('the mode echoed by the harness must be the requested one', () => {
    const { out, nbDir } = setup();
    const r = run(['rrt', '--smoke', `--wolframscript=${FAKE}`, `--out=${out}`, `--originals=${nbDir}`], { FAKE_MODE: 'run' });
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/^MODE: smoke/);
    expect(fs.readFileSync(path.join(out, 'summary.smoke.txt'), 'utf8')).toMatch(/MODE MISMATCH: the harness ran in mode "run", not "smoke"/);
  });
  it('a wolframscript that cannot be found gives the "where wolframscript" hint', () => {
    const r = run(['rrt', '--smoke', '--wolframscript=/nonexistent/wolframscript']);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/where wolframscript/);
  });
});
