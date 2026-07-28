import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { CircuitRepository } from './circuit-repository.mjs';
import { createApiHandler } from './api.mjs';
import { LibraryRepository } from './library-repository.mjs';
import { createLibraryApiHandler } from './library-api.mjs';
import { applySecurityHeaders } from './api-helpers.mjs';
import { createRateLimiter } from './rate-limiter.mjs';
import { createSessionApiHandler } from './session-api.mjs';
import {
  createSessionIdentity,
  createTrustedProxyIdentity,
  loadOrCreateSessionSecret,
} from './session.mjs';

const port = Number(process.env.PORT ?? 4173);
const databasePath = process.env.OPENCIRCUIT_DB ?? 'data/opencircuit.sqlite';
mkdirSync(join(databasePath, '..'), { recursive: true });
const repository = new CircuitRepository(databasePath);
const libraryDatabasePath =
  process.env.OPENCIRCUIT_LIBRARY_DB ?? join(dirname(databasePath), 'library.sqlite');
const libraryRepository = new LibraryRepository(libraryDatabasePath);
const sessionSecret =
  process.env.OPENCIRCUIT_SESSION_SECRET ??
  loadOrCreateSessionSecret(
    process.env.OPENCIRCUIT_SESSION_SECRET_FILE ?? join(dirname(databasePath), 'session-secret'),
  );
const identity =
  process.env.OPENCIRCUIT_IDENTITY_MODE === 'trusted-proxy'
    ? createTrustedProxyIdentity(sessionSecret, {
        headerName: process.env.OPENCIRCUIT_AUTH_HEADER ?? 'x-authenticated-user',
      })
    : createSessionIdentity(sessionSecret, {
        secure: process.env.OPENCIRCUIT_SECURE_COOKIE === '1',
      });
const rateLimiter = createRateLimiter();
const sessionApi = createSessionApiHandler(identity, rateLimiter);
const api = createApiHandler(repository, identity, rateLimiter);
const libraryApi = createLibraryApiHandler(libraryRepository, identity, rateLimiter);
const dist = join(process.cwd(), 'dist');

const server = createServer(async (request, response) => {
  applySecurityHeaders(response);
  if (sessionApi(request, response)) return;
  if (await api(request, response)) return;
  if (await libraryApi(request, response)) return;
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
  libraryRepository.close();
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
