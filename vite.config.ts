import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { CircuitRepository } from './server/circuit-repository.mjs';
import { createApiHandler } from './server/api.mjs';

function circuitApi() {
  return {
    name: 'opencircuit-api',
    configureServer(server: { middlewares: { use: (handler: unknown) => void } }) {
      const databasePath = process.env.OPENCIRCUIT_DB ?? resolve('data/opencircuit.sqlite');
      mkdirSync(resolve(databasePath, '..'), { recursive: true });
      const repository = new CircuitRepository(databasePath);
      const handle = createApiHandler(repository);
      server.middlewares.use(
        async (
          request: Parameters<typeof handle>[0],
          response: Parameters<typeof handle>[1],
          next: () => void,
        ) => {
          if (!(await handle(request, response))) next();
        },
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), circuitApi()],
});
