import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CircuitRepository } from './server/circuit-repository.mjs';
import { createApiHandler } from './server/api.mjs';
import { LibraryRepository } from './server/library-repository.mjs';
import { createLibraryApiHandler } from './server/library-api.mjs';

function circuitApi() {
  return {
    name: 'opencircuit-api',
    configureServer(server: { middlewares: { use: (handler: unknown) => void } }) {
      const databasePath = process.env.OPENCIRCUIT_DB ?? resolve('data/opencircuit.sqlite');
      mkdirSync(resolve(databasePath, '..'), { recursive: true });
      const repository = new CircuitRepository(databasePath);
      const handle = createApiHandler(repository);

      const libraryDatabasePath =
        process.env.OPENCIRCUIT_LIBRARY_DB ?? resolve(dirname(databasePath), 'library.sqlite');
      const libraryRepository = new LibraryRepository(libraryDatabasePath);
      const handleLibrary = createLibraryApiHandler(libraryRepository);

      server.middlewares.use(
        async (
          request: Parameters<typeof handle>[0],
          response: Parameters<typeof handle>[1],
          next: () => void,
        ) => {
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
