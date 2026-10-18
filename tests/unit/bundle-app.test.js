// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/bundle-app.test.js — tools/bundle-app.mjs (owner rule R-A: every app can be deployed on its own):
// the reference scanners, the collector on a small synthetic site (temporary folders, removed afterwards), the
// licence lookup, the bundle and zip writer, tools/serve.mjs with a root folder, and the contents table of each
// app's DESIGN.md §6.1 against the collector.
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import {
  scanJs, scanCss, scanHtml, collect, readReuseToml, licenceIdsOf, bundleApp, planApp, contentsMarkdown,
  designContentsBlock, crc32, writeZip, spdxIds,
} from '../../tools/bundle-app.mjs';
import { startServer } from '../../tools/serve.mjs';
import { APPS } from '../e2e/apps.js';

const temps = [];
const tempDir = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-app-test-')); temps.push(d); return d; };
afterAll(() => { for (const d of temps) fs.rmSync(d, { recursive: true, force: true }); });
/** Write a tree { 'a/b.js': 'text', … } below a new temporary folder. */
function tree(files) {
  const root = tempDir();
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}
const specs = (refs) => refs.filter((r) => r.literal).map((r) => r.spec);

describe('scanJs', () => {
  it('finds static, re-export, side-effect and literal dynamic imports, and ignores comments and strings', () => {
    const src = [
      "import a from './a.js';",
      "import * as T from 'three';",
      "import { x as y,\n  z } from \"../b.js\";",
      "import './side.js';",
      "export { q } from './c.js';",
      "export * as ns from './d.js';",
      "export * from './e.js';",
      "export const k = 1;",
      "// import nope from './comment.js';",
      "/* import('./block-comment.js') */",
      "const s = \"import x from './in-string.js'\";",
      'const t = `import(\'./in-template.js\')`;',
      "const lazy = import('./lazy.js');",
      "const m = obj.import('./method.js');",
      "import json from './data.json' with { type: 'json' };",
    ].join('\n');
    const refs = scanJs(src);
    expect(specs(refs)).toEqual(['./a.js', 'three', '../b.js', './side.js', './c.js', './d.js', './e.js', './lazy.js', './data.json']);
    expect(refs.find((r) => r.spec === './lazy.js').dynamic).toBe(true);
    expect(refs.find((r) => r.spec === './data.json').attrType).toBe('json');
    expect(refs.find((r) => r.spec === '../b.js').line).toBe(3);
  });
  it('is not confused by regular expressions and template literals containing quotes', () => {
    const src = [
      "const re = /['\"`]/g, d = 4 / 2 / 1;",
      'const tpl = `a ${"}"} b ${ { k: \'x\' }.k } c`;',
      "if (/\\/'/.test(s)) x = 1;",
      "import z from './after.js';",
    ].join('\n');
    expect(specs(scanJs(src))).toEqual(['./after.js']);
  });
  it('reports non-literal dynamic imports, and finds new URL(…, import.meta.url), import.meta.resolve, fetch and Worker', () => {
    const src = [
      'const m = import(`./mods/${name}.js`);',
      'const n = import(path);',
      "const u = new URL('./img/pic.png', import.meta.url);",
      "const v = new URL('page.json', document.baseURI);",
      "const r = import.meta.resolve('./res.txt');",
      "fetch('./data/table.csv').then((x) => x);",
      'fetch(url);',
      "const w = new Worker('./worker.js', { type: 'module' });",
      'const meta = import.meta.url;',
    ].join('\n');
    const refs = scanJs(src);
    const dyn = refs.filter((r) => r.kind === 'import' && !r.literal);
    expect(dyn.map((r) => r.line)).toEqual([1, 2]);
    expect(refs.filter((r) => r.kind === 'asset' && r.literal).map((r) => [r.spec, r.base])).toEqual([
      ['./img/pic.png', 'module'], ['page.json', 'document'], ['./res.txt', 'module'], ['./data/table.csv', 'document'], ['./worker.js', 'document'],
    ]);
    expect(refs.find((r) => r.spec === 'fetch(url)')?.warnOnly).toBe(true);
  });
});

describe('scanCss and scanHtml', () => {
  it('scanCss finds url(…) and @import, not inside comments', () => {
    const css = "@import 'more.css';\n@import url(\"other.css\");\n/* url(nope.png) */\n.a { background: url(img/bg.png) } .b { mask: url('#m') } .c { background: url(data:image/png;base64,AAA) }";
    expect(scanCss(css).map((r) => r.spec)).toEqual(['more.css', 'other.css', 'img/bg.png', '#m', 'data:image/png;base64,AAA']);
  });
  it('scanHtml reads scripts, the import map, stylesheets, media, links and inline code, not comments', () => {
    const html = `<!doctype html><html><head>
      <link rel="stylesheet" href="s.css"><link rel="canonical" href="https://x.example/">
      <script type="importmap">{ "imports": { "lib": "./vendor/lib.js" } }</script>
      <script src="classic.js" data-x></script>
      <!-- <script src="commented.js"></script> -->
      <style>.x { background: url(bg.png) }</style>
    </head><body>
      <img src="pic.png" srcset="pic-2x.png 2x, pic-3x.png 3x" alt="a > b">
      <a href="../../index.html">All</a><a href="https://example.org/">ext</a>
      <div style="background: url('inline.png')"></div>
      <script type="module">import './inline-mod.js';</script>
      <script type="module" src="./main.js"></script>
    </body></html>`;
    const r = scanHtml(html);
    expect(r.refs.map((x) => `${x.as}:${x.spec}`)).toEqual([
      'css:s.css', 'script:classic.js', 'file:pic.png', 'file:pic-2x.png', 'file:pic-3x.png', 'link:../../index.html',
      'link:https://example.org/', 'script:./main.js',
    ]);
    expect(JSON.parse(r.importMap.json).imports.lib).toBe('./vendor/lib.js');
    expect(r.inlineJs.map((s) => s.src.trim())).toEqual(["import './inline-mod.js';"]);
    expect(r.inlineCss.map((s) => s.src.trim())).toEqual(['.x { background: url(bg.png) }', "background: url('inline.png')"]);
  });
});

describe('collect (synthetic site)', () => {
  const site = {
    'index.html': '<p>landing</p>',
    'demos/x/index.html': `<link rel="stylesheet" href="../../shared/style.css">
      <script type="importmap">{ "imports": { "lib": "../../vendor/lib/lib.js", "lib/": "../../vendor/lib/" } }</script>
      <script src="../../shared/classic.js"></script>
      <a href="../../index.html">All demos</a> <img src="logo.svg" alt="">
      <script type="module" src="./main.js"></script>`,
    'demos/x/main.js': `// import nope from './nope.js';
      import { a } from './model.js';
      import L from 'lib';
      import { E } from 'lib/extra.js';
      const lazy = () => import('../common/lazy.js');
      const data = new URL('./data/points.json', import.meta.url);
      fetch('data/table.csv'); // relative to the page, not to this module`,
    'demos/x/model.js': "export { s } from '../../shared/util.js';\nexport const a = 1;",
    'demos/x/logo.svg': '<svg/>',
    'demos/x/data/points.json': '[]',
    'demos/x/data/table.csv': 'a,b',
    'demos/x/unused.js': 'export const u = 1;',
    'demos/common/lazy.js': "import './lazy-dep.js';",
    'demos/common/lazy-dep.js': '',
    'shared/style.css': "@import 'fonts.css';\nbody { background: url(img/bg.png); }",
    'shared/fonts.css': '/* url(no.woff2) */',
    'shared/img/bg.png': 'png',
    'shared/classic.js': '',
    'shared/util.js': 'export const s = 2;',
    'vendor/lib/lib.js': "export * from './core.js';",
    'vendor/lib/core.js': 'export default 1;',
    'vendor/lib/extra.js': "import L from 'lib';",
    'vendor/lib/unused.js': '',
  };
  it('follows every kind of reference recursively and nothing else', () => {
    const root = tree(site);
    const r = collect(root, ['demos/x/index.html']);
    expect(r.errors).toEqual([]);
    expect(r.files).toEqual([
      'demos/common/lazy-dep.js', 'demos/common/lazy.js', 'demos/x/data/points.json', 'demos/x/data/table.csv',
      'demos/x/index.html', 'demos/x/logo.svg', 'demos/x/main.js', 'demos/x/model.js',
      'shared/classic.js', 'shared/fonts.css', 'shared/img/bg.png', 'shared/style.css', 'shared/util.js',
      'vendor/lib/core.js', 'vendor/lib/extra.js', 'vendor/lib/lib.js',
    ]);
    expect(r.rootLinks.length).toBe(1); // ../../index.html is served by the bundle's generated root page
  });
  it('fails loudly on a missing file, a wrong letter case, an unknown bare name and a non-literal dynamic import', () => {
    const root = tree({
      ...site,
      'demos/x/main.js': "import './missing.js';\nimport './Model.js';\nimport 'unknown-lib';\nconst m = import(`./${name}.js`);\nimport '/abs.js';\nimport 'https://cdn.example/x.js';",
    });
    const r = collect(root, ['demos/x/index.html']);
    expect(r.errors.length).toBe(6);
    expect(r.errors[0]).toMatch(/demos\/x\/main\.js:1: cannot resolve "demos\/x\/missing\.js"/);
    expect(r.errors[1]).toMatch(/:2: .*letter case.*demos\/x\/model\.js/);
    expect(r.errors[2]).toMatch(/:3: bare module name "unknown-lib" is not in the import map/);
    expect(r.errors[3]).toMatch(/:4: non-literal dynamic import/);
    expect(r.errors[4]).toMatch(/:5: root-absolute path/);
    expect(r.errors[5]).toMatch(/:6: remote module/);
  });
  it('accepts a non-literal dynamic import whose targets are listed as extra files', () => {
    const root = tree({ ...site, 'demos/x/main.js': 'const m = import(`./plugins/${name}.js`);', 'demos/x/plugins/p1.js': "import '../model.js';" });
    const r = collect(root, ['demos/x/index.html'], { extraFiles: ['demos/x/plugins/p1.js'], dynamicImportsIn: ['demos/x/main.js'] });
    expect(r.errors).toEqual([]);
    expect(r.files).toContain('demos/x/plugins/p1.js');
    expect(r.files).toContain('shared/util.js'); // extra files are scanned too
  });
});

describe('licences', () => {
  it('reads REUSE.toml annotations: header wins over "closest", "override" wins over the header', () => {
    const root = tree({
      'REUSE.toml': 'version = 1\n[[annotations]]\npath = ["lib/**",\n  "x.md"]\nprecedence = "closest"\nSPDX-License-Identifier = "MIT"\n\n[[annotations]]\npath = "lib/special/*.js"\nprecedence = "override"\nSPDX-License-Identifier = "MIT AND CC-BY-NC-SA-3.0"\n',
      'lib/a.js': '// SPDX-License-Identifier: Apache-2.0\n',
      'lib/b.js': '// no header\n',
      'lib/special/c.js': '// SPDX-License-Identifier: MIT\n',
      'other.js': '',
    });
    const reuse = readReuseToml(fs.readFileSync(path.join(root, 'REUSE.toml'), 'utf8'));
    expect(licenceIdsOf(root, 'lib/a.js', reuse)).toEqual(['Apache-2.0']);
    expect(licenceIdsOf(root, 'lib/b.js', reuse)).toEqual(['MIT']);
    expect(licenceIdsOf(root, 'x.md', reuse)).toEqual(['MIT']);
    expect(licenceIdsOf(root, 'lib/special/c.js', reuse)).toEqual(['MIT', 'CC-BY-NC-SA-3.0']);
    expect(licenceIdsOf(root, 'other.js', reuse)).toEqual([]);
    expect(spdxIds('(MIT OR Apache-2.0) AND GPL-2.0-only WITH Classpath-exception-2.0')).toEqual(['MIT', 'Apache-2.0', 'GPL-2.0-only', 'Classpath-exception-2.0']);
  });
});

describe('bundleApp and the zip writer (synthetic repository)', () => {
  const repo = () => tree({
    'package.json': JSON.stringify({ version: '9.9.9', repository: { url: 'git+https://example.org/site.git' } }),
    'LICENSE.md': '# Licence\n',
    'LICENSES/MIT.txt': 'MIT text', 'LICENSES/CC-BY-NC-SA-3.0.txt': 'CC text',
    'REUSE.toml': '[[annotations]]\npath = "vendor/**"\nprecedence = "closest"\nSPDX-License-Identifier = "MIT"\n',
    'demos/x/index.html': '<!-- SPDX-License-Identifier: CC-BY-NC-SA-3.0 -->\n<title>Demo X</title><link rel="stylesheet" href="../../shared/style.css">'
      + '<script type="importmap">{ "imports": { "lib": "../../vendor/lib/lib.js" } }</script>'
      + '<a href="../../index.html">All demos</a><script type="module" src="./main.js"></script>'
      + '<div class="credits" data-testid="credits">Adapted from <a href="https://example.org/x">"X"</a> by A. Author.</div>',
    'demos/x/main.js': "// SPDX-License-Identifier: CC-BY-NC-SA-3.0\nimport 'lib';",
    'demos/x/DESIGN.md': '# X\n',
    'shared/style.css': '/* SPDX-License-Identifier: MIT */\n',
    'vendor/lib/lib.js': '', 'vendor/lib/LICENSE': 'lib licence',
    'shared/unused.js': '// SPDX-License-Identifier: MIT\n',
  });
  it('copies exactly the loaded files with their layout, plus root page, README, DESIGN.md and licence texts', () => {
    const root = repo();
    const out = tempDir();
    const r = bundleApp('x', { root, outDir: out, zip: true, config: {} });
    const listed = [];
    const walk = (d, pre = '') => { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name), `${pre}${e.name}/`) : listed.push(pre + e.name); };
    walk(r.folder);
    expect(listed.sort()).toEqual(r.files);
    expect(r.files).toEqual(['.nojekyll', 'LICENSE.md', 'LICENSES/CC-BY-NC-SA-3.0.txt', 'LICENSES/MIT.txt', 'README.md',
      'demos/x/DESIGN.md', 'demos/x/index.html', 'demos/x/main.js', 'index.html', 'shared/style.css', 'vendor/lib/LICENSE', 'vendor/lib/lib.js']);
    const index = fs.readFileSync(path.join(r.folder, 'index.html'), 'utf8');
    expect(index).toContain('href="demos/x/"');
    expect(index).toContain("location.replace('demos/x/')");
    const readme = fs.readFileSync(path.join(r.folder, 'README.md'), 'utf8');
    expect(readme).toContain('# Demo X');
    expect(readme).toContain('Adapted from ["X"](https://example.org/x) by A. Author.');
    expect(readme).toContain('npm run bundle -- x');
    expect(readme).toMatch(/browsers block ES modules on `file:\/\/`/);
    expect(readme).toContain('**MIT** (`LICENSES/MIT.txt`): `shared/`, `vendor/lib/`.');
    expect(readme).not.toMatch(/[A-Z]:\\|\/home\/|\/Users\/|\/tmp\//); // no local machine paths
    // a second run replaces the earlier bundle; a foreign folder is never overwritten
    expect(() => bundleApp('x', { root, outDir: out, config: {} })).not.toThrow();
    fs.mkdirSync(path.join(out, 'y-foreign', 'x'), { recursive: true });
    fs.writeFileSync(path.join(out, 'y-foreign', 'x', 'keep.txt'), 'mine');
    expect(() => bundleApp('x', { root, outDir: path.join(out, 'y-foreign'), config: {} })).toThrow(/not a bundle made by this tool/);
    // the zip holds the same files below the folder x/, and they inflate to the same bytes
    const zip = fs.readFileSync(r.zipFile);
    const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    const count = zip.readUInt16LE(eocd + 10);
    let p = zip.readUInt32LE(eocd + 16);
    const names = [];
    for (let k = 0; k < count; k++) {
      const method = zip.readUInt16LE(p + 10), crc = zip.readUInt32LE(p + 16), csize = zip.readUInt32LE(p + 20);
      const nlen = zip.readUInt16LE(p + 28), off = zip.readUInt32LE(p + 42);
      const name = zip.subarray(p + 46, p + 46 + nlen).toString('utf8');
      const lnlen = zip.readUInt16LE(off + 26), lxlen = zip.readUInt16LE(off + 28);
      const body = zip.subarray(off + 30 + lnlen + lxlen, off + 30 + lnlen + lxlen + csize);
      const data = method === 8 ? zlib.inflateRawSync(body) : body;
      expect(crc32(data), name).toBe(crc);
      expect(data.equals(fs.readFileSync(path.join(r.folder, name.slice(2)))), name).toBe(true);
      names.push(name);
      p += 46 + nlen;
    }
    expect(names).toEqual(r.files.map((f) => `x/${f}`));
  });
  it('refuses to bundle an app with an unresolvable reference, listing the problems', () => {
    const root = repo();
    fs.writeFileSync(path.join(root, 'demos/x/main.js'), "// SPDX-License-Identifier: CC-BY-NC-SA-3.0\nimport './gone.js';\nimport(name);");
    expect(() => bundleApp('x', { root, outDir: tempDir(), config: {} })).toThrow(/2 problem\(s\)[\s\S]*gone\.js[\s\S]*non-literal dynamic import/);
  });
  it('crc32 matches the standard check value; writeZip stores empty files', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
    const d = tree({ 'empty.txt': '' });
    writeZip(d, path.join(d, 'e.zip'), 'top', ['empty.txt']);
    expect(fs.readFileSync(path.join(d, 'e.zip')).length).toBeGreaterThan(22);
  });
});

describe('tools/serve.mjs with a root folder', () => {
  it('serves only that folder, on a free port', async () => {
    const outer = tree({ 'site/index.html': 'root page', 'site/a/b.js': 'export {};', 'secret.txt': 'secret' });
    const s = await startServer({ root: path.join(outer, 'site'), port: 0 });
    try {
      const get = (p) => new Promise((resolve, reject) => {
        http.get({ host: '127.0.0.1', port: s.port, path: p }, (res) => {
          let body = '';
          res.on('data', (c) => { body += c; });
          res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
        }).on('error', reject);
      });
      expect(await get('/')).toMatchObject({ status: 200, body: 'root page' });
      expect(await get('/a/b.js')).toMatchObject({ status: 200, type: 'text/javascript; charset=utf-8' });
      expect((await get('/missing.js')).status).toBe(404);
      for (const p of ['/../secret.txt', '/%2e%2e/secret.txt']) expect((await get(p)).status, p).toBe(404); // URL parsing removes the dots
      expect((await get('/a/..%2f..%2fsecret.txt')).status).toBe(403); // decoded only afterwards: caught by the folder check
      expect((await get('/_internal/x.md')).status).toBe(403);
    } finally {
      await s.close();
    }
  });
});

describe('every app', () => {
  it.each(APPS.map((a) => a.dir))('bundle contents listed in DESIGN.md match the collector: %s', (dir) => {
    const plan = planApp(dir);
    expect(plan.errors).toEqual([]);
    expect(designContentsBlock(dir), `demos/${dir}/DESIGN.md §6.1: run "npm run bundle -- --update-docs"`).toBe(contentsMarkdown(plan));
  });
});
