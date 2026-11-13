// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/affected.test.js — tools/affected.mjs (selective testing, v0.1.39): every file of the repository has a class,
// the dependency map is complete, the Playwright pattern selects exactly the intended tests, package and registry
// changes, and the full-run schedule. Expected values are written by hand from the rules in the tool's header.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  classify, registry, dependencyMap, plan, grepPattern, fullRunSchedule, isSelectiveTag, withoutVersion, appendedEntries,
  resolveSpecifier, stripComments,
} from '../../tools/affected.mjs';

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n');

describe('classes', () => {
  it('every tracked file has a class; the full-run ones are the configurations, the cross-app specs and tools/', async () => {
    const reg = await registry();
    const F = tracked.filter((f) => classify(f, reg).cls === 'F');
    const expected = (f) => f.startsWith('tools/') || ['.gitattributes', '.gitignore', 'playwright.config.js', 'tests/e2e/helpers.js',
      'tests/e2e/site.spec.js', 'tests/e2e/bundle.spec.js', 'tests/e2e/errata-mode.spec.js', 'tests/support/car-records.js'].includes(f);
    expect(F.filter((f) => !expected(f))).toEqual([]); // a new kind of file needs a decision in tools/affected.mjs
    expect(F.filter((f) => f.startsWith('tools/wolfram/'))).toEqual([]); // Q-5
  });
  it('examples', async () => {
    const reg = await registry();
    const c = (f) => classify(f, reg);
    expect(c('README.md').cls).toBe('D');
    expect(c('docs/original-snapshots/prm-1.png').cls).toBe('D');
    expect(c('tools/wolfram/export-gradients.wls').cls).toBe('D');
    expect(c('demos/prm/DESIGN.md')).toMatchObject({ cls: 'D', inventory: 'prm' });
    expect(c('docs/NEW_APP.md')).toMatchObject({ cls: 'D', title: 'the example of docs/NEW_APP.md runs' });
    expect(c('demos/prm/main.js')).toMatchObject({ cls: 'A', app: 'prm' });
    expect(c('demos/prm-3d/model.js')).toMatchObject({ cls: 'A', app: 'prm-3d' });
    expect(c('tests/e2e/euler.spec.js')).toMatchObject({ cls: 'A', app: 'euler-angles' });
    expect(c('tests/golden/prm-3d.original-states.json')).toMatchObject({ cls: 'A', app: 'prm-3d' });
    expect(c('tests/golden/prm.original-states.json')).toMatchObject({ cls: 'A', app: 'prm' });
    expect(c('tests/e2e/plot.spec.js')).toMatchObject({ cls: 'A', spec: 'plot.spec.js' });
    expect(c('tests/e2e/fixtures/plot.html')).toMatchObject({ cls: 'A', specs: ['plot.spec.js'] });
    expect(c('tests/unit/plot.test.js').cls).toBe('T');
    expect(c('tests/support/png.js').cls).toBe('T');
    expect(c('shared/plot.js').cls).toBe('S');
    expect(c('demos/common/prm-core.js').cls).toBe('S');
    expect(c('demos/prm/thumbnail.webp')).toMatchObject({ cls: 'L', app: 'prm' });
    expect(c('index.html').cls).toBe('L');
    expect(c('tests/e2e/site.spec.js').cls).toBe('F');
    expect(c('playwright.config.js').cls).toBe('F');
    expect(c('something/new.txt').cls).toBe('F');
  });
});

describe('the dependency map', () => {
  it('every app loads its own main.js and the Manipulate layer; no import is unresolved', async () => {
    const m = await dependencyMap();
    expect(m.unresolved).toEqual([]);
    for (const a of m.APPS) expect(m.apps[a.dir].has(`demos/${a.dir}/index.html`), a.dir).toBe(true);
    for (const a of m.APPS) expect(m.apps[a.dir].has('shared/style.css'), a.dir).toBe(true);
    expect(m.apps['forward-kinematics'].has('shared/traditional-form.css')).toBe(true);
    expect(m.apps['prm'].has('shared/traditional-form.css')).toBe(false);
    expect(m.apps['dh-parameters'].has('vendor/three/three.module.js')).toBe(true); // the import map
    expect(m.apps['prm'].has('vendor/three/three.module.js')).toBe(false);
    expect(m.fixtures['plot.spec.js'].has('shared/plot.js')).toBe(true);
  });
  it('specifiers: relative, root-absolute, the three import map; comments are not imports', () => {
    expect(resolveSpecifier('demos/a/main.js', '../../shared/x.js')).toBe('shared/x.js');
    expect(resolveSpecifier('demos/a/index.html', './main.js')).toBe('demos/a/main.js');
    expect(resolveSpecifier('shared/v.js', 'three')).toBe('vendor/three/three.module.js');
    expect(resolveSpecifier('shared/v.js', 'three/addons/lines/Line2.js')).toBe('vendor/three/addons/lines/Line2.js');
    expect(resolveSpecifier('shared/v.js', 'node:fs')).toBe(null);
    expect(stripComments("// import { a } from './a.js';\n/* import b from './b.js' */\nimport c from './c.js';").trim()).toBe("import c from './c.js';");
  });
});

describe('plans', () => {
  it('an app file selects that app only; a shared file the apps that load it; style.css is a full run', async () => {
    const a = await plan({ base: 'HEAD', files: ['demos/forward-kinematics/model.js'] });
    expect([a.full, [...a.apps]]).toEqual([false, ['forward-kinematics']]);
    const s = await plan({ base: 'HEAD', files: ['shared/traditional-form.css'] });
    expect([...s.apps]).toEqual(['forward-kinematics']);
    const p = await plan({ base: 'HEAD', files: ['shared/plot.js'] });
    expect(p.apps.size).toBeGreaterThan(5);
    expect([...p.fixtureSpecs].sort()).toEqual(['plot-regions.spec.js', 'plot.spec.js']);
    const f = await plan({ base: 'HEAD', files: ['shared/style.css'] });
    expect(f.full).toBe(true);
  });
  it('documentation only: no browser test; an unchanged UI inventory selects no inventory test', async () => {
    const d = await plan({ base: 'HEAD', files: ['README.md', 'docs/TESTING.md', 'demos/prm/DESIGN.md', 'LICENSES/MIT.txt'] });
    expect([d.full, d.grep]).toEqual([false, '']);
  });
  it('package files: only the version and description may differ', () => {
    const a = '{"name":"x","version":"0.1.38","description":"a","scripts":{"t":"1"}}';
    expect(withoutVersion('package.json', a)).toBe(withoutVersion('package.json', '{"name":"x","version":"0.1.39","description":"b","scripts":{"t":"1"}}'));
    expect(withoutVersion('package.json', a)).not.toBe(withoutVersion('package.json', '{"name":"x","version":"0.1.39","scripts":{"t":"2"}}'));
    const lock = (v, dep) => JSON.stringify({ name: 'x', version: v, packages: { '': { version: v }, 'node_modules/y': { version: dep } } });
    expect(withoutVersion('package-lock.json', lock('1', '2'))).toBe(withoutVersion('package-lock.json', lock('3', '2')));
    expect(withoutVersion('package-lock.json', lock('1', '2'))).not.toBe(withoutVersion('package-lock.json', lock('1', '4')));
  });
  it('registries: appended entries select the new apps; a changed entry is a full run', async () => {
    const reg = (rows) => `export const APPS = ${JSON.stringify(rows)};`;
    const x = { dir: 'x', spec: 'x.spec.js' }, y = { dir: 'y', spec: 'y.spec.js' };
    expect(await appendedEntries('tests/e2e/apps.js', reg([x]), reg([x, y]))).toEqual(['y']);
    expect(await appendedEntries('tests/e2e/apps.js', reg([x]), reg([{ ...x, spec: 'z.spec.js' }, y]))).toBe(null);
    const sc = (o) => `export const SCENARIOS = ${JSON.stringify(o)};`;
    expect(await appendedEntries('tests/support/errata-scenarios.js', sc({ a: { p: 1 } }), sc({ a: { p: 1 }, b: { p: 2 } }))).toEqual(['b']);
    expect(await appendedEntries('tests/support/errata-scenarios.js', sc({ a: { p: 1 } }), sc({ a: { p: 2 } }))).toBe(null);
  });
});

describe('the Playwright pattern', () => {
  // Playwright matches --grep against "project file describe… title"
  const line = (spec, title) => `chromium ${spec} ${title}`;
  it('selects the app\'s spec and its cross-app rows, and nothing of an app whose name starts the same', async () => {
    const { APPS } = await registry();
    const re = new RegExp(grepPattern({ apps: new Set(['prm']), fixtureSpecs: new Set(), inventories: new Set(), titles: new Set(), landing: false }, APPS));
    expect(re.test(line('prm.spec.js', 'prm loads'))).toBe(true);
    expect(re.test(line('tests\\e2e\\prm.spec.js', 'prm loads'))).toBe(true);
    expect(re.test(line('site.spec.js', 'attribution on /demos/prm/'))).toBe(true);
    expect(re.test(line('site.spec.js', 'every control on /demos/prm/ is specified in its design document'))).toBe(true);
    expect(re.test(line('bundle.spec.js', 'bundle: prm runs from its own folder'))).toBe(true);
    expect(re.test(line('errata-mode.spec.js', 'errata switch on prm: kept is the original, corrected changes the listed result'))).toBe(true);
    expect(re.test(line('prm-3d.spec.js', 'prm 3d loads'))).toBe(false);
    expect(re.test(line('site.spec.js', 'attribution on /demos/prm-3d/'))).toBe(false);
    expect(re.test(line('bundle.spec.js', 'bundle: prm-3d runs from its own folder'))).toBe(false);
    expect(re.test(line('errata-mode.spec.js', 'errata switch on prm-robot-arm: kept'))).toBe(false);
    expect(re.test(line('site.spec.js', 'landing page links to all demos and they load'))).toBe(false);
  });
  it('landing page, an inventory test alone, a named test', async () => {
    const { APPS } = await registry();
    const re = new RegExp(grepPattern({ apps: new Set(), fixtureSpecs: new Set(), inventories: new Set(['rrt']), titles: new Set(['the example of docs/NEW_APP.md runs']), landing: true }, APPS));
    expect(re.test(line('site.spec.js', 'every card on the landing page has a thumbnail that loads'))).toBe(true);
    expect(re.test(line('site.spec.js', 'every control on /demos/rrt/ is specified in its design document'))).toBe(true);
    expect(re.test(line('site.spec.js', 'attribution on /demos/rrt/'))).toBe(false);
    expect(re.test(line('graphics-options.spec.js', 'the example of docs/NEW_APP.md runs: a body returning a bare list'))).toBe(true);
  });
});

describe('the full-run schedule (Q-2)', () => {
  const env = 'env: playwright 1.63.0; node v22.0.0';
  const tag = (name, days, message) => ({ name, date: new Date(Date.UTC(2026, 10, 20) - days * 864e5), message });
  const now = new Date(Date.UTC(2026, 10, 20));
  const full = (d) => tag(`f${d}`, d, `All automated tests passed (full): …\n${env}`);
  const sel = (d) => tag(`s${d}`, d, `All automated tests passed (selective): …\n${env}`);
  it('selective while the last full run is recent, has the same versions and fewer than 4 selective releases followed', () => {
    expect(fullRunSchedule([sel(1), sel(2), sel(3), full(4)], { now, env }).due).toBe(false);
  });
  it('due: the 5th release, a week, other versions, no versions recorded, no full run at all', () => {
    expect(fullRunSchedule([sel(1), sel(1), sel(2), sel(2), full(3)], { now, env }).due).toBe(true);
    expect(fullRunSchedule([sel(1), full(7)], { now, env }).due).toBe(true);
    expect(fullRunSchedule([full(1)], { now, env: 'env: playwright 1.64.0; node v22.0.0' }).due).toBe(true);
    expect(fullRunSchedule([tag('old', 1, 'All automated tests passed (unit, golden, Firefox + Chromium + WebKit e2e)')], { now, env }).due).toBe(true);
    expect(fullRunSchedule([], { now, env }).due).toBe(true);
  });
  it('a retest after a full run counts as full; after a selective run, as selective', () => {
    expect(isSelectiveTag({ message: 'All automated tests passed (full, retest): …' })).toBe(false);
    expect(isSelectiveTag({ message: 'All automated tests passed (selective, retest): …' })).toBe(true);
  });
});
