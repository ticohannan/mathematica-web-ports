// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/harness/runner-lib.mjs — the testable parts of tools/run-harness.mjs (Mathematica harness, HARNESS-WL §7.3):
// wire format (HW-07), notebook and wolframscript lookup (HW-63), input-echo check (HW-08), result assembly from the
// partial file, summaries and bit-exact diffs (HW-64).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { LexNumber, parseLexical, stringifyLexical, wireReal, isLexReal } from '../lib/json-lexical.mjs';
import { scenarioSha256 } from './scenario-schema.mjs';

// ---------------------------------------------------------------- wire format (HW-07)
/** Replace every machine real (lexical) by {"$r": "m*2^e"}; -0.0 becomes 0 (no signed zero in Mathematica). */
export function toWireValue(v) {
  if (v instanceof LexNumber) {
    if (!v.isReal) return v;
    const x = v.value;
    if (!Number.isFinite(x)) throw new Error(`not a finite real: ${v.text}`);
    return { $r: wireReal(Object.is(x, -0) ? 0 : x) };
  }
  if (Array.isArray(v)) return v.map(toWireValue);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toWireValue(x)]));
  return v;
}
/** The wire file for one app: scenario file + effective start + per-scenario hash; reals in steps as {"$r"}. */
export function wireFile(file, { only = null, timeLimit = null, initTimeLimit = null } = {}) {
  const wanted = only ? new Set(only) : null;
  const scenarios = file.scenarios.filter((sc) => !wanted || wanted.has(sc.id)).map((sc) => {
    const out = { id: sc.id, start: sc.start ?? file.start ?? 'initial', steps: toWireValue(sc.steps), capture: sc.capture,
      sha256: scenarioSha256(file, sc) };
    for (const k of ['captureEachStep', 'trace']) if (k in sc) out[k] = sc[k];
    if ('timeLimit' in sc) out.timeLimit = sc.timeLimit;
    return out;
  });
  const out = { schema: 'manipulate-harness/wire-1', app: file.app, notebook: file.notebook, start: file.start ?? 'initial' };
  for (const k of ['timeLimit', 'scenarioTimeLimit', 'initTimeLimit', 'maxStringChars', 'definitions', 'traceFunctions', 'traceSystemFunctions',
    'traceLimit', 'inspectDefinitions', 'wlChecks', 'images']) if (k in file) out[k] = file[k];
  for (const k of ['probes', 'probeFormulas']) if (k in file) out[k] = toWireValue(file[k]);
  if (timeLimit != null) out.timeLimit = timeLimit;
  if (initTimeLimit != null) out.initTimeLimit = initTimeLimit;
  out.scenarios = scenarios;
  return out;
}
export const wireText = (w) => stringifyLexical(w, { ascii: true });

// ---------------------------------------------------------------- finding things on the owner's machine
/** Find a notebook by file name: explicit path, the originals folders, then one level of sub-folders. */
export function findNotebook(name, { root, nb = null, originals = [] }) {
  if (nb) return fs.existsSync(nb) ? path.resolve(nb) : null;
  const dirs = [...originals.map((d) => path.resolve(root, d)), path.join(root, '_internal', 'originals'),
    path.join(root, '_internal', 'originals', 'batch-ab')];
  for (const d of dirs) { const p = path.join(d, name); if (fs.existsSync(p)) return p; }
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { const p = path.join(d, e.name, name); if (fs.existsSync(p)) return p; }
    }
  }
  return null;
}

/** Candidate wolframscript locations (PATH first, then standard installs). */
export function wolframscriptCandidates(platform = process.platform, env = process.env) {
  const c = ['wolframscript'];
  if (platform === 'win32') {
    const pf = [env.ProgramFiles, env['ProgramFiles(x86)'], 'C:\\Program Files'].filter(Boolean);
    for (const base of pf) {
      c.push(path.win32.join(base, 'Wolfram Research', 'WolframScript', 'wolframscript.exe'));
      for (const prod of ['Wolfram', 'Mathematica', 'Wolfram Engine']) {
        const d = path.win32.join(base, 'Wolfram Research', prod);
        let vers = [];
        try { vers = fs.readdirSync(d).sort().reverse(); } catch { /* not installed */ }
        for (const v of vers) c.push(path.win32.join(d, v, 'wolframscript.exe'));
      }
    }
  } else if (platform === 'darwin') {
    c.push('/usr/local/bin/wolframscript', '/Applications/Wolfram.app/Contents/MacOS/wolframscript',
      '/Applications/Mathematica.app/Contents/MacOS/wolframscript');
  } else {
    c.push('/usr/local/bin/wolframscript', '/usr/bin/wolframscript');
  }
  return [...new Set(c)];
}
/** First candidate that answers `-version` (no shell: arguments reach the program unchanged on Windows too). */
export function findWolframscript(explicit = null, run = spawnSync) {
  const cands = explicit ? [explicit] : wolframscriptCandidates();
  for (const c of cands) {
    if (c !== 'wolframscript' && !fs.existsSync(c)) continue;
    const r = run(c, ['-version'], { encoding: 'utf8', windowsHide: true, timeout: 60000 });
    if (!r.error && r.status === 0) return { path: c, version: String(r.stdout || '').trim() };
  }
  return null;
}

// ---------------------------------------------------------------- results
/**
 * Read a result file lexically. The harness writes a preliminary file ("preliminary": true, structure report only)
 * early and overwrites it at the end; if only that one exists, or no file at all, the scenarios are assembled from
 * the .partial.jsonl (header line + one record per line) and the preliminary structure is kept.
 */
export function readResults(outFile, partialFile) {
  const out = fs.existsSync(outFile) ? parseLexical(fs.readFileSync(outFile, 'utf8')) : null;
  if (out && out.preliminary !== true) return { results: out, from: 'result' };
  const fromPartial = readPartial(partialFile);
  if (fromPartial) {
    if (out) fromPartial.results.structure = fromPartial.results.structure ?? out.structure;
    return fromPartial;
  }
  return out ? { results: out, from: 'preliminary' } : null;
}
function readPartial(partialFile) {
  if (partialFile && fs.existsSync(partialFile)) {
    const lines = fs.readFileSync(partialFile, 'utf8').split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return null;
    const head = parseLexical(lines[0]);
    const scenarios = [];
    for (const l of lines.slice(1)) { try { scenarios.push(parseLexical(l)); } catch { /* a line cut by a crash */ } }
    return { results: { ...head, partialHeader: undefined, assembledFromPartial: true, scenarios }, from: 'partial' };
  }
  return null;
}

/** Compare every echoed input real with the authored number, bit for bit (HW-08). Returns a list of problems. */
export function checkInputEcho(file, results) {
  const problems = [];
  const byId = new Map(file.scenarios.map((s) => [s.id, s]));
  for (const rec of results.scenarios ?? []) {
    const sc = byId.get(rec.id);
    if (!sc) { problems.push(`${rec.id}: not in the scenario file`); continue; }
    for (const e of rec.inputEcho ?? []) {
      const step = sc.steps[Number(e.step) - 1];
      const kind = step && ('set' in step ? 'set' : 'drag' in step ? 'drag' : null);
      if (!kind) { problems.push(`${rec.id} step ${e.step}: echo for a step without values`); continue; }
      let authored = step[kind][e.name];
      if (authored && typeof authored === 'object' && !Array.isArray(authored) && !(authored instanceof LexNumber)) authored = authored.to;
      const p = compareEcho(authored, e.value);
      if (p) problems.push(`${rec.id} step ${e.step} ${e.name}: ${p}`);
    }
  }
  return problems;
}
function compareEcho(authored, echoed, where = '') {
  if (isLexReal(authored)) {
    if (!(echoed instanceof LexNumber) || !echoed.isReal) return `${where} authored real ${authored.text}, echoed ${stringifyLexical(echoed)}`;
    const a = authored.value === 0 ? 0 : authored.value, b = echoed.value;
    return Object.is(a, b) || (a === 0 && b === 0) ? null : `${where} real ${authored.text} came back as ${echoed.text}`;
  }
  if (authored instanceof LexNumber) {
    if (!(echoed instanceof LexNumber) || echoed.isReal || echoed.text !== authored.text) return `${where} integer ${authored.text} came back as ${stringifyLexical(echoed)}`;
    return null;
  }
  if (Array.isArray(authored)) {
    if (!Array.isArray(echoed) || echoed.length !== authored.length) return `${where} list shape differs`;
    for (let i = 0; i < authored.length; i++) { const p = compareEcho(authored[i], echoed[i], `${where}[${i}]`); if (p) return p; }
    return null;
  }
  if (typeof authored === 'boolean') return echoed === authored ? null : `${where} boolean differs`;
  if (typeof authored === 'string') {
    if (authored.startsWith('wl:') || authored.startsWith('ctl:')) return null; // evaluated in Mathematica: nothing to compare
    return echoed === authored ? null : `${where} string ${JSON.stringify(authored)} came back as ${stringifyLexical(echoed)}`;
  }
  return null;
}

/** Status counts, slowest scenarios, front-end timeout risks, messages, aliases (HW-63 summary). */
export function summarize(file, results, { expectedIds = null } = {}) {
  const recs = results.scenarios ?? [];
  const statuses = {};
  for (const r of recs) statuses[r.status] = (statuses[r.status] ?? 0) + 1;
  const num = (v) => (v instanceof LexNumber ? v.value : typeof v === 'number' ? v : 0);
  const slowest = [...recs].sort((a, b) => num(b.seconds) - num(a.seconds)).slice(0, 5).map((r) => ({ id: r.id, seconds: num(r.seconds) }));
  const risk = recs.filter((r) => (r.steps ?? []).some((s) => s.feTimeoutRisk === true)).map((r) => r.id);
  const messages = {};
  for (const r of recs) for (const m of r.messages ?? []) messages[m.name] = (messages[m.name] ?? 0) + 1;
  const aliases = {};
  for (const r of recs) for (const [k, v] of Object.entries(r.aliases ?? {})) aliases[k] = v;
  const ids = new Set(recs.map((r) => r.id));
  const missing = (expectedIds ?? (file?.scenarios ?? []).map((s) => s.id)).filter((id) => !ids.has(id));
  const notOk = recs.filter((r) => r.status !== 'ok').map((r) => ({ id: r.id, status: r.status, notes: r.notes ?? [] }));
  const stale = file ? recs.filter((r) => {
    const sc = file.scenarios.find((s) => s.id === r.id);
    return sc && r.scenarioSha256 && r.scenarioSha256 !== scenarioSha256(file, sc);
  }).map((r) => r.id) : [];
  return { total: recs.length, statuses, slowest, feTimeoutRisk: risk, messages, aliases, missing, notOk, stale };
}

/** Bit-exact comparison of two result files scenario by scenario, ignoring timings (HW-64 --diff, HW-71). */
const IGNORED = new Set(['seconds', 'evaluationSeconds', 'runDate', 'timeZone']);
export function diffResults(a, b, { ignore = IGNORED, limit = 50 } = {}) {
  const out = [];
  const walk = (x, y, p) => {
    if (out.length >= limit) return;
    if (x instanceof LexNumber || y instanceof LexNumber) {
      if (!(x instanceof LexNumber) || !(y instanceof LexNumber) || x.isReal !== y.isReal || (x.isReal ? !Object.is(x.value, y.value) : x.text !== y.text)) {
        out.push(`${p}: ${stringifyLexical(x ?? null)} vs ${stringifyLexical(y ?? null)}`);
      }
      return;
    }
    if (Array.isArray(x) || Array.isArray(y)) {
      if (!Array.isArray(x) || !Array.isArray(y)) { out.push(`${p}: array vs non-array`); return; }
      if (x.length !== y.length) out.push(`${p}: length ${x.length} vs ${y.length}`);
      for (let i = 0; i < Math.min(x.length, y.length); i++) walk(x[i], y[i], `${p}[${i}]`);
      return;
    }
    if (x && typeof x === 'object' && y && typeof y === 'object') {
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
        if (ignore.has(k)) continue;
        if (!(k in x) || !(k in y)) { out.push(`${p}.${k}: only in ${k in x ? 'first' : 'second'}`); continue; }
        walk(x[k], y[k], `${p}.${k}`);
      }
      return;
    }
    if (x !== y) out.push(`${p}: ${JSON.stringify(x)} vs ${JSON.stringify(y)}`);
  };
  const ia = new Map((a.scenarios ?? []).map((r) => [r.id, r]));
  const ib = new Map((b.scenarios ?? []).map((r) => [r.id, r]));
  const perScenario = {};
  for (const id of new Set([...ia.keys(), ...ib.keys()])) {
    out.length = 0;
    if (!ia.has(id) || !ib.has(id)) { perScenario[id] = [`only in ${ia.has(id) ? 'first' : 'second'}`]; continue; }
    walk(ia.get(id), ib.get(id), id);
    if (out.length) perScenario[id] = [...out];
  }
  return perScenario;
}

/** HW-72: compare the harness's motion-planning captures with mp-original.wls's scene records. */
export function parityCompare(mpScenes, harnessRecords, fields) {
  const rows = [];
  harnessRecords.forEach((rec, i) => {
    const mp = mpScenes[i];
    const fieldsOut = {};
    for (const f of fields) {
      const a = mp ? mp[f] : undefined;
      const b = rec.capture ? rec.capture[f] : undefined;
      fieldsOut[f] = sameNumbers(a, b) ? 'identical' : 'DIFFERENT';
    }
    rows.push({ id: rec.id, mp: mp?.id, status: rec.status, fields: fieldsOut, ok: Object.values(fieldsOut).every((v) => v === 'identical') });
  });
  return rows;
}
/** Numbers equal as doubles; harness exact values {"wl", "n"} compare by n; mp-original's "WL:…" strings by text. */
export function sameNumbers(a, b) {
  const num = (v) => (v instanceof LexNumber ? v.value : typeof v === 'number' ? v : undefined);
  if (num(a) !== undefined && num(b) !== undefined) return Object.is(num(a), num(b)) || (num(a) === 0 && num(b) === 0);
  if (num(a) !== undefined && b && typeof b === 'object' && 'n' in b) return sameNumbers(a, b.n);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => sameNumbers(x, b[i]));
  if (a === null && b === null) return true;
  if (typeof a === 'boolean' || typeof b === 'boolean') return a === b;
  if (typeof a === 'string' && typeof b === 'string') return a === b;
  // mp-original writes odd values as "WL:<InputForm>"; the harness as {"wl": text, …}: equal texts are the same value
  if (typeof a === 'string' && a.startsWith('WL:') && b && typeof b === 'object') return typeof b.wl === 'string' && a.slice(3) === b.wl;
  if (a && b && typeof a === 'object' && typeof b === 'object') return JSON.stringify(Object.keys(a)) === JSON.stringify(Object.keys(b)) && Object.keys(a).every((k) => sameNumbers(a[k], b[k]));
  return false;
}
