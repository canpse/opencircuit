import { relative, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();
const sourceFiles = import.meta.glob('../../src/**/*.{ts,tsx,mjs}', {
  eager: true,
  query: '?raw',
  import: 'default',
});

function importsOf(source) {
  return Array.from(
    source.matchAll(/(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g),
    (match) => match[1],
  );
}

function absoluteImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return specifier;
  return resolve(fromFile, '..', specifier);
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
});
