import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { attachWsRoomHub } from './wsRoomHub.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  let relPath = decodeURIComponent(url.pathname);
  if (relPath === '/') relPath = '/index.html';

  const safePath = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(DIST_DIR, safePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback for HTML routes, 404 for missing static assets
    if (path.extname(safePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  fs.createReadStream(filePath).pipe(res);
});

attachWsRoomHub(server, { destroyUnmatched: true });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`STRANGER 2.0 server listening on http://localhost:${PORT}`);
});
