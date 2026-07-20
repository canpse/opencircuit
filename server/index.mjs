import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { CircuitRepository } from './circuit-repository.mjs';
import { createApiHandler } from './api.mjs';

const port = Number(process.env.PORT ?? 4173);
const databasePath = process.env.OPENCIRCUIT_DB ?? 'data/opencircuit.sqlite';
mkdirSync(join(databasePath, '..'), { recursive: true });
const repository = new CircuitRepository(databasePath);
const api = createApiHandler(repository);
const dist = join(process.cwd(), 'dist');

const server = createServer(async (request, response) => {
  if (await api(request, response)) return;
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const relative = normalize(pathname)
    .replace(/^(\.\.(\/|\\|$))+/, '')
    .replace(/^\//, '');
  let filename = join(dist, relative || 'index.html');
  try {
    if ((await stat(filename)).isDirectory()) filename = join(filename, 'index.html');
    const content = await readFile(filename);
    response.setHeader('Content-Type', mime(extname(filename)));
    response.end(content);
  } catch {
    try {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(await readFile(join(dist, 'index.html')));
    } catch {
      response.statusCode = 404;
      response.end('Build não encontrado. Execute npm run build.');
    }
  }
});

server.listen(port, () => console.log(`OpenCircuit em http://localhost:${port}`));
process.on('SIGTERM', () => {
  server.close();
  repository.close();
});

function mime(extension) {
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.json': 'application/json',
    }[extension] ?? 'application/octet-stream'
  );
}
