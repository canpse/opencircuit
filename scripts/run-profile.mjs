import { build } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, '.profile-cache');
const outfile = resolve(outDir, 'profile-circuit.mjs');

await build({
  root,
  logLevel: 'silent',
  build: {
    ssr: resolve(root, 'scripts/profile-circuit.tsx'),
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'profile-circuit.mjs',
      },
    },
  },
});

const result = spawnSync(process.execPath, [outfile], {
  cwd: root,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
