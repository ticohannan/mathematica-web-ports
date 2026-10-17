// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/harness/scenario-schema.mjs — schema (HARNESS-WL §4.2) and lint (HW-04, HW-61) of the Mathematica harness
// scenario files tests/harness/<dir>.scenarios.json. Works on values read with tools/lib/json-lexical.mjs, so a
// number keeps its text (`1.0` real, `1` integer) and integer-only fields can be checked lexically.
//
// The JSON Schema below is the documented contract (draft 2020-12); validateScenarioFile() implements exactly
// these rules by hand (no schema library is a dependency of this repository) plus the lint rules of HW-61.
// Additions to HARNESS-WL §4.2: the optional file-level "licence" (SPDX expression), used when copied data make a
// file partly CC BY-NC-SA (HW §7.1), "generatedBy", and "initTimeLimit" (seconds for the stored Initialization).

import { LexNumber, isLexInteger, isLexReal, canonicalLexical } from '../lib/json-lexical.mjs';
import { createHash } from 'node:crypto';

export const SCENARIO_SCHEMA_ID = 'manipulate-harness/scenarios-1';

export const SCENARIO_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: SCENARIO_SCHEMA_ID,
  type: 'object',
  required: ['schema', 'app', 'notebook', 'scenarios'],
  additionalProperties: false,
  properties: {
    schema: { const: SCENARIO_SCHEMA_ID },
    app: { type: 'string', pattern: '^[a-z0-9-]+$' },
    notebook: { type: 'string', description: 'file name of the definition notebook (no folder)' },
    notebookSha256: { type: 'string', pattern: '^[0-9a-f]{64}$' },
    source: { type: 'string', description: 'repo-relative path of the TESTPLAN the scenarios came from' },
    licence: { type: 'string', description: 'SPDX licence expression of this file (default MIT)' },
    generatedBy: { type: 'string' },
    start: { $ref: '#/$defs/start', default: 'initial' },
    timeLimit: { type: 'number', exclusiveMinimum: 0, default: 60, description: 'seconds per Body evaluation' },
    scenarioTimeLimit: { type: 'number', exclusiveMinimum: 0, default: 1800 },
    initTimeLimit: { type: 'number', exclusiveMinimum: 0, default: 600, description: 'seconds for the stored Initialization' },
    definitions: { type: 'array', items: { type: 'string' } },
    images: { type: 'boolean', default: false },
    maxStringChars: { type: 'integer', default: 5000000 },
    traceFunctions: { type: 'array', items: { type: 'string' } },
    traceSystemFunctions: { type: 'array', items: { type: 'string' } },
    traceLimit: { type: 'integer', default: 300000 },
    probes: { type: 'object' },
    probeFormulas: { type: 'object' },
    inspectDefinitions: { type: 'array', items: { type: 'string' } },
    wlChecks: { type: 'object', additionalProperties: { type: 'string' } },
    scenarios: { type: 'array', minItems: 1, items: { $ref: '#/$defs/scenario' } },
  },
  $defs: {
    start: { type: 'string', pattern: '^(initial|live|snapshot:[1-9][0-9]*)$' },
    scenario: {
      type: 'object',
      required: ['id', 'steps', 'capture', 'why'],
      additionalProperties: false,
      properties: {
        id: { type: 'string', pattern: '^H-[A-Z0-9]{2}-[0-9]{2,3}$' },
        steps: { type: 'array', items: { $ref: '#/$defs/step' } },
        capture: { type: 'array', items: { type: 'string', minLength: 1 } },
        captureEachStep: { type: 'boolean', default: false },
        start: { $ref: '#/$defs/start' },
        timeLimit: { type: 'number', exclusiveMinimum: 0 },
        trace: { type: 'boolean', default: false },
        why: { type: 'string' },
        source: { type: 'string', description: 'the TESTPLAN line, verbatim' },
      },
    },
    step: {
      type: 'object',
      oneOf: [{ required: ['set'] }, { required: ['drag'] }, { required: ['press'] }, { required: ['settle'] }, { required: ['seed'] }, { required: ['setFrom'] }],
      additionalProperties: false,
      properties: {
        set: { type: 'object', additionalProperties: { $ref: '#/$defs/value' } },
        drag: { type: 'object', additionalProperties: { oneOf: [{ $ref: '#/$defs/value' }, { type: 'object', required: ['index', 'to'], additionalProperties: false, properties: { index: { type: 'integer', minimum: 1 }, to: { $ref: '#/$defs/value' } } }] } },
        press: { type: 'string' },
        settle: { const: true },
        seed: { type: 'integer' },
        setFrom: { $ref: '#/$defs/start' },
        evaluate: { type: 'boolean', default: true, description: 'setFrom only' },
        maxEvaluations: { type: 'integer', minimum: 1, default: 50, description: 'settle only' },
        controlActive: { type: 'boolean', default: false },
      },
    },
    value: { oneOf: [{ type: 'number' }, { type: 'boolean' }, { type: 'string' }, { type: 'array', items: { $ref: '#/$defs/value' } }] },
  },
};

export const STEP_KINDS = ['set', 'drag', 'press', 'settle', 'seed', 'setFrom'];
const START_RE = /^(initial|live|snapshot:[1-9][0-9]*)$/;
const ID_RE = /^H-[A-Z0-9]{2}-[0-9]{2,3}$/;
const FILE_KEYS = Object.keys(SCENARIO_SCHEMA.properties);
const SCENARIO_KEYS = Object.keys(SCENARIO_SCHEMA.$defs.scenario.properties);
const STEP_KEYS = Object.keys(SCENARIO_SCHEMA.$defs.step.properties);

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof LexNumber);
const isNum = (v) => v instanceof LexNumber || typeof v === 'number';
const numVal = (v) => (v instanceof LexNumber ? v.value : v);
const isInt = (v) => isLexInteger(v) || (typeof v === 'number' && Number.isInteger(v));

/** Errors of one authored value (HARNESS-WL §4.3), with a JSON path prefix. */
export function valueErrors(v, where) {
  if (isNum(v) || typeof v === 'boolean') return [];
  if (typeof v === 'string') {
    if (v.startsWith('ctl:') && !/^ctl:[^#]+#[1-9][0-9]*$/.test(v)) return [`${where}: bad ctl: value ${JSON.stringify(v)} (form "ctl:<var>#<k>")`];
    if (v.startsWith('wl:') && v.length === 3) return [`${where}: empty wl: value`];
    return [];
  }
  if (Array.isArray(v)) return v.flatMap((x, i) => valueErrors(x, `${where}[${i}]`));
  return [`${where}: value must be a number, boolean, string or array`];
}

/** Errors of one step. */
export function stepErrors(step, where) {
  const errs = [];
  if (!isObj(step)) return [`${where}: a step must be an object`];
  for (const k of Object.keys(step)) if (!STEP_KEYS.includes(k)) errs.push(`${where}: unknown key "${k}"`);
  const kinds = STEP_KINDS.filter((k) => k in step);
  if (kinds.length !== 1) { errs.push(`${where}: exactly one step kind expected (${STEP_KINDS.join(', ')}), found ${kinds.length ? kinds.join('+') : 'none'}`); return errs; }
  const kind = kinds[0];
  if (kind === 'set') {
    if (!isObj(step.set)) errs.push(`${where}.set: must be an object`);
    else for (const [n, v] of Object.entries(step.set)) errs.push(...valueErrors(v, `${where}.set.${n}`));
  } else if (kind === 'drag') {
    if (!isObj(step.drag) || !Object.keys(step.drag).length) errs.push(`${where}.drag: must be a non-empty object`);
    else for (const [n, v] of Object.entries(step.drag)) {
      if (isObj(v)) {
        const extra = Object.keys(v).filter((k) => k !== 'index' && k !== 'to');
        if (extra.length) errs.push(`${where}.drag.${n}: unknown key(s) ${extra.join(', ')}`);
        if (!isInt(v.index) || numVal(v.index) < 1) errs.push(`${where}.drag.${n}.index: integer >= 1 required`);
        if (!('to' in v)) errs.push(`${where}.drag.${n}: "to" required`);
        else errs.push(...valueErrors(v.to, `${where}.drag.${n}.to`));
      } else errs.push(...valueErrors(v, `${where}.drag.${n}`));
    }
  } else if (kind === 'press') {
    if (typeof step.press !== 'string' || !step.press.length) errs.push(`${where}.press: non-empty string required`);
  } else if (kind === 'settle') {
    if (step.settle !== true) errs.push(`${where}.settle: must be true`);
  } else if (kind === 'seed') {
    if (!isInt(step.seed)) errs.push(`${where}.seed: integer required (written without . or exponent)`);
  } else if (kind === 'setFrom') {
    if (typeof step.setFrom !== 'string' || !START_RE.test(step.setFrom)) errs.push(`${where}.setFrom: must be initial, live or snapshot:<k>`);
  }
  if ('evaluate' in step && (kind !== 'setFrom' || typeof step.evaluate !== 'boolean')) errs.push(`${where}.evaluate: boolean, setFrom steps only`);
  if ('maxEvaluations' in step && (kind !== 'settle' || !isInt(step.maxEvaluations) || numVal(step.maxEvaluations) < 1)) errs.push(`${where}.maxEvaluations: integer >= 1, settle steps only`);
  if ('controlActive' in step && typeof step.controlActive !== 'boolean') errs.push(`${where}.controlActive: boolean required`);
  if ('controlActive' in step && kind === 'seed') errs.push(`${where}.controlActive: a seed step evaluates nothing`);
  return errs;
}

/** Errors of one scenario (schema + lint). */
export function scenarioErrors(sc, where = 'scenario') {
  const errs = [];
  if (!isObj(sc)) return [`${where}: must be an object`];
  const w = typeof sc.id === 'string' ? sc.id : where;
  for (const k of Object.keys(sc)) if (!SCENARIO_KEYS.includes(k)) errs.push(`${w}: unknown key "${k}"`);
  for (const k of ['id', 'steps', 'capture', 'why']) if (!(k in sc)) errs.push(`${w}: "${k}" required`);
  if ('id' in sc && (typeof sc.id !== 'string' || !ID_RE.test(sc.id))) errs.push(`${w}: id must match H-XX-nn`);
  if ('steps' in sc) {
    if (!Array.isArray(sc.steps)) errs.push(`${w}.steps: array required`);
    else sc.steps.forEach((s, i) => errs.push(...stepErrors(s, `${w}.steps[${i}]`)));
  }
  if ('capture' in sc) {
    if (!Array.isArray(sc.capture)) errs.push(`${w}.capture: array required`);
    else {
      sc.capture.forEach((c, i) => { if (typeof c !== 'string' || !c.length) errs.push(`${w}.capture[${i}]: non-empty string required`); });
      const dup = sc.capture.filter((c, i) => sc.capture.indexOf(c) !== i);
      if (dup.length) errs.push(`${w}.capture: duplicate entries ${[...new Set(dup)].join(', ')}`);
    }
  }
  for (const k of ['captureEachStep', 'trace']) if (k in sc && typeof sc[k] !== 'boolean') errs.push(`${w}.${k}: boolean required`);
  if ('why' in sc && typeof sc.why !== 'string') errs.push(`${w}.why: string required`);
  if ('source' in sc && typeof sc.source !== 'string') errs.push(`${w}.source: string required`);
  if ('start' in sc && (typeof sc.start !== 'string' || !START_RE.test(sc.start))) errs.push(`${w}.start: must be initial, live or snapshot:<k>`);
  if ('timeLimit' in sc && (!isNum(sc.timeLimit) || !(numVal(sc.timeLimit) > 0))) errs.push(`${w}.timeLimit: positive number required`);
  return errs;
}

/** Errors of a whole scenario file (schema + lint: ids unique, prefix consistent). */
export function validateScenarioFile(file, { prefix } = {}) {
  const errs = [];
  if (!isObj(file)) return ['the file must contain a JSON object'];
  for (const k of Object.keys(file)) if (!FILE_KEYS.includes(k)) errs.push(`unknown file-level key "${k}"`);
  for (const k of SCENARIO_SCHEMA.required) if (!(k in file)) errs.push(`"${k}" required`);
  if ('schema' in file && file.schema !== SCENARIO_SCHEMA_ID) errs.push(`schema must be "${SCENARIO_SCHEMA_ID}"`);
  if ('app' in file && (typeof file.app !== 'string' || !/^[a-z0-9-]+$/.test(file.app))) errs.push('app: lower-case letters, digits and - only');
  if ('notebook' in file && (typeof file.notebook !== 'string' || /[\\/]/.test(file.notebook) || !file.notebook.endsWith('.nb'))) errs.push('notebook: a .nb file name without folders');
  if ('notebookSha256' in file && (typeof file.notebookSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(file.notebookSha256))) errs.push('notebookSha256: 64 lower-case hex digits');
  if ('start' in file && (typeof file.start !== 'string' || !START_RE.test(file.start))) errs.push('start: must be initial, live or snapshot:<k>');
  for (const k of ['timeLimit', 'scenarioTimeLimit', 'initTimeLimit']) if (k in file && (!isNum(file[k]) || !(numVal(file[k]) > 0))) errs.push(`${k}: positive number required`);
  for (const k of ['maxStringChars', 'traceLimit']) if (k in file && !isInt(file[k])) errs.push(`${k}: integer required`);
  for (const k of ['definitions', 'traceFunctions', 'traceSystemFunctions', 'inspectDefinitions']) {
    if (k in file && (!Array.isArray(file[k]) || file[k].some((s) => typeof s !== 'string'))) errs.push(`${k}: array of strings required`);
  }
  if ('images' in file && typeof file.images !== 'boolean') errs.push('images: boolean required');
  for (const k of ['probes', 'probeFormulas']) if (k in file && !isObj(file[k])) errs.push(`${k}: object required`);
  if ('wlChecks' in file && (!isObj(file.wlChecks) || Object.values(file.wlChecks).some((s) => typeof s !== 'string'))) errs.push('wlChecks: object of strings required');
  for (const k of ['source', 'licence', 'generatedBy']) if (k in file && typeof file[k] !== 'string') errs.push(`${k}: string required`);
  if (!Array.isArray(file.scenarios) || !file.scenarios.length) { errs.push('scenarios: non-empty array required'); return errs; }
  const seen = new Set();
  file.scenarios.forEach((sc, i) => {
    errs.push(...scenarioErrors(sc, `scenarios[${i}]`));
    if (isObj(sc) && typeof sc.id === 'string') {
      if (seen.has(sc.id)) errs.push(`${sc.id}: duplicate id (HW-04)`);
      seen.add(sc.id);
      if (prefix && !sc.id.startsWith(`H-${prefix}-`)) errs.push(`${sc.id}: id prefix must be H-${prefix}-`);
    }
  });
  return errs;
}

/** The parts of a scenario that determine its results (HW-59): what a stale-data check must compare. */
export function scenarioIdentity(file, sc) {
  return {
    id: sc.id,
    start: sc.start ?? file.start ?? 'initial',
    steps: sc.steps,
    capture: sc.capture,
    captureEachStep: sc.captureEachStep ?? false,
    trace: sc.trace ?? false,
    definitions: file.definitions ?? [],
  };
}
/** SHA-256 (hex) of the canonical JSON of scenarioIdentity: recorded by the harness as scenarioSha256. */
export function scenarioSha256(file, sc) {
  return createHash('sha256').update(canonicalLexical(scenarioIdentity(file, sc)), 'utf8').digest('hex');
}

/** Count of real/integer leaves (diagnostics for reports). */
export function countLeaves(v, acc = { real: 0, integer: 0, wl: 0, ctl: 0, string: 0, boolean: 0 }) {
  if (isLexReal(v)) acc.real++;
  else if (isLexInteger(v)) acc.integer++;
  else if (typeof v === 'boolean') acc.boolean++;
  else if (typeof v === 'string') acc[v.startsWith('wl:') ? 'wl' : v.startsWith('ctl:') ? 'ctl' : 'string']++;
  else if (Array.isArray(v)) v.forEach((x) => countLeaves(x, acc));
  return acc;
}
