import { relative, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();
const sourceFiles = import.meta.glob('../../src/**/*.{ts,tsx,mjs}', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const sourcePathByRelativeFile = new Map(
  Object.keys(sourceFiles).map((relativeFile) => [
    relativeFile,
    resolve(projectRoot, 'tests/architecture', relativeFile),
  ]),
);
const sourcePaths = new Set(sourcePathByRelativeFile.values());

function importsOf(source) {
  const declarations = Array.from(
    source.matchAll(/(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g),
    (match) => match[1],
  );
  const dynamicImports = Array.from(
    source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
    (match) => match[1],
  );
  return [...declarations, ...dynamicImports];
}

function absoluteImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return specifier;
  return resolve(fromFile, '..', specifier);
}

function resolveSourceImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = absoluteImport(fromFile, specifier.split(/[?#]/, 1)[0]);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mjs`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
    resolve(base, 'index.mjs'),
  ];
  return candidates.find((candidate) => sourcePaths.has(candidate)) ?? null;
}

describe('fronteiras arquiteturais', () => {
  for (const [relativeFile, source] of Object.entries(sourceFiles)) {
    const file = resolve(projectRoot, 'tests/architecture', relativeFile);
    const projectPath = relative(projectRoot, file);
    const imports = importsOf(String(source)).map((specifier) => absoluteImport(file, specifier));

    if (projectPath.startsWith('src/core/')) {
      test(`${projectPath} não depende de UI, state ou React`, () => {
        expect(imports.some((entry) => entry === 'react' || entry.includes('/src/ui/'))).toBe(
          false,
        );
        expect(imports.some((entry) => entry.includes('/src/state/'))).toBe(false);
      });
    }

    if (projectPath.startsWith('src/state/')) {
      test(`${projectPath} não depende de UI ou React`, () => {
        expect(imports.some((entry) => entry === 'react' || entry.includes('/src/ui/'))).toBe(
          false,
        );
      });
    }

    if (projectPath === 'src/performance/measure.ts') {
      test(`${projectPath} permanece independente de React`, () => {
        expect(imports).not.toContain('react');
      });
    }
  }

  test('tipos canônicos do editor não são importados por componentes agregadores', () => {
    const forbidden = [
      "from './CircuitCanvas'",
      'from "./CircuitCanvas"',
      "from '../editor/CircuitCanvas'",
      'from "../editor/CircuitCanvas"',
      "from '../context-menu/ContextMenuView'",
      'from "../context-menu/ContextMenuView"',
    ];
    const offenders = Object.entries(sourceFiles).flatMap(([file, source]) =>
      forbidden.some((fragment) => String(source).includes(fragment)) ? [file] : [],
    );
    expect(offenders).toEqual([]);
  });

  test('todos os módulos de produção do cliente são alcançáveis pelo entrypoint', () => {
    const entrypoint = resolve(projectRoot, 'src/main.tsx');
    const reachable = new Set();
    const pending = [entrypoint];

    while (pending.length > 0) {
      const current = pending.pop();
      if (!current || reachable.has(current)) continue;
      reachable.add(current);
      const sourceEntry = Array.from(sourcePathByRelativeFile.entries()).find(
        ([, absolutePath]) => absolutePath === current,
      );
      if (!sourceEntry) continue;
      for (const specifier of importsOf(String(sourceFiles[sourceEntry[0]]))) {
        const imported = resolveSourceImport(current, specifier);
        if (imported && !reachable.has(imported)) pending.push(imported);
      }
    }

    const unreachable = [...sourcePaths]
      .filter((file) => !file.endsWith('.d.ts') && !reachable.has(file))
      .map((file) => relative(projectRoot, file))
      .sort();
    expect(unreachable).toEqual([]);
  });
});
