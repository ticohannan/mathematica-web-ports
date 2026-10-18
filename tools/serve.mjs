#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/serve.mjs — zero-dependency static file server for local testing.
// Usage:  node tools/serve.mjs [port] [root]      (default port 8080, default root: the repository)
// Serves the repository root (or the folder given as root, e.g. a bundle made by tools/bundle-app.mjs:
// `node tools/serve.mjs 8081 dist/prm`), the same way GitHub Pages will. Binds to 127.0.0.1 only, so it is
// not reachable from other machines. Port 0 picks a free port.
// Also usable from tests: `const s = await startServer({ root, port: 0 }); … s.url …; await s.close();`
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};
// Never serve private / tooling folders, even locally.
const blocked = ['/_internal', '/node_modules', '/.git'];

/** Start the server. Resolves to { server, port, url, root, close() } once it listens. */
export function startServer({ root = repoRoot, port = 8080, host = '127.0.0.1' } = {}) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (blocked.some((b) => urlPath === b || urlPath.startsWith(b + '/'))) { res.writeHead(403); return res.end('Forbidden'); }
      let file = path.normalize(path.join(base, urlPath));
      if (file !== base && !file.startsWith(base + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      res.writeHead(500); res.end(String(e));
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const actual = server.address().port;
      resolve({
        server, port: actual, root: base, url: `http://${host}:${actual}`,
        close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
      });
    });
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.argv[2] || process.env.PORT || 8080);
  const root = process.argv[3] ? path.resolve(process.argv[3]) : repoRoot;
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) { console.error(`Not a folder: ${root}`); process.exit(1); }
  startServer({ root, port }).then((s) => console.log(`Serving ${s.root} at ${s.url}/  (Ctrl+C to stop)`),
    (e) => { console.error(String(e)); process.exit(1); });
}
