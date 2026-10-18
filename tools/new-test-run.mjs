// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/new-test-run.mjs — writes the fill-in test-run file for one app and day (owner rule R-B,
// docs/DESIGN_PROCESS.md rule 8; procedure in docs/MATHEMATICA_CHECKS.md):
//
//   node tools/new-test-run.mjs <dir> [--date=YYYY-MM-DD] [--out=FOLDER] [--force]
//   npm run test-run -- <dir>
//
// <dir> is an app folder under demos/ (e.g. car-paths) or "general" for the M-GEN items. The items are read from
// docs/checklists/<dir>.md, or, for general and the first three apps, from their section of
// docs/MANUAL_TEST_CHECKLIST.md. The file goes to _internal/test-runs/<date>_<dir>.md (or FOLDER/<date>_<dir>.md)
// and lists every M- item with its Record instructions and empty result fields. An existing file is never
// overwritten unless --force is given. Exit status: 0 written, 1 refused (file exists), 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAIN_CHECKLIST = 'docs/MANUAL_TEST_CHECKLIST.md';
/** Items kept in docs/MANUAL_TEST_CHECKLIST.md: dir -> item prefix. */
export const MAIN_SECTIONS = { general: 'GEN', 'motion-planning': 'MP', 'three-parametrizations': 'TP', 'euler-angles': 'EA' };

/** The checklist text that holds the items of `dir`, and its repository-relative file name. */
export function checklistSource(dir, root = ROOT) {
  if (MAIN_SECTIONS[dir]) {
    const md = fs.readFileSync(path.join(root, MAIN_CHECKLIST), 'utf8');
    const prefix = MAIN_SECTIONS[dir];
    // the section "## <PREFIX> — …" up to the next "## " heading
    const start = md.search(new RegExp(`^## ${prefix} \\u2014`, 'm'));
    if (start < 0) throw new Error(`section "## ${prefix} —" not found in ${MAIN_CHECKLIST}`);
    const next = md.slice(start + 3).search(/^## /m);
    return { file: MAIN_CHECKLIST, text: next < 0 ? md.slice(start) : md.slice(start, start + 3 + next) };
  }
  if (!/^[a-z0-9-]+$/.test(dir)) throw new Error(`not an app folder name: ${dir}`);
  const file = `docs/checklists/${dir}.md`;
  if (!fs.existsSync(path.join(root, file))) throw new Error(`no checklist for "${dir}" (${file} does not exist)`);
  return { file, text: fs.readFileSync(path.join(root, file), 'utf8') };
}

/** Known values of <dir>: general, the first three apps and every docs/checklists/<dir>.md. */
export function knownDirs(root = ROOT) {
  const own = fs.readdirSync(path.join(root, 'docs/checklists')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
  return [...Object.keys(MAIN_SECTIONS), ...own.sort()];
}

/** The M- items of a checklist text: { id, title, body, record, headings } in file order. */
export function parseItems(text) {
  const items = [];
  const lines = text.split('\n');
  let cur = null;
  const close = () => {
    if (!cur) return;
    const body = cur.lines.join('\n').trim();
    const headings = [...body.matchAll(/^\*\*([A-Z][A-Za-z /]*?)\*\* —/gm)].map((m) => m[1]);
    const rec = body.match(/^\*\*Record\*\* — ([\s\S]*?)(?=^\*\*[A-Z][A-Za-z /]*?\*\* —|(?![\s\S]))/m);
    items.push({ id: cur.id, title: cur.title, body, headings, record: rec ? rec[1].replace(/\s+/g, ' ').trim() : '' });
    cur = null;
  };
  for (const line of lines) {
    const m = line.match(/^### (M-[A-Z]+-\d+)\s+(.*)$/);
    if (m) { close(); cur = { id: m[1], title: m[2].trim(), lines: [] }; continue; }
    if (/^(## |---)/.test(line)) { close(); continue; }
    if (cur) cur.lines.push(line);
  }
  close();
  return items;
}

/** Original notebooks named in a checklist text (`_internal\originals\…\.nb`, not the saved working copies in
 * `_internal\originals\saved\`), in order of first occurrence. */
export function notebooksIn(text) {
  const all = [...text.matchAll(/`(_internal\\originals\\[^`]+?\.nb)`/g)].map((m) => m[1]);
  return [...new Set(all.filter((p) => !p.startsWith('_internal\\originals\\saved\\')))];
}

/** Markdown of the test-run file. */
export function renderTestRun({ dir, date, source, items, notebooks }) {
  const out = [
    `# Test run — ${dir} — ${date}`,
    '',
    `Items and procedures: \`${source}\`. General procedure: \`docs/MATHEMATICA_CHECKS.md\` (opening the notebook,`,
    'the ⊕ menu, waiting, saving, sending results back). For each item fill in the Original and Port lines, tick one',
    'result box (`[x]`) and add notes; name screenshots `<date>_<dir>_<ID>_<what>.png`.',
    '',
    '```',
    'Tester:',
    `Date: ${date}`,
    'Mathematica version (Help > About Wolfram Mathematica):',
    'Operating system:',
    'Port tested (git log -1 --oneline, or the URL):',
    'Browser + version:',
    `Original notebook(s): ${notebooks.length ? notebooks.join(', ') : 'none (browser-only items)'}`,
    '```',
    '',
  ];
  for (const it of items) {
    out.push('---', '', `## ${it.id}  ${it.title}`, '');
    if (it.record) out.push(`Record: ${it.record}`, '');
    out.push('Original:', 'Port:', 'Result: [ ] PASS  [ ] FAIL  [ ] UNSURE', 'Notes:', '');
  }
  out.push('---', '', '## Anything else', '(unexpected behaviour, ideas, questions)', '');
  return out.join('\n');
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Command line. Returns the exit status; `log` and `err` receive the messages. */
export function main(argv, { root = ROOT, log = console.log, err = console.error } = {}) {
  const opts = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.length ? v.join('=') : true];
  }));
  const args = argv.filter((a) => !a.startsWith('--'));
  if (args.length !== 1 || opts.help) {
    err('usage: node tools/new-test-run.mjs <dir> [--date=YYYY-MM-DD] [--out=FOLDER] [--force]');
    err(`<dir>: ${knownDirs(root).join(', ')}`);
    return 2;
  }
  const dir = args[0];
  const date = opts.date ?? today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { err(`--date must be YYYY-MM-DD, not ${date}`); return 2; }
  let src;
  try { src = checklistSource(dir, root); } catch (e) {
    err(e.message);
    err(`<dir>: ${knownDirs(root).join(', ')}`);
    return 2;
  }
  const items = parseItems(src.text);
  if (!items.length) { err(`no M- items found for "${dir}" in ${src.file}`); return 2; }
  const folder = path.resolve(root, typeof opts.out === 'string' ? opts.out : path.join('_internal', 'test-runs'));
  const file = path.join(folder, `${date}_${dir}.md`);
  if (fs.existsSync(file) && !opts.force) {
    err(`${file} exists; not overwritten (open it to continue, or pass --force)`);
    return 1;
  }
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(file, renderTestRun({ dir, date, source: src.file, items, notebooks: notebooksIn(src.text) }));
  log(`wrote ${file} (${items.length} items: ${items[0].id} … ${items[items.length - 1].id})`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
