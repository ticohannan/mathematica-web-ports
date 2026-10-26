// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/new-app.test.js — tools/new-app.mjs on a temporary copy of the repository files it reads and writes:
// what it writes, how it registers the app, that --remove restores every registry byte for byte, and its refusals.
// (That a generated app passes every unit and browser gate was checked when the tool was written, see its header.)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REG = ['tests/e2e/apps.js', 'index.html', 'README.md', 'docs/DESIGN_PROCESS.md', 'LICENSE.md'];
let tmp;
const run = (...a) => execFileSync(process.execPath, ['tools/new-app.mjs', ...a, '--root', tmp], { encoding: 'utf8', stdio: 'pipe' });
const fail = (...a) => { try { run(...a); return null; } catch (e) { return String(e.stderr); } };
const read = (f) => fs.readFileSync(path.join(tmp, f), 'utf8');

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'new-app-'));
  for (const f of ['package.json', 'REUSE.toml', 'tools', 'shared', 'vendor', 'demos', 'LICENSES', ...REG]) fs.cpSync(f, path.join(tmp, f), { recursive: true });
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('tools/new-app.mjs', () => {
  it('--dry-run lists the files and writes nothing', () => {
    const before = REG.map(read);
    const out = run('dry-demo', '--title', 'Dry Demo', '--slug', 'DryDemo', '--authors', 'A. Author', '--dry-run');
    expect(out).toContain('demos/dry-demo/main.js');
    expect(fs.existsSync(path.join(tmp, 'demos/dry-demo'))).toBe(false);
    expect(REG.map(read)).toEqual(before);
  });
  it('writes a 2D app and registers it everywhere; --remove restores every registry byte for byte', () => {
    const before = REG.map(read);
    run('wave-demo', '--title', 'Wave Demo', '--slug', 'WaveDemo', '--authors', 'Ann Author; Bob Builder', '--published', '2017-01-02');
    for (const f of ['demos/wave-demo/index.html', 'demos/wave-demo/main.js', 'demos/wave-demo/model.js', 'demos/wave-demo/DESIGN.md',
      'tests/unit/wave-demo.test.js', 'tests/e2e/wave-demo.spec.js', 'docs/checklists/wave-demo.md']) expect(fs.existsSync(path.join(tmp, f)), f).toBe(true);
    expect(read('tests/e2e/apps.js')).toContain(`{ dir: 'wave-demo', prefix: 'WD', spec: 'wave-demo.spec.js', url: '/demos/wave-demo/', slug: 'WaveDemo', title: "Wave Demo", authors: ["Ann Author","Bob Builder"], webgl: false, notice: true }`);
    expect(read('index.html')).toContain('<h2 class="section-title">New demonstrations</h2>');
    expect(read('index.html')).toContain('data-testid="demo-link-wave-demo"');
    expect(read('README.md')).toContain('| Wave Demo | `demos/wave-demo/` | SVG |');
    expect(read('docs/DESIGN_PROCESS.md')).toContain('[`demos/wave-demo/DESIGN.md`](../demos/wave-demo/DESIGN.md)');
    expect(read('LICENSE.md')).toContain('| `demos/wave-demo/` | "Wave Demo" — <https://demonstrations.wolfram.com/WaveDemo/> (published 2017-01-02) | Ann Author and Bob Builder |');
    const html = read('demos/wave-demo/index.html');
    expect(html).toContain('SPDX-License-Identifier: CC-BY-NC-SA-3.0');
    expect(html).toContain('href="https://demonstrations.wolfram.com/WaveDemo/"');
    expect(html).toContain('by Ann Author and Bob Builder');
    expect(read('demos/wave-demo/main.js')).toMatch(/Manipulate\(\{[\s\S]*Axes: true[\s\S]*Locator\]/);
    const design = read('demos/wave-demo/DESIGN.md');
    expect(design).toMatch(/<!-- bundle-contents:begin[^\n]*\n\| Area \| Files/); // the bundle table was filled in
    expect(design).toContain('| F-WD-01 |');
    run('--remove', 'wave-demo');
    expect(REG.map(read)).toEqual(before);
    expect(fs.existsSync(path.join(tmp, 'demos/wave-demo'))).toBe(false);
    expect(fs.existsSync(path.join(tmp, 'docs/checklists/wave-demo.md'))).toBe(false);
  });
  it('--3d writes a Graphics3D app with View3D and the WebGL 2 start-up check; a second new app joins the same section', () => {
    const indexBefore = read('index.html');
    run('ball-demo', '--title', 'Ball Demo', '--slug', 'BallDemo', '--authors', 'C. Coder', '--3d');
    run('cone-demo', '--title', 'Cone Demo', '--slug', 'ConeDemo', '--authors', 'C. Coder');
    expect(read('demos/ball-demo/index.html')).toContain('data-needs-webgl2');
    expect(read('demos/ball-demo/main.js')).toContain('View3D(');
    expect(read('demos/ball-demo/model.js')).toContain('Graphics3D(');
    expect(read('tests/e2e/apps.js')).toContain("dir: 'ball-demo', prefix: 'BD'");
    expect(read('index.html').match(/New demonstrations/g)).toHaveLength(1);
    run('--remove', 'ball-demo');
    run('--remove', 'cone-demo');
    expect(read('index.html')).toBe(indexBefore); // the section goes again when it was made for these apps
  });
  it("a title with quotes, '&', '<' and '$' stays intact in every file; options may come before the folder name", () => {
    const before = REG.map(read);
    const title = `Tom's "A&B" <x> $& $' cost`;
    run('--3d', 'odd-demo', '--title', title, '--slug', 'OddDemo', '--authors', "D. O'Brien");
    for (const f of ['demos/odd-demo/main.js', 'demos/odd-demo/model.js', 'tests/e2e/apps.js', 'tests/unit/odd-demo.test.js', 'tests/e2e/odd-demo.spec.js']) {
      execFileSync(process.execPath, ['--check', path.join(tmp, f)]); // still valid JavaScript
    }
    expect(read('demos/odd-demo/main.js')).toContain(JSON.stringify(`${title} (3D, drag to rotate)`));
    expect(read('tests/e2e/apps.js')).toContain(`title: ${JSON.stringify(title)}`);
    expect(read('tests/e2e/apps.js').trimEnd().endsWith('];')).toBe(true);
    expect(read('LICENSE.md')).toContain(`the port of "${title}"`);
    expect(read('index.html')).toContain('Tom\'s &quot;A&amp;B&quot; &lt;x&gt; $&amp; $\' cost');
    run('--remove', 'odd-demo');
    expect(REG.map(read)).toEqual(before);
  });
  it('refuses a "|" in the title and a slug that is not a URL name', () => {
    expect(fail('y-demo', '--title', 'A | B', '--slug', 'Y', '--authors', 'X')).toMatch(/may not contain "\|"/);
    expect(fail('y-demo', '--title', 'Y', '--slug', "Y'Z", '--authors', 'X')).toMatch(/--slug must be/);
  });
  it('refuses a folder that exists, a used prefix, missing options, and removing an app it did not make', () => {
    expect(fail('robot-motion-obstacles', '--title', 'X', '--slug', 'X', '--authors', 'X')).toMatch(/exists already/);
    expect(fail('x-demo', '--title', 'X', '--slug', 'X', '--authors', 'X', '--prefix', 'RM')).toMatch(/used by another app/);
    expect(fail('x-demo', '--slug', 'X', '--authors', 'X')).toMatch(/--title/);
    expect(fail('--remove', 'robot-motion-obstacles')).toMatch(/not made by this tool/);
  });
});
