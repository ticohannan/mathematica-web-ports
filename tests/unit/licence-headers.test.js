// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/licence-headers.test.js — every source file declares its licence (REUSE/SPDX), and the
// split between MIT tooling and CC BY-NC-SA adaptations stays as documented in LICENSE.md.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SKIP = new Set(['node_modules', 'test-output', 'vendor', '_internal', '.git', 'LICENSES']);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|py|css|html|wls)$/.test(e.name)) out.push(p.split(path.sep).join('/'));
  }
  return out;
}
const files = walk('.').map((f) => f.replace(/^\.\//, ''));
const licenceOf = (f) => (fs.readFileSync(f, 'utf8').split('\n').slice(0, 8).join('\n').match(/SPDX-License-Identifier: (\S+)/) || [])[1];

describe('licence headers', () => {
  it('found the source files', () => expect(files.length).toBeGreaterThan(30));
  it.each(files)('%s has an SPDX-License-Identifier in its first lines', (f) => {
    expect(['MIT', 'CC-BY-NC-SA-3.0']).toContain(licenceOf(f));
  });
  it('adapted demos, golden tests and the reference planner are CC BY-NC-SA 3.0', () => {
    for (const f of files.filter((f) => /^(demos\/|tests\/golden\/|tests\/support\/)/.test(f) || f === 'index.html')) {
      expect(licenceOf(f), f).toBe('CC-BY-NC-SA-3.0');
    }
  });
  it('tools and shared helpers are MIT', () => {
    for (const f of files.filter((f) => /^(tools\/|shared\/)/.test(f))) expect(licenceOf(f), f).toBe('MIT');
  });
  it('no file credits an AI tool as author or co-author', () => {
    for (const f of [...files, 'README.md', 'LICENSE.md'].filter((f) => !f.endsWith('licence-headers.test.js'))) {
      expect(fs.readFileSync(f, 'utf8'), f).not.toMatch(/co-?authored|SPDX-FileCopyrightText:.*(Claude|Anthropic)/i);
    }
  });
});
