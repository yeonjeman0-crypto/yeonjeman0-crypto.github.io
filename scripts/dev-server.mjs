import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4000);
const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
]);

const rootPrefix = `${SITE_ROOT}${path.sep}`;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}`);
    const cleanPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const candidate = path.resolve(SITE_ROOT, `.${cleanPath}`);

    if (candidate !== SITE_ROOT && !candidate.startsWith(rootPrefix)) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const info = await stat(candidate);
    const finalPath = info.isDirectory() ? path.join(candidate, 'index.html') : candidate;
    const body = await readFile(finalPath);
    res.writeHead(200, {
      'content-type': MIME_TYPES.get(path.extname(finalPath).toLowerCase()) || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`SAMJOO SM website: http://${HOST}:${PORT}`);
  console.log('Press Ctrl+C to stop.');
});
