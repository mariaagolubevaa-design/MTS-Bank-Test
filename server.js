import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)));
const binCache = new Map();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf' };
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname.startsWith('/api/bank/')) {
      const bin = url.pathname.slice('/api/bank/'.length);
      if (!/^\d{8}$/.test(bin)) { response.writeHead(400); response.end(); return; }
      let result = binCache.get(bin);
      if (!result) {
        try {
          const upstream = await fetch('https://lookup.binlist.net/' + bin, { headers: { 'Accept-Version': '3' }, signal: AbortSignal.timeout(4000) });
          if (!upstream.ok) throw new Error('Unavailable');
          const data = await upstream.json();
          result = { name: data.bank?.name || null, country: data.country?.alpha2 || null };
          if (result.name && result.country) binCache.set(bin, result);
        } catch { result = { name: null, country: null }; }
      }
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(result)); return;
    }
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!target.startsWith(root + path.sep)) throw new Error('Invalid path');
    const content = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(Number(process.env.PORT || 5173), '127.0.0.1', () => console.log('C2C: http://localhost:5173'));
