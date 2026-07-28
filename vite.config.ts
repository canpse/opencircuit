import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CircuitRepository } from './server/circuit-repository.mjs';
import { createApiHandler } from './server/api.mjs';
import { LibraryRepository } from './server/library-repository.mjs';
import { createLibraryApiHandler } from './server/library-api.mjs';
import { createRateLimiter } from './server/rate-limiter.mjs';
import { createSessionApiHandler } from './server/session-api.mjs';
import { createSessionIdentity, loadOrCreateSessionSecret } from './server/session.mjs';

function circuitApi() {
  return {
    name: 'opencircuit-api',
    configureServer(server: { middlewares: { use: (handler: unknown) => void } }) {
      const databasePath = process.env.OPENCIRCUIT_DB ?? resolve('data/opencircuit.sqlite');
      mkdirSync(resolve(databasePath, '..'), { recursive: true });
      const repository = new CircuitRepository(databasePath);

      const libraryDatabasePath =
        process.env.OPENCIRCUIT_LIBRARY_DB ?? resolve(dirname(databasePath), 'library.sqlite');
      const libraryRepository = new LibraryRepository(libraryDatabasePath);
      const sessionSecret =
        process.env.OPENCIRCUIT_SESSION_SECRET ??
        loadOrCreateSessionSecret(
          process.env.OPENCIRCUIT_SESSION_SECRET_FILE ??
            resolve(dirname(databasePath), 'session-secret'),
        );
      const identity = createSessionIdentity(sessionSecret);
      const rateLimiter = createRateLimiter();
      const handleSession = createSessionApiHandler(identity, rateLimiter);
      const handle = createApiHandler(repository, identity, rateLimiter);
      const handleLibrary = createLibraryApiHandler(libraryRepository, identity, rateLimiter);

      server.middlewares.use(
        async (
          request: Parameters<typeof handle>[0],
          response: Parameters<typeof handle>[1],
          next: () => void,
        ) => {
          if (handleSession(request, response)) return;
          if (await handle(request, response)) return;
          if (await handleLibrary(request, response)) return;
          next();
        },
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), circuitApi()],
});
