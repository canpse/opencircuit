import { defineConfig } from 'vitest/config';
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
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx,mjs}', 'server/**/*.mjs'],
      exclude: ['tests/**', '**/*.d.ts', '**/*.d.mts'],
      thresholds: {
        'src/core/**': {
          statements: 90,
          branches: 80,
          functions: 95,
          lines: 90,
        },
        'server/!(index).mjs': {
          statements: 80,
          branches: 70,
          functions: 95,
          lines: 85,
        },
      },
    },
  },
});
