import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.json': 'application/json' };
const server = http.createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile() || path.basename(file).startsWith('_')) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(response);
  } catch {
    response.writeHead(400).end('Bad request');
  }
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE') server.listen(0, '127.0.0.1');
  else throw error;
});
server.listen(Number(process.env.PORT || 4175), '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${server.address().port}`));
