// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/errata-docs.mjs — keeps the documents in step with the apps' errata-mode.js files (the switch "errors of the
// original: kept | corrected", shared/errata.js, v0.1.34). Run from the repository folder:
//
//   node tools/errata-docs.mjs            rewrite the DESIGN.md rows and docs/CORRECTED_MODE.md
//   node tools/errata-docs.mjs --check    exit 1 if a file would change (used by the unit test)
//
// For every app of tests/e2e/apps.js:
//   * §9 gets the revision row of the current package.json version (in the switch's own version its text; in a later
//     version an existing row is kept, a missing one is added as a version-number row), and the header's "Code version";
//   * with a demos/<dir>/errata-mode.js: the A- feature row of the switch (§4), its two rows in the UI inventory (§5),
//     the approved P- row (§8) and, for each listed E- finding, Status "switchable since vX.Y.Z" with the sentence
//     "Switch: …" at the end of "What the port does" (§11).
// docs/CORRECTED_MODE.md lists every correction of every app (generated; do not edit by hand).
// The tool is idempotent: running it twice changes nothing.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { APPS } from '../tests/e2e/apps.js';

const SINCE = 'v0.1.34'; // the version that introduced the switch (never changes)
const DATE = '2026-11-10';
const REQUEST = 'owner request 2026-11-10';
const FEATURE_MARK = 'Switch "errors of the original: kept \\| corrected"';
const VERSION_ONLY = `version number (${SINCE}: the switch "errors of the original: kept \\| corrected" for the apps with code-level findings in §11, \`shared/errata.js\`); no change to this app's code, behaviour or picture`;

const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const cells = (line) => line.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
const row = (cs) => `| ${cs.join(' | ')} |`;

/** [start, end) line indices of the section whose heading starts with `## <title>`. */
function sectionRange(lines, title) {
  const i = lines.findIndex((l) => l.startsWith(`## ${title}`));
  if (i < 0) throw new Error(`section "${title}" not found`);
  let j = lines.findIndex((l, k) => k > i && l.startsWith('## '));
  if (j < 0) j = lines.length;
  return [i, j];
}
/** index of the last table line (starting with '|') inside [i, j) */
function lastTableLine(lines, i, j, test = () => true) {
  let last = -1;
  for (let k = i; k < j; k++) if (lines[k].startsWith('|') && test(lines[k])) last = k;
  return last;
}

export async function loadCorrections(dir) {
  const file = path.resolve(`demos/${dir}/errata-mode.js`);
  if (!fs.existsSync(file)) return null;
  const mod = await import(pathToFileURL(file).href);
  // v0.1.37: an app that came with its switch exports SWITCH = { since, date, request } (its own version and request);
  // the list then carries it as a property (the entries themselves are unchanged)
  if (mod.SWITCH) return Object.assign([...mod.CORRECTIONS], { switch: mod.SWITCH });
  return mod.CORRECTIONS;
}
const switchOf = (corrections) => corrections?.switch ?? { since: SINCE, date: DATE, request: REQUEST, owner: 'owner / 2026-11-10' };

export function updateDesign(md, { dir, prefix }, corrections, version) {
  const lines = md.split('\n');
  // header: code version
  const cv = lines.findIndex((l) => /^\| Code version: \|/.test(l));
  if (cv >= 0) lines[cv] = `| Code version: | ${version} |`;

  let featureId = null;
  const { since: SW_SINCE, date: SW_DATE, request: SW_REQUEST } = switchOf(corrections);
  const SW_OWNER = switchOf(corrections).owner ?? `owner / ${SW_DATE}`;
  const own = !!corrections?.switch; // an app ported with its switch: its revision rows are its own
  if (corrections) {
    const ids = corrections.map((c) => c.id);
    // §4 feature row
    let [i, j] = sectionRange(lines, '4. Features');
    const existing = lines.slice(i, j).find((l) => l.includes(FEATURE_MARK));
    if (existing) featureId = cells(existing)[0];
    else {
      const nums = lines.slice(i, j).map((l) => l.match(new RegExp(`^\\| A-${prefix}-(\\d+) \\|`))).filter(Boolean).map((m) => Number(m[1]));
      featureId = `A-${prefix}-${String(Math.max(0, ...nums) + 1).padStart(2, '0')}`;
    }
    const featureRow = row([featureId,
      `${FEATURE_MARK} beside "Initial settings" (variable \`errata\`, default kept = the original's behaviour). "corrected" changes only ${ids.join(', ')} (§11; \`errata-mode.js\`); the differences are listed on the page under "Errors of the original: what "corrected" changes"`,
      `${SW_REQUEST}: every code-level error of the original can be switched between the original's behaviour and its correction`,
      SW_SINCE,
      `unit "corrected mode (E-${prefix})"; e2e "errata switch on ${dir}: kept is the original, corrected changes the listed result"`]);
    if (existing) lines[lines.indexOf(existing)] = featureRow;
    else {
      const at = lastTableLine(lines, i, j, (l) => new RegExp(`^\\| A-${prefix}-\\d+ \\|`).test(l));
      lines.splice((at < 0 ? lastTableLine(lines, i, j) : at) + 1, 0, featureRow);
    }
    // §5 inventory rows
    [i, j] = sectionRange(lines, '5. UI inventory');
    const inv = [row(['`setter-errata-*`', featureId]), row(['`errata-details`', featureId])];
    for (let k = j - 1; k >= i; k--) if (/^\| `(setter-errata-\*|errata-details)` \|/.test(lines[k])) lines.splice(k, 1);
    [i, j] = sectionRange(lines, '5. UI inventory');
    lines.splice(lastTableLine(lines, i, j) + 1, 0, ...inv);
    // §8 proposal row (approved and implemented)
    [i, j] = sectionRange(lines, '8. Proposed changes');
    const pExisting = lines.slice(i, j).find((l) => l.startsWith('|') && l.includes(FEATURE_MARK));
    let pId;
    if (pExisting) pId = cells(pExisting)[0];
    else {
      const nums = [...md.matchAll(new RegExp(`\\bP-${prefix}-(\\d+)\\b`, 'g'))].map((m) => Number(m[1]));
      pId = `P-${prefix}-${String(Math.max(0, ...nums) + 1).padStart(2, '0')}`;
    }
    const pRow = row([pId, `approved (${SW_REQUEST}), implemented in ${SW_SINCE} as ${featureId}`, SW_OWNER,
      `${FEATURE_MARK}: mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for ${ids.join(', ')}`,
      'the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back',
      'the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences']);
    if (pExisting) lines[lines.indexOf(pExisting)] = pRow;
    else {
      const sep = lines.findIndex((l, k) => k > i && k < j && /^\|[-| ]+\|$/.test(l));
      if (sep < 0) throw new Error(`${dir}: §8 has no table`);
      let at = sep;
      while (at + 1 < j && lines[at + 1].startsWith('|')) at++;
      lines.splice(at + 1, 0, pRow);
    }
    // §11 rows
    [i, j] = sectionRange(lines, '11. Errors in the original');
    for (const c of corrections) {
      const k = lines.findIndex((l, n) => n > i && n < j && l.startsWith(`| ${c.id} |`));
      if (k < 0) throw new Error(`${dir}: ${c.id} is not a row of §11`);
      const cs = cells(lines[k]);
      if (cs.length !== 7) throw new Error(`${dir}: ${c.id} has ${cs.length} columns`);
      cs[4] = `${cs[4].replace(/\s*\*\*Switch:\*\*.*$/, '')} **Switch:** with "errors of the original: corrected" (${featureId}, ${SW_SINCE}) — ${strip(c.corrected).replace(/\|/g, '\\|')}`;
      cs[6] = `switchable since ${SW_SINCE}`;
      lines[k] = row(cs);
    }
  }
  // §9 revision row of the current version
  const [i, j] = sectionRange(lines, '9. Revision history');
  const have = lines.findIndex((l, k) => k > i && k < j && l.startsWith('|') && cells(l)[1] === `v${version}`);
  const text = corrections
    ? `${featureId}: the switch "errors of the original: kept \\| corrected" (${SW_REQUEST}); corrected mode for ${corrections.map((c) => c.id).join(', ')}, default kept: the original's behaviour, golden data and pictures unchanged`
    : VERSION_ONLY;
  // v0.1.35: the row text above belongs to the version that brought the switch (SINCE); in a later version an existing
  // row of that version is the release's own and is kept, and a missing one gets a plain version-number row
  if (`v${version}` !== SW_SINCE || own) {
    if (have < 0) {
      const last = lastTableLine(lines, i, j);
      const rev = Number(cells(lines[last])[0]);
      const today = new Date().toISOString().slice(0, 10); // DATE is the switch's own date
      lines.splice(last + 1, 0, row([Number.isFinite(rev) ? rev + 1 : 1, `v${version}`, today, `version number (v${version}); no change to this app's code, behaviour or picture`]));
    }
  } else if (have >= 0) { const cs = cells(lines[have]); cs[3] = text; lines[have] = row(cs); }
  else {
    const last = lastTableLine(lines, i, j);
    const rev = Number(cells(lines[last])[0]);
    lines.splice(last + 1, 0, row([Number.isFinite(rev) ? rev + 1 : 1, `v${version}`, SW_DATE, text]));
  }
  return lines.join('\n');
}

export function correctedModeDoc(entries, version) {
  const out = ['<!-- SPDX-FileCopyrightText: 2026 Tico Hannan', '     SPDX-License-Identifier: CC-BY-NC-SA-3.0 -->', '<!-- generated by tools/errata-docs.mjs from demos/<app>/errata-mode.js; do not edit by hand -->',
    '# Corrected mode: what the switch "errors of the original" changes', '',
    `Since ${SINCE} the apps listed here have a switch beside "Initial settings": **errors of the original: kept | corrected**.`, '',
    '- **kept** (the default) is the faithful port: every number and picture is what the original Demonstration gives,',
    '  including the errors found in it (each app\'s `DESIGN.md` §11).',
    '- **corrected** changes only the code needed to correct the findings listed below. Everything else — controls,',
    '  layout, texts, the other findings — is the same in both modes.',
    '- "Initial settings" returns to **kept**. A saved state or link without the variable `errata` is the original.',
    '- The corrections are the port\'s; none has been confirmed by an author of the originals. The same list is on each',
    '  page under "Errors of the original: what "corrected" changes".', '',
    `To go back to the last version without the switch: tag \`pre-fixed-mode-v0.1.33\` (= v0.1.33, commit \`b4569b0\`).`, '',
    `Apps with the switch: ${entries.length}; corrections: ${entries.reduce((n, e) => n + e.corrections.length, 0)}. Code version ${version}.`, ''];
  for (const e of entries) {
    out.push(`## ${e.title} (\`demos/${e.dir}/\`${e.corrections.switch ? `, since ${e.corrections.switch.since}` : ''})`, '', '| Finding | The original (kept) | Corrected |', '|---|---|---|');
    for (const c of e.corrections) out.push(row([c.id, c.original.replace(/\|/g, '\\|'), c.corrected.replace(/\|/g, '\\|')]));
    out.push('');
  }
  return out.join('\n');
}

async function main() {
  const check = process.argv.includes('--check');
  const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
  const changed = [];
  const entries = [];
  const put = (file, text) => {
    const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (old === text) return;
    changed.push(file);
    if (!check) fs.writeFileSync(file, text);
  };
  for (const app of APPS) {
    const corrections = await loadCorrections(app.dir);
    if (corrections) entries.push({ ...app, corrections });
    const file = `demos/${app.dir}/DESIGN.md`;
    put(file, updateDesign(fs.readFileSync(file, 'utf8'), app, corrections, version));
  }
  put('docs/CORRECTED_MODE.md', correctedModeDoc(entries, version));
  console.log(`${check ? 'would change' : 'changed'}: ${changed.length} file(s)${changed.length ? `\n  ${changed.join('\n  ')}` : ''}`);
  if (check && changed.length) process.exitCode = 1;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
