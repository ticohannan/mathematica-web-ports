#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/affected.mjs — which browser tests a change can affect (selective testing, v0.1.39; owner decision 2026-11-12,
// internal proposal "selective testing" Q-1…Q-5). The unit and golden tests always run in full (about 10 s); only the
// browser tests are selected.
//
//   node tools/affected.mjs [--base <ref>] [--explain] [--json]   print the plan against <ref> (default: the newest
//                                                                 tested-* tag reachable from HEAD)
//   npm run test:affected [-- --base <ref>] [-- --full]           run the unit tests and the selected browser tests
//                                                                 (Firefox, Chromium, WebKit); no tag, no push
//   tools/publish-tested.mjs uses plan() and the full-run schedule below.
//
// Every changed file (git diff --name-only <base> HEAD, plus uncommitted changes) falls into one class:
//   D  documentation: *.md, LICENSES/, docs/original-source/, docs/original-snapshots/, docs/third-party/, REUSE.toml,
//      .nojekyll, tools/wolfram/ (Q-5), package.json / package-lock.json when only the version and description
//      changed — no browser test, except the two kinds of document a browser test reads: demos/<app>/DESIGN.md when its
//      UI inventory (§5) changed (that app's UI-inventory test) and docs/NEW_APP.md (graphics-options' "the example of
//      docs/NEW_APP.md runs")
//   T  unit tests only: tests/unit/, tests/harness/, tests/golden/ files of no app, tests/support/ files no browser test
//      loads — no browser test
//   A  one app: demos/<app>/, tests/e2e/<its spec>, tests/golden/<app>.* — that app's spec and its rows in the cross-app
//      specs (attribution, UI inventory, start-up / WebGL notice, bundle, errata switch); likewise a non-app spec and
//      its fixture page (tests/e2e/<name>.spec.js, tests/e2e/fixtures/<page>.html)
//   S  shared code: shared/, demos/common/, vendor/ — every app (and fixture page) that loads the file, each as in A;
//      a file that every app loads (shared/manipulate.js and its imports, shared/style.css) means a full run
//   L  landing page: index.html at the root, an app's thumbnail.webp — the landing-page tests of site.spec.js
//   F  everything else (package.json beyond the version, configs, tests/e2e/helpers.js, tests/support/ beyond appended
//      scenarios, tools/ outside tools/wolfram/, a deleted shared file, any unknown path): a FULL run. tests/e2e/apps.js
//      and tests/support/errata-scenarios.js count as A for the apps they add when they only add entries.
// Which apps load a file: each app's index.html (<script src>, <link href>, inline module imports, the import map of
// three) and, from there, every static import / export-from / import('…') with a literal path — the same for the
// fixture pages of the non-app specs. An import that cannot be resolved to a file is reported (unit test: none).
//
// Full-run schedule (Q-2): a full run is due when the newest full run (a tested-* tag whose message does not say
// "(selective") is 7 days old or older, when 4 selective releases followed it (so every 5th release is full), or when the
// Playwright or Node version differs from the "env:" line of that tag (or it has none).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CLASS_NAMES = { D: 'documentation', T: 'unit tests only', A: 'one app', S: 'shared code', L: 'landing page', F: 'full run' };
export const CROSS_APP_SPECS = ['site.spec.js', 'bundle.spec.js', 'errata-mode.spec.js'];
const LANDING_TITLES = ['landing page links to all demos', 'every card on the landing page', 'attribution on the landing page', 'private folders are not served'];
const NEW_APP_DOC_TITLE = 'the example of docs/NEW_APP.md runs';

const posix = (p) => p.split(path.sep).join('/');
export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---- the dependency map ----------------------------------------------------------------------------------------------
const IMPORT_RE = /(?:^|[\s;{}])(?:import|export)\s*(?:[\w*{}\s,$]*?\s*from\s*)?['"]([^'"\n]+)['"]|import\(\s*['"]([^'"\n]+)['"]\s*\)/g;
const HTML_REF_RE = /<(?:script|link)\b[^>]*?\s(?:src|href)\s*=\s*"([^"]+)"/g;
const IMPORT_MAP = { three: 'vendor/three/three.module.js', 'three/addons/': 'vendor/three/addons/' };

/** resolve an import specifier from repository file `from` (posix, relative to root); null for a URL or bare name */
export function resolveSpecifier(from, spec) {
  if (spec === 'three') return IMPORT_MAP.three;
  if (spec.startsWith('three/addons/')) return IMPORT_MAP['three/addons/'] + spec.slice('three/addons/'.length);
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  if (/^[a-z]+:/i.test(spec)) return null;
  const abs = spec.startsWith('/') ? spec.slice(1) : path.posix.join(path.posix.dirname(from), spec);
  return path.posix.normalize(abs.split(/[?#]/)[0]);
}

/** source without comments: block comments, whole-line // comments and HTML comments (examples in headers are not imports) */
export const stripComments = (t) => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** the repository files a page or module loads, transitively (posix paths); unresolved: [{from, spec}] */
export function closureOf(entries, { root = ROOT, unresolved = [] } = {}) {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    const abs = path.join(root, file);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) { unresolved.push({ from: '(entry)', spec: file }); return; }
    seen.add(file);
    const text = /\.(m?js|html)$/.test(file) ? stripComments(fs.readFileSync(abs, 'utf8')) : '';
    if (file.endsWith('.html')) {
      for (const m of text.matchAll(HTML_REF_RE)) {
        if (/^[a-z]+:|^\/\//i.test(m[1])) continue; // external URL (none expected)
        const r = resolveSpecifier(file, m[1]);
        if (r) visit(r);
      }
    }
    if (/\.(m?js|html)$/.test(file)) {
      for (const m of text.matchAll(IMPORT_RE)) {
        const spec = m[1] ?? m[2];
        const r = resolveSpecifier(file, spec);
        if (r === null) { if (!/^(node:|@playwright|vitest)/.test(spec)) unresolved.push({ from: file, spec }); continue; }
        if (!fs.existsSync(path.join(root, r))) { unresolved.push({ from: file, spec }); continue; }
        visit(r);
      }
    }
  };
  for (const e of entries) visit(e);
  return seen;
}

/** the apps (tests/e2e/apps.js) and the non-app specs with their fixture pages */
export async function registry(root = ROOT) {
  const { APPS } = await import(pathToFileURL(path.join(root, 'tests/e2e/apps.js')).href);
  const appSpecs = new Set(APPS.map((a) => a.spec));
  const specs = fs.readdirSync(path.join(root, 'tests/e2e')).filter((f) => f.endsWith('.spec.js'));
  const fixtureSpecs = specs.filter((s) => !appSpecs.has(s) && !CROSS_APP_SPECS.includes(s)).map((spec) => {
    const src = fs.readFileSync(path.join(root, 'tests/e2e', spec), 'utf8');
    const pages = [...new Set([...src.matchAll(/fixtures\/([\w.-]+\.html)/g)].map((m) => `tests/e2e/fixtures/${m[1]}`))];
    return { spec, pages };
  });
  // the tests/support files the browser tests load (the others serve only unit tests)
  const e2eSupport = new Set();
  for (const f of fs.readdirSync(path.join(root, 'tests/e2e')).filter((x) => x.endsWith('.js'))) {
    for (const s of closureOf([`tests/e2e/${f}`], { root })) if (s.startsWith('tests/support/')) e2eSupport.add(s);
  }
  return { APPS, fixtureSpecs, specs, e2eSupport };
}

/** { apps: {dir: Set(files)}, fixtures: {spec: Set(files)}, unresolved } — what each page loads */
export async function dependencyMap(root = ROOT) {
  const { APPS, fixtureSpecs } = await registry(root);
  const unresolved = [];
  const apps = {}, fixtures = {};
  for (const a of APPS) apps[a.dir] = closureOf([`demos/${a.dir}/index.html`], { root, unresolved });
  for (const f of fixtureSpecs) fixtures[f.spec] = closureOf(f.pages, { root, unresolved });
  const { e2eSupport } = await registry(root);
  return { APPS, fixtureSpecs, apps, fixtures, unresolved, e2eSupport };
}

// ---- classes ---------------------------------------------------------------------------------------------------------
/**
 * The class of one changed path (posix, relative to the root), without looking at its content:
 * { cls: 'D'|'T'|'A'|'S'|'L'|'F'|'P'|'R', app?, spec?, inventory?, title?, why } — 'P' (package files: D when only the
 * version changed, else F) and 'R' (registries: A for appended entries, else F) are decided by plan() from the content.
 */
export function classify(file, { APPS, fixtureSpecs, e2eSupport = new Set() }) {
  const dirs = new Set(APPS.map((a) => a.dir));
  const bySpec = new Map(APPS.map((a) => [a.spec, a.dir]));
  const fixtureBySpec = new Map(fixtureSpecs.map((f) => [f.spec, f]));
  const m = (re) => file.match(re);
  let r;
  if (file === 'package.json' || file === 'package-lock.json') return { cls: 'P', why: 'package file' };
  if (file === 'tests/e2e/apps.js' || file === 'tests/support/errata-scenarios.js') return { cls: 'R', why: 'app registry' };
  if (file.startsWith('tools/wolfram/')) return { cls: 'D', why: 'a Mathematica script no test runs (Q-5)' };
  if ((r = m(/^demos\/([^/]+)\/DESIGN\.md$/)) && dirs.has(r[1])) return { cls: 'D', inventory: r[1], why: 'design document (its UI-inventory test)' };
  if (file === 'docs/NEW_APP.md') return { cls: 'D', title: NEW_APP_DOC_TITLE, why: 'NEW_APP.md (its example is tested)' };
  if (file.endsWith('.md')) return { cls: 'D', why: 'documentation' };
  if (/^(LICENSES|docs\/original-source|docs\/original-snapshots|docs\/third-party)\//.test(file) || file === 'REUSE.toml' || file === '.nojekyll') return { cls: 'D', why: 'documentation or licence data' };
  if ((r = m(/^demos\/([^/]+)\/thumbnail\.webp$/)) && dirs.has(r[1])) return { cls: 'L', app: r[1], why: 'landing-page thumbnail' };
  if (file.startsWith('demos/common/')) return { cls: 'S', why: 'shared app code' };
  if ((r = m(/^demos\/([^/]+)\//)) && dirs.has(r[1])) return { cls: 'A', app: r[1], why: 'app file' };
  if (file.startsWith('shared/') || file.startsWith('vendor/')) return { cls: 'S', why: 'shared code' };
  if ((r = m(/^tests\/e2e\/([^/]+\.spec\.js)$/))) {
    if (bySpec.has(r[1])) return { cls: 'A', app: bySpec.get(r[1]), why: 'the app\'s browser tests' };
    if (fixtureBySpec.has(r[1])) return { cls: 'A', spec: r[1], why: 'a shared-code browser test' };
    return { cls: 'F', why: 'a browser test of every app' };
  }
  if ((r = m(/^tests\/e2e\/fixtures\/([^/]+)$/))) {
    const users = fixtureSpecs.filter((f) => f.pages.includes(file)).map((f) => f.spec);
    return users.length ? { cls: 'A', specs: users, why: 'a fixture page' } : { cls: 'F', why: 'an unused fixture' };
  }
  if ((r = m(/^tests\/golden\/([^/]+?)\.[^/]+$/))) {
    // golden data of an app: <dir>.<anything>, longest matching dir
    const dir = [...dirs].filter((d) => r[0].startsWith(`tests/golden/${d}.`)).sort((x, y) => y.length - x.length)[0];
    return dir ? { cls: 'A', app: dir, why: 'the app\'s golden data' } : { cls: 'T', why: 'golden data of no app' };
  }
  if (file.startsWith('tests/unit/') || file.startsWith('tests/harness/') || file.startsWith('tests/golden/')) return { cls: 'T', why: 'unit tests' };
  if (file.startsWith('tests/support/') && !e2eSupport.has(file)) return { cls: 'T', why: 'a helper of the unit tests only' };
  if (file === 'vitest.config.js') return { cls: 'T', why: 'the unit-test configuration (the unit tests always run)' };
  if (file === 'index.html') return { cls: 'L', why: 'landing page' };
  return { cls: 'F', why: 'not a documentation, app, shared-code or test file' };
}

// ---- git helpers -----------------------------------------------------------------------------------------------------
const git = (args, root = ROOT) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 }).trim();
const gitOk = (args, root = ROOT) => spawnSync('git', args, { cwd: root, encoding: 'utf8' }).status === 0;
const showAt = (ref, file, root = ROOT) => { try { return git(['show', `${ref}:${file}`], root); } catch { return null; } };

/** the tested-* tags reachable from HEAD, newest first: [{ name, date, message }] */
export function testedTags(root = ROOT) {
  const out = git(['for-each-ref', '--merged', 'HEAD', '--sort=-creatordate', '--format=%(refname:short)%00%(creatordate:iso-strict)%00%(contents)%00%00', 'refs/tags/tested-*'], root);
  return out.split('\0\0').map((s) => s.replace(/^\n/, '')).filter(Boolean).map((s) => { const [name, date, message = ''] = s.split('\0'); return { name, date: new Date(date), message: message.trim() }; });
}
export const isSelectiveTag = (t) => /\(selective/.test(t.message);
export const envLine = (root = ROOT) => {
  const pw = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@playwright/test/package.json'), 'utf8')).version;
  return `env: playwright ${pw}; node ${process.version}`;
};

/** whether a full run is due (Q-2): { due, why } */
export function fullRunSchedule(tags, { now = new Date(), env } = {}) {
  const lastFullIdx = tags.findIndex((t) => !isSelectiveTag(t));
  if (lastFullIdx < 0) return { due: true, why: 'no full run among the tested-* tags' };
  const last = tags[lastFullIdx];
  if (lastFullIdx >= 4) return { due: true, why: `${lastFullIdx} selective releases since the full run ${last.name} (every 5th release is full)` };
  if (now - last.date >= 7 * 864e5) return { due: true, why: `the full run ${last.name} is a week old or older` };
  const was = (last.message.match(/^env: .*$/m) || [null])[0];
  if (env && was !== env) return { due: true, why: was ? `the browsers or Node changed since ${last.name} (${was} → ${env})` : `${last.name} records no Playwright and Node versions` };
  return { due: false, why: `last full run ${last.name}; ${lastFullIdx} selective release(s) since` };
}

const parseJson = (s) => { try { return JSON.parse(s); } catch { return null; } };
export const withoutVersion = (file, s) => {
  const j = parseJson(s);
  if (!j) return null;
  delete j.version; delete j.description;
  if (file === 'package-lock.json' && j.packages?.['']) delete j.packages[''].version;
  return JSON.stringify(j);
};
async function loadModule(text, name) {
  const dir = fs.mkdtempSync(path.join((await import('node:os')).tmpdir(), 'affected-'));
  const f = path.join(dir, name);
  fs.writeFileSync(f, text);
  try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
/** an app registry that only gained entries: the added app dirs; null if anything else changed */
export async function appendedEntries(file, baseText, headText) {
  if (baseText === null) return null;
  const [b, h] = [await loadModule(baseText, 'r.mjs'), await loadModule(headText, 'r.mjs')];
  if (file === 'tests/e2e/apps.js') {
    const old = new Map(b.APPS.map((a) => [a.dir, JSON.stringify(a)]));
    if (b.APPS.some((a) => JSON.stringify(h.APPS.find((x) => x.dir === a.dir)) !== old.get(a.dir))) return null;
    return h.APPS.filter((a) => !old.has(a.dir)).map((a) => a.dir);
  }
  const [bo, ho] = [b.SCENARIOS, h.SCENARIOS];
  if (Object.keys(bo).some((k) => JSON.stringify(bo[k]) !== JSON.stringify(ho[k]))) return null;
  return Object.keys(ho).filter((k) => !(k in bo));
}

// ---- the plan --------------------------------------------------------------------------------------------------------
/**
 * plan({ base, files, root }) → { base, full, reasons, files: [{file, cls, …}], apps (dirs), fixtureSpecs, inventories,
 * titles, landing, grep (the Playwright --grep pattern as a string; '' = no browser test) }.
 * files defaults to the changes from base to the working tree (committed and uncommitted, untracked included).
 */
export async function plan({ base, files, root = ROOT, deleted } = {}) {
  const map = await dependencyMap(root);
  const { APPS } = map;
  if (!base) base = testedTags(root)[0]?.name ?? null;
  const reasons = [];
  if (!base) reasons.push('no tested-* tag to compare with');
  if (!files && base) {
    const diff = git(['diff', '--name-status', '--no-renames', base], root).split('\n').filter(Boolean).map((l) => l.split('\t'));
    const untracked = git(['ls-files', '--others', '--exclude-standard'], root).split('\n').filter(Boolean);
    deleted = diff.filter(([s]) => s === 'D').map(([, f]) => f);
    files = [...new Set([...diff.map(([, f]) => f), ...untracked])];
  }
  files ??= []; deleted ??= [];
  const out = { base, full: false, reasons, files: [], apps: new Set(), fixtureSpecs: new Set(), inventories: new Set(), titles: new Set(), landing: false, unresolved: map.unresolved };
  const addApp = (d) => out.apps.add(d);
  for (const file of files.map(posix)) {
    let c = classify(file, map);
    if (c.cls === 'P') {
      const same = base && withoutVersion(file, showAt(base, file, root) ?? '') !== null
        && withoutVersion(file, showAt(base, file, root)) === withoutVersion(file, fs.readFileSync(path.join(root, file), 'utf8'));
      c = same ? { cls: 'D', why: 'only the version or description changed' } : { cls: 'F', why: 'dependencies or scripts changed' };
    } else if (c.cls === 'R') {
      const added = fs.existsSync(path.join(root, file)) ? await appendedEntries(file, base ? showAt(base, file, root) : null, fs.readFileSync(path.join(root, file), 'utf8')) : null;
      c = added ? { cls: 'A', apps: added, why: `entries added for ${added.join(', ') || 'no app'}` } : { cls: 'F', why: 'existing entries changed' };
    }
    if (c.inventory) { // the UI-inventory test reads only §5 of the design document: unchanged §5, no browser test
      const sec = (t) => (t === null ? null : t.slice(t.indexOf('## 5. UI inventory'), t.indexOf('\n## 6.')));
      const now = fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : null;
      if (base && now !== null && sec(showAt(base, file, root)) === sec(now)) c = { cls: 'D', why: 'design document, UI inventory (§5) unchanged' };
    }
    if (deleted.includes(file) && (c.cls === 'S' || (c.cls === 'A' && !fs.existsSync(path.join(root, 'demos', c.app ?? '-'))))) c = { cls: 'F', why: 'a deleted shared or app file' };
    if (c.cls === 'S') {
      const users = Object.entries(map.apps).filter(([, s]) => s.has(file)).map(([d]) => d);
      const fx = Object.entries(map.fixtures).filter(([, s]) => s.has(file)).map(([sp]) => sp);
      if (users.length === APPS.length) c = { cls: 'F', why: 'loaded by every app' };
      else { users.forEach(addApp); fx.forEach((s) => out.fixtureSpecs.add(s)); c = { ...c, users, fixtures: fx }; }
    }
    if (c.cls === 'A') { if (c.app) addApp(c.app); (c.apps ?? []).forEach(addApp); if (c.spec) out.fixtureSpecs.add(c.spec); (c.specs ?? []).forEach((s) => out.fixtureSpecs.add(s)); }
    if (c.cls === 'L') { out.landing = true; if (c.app) addApp(c.app); }
    if (c.cls === 'D') { if (c.inventory) out.inventories.add(c.inventory); if (c.title) out.titles.add(c.title); }
    if (c.cls === 'F') reasons.push(`${file}: ${c.why}`);
    out.files.push({ file, ...c });
  }
  if (map.unresolved.length) reasons.push(`unresolved imports: ${[...new Set(map.unresolved.map((u) => `${u.from} → ${u.spec}`))].join(', ')}`);
  out.full = reasons.length > 0;
  out.grep = out.full ? '' : grepPattern(out, APPS);
  return out;
}

/** the Playwright --grep pattern (matched against "project file describe… title") for a selective plan */
export function grepPattern({ apps, fixtureSpecs, inventories, titles, landing }, APPS) {
  const alts = [];
  const file = (spec) => `(?:^|[\\s/\\\\])${escapeRe(spec)}(?:\\s|$)`;
  for (const a of APPS.filter((x) => apps.has(x.dir))) {
    alts.push(file(a.spec), escapeRe(a.url), `bundle: ${escapeRe(a.dir)} runs from`, `errata switch on ${escapeRe(a.dir)}:`);
  }
  for (const s of fixtureSpecs) alts.push(file(s));
  for (const d of inventories) if (!apps.has(d)) { const a = APPS.find((x) => x.dir === d); if (a) alts.push(`every control on ${escapeRe(a.url)} is specified`); }
  for (const t of titles) alts.push(escapeRe(t));
  if (landing) for (const t of LANDING_TITLES) alts.push(escapeRe(t));
  return alts.join('|');
}

/** a short text of the plan for the console and the tag message */
export function describePlan(p, { explain = false } = {}) {
  const lines = [];
  const by = {};
  for (const f of p.files) (by[f.cls] ??= []).push(f);
  lines.push(`base ${p.base ?? '(none)'}; ${p.files.length} changed file(s): ${Object.keys(by).sort().map((k) => `${k} ${by[k].length}`).join(', ') || 'none'}`);
  if (p.full) lines.push(`FULL run: ${p.reasons.join('; ')}`);
  else if (!p.grep) lines.push('no browser test can be affected (documentation and unit tests only)');
  else {
    if (p.apps.size) lines.push(`apps (${p.apps.size}): ${[...p.apps].sort().join(', ')}`);
    if (p.fixtureSpecs.size) lines.push(`shared-code specs: ${[...p.fixtureSpecs].sort().join(', ')}`);
    if (p.inventories.size) lines.push(`UI-inventory tests: ${[...p.inventories].sort().join(', ')}`);
    if (p.titles.size) lines.push(`tests: ${[...p.titles].join(', ')}`);
    if (p.landing) lines.push('landing-page tests');
  }
  if (explain) for (const f of p.files) lines.push(`  ${f.cls} ${f.file} — ${f.why}${f.users ? ` → ${f.users.length} app(s): ${f.users.join(', ')}` : ''}${f.fixtures?.length ? `; specs ${f.fixtures.join(', ')}` : ''}`);
  return lines.join('\n');
}

// ---- CLI -------------------------------------------------------------------------------------------------------------
async function main(argv) {
  const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const p = await plan({ base: opt('--base') });
  if (argv.includes('--json')) { console.log(JSON.stringify({ ...p, apps: [...p.apps], fixtureSpecs: [...p.fixtureSpecs], inventories: [...p.inventories], titles: [...p.titles] }, null, 1)); return; }
  const full = p.full || argv.includes('--full');
  console.log(describePlan(p, { explain: argv.includes('--explain') }));
  if (!argv.includes('--run')) return;
  const sh = (cmd, env = {}) => spawnSync(cmd, { cwd: ROOT, shell: true, stdio: 'inherit', env: { ...process.env, ...env } }).status === 0;
  console.log('\n== Unit + golden tests ==');
  if (!sh('npm test')) process.exit(1);
  if (!full && !p.grep) { console.log('\n✔ unit tests passed; no browser test selected.'); return; }
  console.log(`\n== Browser tests (Firefox + Chromium + WebKit): ${full ? 'all' : 'selected'} ==`);
  if (!sh('npx playwright test --project=firefox --project=chromium --project=webkit', full ? {} : { PW_GREP: p.grep })) process.exit(1);
  console.log('\n✔ all selected tests passed.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
