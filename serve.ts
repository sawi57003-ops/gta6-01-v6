// SOL BAY HEAT — tiny static server for local play.
//
// Serves game/ on http://localhost:8080 so the browser can load the ES
// modules (they need http, not file://). No dependencies, Node 22 only.
// Usage: node serve.ts — then open http://localhost:8080 in a browser.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const gameDir = join(here, 'game');
const port = Number(process.env.PORT || 8080);

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const path = url === '/' ? '/index.html' : url;
  const file = join(gameDir, path);
  if (!file.startsWith(gameDir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found: ' + path);
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

server.listen(port, () => {
  console.log('SOL BAY HEAT at http://localhost:' + port + ' — press Ctrl+C to stop.');
});
