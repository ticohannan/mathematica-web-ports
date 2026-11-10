// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/errata-mode.test.js — the switch "errors of the original: kept | corrected" (shared/errata.js, v0.1.34):
// the shared helper, and for every app with a demos/<dir>/errata-mode.js that its list of corrections, its page, its
// design document (§4, §5, §8, §9, §11), its own unit tests and its browser scenario agree. The corrections themselves
// are tested in each app's unit test file, in the describe block "corrected mode (E-XX)".
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { APPS } from '../e2e/apps.js';
import { isCorrected, ErrataControl, ORIGINAL, CORRECTED, ERRATA } from '../../shared/errata.js';
import { updateDesign, correctedModeDoc, loadCorrections } from '../../tools/errata-docs.mjs';
import { SCENARIOS } from '../support/errata-scenarios.js';
import { tableRows } from './design-docs.test.js';

const read = (f) => fs.readFileSync(f, 'utf8');
const version = JSON.parse(read('package.json')).version;
const unitText = fs.readdirSync('tests/unit').filter((f) => f.endsWith('.js')).map((f) => read(path.join('tests/unit', f))).join('\n');
const WITH = APPS.filter((a) => fs.existsSync(`demos/${a.dir}/errata-mode.js`));
const section = (md, title) => {
  const i = md.indexOf(`## ${title}`);
  const j = md.indexOf('\n## ', i + 1);
  return md.slice(i, j < 0 ? undefined : j);
};

describe('shared/errata.js', () => {
  it('a state without the variable, or with "original", is the original; only "corrected" is corrected', () => {
    expect(isCorrected(undefined)).toBe(false);
    expect(isCorrected({})).toBe(false);
    expect(isCorrected({ [ERRATA]: ORIGINAL })).toBe(false);
    expect(isCorrected({ [ERRATA]: 'Corrected' })).toBe(false);
    expect(isCorrected({ [ERRATA]: true })).toBe(false);
    expect(isCorrected({ [ERRATA]: CORRECTED })).toBe(true);
  });
  it('the control is a setter bar on the variable errata with the default "original"', () => {
    const [[name, init, label], values, opts] = ErrataControl([]);
    expect([name, init, label]).toEqual(['errata', 'original', 'errors of the original']);
    expect(values.map((v) => [v.value, v.label])).toEqual([['original', 'kept'], ['corrected', 'corrected']]);
    expect(opts.ControlType.controlType).toBe('SetterBar');
  });
  it('at least one app has the switch, and every scenario belongs to an app with the switch', () => {
    expect(WITH.length).toBeGreaterThan(0);
    for (const dir of Object.keys(SCENARIOS)) expect(WITH.map((a) => a.dir), dir).toContain(dir);
  });
});

describe.each(WITH)('errata switch of $dir', ({ dir, prefix }) => {
  const md = read(`demos/${dir}/DESIGN.md`);
  it('errata-mode.js lists corrections with unique E- IDs of this app and both texts', async () => {
    const list = await loadCorrections(dir);
    expect(list.length).toBeGreaterThan(0);
    expect(new Set(list.map((c) => c.id)).size).toBe(list.length);
    for (const c of list) {
      expect(c.id).toMatch(new RegExp(`^E-${prefix}-\\d+$`));
      expect(Object.keys(c).sort()).toEqual(['corrected', 'id', 'original']);
      for (const t of [c.original, c.corrected]) { expect(t.trim().length, c.id).toBeGreaterThan(10); expect(t, c.id).not.toContain('|'); }
    }
  });
  it('the page adds the switch with the app\'s list', () => {
    const main = read(`demos/${dir}/main.js`);
    expect(main).toMatch(/import \{[^}]*\bErrataControl\b[^}]*\} from '\.\.\/\.\.\/shared\/errata\.js'/);
    expect(main).toMatch(/import \{ CORRECTIONS \} from '\.\/errata-mode\.js'/);
    expect(main).toContain('ErrataControl(CORRECTIONS)');
  });
  it('§11 marks exactly the listed findings as switchable', async () => {
    const ids = (await loadCorrections(dir)).map((c) => c.id).sort();
    const rows = tableRows(section(md, '11. Errors in the original'));
    expect(rows.filter((r) => /^switchable since v/.test(r[6])).map((r) => r[0]).sort()).toEqual(ids);
    for (const r of rows.filter((x) => ids.includes(x[0]))) expect(r[4], r[0]).toContain('**Switch:**');
  });
  it('the app\'s unit tests have the block "corrected mode (E-XX)" and the browser test has a scenario', () => {
    expect(unitText).toContain(`describe('corrected mode (E-${prefix})'`);
    const s = SCENARIOS[dir];
    expect(s, `tests/support/errata-scenarios.js has no scenario for ${dir}`).toBeTruthy();
    expect(typeof s.probe).toBe('string');
    expect(s.original).not.toEqual(s.corrected);
  });
});

describe('documents in step with errata-mode.js (node tools/errata-docs.mjs)', () => {
  it('every DESIGN.md is what the tool writes', async () => {
    for (const app of APPS) {
      const file = `demos/${app.dir}/DESIGN.md`;
      expect(updateDesign(read(file), app, await loadCorrections(app.dir), version) === read(file), `${file}: run "node tools/errata-docs.mjs"`).toBe(true);
    }
  });
  it('docs/CORRECTED_MODE.md is what the tool writes', async () => {
    const entries = [];
    for (const app of WITH) entries.push({ ...app, corrections: await loadCorrections(app.dir) });
    expect(read('docs/CORRECTED_MODE.md')).toBe(correctedModeDoc(entries, version));
  });
});
