import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  INITIAL_LOCAL_AUTOSAVE_MODEL,
  localAutosaveReducer,
} from '../../src/ui/hooks/localAutosaveState';

test('autosave percorre saving e saved em uma gravação normal', () => {
  const started = localAutosaveReducer(INITIAL_LOCAL_AUTOSAVE_MODEL, { type: 'started' });
  const saved = localAutosaveReducer(started, { type: 'succeeded' });

  assert.equal(started.status, 'saving');
  assert.equal(saved.status, 'saved');
});

test('autosave distingue falha repetida de recuperação', () => {
  const failed = localAutosaveReducer(INITIAL_LOCAL_AUTOSAVE_MODEL, { type: 'failed' });
  const retrying = localAutosaveReducer(failed, { type: 'started' });
  const failedAgain = localAutosaveReducer(retrying, { type: 'failed' });
  const recovering = localAutosaveReducer(failedAgain, { type: 'started' });
  const recovered = localAutosaveReducer(recovering, { type: 'succeeded' });
  const nextAttempt = localAutosaveReducer(recovered, { type: 'started' });
  const saved = localAutosaveReducer(nextAttempt, { type: 'succeeded' });

  assert.equal(failed.status, 'failed');
  assert.equal(failedAgain.status, 'failed');
  assert.equal(recovered.status, 'recovered');
  assert.equal(saved.status, 'saved');
});
