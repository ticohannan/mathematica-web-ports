// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/design-docs.test.js — the design documents are the specification of each app
// (docs/DESIGN_PROCESS.md). This test keeps them tied to the code version and checks that every
// feature has a reason, a version and verification references that really exist.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const APPS = [
  { dir: 'motion-planning', prefix: 'MP', spec: 'motion-planning.spec.js' },
  { dir: 'three-parametrizations', prefix: 'TP', spec: 'three-parametrizations.spec.js' },
  { dir: 'euler-angles', prefix: 'EA', spec: 'euler.spec.js' },
];
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const read = (f) => fs.readFileSync(f, 'utf8');
const checklist = read('docs/MANUAL_TEST_CHECKLIST.md');
const unitText = ['tests/unit', 'tests/golden'].flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.js')).map((f) => read(path.join(d, f)))).join('\n');

/** Rows of all markdown tables: arrays of trimmed cells (header and separator rows excluded). */
export function tableRows(md) {
  const rows = [];
  let prevWasTable = false;
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) { prevWasTable = false; continue; }
    const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => /^-+$/.test(c))) { prevWasTable = true; continue; }
    if (prevWasTable) rows.push(cells);
    prevWasTable = true;
  }
  return rows;
}
const section = (md, title) => {
  const i = md.indexOf(`## ${title}`);
  if (i < 0) return '';
  const j = md.indexOf('\n## ', i + 1);
  return md.slice(i, j < 0 ? undefined : j);
};

describe.each(APPS)('design document of $dir', ({ dir, prefix, spec }) => {
  const file = `demos/${dir}/DESIGN.md`;
  const md = read(file);
  const e2eText = read(`tests/e2e/${spec}`) + read('tests/e2e/site.spec.js');
  const featureRows = tableRows(section(md, '4. Features')).filter((r) => new RegExp(`^[FA]-${prefix}-\\d+$`).test(r[0]));

  it(`names the current code version (package.json ${version})`, () => {
    expect(md).toMatch(new RegExp(`\\| Code version: \\| ${version.replace(/\./g, '\\.')} \\|`));
  });
  it('has the required sections', () => {
    for (const s of ['1. Purpose', '2. Scope', '3. Users and use cases', '4. Features', '5. UI inventory', '6. Design', '7. Deviations', '8. Proposed changes', '9. Revision history', '10. Improvements to consider']) {
      expect(md, s).toContain(`## ${s}`);
    }
  });
  it('lists features with unique IDs', () => {
    expect(featureRows.length).toBeGreaterThan(8);
    const ids = featureRows.map((r) => r[0]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every feature has a reason, a version and verification', () => {
    for (const [id, feature, why, since, verified] of featureRows) {
      expect(feature, id).toBeTruthy();
      expect(why, `${id}: Why`).toMatch(/\w{3}/);
      expect(since, `${id}: Since`).toMatch(/^v\d+\.\d+\.\d+$/);
      expect(verified, `${id}: Verified by`).toMatch(/\w/);
    }
  });
  it('every verification reference exists (test titles, checklist items)', () => {
    for (const [id, , , , verified] of featureRows) {
      for (const ref of verified.split(';').map((r) => r.trim()).filter(Boolean)) {
        const m = ref.match(/^(e2e|unit|golden) "(.+)"$/);
        if (m) {
          const hay = m[1] === 'e2e' ? e2eText : unitText;
          expect(hay.includes(m[2]), `${id}: test title "${m[2]}" not found (${m[1]})`).toBe(true);
        } else if (/^M-[A-Z]+-\d+$/.test(ref)) {
          expect(checklist, `${id}: checklist item ${ref}`).toMatch(new RegExp(`### ${ref}\\b`));
        } else {
          expect(['inventory', 'compare', 'review'], `${id}: unknown reference "${ref}"`).toContain(ref);
        }
      }
    }
  });
  it('every UI-inventory row points to features of this document', () => {
    const ids = new Set(featureRows.map((r) => r[0]));
    const inv = tableRows(section(md, '5. UI inventory'));
    expect(inv.length).toBeGreaterThan(3);
    for (const [pattern, features] of inv) {
      expect(pattern, 'inventory pattern must be in backticks').toMatch(/^`[^`]+`$/);
      for (const f of features.split(',').map((x) => x.trim())) expect(ids.has(f), `${pattern} → ${f}`).toBe(true);
    }
  });
  it('improvements to consider have unique IDs, a benefit and a cost/risk, and are not features', () => {
    const rows = tableRows(section(md, '10. Improvements to consider'));
    expect(rows.length).toBeGreaterThan(2);
    const ids = rows.map((r) => r[0]);
    for (const [id, what, benefit, cost] of rows) {
      expect(id).toMatch(new RegExp(`^I-${prefix}-\\d+$`));
      expect(what, id).toMatch(/\w{3}/);
      expect(benefit, `${id}: Benefit`).toMatch(/\w{3}/);
      expect(cost, `${id}: Cost / risk`).toMatch(/\w{3}/);
    }
    expect(new Set(ids).size).toBe(ids.length);
    const featureIds = new Set(featureRows.map((r) => r[0]));
    for (const id of ids) expect(featureIds.has(id), id).toBe(false);
  });
  it('the revision history has a row for the current code version', () => {
    const rows = tableRows(section(md, '9. Revision history'));
    expect(rows.some((r) => r[1] === `v${version}`)).toBe(true);
  });
});

describe('design process document', () => {
  it('exists and links all three design documents', () => {
    const p = read('docs/DESIGN_PROCESS.md');
    for (const { dir } of APPS) expect(p).toContain(`demos/${dir}/DESIGN.md`);
  });
});
