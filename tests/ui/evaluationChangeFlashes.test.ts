import { test } from 'vitest';
import assert from 'node:assert/strict';
import { diffChangedSignals } from '../../src/ui/hooks/useEvaluationChangeFlashes';
import type { EvaluationResult } from '../../src/core/types';

test('PrimeiraAvaliacaoNaoMarcaNada', () => {
  const next: EvaluationResult = { A: { out: true } };
  assert.deepEqual(diffChangedSignals(undefined, next, 1), new Map());
});

test('PinoQueFlipaDeValorApareceComAGeracaoPassada', () => {
  const previous: EvaluationResult = { A: { out: false } };
  const next: EvaluationResult = { A: { out: true } };
  assert.deepEqual(diffChangedSignals(previous, next, 7), new Map([['A:out', 7]]));
});

test('PinoQueNaoMudouNaoAparece', () => {
  const previous: EvaluationResult = { A: { out: true }, B: { in: false } };
  const next: EvaluationResult = { A: { out: true }, B: { in: false } };
  assert.deepEqual(diffChangedSignals(previous, next, 1), new Map());
});

test('PinoNovoNaoContaComoMudanca', () => {
  const previous: EvaluationResult = { A: { out: true } };
  const next: EvaluationResult = { A: { out: true, extra: true } };
  assert.deepEqual(diffChangedSignals(previous, next, 1), new Map());
});

test('ComponenteNovoInteiroNaoConta', () => {
  const previous: EvaluationResult = { A: { out: true } };
  const next: EvaluationResult = { A: { out: true }, B: { in: true } };
  assert.deepEqual(diffChangedSignals(previous, next, 1), new Map());
});

test('VariosPinosMudandoJuntosGanhamAMesmaGeracao', () => {
  const previous: EvaluationResult = { A: { out: false }, B: { in: false } };
  const next: EvaluationResult = { A: { out: true }, B: { in: true } };
  assert.deepEqual(
    diffChangedSignals(previous, next, 3),
    new Map([
      ['A:out', 3],
      ['B:in', 3],
    ]),
  );
});
