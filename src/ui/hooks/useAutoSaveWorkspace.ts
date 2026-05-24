import { useEffect } from 'react';
import { saveWorkspace, type WorkspaceState } from '../../state/workspaceStorage';

export function useAutoSaveWorkspace(workspace: WorkspaceState) {
  useEffect(() => {
    saveWorkspace(workspace);
  }, [workspace]);
}
