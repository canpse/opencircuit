import { build } from 'vite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, '.test-cache');
const outfile = resolve(outDir, 'simulation.test.mjs');

mkdirSync(outDir, { recursive: true });

await build({
  root,
  logLevel: 'silent',
  build: {
    ssr: resolve(root, 'tests/core/simulation.test.ts'),
    outDir,
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'simulation.test.mjs',
      },
    },
  },
});

const result = spawnSync(process.execPath, [outfile], {
  cwd: root,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
