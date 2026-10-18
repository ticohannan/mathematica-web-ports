// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/new-test-run.test.js — the test-run template generator (tools/new-test-run.mjs) and the form of the
// manual checklist items it reads (owner rule R-B, docs/DESIGN_PROCESS.md rule 8): every item that opens an original
// notebook has the fixed headings Open, Prepare, Do, Record, Save, Port, Expected in this order; browser-only items
// have Steps, Record, Expected. Writes only into a temporary folder, which is removed afterwards.
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { APPS } from '../e2e/apps.js';
import { main, parseItems, checklistSource, knownDirs, notebooksIn, renderTestRun } from '../../tools/new-test-run.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'new-test-run-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));
const quiet = { log: () => {}, err: () => {} };
// every app in the registry has a checklist (general = docs/MANUAL_TEST_CHECKLIST.md)
const DIRS = ['general', ...APPS.map((a) => a.dir)];
const PROCEDURE = ['Open', 'Prepare', 'Do', 'Record', 'Save', 'Port', 'Expected / what it decides'];
const SHORT = ['Steps', 'Record', 'Expected'];

describe('tools/new-test-run.mjs', () => {
  it('knows general, the apps and nothing else', () => {
    expect(knownDirs().sort()).toEqual([...DIRS].sort());
  });

  it.each(DIRS)('writes the template for %s with every M- item of its checklist', (dir) => {
    const src = checklistSource(dir);
    const ids = [...src.text.matchAll(/^### (M-[A-Z]+-\d+)\b/gm)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(5);
    expect(main([dir, '--date=2026-10-17', `--out=${tmp}`], quiet)).toBe(0);
    const out = fs.readFileSync(path.join(tmp, `2026-10-17_${dir}.md`), 'utf8');
    expect(out).toContain(`# Test run — ${dir} — 2026-10-17`);
    expect([...out.matchAll(/^## (M-[A-Z]+-\d+)\b/gm)].map((m) => m[1])).toEqual(ids);
    expect(out.match(/^Result: \[ \] PASS {2}\[ \] FAIL {2}\[ \] UNSURE$/gm)).toHaveLength(ids.length);
    for (const it of parseItems(src.text)) expect(out, it.id).toContain(`Record: ${it.record}`);
  });

  it('lists the original notebook of the app, not the saved working copies', () => {
    const nbs = notebooksIn(checklistSource('car-paths').text);
    expect(nbs).toEqual(['_internal\\originals\\Demonstration-Shortest-Path-for-Forward-and-Reverse-Motion-of-a-Car-1-0-0-definition.nb']);
    expect(notebooksIn(checklistSource('general').text)).toEqual([]);
    const md = renderTestRun({ dir: 'x', date: '2026-01-02', source: 's.md', items: [], notebooks: [] });
    expect(md).toContain('Original notebook(s): none (browser-only items)');
  });

  it('never overwrites an existing test-run file unless --force is given', () => {
    const args = ['prm', '--date=2026-10-18', `--out=${tmp}`];
    expect(main(args, quiet)).toBe(0);
    const file = path.join(tmp, '2026-10-18_prm.md');
    fs.appendFileSync(file, 'tester notes\n');
    expect(main(args, quiet)).toBe(1);
    expect(fs.readFileSync(file, 'utf8')).toContain('tester notes');
    expect(main([...args, '--force'], quiet)).toBe(0);
    expect(fs.readFileSync(file, 'utf8')).not.toContain('tester notes');
  });

  it('refuses unknown folders, bad dates and missing arguments', () => {
    expect(main(['no-such-app'], quiet)).toBe(2);
    expect(main(['../etc'], quiet)).toBe(2);
    expect(main(['prm', '--date=17.10.2026', `--out=${tmp}`], quiet)).toBe(2);
    expect(main([], quiet)).toBe(2);
  });

  it('runs from the command line (npm run test-run)', () => {
    const r = spawnSync(process.execPath, ['tools/new-test-run.mjs', 'unit-balls', '--date=2026-10-19', `--out=${tmp}`], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/wrote .*2026-10-19_unit-balls\.md \(8 items: M-UB-01 … M-UB-08\)/);
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.scripts['test-run']).toBe('node tools/new-test-run.mjs');
  });
});

describe('manual checklist items are operator procedures (R-B)', () => {
  it.each(DIRS)('%s: items that open an original have the seven fixed headings in order', (dir) => {
    for (const item of parseItems(checklistSource(dir).text)) {
      if (item.headings[0] === 'Open') {
        expect(item.headings, item.id).toEqual(PROCEDURE);
        expect(item.body, `${item.id}: names the notebook by its repository path`).toMatch(/`_internal\\originals\\[^`]+\.nb`/);
      } else {
        expect(item.headings, `${item.id}: browser-only items use Steps / Record / Expected`).toEqual(SHORT);
        expect(item.body, `${item.id}: a browser-only item must not need the original`).not.toMatch(/_internal\\originals\\/);
      }
      expect(item.record, `${item.id}: Record says what to write down`).toMatch(/\w{3}/);
    }
  });
});
