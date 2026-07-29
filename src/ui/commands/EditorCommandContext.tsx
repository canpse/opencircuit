import { createContext, use, type ReactNode } from 'react';
import type { EditorCommandId, EditorCommandMap } from './editorCommands';

const EditorCommandContext = createContext<EditorCommandMap | null>(null);

export function EditorCommandProvider({
  commands,
  children,
}: {
  commands: EditorCommandMap;
  children: ReactNode;
}) {
  return <EditorCommandContext value={commands}>{children}</EditorCommandContext>;
}

export function useEditorCommands(): EditorCommandMap {
  const commands = use(EditorCommandContext);
  if (!commands) throw new Error('EditorCommandProvider ausente.');
  return commands;
}

export function useOptionalEditorCommands(): EditorCommandMap | null {
  return use(EditorCommandContext);
}

export function useEditorCommand(id: EditorCommandId) {
  return useEditorCommands()[id];
}
