// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/harness-runner.test.js — the Node side of the Mathematica harness (tools/harness/runner-lib.mjs,
// tools/run-harness.mjs): wire format (HW-07), input-echo check (HW-08), results from the partial file (HW-63),
// summaries, bit-exact diffs (HW-64, HW-71), parity comparison (HW-72), the --dry-run command line.
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseLexical, stringifyLexical, fromWireReal } from '../../tools/lib/json-lexical.mjs';
import { toWireValue, wireFile, wireText, findNotebook, wolframscriptCandidates, findWolframscript, readResults, checkInputEcho,
  summarize, diffResults, parityCompare, sameNumbers } from '../../tools/harness/runner-lib.mjs';
import { scenarioSha256 } from '../../tools/harness/scenario-schema.mjs';

const lex = (t) => parseLexical(t);
const tmpDirs = [];
const mkTmp = (p) => { const d = fs.mkdtempSync(p); tmpDirs.push(d); return d; };
afterAll(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });
const FILE = lex(`{"schema":"manipulate-harness/scenarios-1","app":"rrt","notebook":"N.nb","timeLimit":30,
  "scenarios":[
   {"id":"H-RT-01","steps":[{"set":{"a":0.1,"b":[1,-0.0,2.5e-3],"c":"wl:1/2","d":"RS","e":true}},{"set":{}}],"capture":["a"],"why":"w"},
   {"id":"H-RT-02","start":"live","steps":[{"seed":5},{"drag":{"p":{"index":2,"to":[1.0,2]}}}],"capture":["%g"],"captureEachStep":true,"why":"w"}]}`);

describe('wire format (HW-07)', () => {
  it('every real becomes {"$r":"m*2^e"}, integers, strings and booleans pass unchanged, -0.0 -> 0', () => {
    const w = toWireValue(FILE.scenarios[0].steps[0].set);
    expect(w.a).toEqual({ $r: '3602879701896397*2^-55' });
    expect(fromWireReal(w.a.$r)).toBe(0.1);
    expect(w.b[0].text).toBe('1');
    expect(w.b[1]).toEqual({ $r: '0*2^0' });
    expect(fromWireReal(w.b[2].$r)).toBe(2.5e-3);
    expect(w.c).toBe('wl:1/2');
    expect(w.d).toBe('RS');
    expect(w.e).toBe(true);
  });
  it('the wire file has the effective start, the scenario hash and no reals left', () => {
    const w = wireFile(FILE);
    expect(w.scenarios.map((s) => s.start)).toEqual(['initial', 'live']);
    expect(w.scenarios[0].sha256).toBe(scenarioSha256(FILE, FILE.scenarios[0]));
    expect(w.scenarios[1].captureEachStep).toBe(true);
    const text = wireText(w);
    expect(/[^\x20-\x7e]/.test(text)).toBe(false);
    // numbers left in the wire are integers only (reals are all {"$r"} objects)
    const nums = [];
    const walk = (v) => { if (v && v.text) nums.push(v.text); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    walk(parseLexical(text).scenarios);
    expect(nums.every((t) => /^-?\d+$/.test(t))).toBe(true);
    expect(stringifyLexical(parseLexical(text))).toBe(text);
  });
  it('--only and --time-limit', () => {
    const w = wireFile(FILE, { only: ['H-RT-02'], timeLimit: 5 });
    expect(w.scenarios.map((s) => s.id)).toEqual(['H-RT-02']);
    expect(w.timeLimit).toBe(5);
  });
});

describe('input echo (HW-08)', () => {
  const results = (echo) => lex(`{"scenarios":[{"id":"H-RT-01","status":"ok","inputEcho":${echo}}]}`);
  it('accepts bit-identical reals, integers, strings; ignores wl:', () => {
    const r = results('[{"step":1,"name":"a","value":0.1},{"step":1,"name":"b","value":[1,0.0,0.0025]},{"step":1,"name":"c","value":{"wl":"1/2","n":0.5}},{"step":1,"name":"d","value":"RS"},{"step":1,"name":"e","value":true}]');
    expect(checkInputEcho(FILE, r)).toEqual([]);
  });
  it('flags a real that came back different, an integer that came back real, a lost string', () => {
    const r = results('[{"step":1,"name":"a","value":0.10000000000000002},{"step":1,"name":"b","value":[1.0,0.0,0.0025]},{"step":1,"name":"d","value":"rs"}]');
    const p = checkInputEcho(FILE, r);
    expect(p.length).toBe(3);
    expect(p.join('\n')).toMatch(/real 0.1 came back as 0.10000000000000002/);
    expect(p.join('\n')).toMatch(/integer 1 came back as 1.0/);
  });
  it('drag with index compares the "to" value', () => {
    const r = lex('{"scenarios":[{"id":"H-RT-02","status":"ok","inputEcho":[{"step":2,"name":"p","value":[1.0,2]}]}]}');
    expect(checkInputEcho(FILE, r)).toEqual([]);
  });
});

describe('results, summary and diff', () => {
  const tmp = mkTmp(path.join(os.tmpdir(), 'harness-'));
  const rec = (id, status, extra = '') => `{"id":"${id}","status":"${status}","seconds":${status === 'ok' ? '0.5' : '7.25'},"steps":[{"step":1,"seconds":0.5${status === 'timeout' ? ',"feTimeoutRisk":true' : ''}}],"capture":{"a":0.1},"messages":[{"name":"Power::infy","text":"x"}],"aliases":{"Theta":"θ (spelled-out)"},"notes":[]${extra}}`;
  it('a crashed run is assembled from the partial file (header line + one line per scenario; a cut line is dropped)', () => {
    const part = path.join(tmp, 'x.partial.jsonl');
    fs.writeFileSync(part, `{"schema":"manipulate-harness/results-1","partialHeader":true,"wolframVersion":"15.0.1"}\n${rec('H-RT-01', 'ok')}\n{"id":"H-RT-02","sta`);
    const got = readResults(path.join(tmp, 'missing.json'), part);
    expect(got.from).toBe('partial');
    expect(got.results.scenarios.map((s) => s.id)).toEqual(['H-RT-01']);
    expect(got.results.assembledFromPartial).toBe(true);
  });
  it('summary: statuses, slowest, front-end timeout risk, messages, aliases, missing and stale ids', () => {
    const res = lex(`{"scenarios":[${rec('H-RT-01', 'ok', `,"scenarioSha256":"${'0'.repeat(64)}"`)},${rec('H-RT-02', 'timeout')}]}`);
    const s = summarize(FILE, res);
    expect(s.statuses).toEqual({ ok: 1, timeout: 1 });
    expect(s.slowest[0]).toEqual({ id: 'H-RT-02', seconds: 7.25 });
    expect(s.feTimeoutRisk).toEqual(['H-RT-02']);
    expect(s.messages).toEqual({ 'Power::infy': 2 });
    expect(s.aliases).toEqual({ Theta: 'θ (spelled-out)' });
    expect(s.stale).toEqual(['H-RT-01']);
    expect(s.missing).toEqual([]);
  });
  it('diff ignores timings and finds the last bit', () => {
    const a = lex(`{"scenarios":[${rec('H-RT-01', 'ok')}]}`);
    const b = lex(`{"scenarios":[${rec('H-RT-01', 'ok').replace('"seconds":0.5', '"seconds":9.9')}]}`);
    expect(diffResults(a, b)).toEqual({});
    const c = lex(`{"scenarios":[${rec('H-RT-01', 'ok').replace('"a":0.1', '"a":0.10000000000000002')}]}`);
    expect(diffResults(a, c)['H-RT-01'][0]).toMatch(/capture\.a: 0\.1 vs 0\.10000000000000002/);
    const d = lex(`{"scenarios":[${rec('H-RT-01', 'ok').replace('"a":0.1', '"a":1')}]}`);
    expect(Object.keys(diffResults(lex(`{"scenarios":[${rec('H-RT-01', 'ok').replace('"a":0.1', '"a":1.0')}]}`), d))).toEqual(['H-RT-01']);
  });
  it('HW-72 parity: numbers as doubles, exact {"wl","n"} by n, any other difference is DIFFERENT', () => {
    const mp = lex('[{"id":"golden-0","path":[[0.5,1.0]],"robotinsideobstcond":[false,true],"discretePath":null}]');
    const hw = lex('[{"id":"H-MP-01","status":"ok","capture":{"path":[[{"wl":"1/2","n":0.5},1.0]],"robotinsideobstcond":[false,true],"discretePath":null}}]');
    const rows = parityCompare(mp, hw, ['path', 'robotinsideobstcond', 'discretePath']);
    expect(rows[0].ok).toBe(true);
    expect(sameNumbers(lex('0.1'), lex('0.10000000000000002'))).toBe(false);
  });
});

describe('finding notebooks and wolframscript', () => {
  it('finds a notebook by file name in an originals folder or one level below', () => {
    const root = mkTmp(path.join(os.tmpdir(), 'repo-'));
    fs.mkdirSync(path.join(root, '_internal', 'originals', 'batch-ab'), { recursive: true });
    fs.writeFileSync(path.join(root, '_internal', 'originals', 'batch-ab', 'A.nb'), 'x');
    expect(findNotebook('A.nb', { root })).toBe(path.join(root, '_internal', 'originals', 'batch-ab', 'A.nb'));
    expect(findNotebook('B.nb', { root })).toBe(null);
    const extra = mkTmp(path.join(os.tmpdir(), 'nbs-'));
    fs.mkdirSync(path.join(extra, 'sub'));
    fs.writeFileSync(path.join(extra, 'sub', 'B.nb'), 'x');
    expect(findNotebook('B.nb', { root, originals: [extra] })).toBe(path.join(extra, 'sub', 'B.nb'));
  });
  it('wolframscript candidates: PATH first, then the standard Windows install folders', () => {
    const c = wolframscriptCandidates('win32', { ProgramFiles: 'C:\\Program Files' });
    expect(c[0]).toBe('wolframscript');
    expect(c).toContain('C:\\Program Files\\Wolfram Research\\WolframScript\\wolframscript.exe');
  });
  it('findWolframscript asks each candidate for -version without a shell', () => {
    const calls = [];
    const fake = (cmd, args, o) => { calls.push({ cmd, args, shell: o.shell }); return { status: 0, stdout: 'WolframScript 1.13.0' }; };
    expect(findWolframscript('wolframscript', fake)).toEqual({ path: 'wolframscript', version: 'WolframScript 1.13.0' });
    expect(calls[0].args).toEqual(['-version']);
    expect(calls[0].shell).toBeUndefined();
    expect(findWolframscript('wolframscript', () => ({ error: new Error('ENOENT') }))).toBe(null);
  });
});

describe('tools/run-harness.mjs --dry-run', () => {
  it('writes the wire file and prints the wolframscript command for a smoke run', () => {
    const out = mkTmp(path.join(os.tmpdir(), 'harness-out-'));
    const nbDir = mkTmp(path.join(os.tmpdir(), 'harness-nb-'));
    const nb = JSON.parse(JSON.stringify(parseLexical(fs.readFileSync('tests/harness/rrt.scenarios.json', 'utf8')).notebook));
    fs.writeFileSync(path.join(nbDir, nb), '(* not a real notebook *)');
    const r = spawnSync(process.execPath, ['tools/run-harness.mjs', 'rrt', '--smoke', '--dry-run', `--out=${out}`, `--originals=${nbDir}`], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/\[dry-run\] wolframscript -file .*manipulate-harness\.wls .*--smoke --partial=/);
    const wire = parseLexical(fs.readFileSync(path.join(out, 'rrt.wire.json'), 'utf8'));
    expect(wire.scenarios.length).toBe(18);
    expect(fs.existsSync(path.join(out, 'summary.smoke.txt'))).toBe(true);
  });
  it('rejects unknown options', () => {
    const r = spawnSync(process.execPath, ['tools/run-harness.mjs', 'rrt', '--bogus'], { encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/unknown option/);
  });
});
