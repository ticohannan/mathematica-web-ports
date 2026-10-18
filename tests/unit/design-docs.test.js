// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/design-docs.test.js — the design documents are the specification of each app
// (docs/DESIGN_PROCESS.md). This test keeps them tied to the code version and checks that every
// feature has a reason, a version and verification references that really exist.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { APPS as ALL_APPS } from '../e2e/apps.js';
// Apps whose DESIGN.md exists; the test 'every app has a design document' requires all of them.
const APPS = ALL_APPS.filter((a) => fs.existsSync(`demos/${a.dir}/DESIGN.md`)).map((a) => ({ dir: a.dir, prefix: a.prefix, spec: a.spec }));
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const read = (f) => fs.readFileSync(f, 'utf8');
// general checklist + one checklist file per app (docs/checklists/<dir>.md)
const checklist = [read('docs/MANUAL_TEST_CHECKLIST.md'), ...fs.readdirSync('docs/checklists').filter((f) => f.endsWith('.md')).map((f) => read(path.join('docs/checklists', f)))].join('\n');
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
// Section 11 (owner rule R-C): title, table header, Kind vocabulary.
const ERRORS_TITLE = '11. Errors in the original (conceptual and mathematical)';
const ERRORS_HEADER = ['ID', 'Kind', 'Where in the original', 'What is (probably) wrong', 'What the port does', 'Effect of correcting it', 'Status'];
const ERROR_KINDS = ['conceptual', 'mathematical', 'numerical', 'text'];
const section = (md, title) => {
  const i = md.indexOf(`## ${title}`);
  if (i < 0) return '';
  const j = md.indexOf('\n## ', i + 1);
  return md.slice(i, j < 0 ? undefined : j);
};

describe.each(APPS)('design document of $dir', ({ dir, prefix, spec }) => {
  const file = `demos/${dir}/DESIGN.md`;
  const md = read(file);
  // bundle.spec.js titles its per-app tests with ${app.dir}; substituted here so the title can be cited verbatim
  const e2eText = read(`tests/e2e/${spec}`) + read('tests/e2e/site.spec.js') + read('tests/e2e/bundle.spec.js').replaceAll('${app.dir}', dir);
  const featureRows = tableRows(section(md, '4. Features')).filter((r) => new RegExp(`^[FA]-${prefix}-\\d+$`).test(r[0]));

  it(`names the current code version (package.json ${version})`, () => {
    expect(md).toMatch(new RegExp(`\\| Code version: \\| ${version.replace(/\./g, '\\.')} \\|`));
  });
  it('has the required sections', () => {
    for (const s of ['1. Purpose', '2. Scope', '3. Users and use cases', '4. Features', '5. UI inventory', '6. Design', '7. Deviations', '8. Proposed changes', '9. Revision history', '10. Improvements to consider', ERRORS_TITLE]) {
      expect(md, s).toContain(`## ${s}`);
    }
  });
  // owner rule R-A: every app can be bundled alone; tools/bundle-app.mjs --update-docs rewrites the table in this subsection
  it('section 6 has the subsection "### 6.n Building and deploying this app alone" with the bundle-contents table', () => {
    const sec = section(md, '6. Design');
    const m = sec.match(/^### 6\.\d+ Building and deploying this app alone$/m);
    expect(m, 'heading "### 6.n Building and deploying this app alone" in section 6').toBeTruthy();
    const rest = sec.slice(m.index + m[0].length);
    const next = rest.search(/^### /m);
    expect((next < 0 ? rest : rest.slice(0, next)), 'bundle-contents block inside that subsection').toMatch(/<!-- bundle-contents:begin[\s\S]*?<!-- bundle-contents:end -->/);
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
        const m = ref.match(/^(e2e|unit|golden|harness) "(.+)"$/);
        if (m && m[1] === 'harness') {
          // Mathematica-harness scenario H-XX-nn: a golden test titled `harness "H-XX-nn"` (HW-65) and the scenario in
          // tests/harness/<dir>.scenarios.json
          expect(unitText.includes(`harness "${m[2]}"`), `${id}: harness test "${m[2]}" not found`).toBe(true);
          expect(read(`tests/harness/${dir}.scenarios.json`).includes(`"id": "${m[2]}"`), `${id}: scenario ${m[2]} not in tests/harness/${dir}.scenarios.json`).toBe(true);
        } else if (m) {
          const hay = m[1] === 'e2e' ? e2eText : unitText;
          expect(hay.includes(m[2]), `${id}: test title "${m[2]}" not found (${m[1]})`).toBe(true);
        } else if (/^M-[A-Z][A-Z0-9]*-\d+$/.test(ref)) {
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
  // Owner rule R-C (2026-10-17, docs/DESIGN_PROCESS.md rule 9): errors in the original, the last section.
  it(`has "## ${ERRORS_TITLE}" as its last section, after section 10`, () => {
    const heads = md.split('\n').filter((l) => l.startsWith('## '));
    expect(heads[heads.length - 1]).toBe(`## ${ERRORS_TITLE}`);
    expect(md.indexOf('## 10. Improvements to consider')).toBeLessThan(md.indexOf(`## ${ERRORS_TITLE}`));
  });
  it('section 11 is a table of 7 columns with E- IDs, the Kind and Status vocabularies and no empty cells', () => {
    const sec = section(md, ERRORS_TITLE);
    const header = sec.split('\n').find((l) => l.startsWith('|'));
    expect(header && header.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim())).toEqual(ERRORS_HEADER);
    const rows = tableRows(sec);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const id = row[0];
      expect(row.length, `${id}: number of columns`).toBe(7);
      for (const [k, cell] of row.entries()) expect(cell, `${id}: column "${ERRORS_HEADER[k]}" is empty`).not.toBe('');
      const [, kind, , , , , status] = row;
      if (id === '—') {
        expect(kind, 'a row without an ID must be the "none found" row').toBe('none found');
        expect(status, 'status of the "none found" row').toBe('—');
      } else {
        expect(id).toMatch(new RegExp(`^E-${prefix}-\\d+$`));
        expect(ERROR_KINDS, `${id}: Kind`).toContain(kind);
        expect(kind, `${id}: "none found" needs the ID —`).not.toBe('none found');
        expect(status, `${id}: Status`).toMatch(/^(open|kept|corrected in v\d+\.\d+\.\d+)$/);
      }
    }
    if (rows.some((r) => r[0] === '—')) expect(rows.length, 'the "none found" row stands alone').toBe(1);
    const ids = rows.map((r) => r[0]).filter((id) => id !== '—');
    expect(new Set(ids).size, 'E- IDs are unique').toBe(ids.length);
    // E- IDs are not used as IDs of features, additions, improvements or any other table row of the document
    const otherIds = new Set(tableRows(md.replace(sec, '')).map((r) => r[0]));
    for (const id of ids) expect(otherIds.has(id), `${id} is also used outside section 11`).toBe(false);
  });
});

describe('design documents present', () => {
  it('every app has a design document', () => {
    for (const a of ALL_APPS) expect(fs.existsSync(`demos/${a.dir}/DESIGN.md`), a.dir).toBe(true);
  });
});

describe('design process document', () => {
  it('exists and links all design documents', () => {
    const p = read('docs/DESIGN_PROCESS.md');
    for (const { dir } of ALL_APPS) expect(p).toContain(`demos/${dir}/DESIGN.md`);
  });
});
