import { useEffect, useReducer } from 'react';
import { saveWorkspace, type WorkspaceState } from '../../state/workspaceStorage';
import {
  INITIAL_LOCAL_AUTOSAVE_MODEL,
  localAutosaveReducer,
  type LocalAutosaveStatus,
} from './localAutosaveState';

export function useAutoSaveWorkspace(workspace: WorkspaceState): LocalAutosaveStatus {
  const [autosave, dispatch] = useReducer(localAutosaveReducer, INITIAL_LOCAL_AUTOSAVE_MODEL);

  useEffect(() => {
    // The external write and the state describing its outcome belong to the same
    // synchronization effect.
    dispatch({ type: 'started' });
    dispatch({ type: saveWorkspace(workspace) ? 'succeeded' : 'failed' });
  }, [workspace]);

  return autosave.status;
}
