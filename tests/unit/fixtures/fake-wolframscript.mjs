#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/fixtures/fake-wolframscript.mjs — stands in for wolframscript in tests/unit/harness-runner-e2e.test.js.
// It answers -version and, for "-file manipulate-harness.wls <nb> <wire> <out> [options]", writes result files shaped
// like the harness's (echoing every input value back from the wire format), so tools/run-harness.mjs can be tested
// end to end without Mathematica. FAKE_CRASH_AFTER=n stops after n scenarios without writing <out> (crash test);
// FAKE_HANG=1 never finishes (timeout test); FAKE_EARLY_FAIL=1 dies before reading the notebook; FAKE_MODE=x echoes
// a wrong mode.
import fs from 'node:fs';
import { parseLexical, stringifyLexical, LexNumber, lexReal, fromWireReal } from '../../../tools/lib/json-lexical.mjs';

const a = process.argv.slice(2);
if (a[0] === '-version') { console.log('WolframScript 1.0 (fake)'); process.exit(0); }
const [, , nb, wireFile, outFile, ...opts] = a;
const opt = (n) => opts.find((o) => o.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const mode = opts.includes('--smoke') ? 'smoke' : opts.includes('--self-check') ? 'self-check' : 'run';
console.log(`HARNESS-MODE: ${process.env.FAKE_MODE ?? mode}  (fake)`);
if (process.env.FAKE_EARLY_FAIL) { console.log('Syntax::sntxi: incomplete expression (fake)'); process.exit(1); }
console.log('[harness] read notebook');
if (process.env.FAKE_HANG) setInterval(() => {}, 1000);
else run();
function run() {
const wire = parseLexical(fs.readFileSync(wireFile, 'utf8'));
const decode = (v) => {
  if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof LexNumber) && '$r' in v) return lexReal(fromWireReal(v.$r));
  if (Array.isArray(v)) return v.map(decode);
  if (typeof v === 'string' && v.startsWith('wl:')) return { wl: v.slice(3) };
  return v;
};
const head = { schema: mode === 'run' ? 'manipulate-harness/results-1' : `manipulate-harness/${mode}-1`, mode, tool: 'tools/wolfram/manipulate-harness.wls',
  toolSha256: 'f'.repeat(64), wolframVersion: '15.0.1 (fake)', versionNumber: lexReal(15), notebook: { file: nb, sha256: 'a'.repeat(64) },
  numberFormatSelfTest: true, internalSelfTest: { numberFormatFast: true }, phase: 'mode', structure: { variables: ['x', 'y'], scopes: [], snapshots: [], buttons: [] } };
console.log(`[harness] mode: ${mode}`);
if (mode !== 'run') {
  const out = { ...head, evaluations: [{ state: 'initial', status: 'ok', head: 'Graphics', seconds: lexReal(0.25), changed: [], messages: [] }] };
  fs.writeFileSync(outFile, stringifyLexical(out));
  process.exit(0);
}
fs.writeFileSync(outFile, stringifyLexical({ ...head, preliminary: true }));
const partial = opt('partial');
if (partial) fs.writeFileSync(partial, `${stringifyLexical({ ...head, partialHeader: true })}\n`);
const crashAfter = process.env.FAKE_CRASH_AFTER ? Number(process.env.FAKE_CRASH_AFTER) : Infinity;
const recs = [];
for (const [i, sc] of wire.scenarios.entries()) {
  if (i >= crashAfter) { console.log('kernel crashed (fake)'); process.exit(1); }
  const echo = [];
  sc.steps.forEach((st, k) => {
    const kind = 'set' in st ? 'set' : 'drag' in st ? 'drag' : null;
    if (!kind) return;
    for (const [n, v] of Object.entries(st[kind])) echo.push({ step: k + 1, name: n, value: decode(v && v.to !== undefined ? v.to : v) });
  });
  const rec = { id: sc.id, status: 'ok', start: sc.start, seconds: lexReal(0.5), evaluations: sc.steps.length, aliases: {}, resolved: {},
    inputEcho: echo, steps: [], capture: {}, messages: [], notes: [], scenarioSha256: sc.sha256 };
  recs.push(rec);
  console.log(`${sc.id}: ok`);
  if (partial) fs.appendFileSync(partial, `${stringifyLexical(rec)}\n`);
}
fs.writeFileSync(outFile, stringifyLexical({ ...head, scenarios: recs }));
}
