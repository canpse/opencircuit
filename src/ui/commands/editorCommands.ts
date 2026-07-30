export type CommandMenuGroup = 'file' | 'edit' | 'view' | 'help';

export type EditorCommandId =
  | 'file.new'
  | 'file.openCircuits'
  | 'file.openLibrary'
  | 'file.save'
  | 'file.saveAs'
  | 'file.importJson'
  | 'file.downloadJson'
  | 'file.exportPng'
  | 'file.exportSvg'
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.selectAll'
  | 'edit.transformSelection'
  | 'edit.copy'
  | 'edit.paste'
  | 'edit.delete'
  | 'view.zoomIn'
  | 'view.zoomOut'
  | 'view.zoomReset'
  | 'view.zoomFit'
  | 'view.toggleHand'
  | 'view.selectTool'
  | 'view.toggleWaveforms'
  | 'help.shortcuts'
  | 'editor.cancel';

export interface ShortcutSpec {
  key?: string;
  code?: string;
  primary?: boolean;
  shift?: boolean | 'any';
  alt?: boolean;
  displayKey?: string;
  display?: boolean;
  allowRepeat?: boolean;
}

export interface CommandDefinition {
  id: EditorCommandId;
  group: CommandMenuGroup | 'editor';
  label: string;
  description: string;
  shortcuts: readonly ShortcutSpec[];
}

export interface EditorCommand extends CommandDefinition {
  enabled: boolean;
  checked?: boolean;
  run: () => void;
}

export type EditorCommandMap = Record<EditorCommandId, EditorCommand>;

export interface CommandBinding {
  run: () => void;
  enabled?: boolean;
  checked?: boolean;
  label?: string;
  description?: string;
}

export type EditorCommandBindings = Record<EditorCommandId, CommandBinding>;

export const COMMAND_DEFINITIONS: readonly CommandDefinition[] = [
  {
    id: 'file.new',
    group: 'file',
    label: 'Novo circuito',
    description: 'Cria um documento vazio em uma nova aba.',
    shortcuts: [],
  },
  {
    id: 'file.openCircuits',
    group: 'file',
    label: 'Meus circuitos',
    description: 'Abre um circuito salvo no servidor.',
    shortcuts: [{ key: 'o', primary: true, displayKey: 'O' }],
  },
  {
    id: 'file.openLibrary',
    group: 'file',
    label: 'Minha biblioteca',
    description: 'Abre os componentes da biblioteca pessoal.',
    shortcuts: [],
  },
  {
    id: 'file.save',
    group: 'file',
    label: 'Salvar no servidor…',
    description: 'Salva o documento no destino indicado pela aba.',
    shortcuts: [{ key: 's', primary: true, displayKey: 'S' }],
  },
  {
    id: 'file.saveAs',
    group: 'file',
    label: 'Criar cópia no servidor…',
    description: 'Cria uma cópia independente e a abre em uma nova aba.',
    shortcuts: [{ key: 's', primary: true, shift: true, displayKey: 'S' }],
  },
  {
    id: 'file.importJson',
    group: 'file',
    label: 'Importar JSON…',
    description: 'Importa um circuito de um arquivo JSON.',
    shortcuts: [],
  },
  {
    id: 'file.downloadJson',
    group: 'file',
    label: 'Baixar cópia JSON',
    description:
      'Baixa uma cópia editável e portátil sem alterar o vínculo ou a sincronização da aba.',
    shortcuts: [],
  },
  {
    id: 'file.exportPng',
    group: 'file',
    label: 'Baixar imagem PNG',
    description: 'Exporta uma imagem do circuito em alta resolução.',
    shortcuts: [],
  },
  {
    id: 'file.exportSvg',
    group: 'file',
    label: 'Baixar imagem SVG',
    description: 'Exporta uma imagem vetorial do circuito.',
    shortcuts: [],
  },
  {
    id: 'edit.undo',
    group: 'edit',
    label: 'Desfazer',
    description: 'Desfaz a última alteração do circuito.',
    shortcuts: [{ key: 'z', primary: true, displayKey: 'Z' }],
  },
  {
    id: 'edit.redo',
    group: 'edit',
    label: 'Refazer',
    description: 'Refaz a última alteração desfeita.',
    shortcuts: [
      { key: 'z', primary: true, shift: true, displayKey: 'Z' },
      { key: 'y', primary: true, displayKey: 'Y' },
    ],
  },
  {
    id: 'edit.selectAll',
    group: 'edit',
    label: 'Selecionar tudo',
    description: 'Seleciona todos os componentes e fios do escopo atual.',
    shortcuts: [{ key: 'a', primary: true, displayKey: 'A' }],
  },
  {
    id: 'edit.transformSelection',
    group: 'edit',
    label: 'Transformar seleção em subcircuito…',
    description: 'Transforma os componentes selecionados em uma definição reutilizável.',
    shortcuts: [],
  },
  {
    id: 'edit.copy',
    group: 'edit',
    label: 'Copiar',
    description: 'Copia os componentes e fios selecionados.',
    shortcuts: [{ key: 'c', primary: true, displayKey: 'C' }],
  },
  {
    id: 'edit.paste',
    group: 'edit',
    label: 'Colar',
    description: 'Cola uma cópia do conteúdo copiado dentro do editor.',
    shortcuts: [{ key: 'v', primary: true, displayKey: 'V' }],
  },
  {
    id: 'edit.delete',
    group: 'edit',
    label: 'Excluir seleção',
    description: 'Remove os componentes e fios selecionados.',
    shortcuts: [
      { key: 'Delete', displayKey: 'Delete' },
      { key: 'Backspace', displayKey: 'Backspace' },
    ],
  },
  {
    id: 'view.zoomIn',
    group: 'view',
    label: 'Aproximar',
    description: 'Aumenta o zoom no centro do canvas.',
    shortcuts: [
      { key: '+', primary: true, shift: 'any', displayKey: '+' },
      { key: '=', primary: true, shift: 'any', display: false },
      { code: 'NumpadAdd', primary: true, shift: 'any', display: false },
    ],
  },
  {
    id: 'view.zoomOut',
    group: 'view',
    label: 'Afastar',
    description: 'Diminui o zoom no centro do canvas.',
    shortcuts: [
      { key: '-', primary: true, displayKey: '−' },
      { code: 'NumpadSubtract', primary: true, display: false },
    ],
  },
  {
    id: 'view.zoomReset',
    group: 'view',
    label: 'Restaurar zoom a 100%',
    description: 'Restaura a câmera e o nível de zoom padrão.',
    shortcuts: [],
  },
  {
    id: 'view.zoomFit',
    group: 'view',
    label: 'Enquadrar circuito',
    description: 'Enquadra todo o circuito na área visível.',
    shortcuts: [{ key: '0', primary: true, displayKey: '0' }],
  },
  {
    id: 'view.toggleHand',
    group: 'view',
    label: 'Alternar Mão/Seleção',
    description: 'Alterna entre mover a câmera e selecionar elementos.',
    shortcuts: [{ code: 'Space', displayKey: 'Espaço', allowRepeat: false }],
  },
  {
    id: 'view.selectTool',
    group: 'view',
    label: 'Ferramenta Selecionar',
    description: 'Ativa a ferramenta de seleção.',
    shortcuts: [],
  },
  {
    id: 'view.toggleWaveforms',
    group: 'view',
    label: 'Formas de onda',
    description: 'Abre ou fecha o painel de formas de onda.',
    shortcuts: [],
  },
  {
    id: 'help.shortcuts',
    group: 'help',
    label: 'Atalhos e gestos',
    description: 'Mostra a referência de teclado e ponteiro do editor.',
    shortcuts: [],
  },
  {
    id: 'editor.cancel',
    group: 'editor',
    label: 'Cancelar interação',
    description:
      'Cancela a interação atual ou limpa a seleção quando nenhuma interação está ativa.',
    shortcuts: [{ key: 'Escape', displayKey: 'Esc', allowRepeat: false }],
  },
] as const;

export const COMMAND_MENU_GROUPS: ReadonlyArray<{
  id: CommandMenuGroup;
  label: string;
  entries: ReadonlyArray<EditorCommandId | `separator:${string}`>;
}> = [
  {
    id: 'file',
    label: 'Arquivo',
    entries: [
      'file.new',
      'file.openCircuits',
      'file.openLibrary',
      'separator:open',
      'file.save',
      'file.saveAs',
      'separator:save',
      'file.importJson',
      'file.downloadJson',
      'file.exportPng',
      'file.exportSvg',
    ],
  },
  {
    id: 'edit',
    label: 'Editar',
    entries: [
      'edit.undo',
      'edit.redo',
      'separator:history',
      'edit.selectAll',
      'edit.transformSelection',
      'separator:selection',
      'edit.copy',
      'edit.paste',
      'edit.delete',
    ],
  },
  {
    id: 'view',
    label: 'Exibir',
    entries: [
      'view.zoomIn',
      'view.zoomOut',
      'view.zoomReset',
      'view.zoomFit',
      'separator:camera',
      'view.toggleHand',
      'view.selectTool',
      'view.toggleWaveforms',
    ],
  },
  {
    id: 'help',
    label: 'Ajuda',
    entries: ['help.shortcuts'],
  },
];

export const EDITOR_GESTURES: ReadonlyArray<{ gesture: string; description: string }> = [
  {
    gesture: 'Arrastar no vazio',
    description: 'Cria uma seleção retangular de componentes e fios.',
  },
  {
    gesture: 'Shift+clique',
    description: 'Adiciona ou remove um componente ou fio da seleção atual.',
  },
  {
    gesture: 'Clique no vazio',
    description: 'Limpa a seleção atual.',
  },
  {
    gesture: 'Arrastar item selecionado',
    description: 'Move em conjunto todos os componentes selecionados.',
  },
  {
    gesture: 'Botão direito',
    description: 'Abre ações contextuais do canvas, componente, fio ou ponto de controle.',
  },
  {
    gesture: 'Duplo clique em aba ou rótulo',
    description: 'Renomeia a aba, o componente ou o túnel.',
  },
  {
    gesture: 'Duplo clique em subcircuito',
    description: 'Entra na definição usada pela instância.',
  },
  {
    gesture: 'Arrastar um fio',
    description: 'Cria ou move um ponto de controle da rota.',
  },
  {
    gesture: 'Botão central',
    description: 'Move a câmera sem trocar a ferramenta ativa.',
  },
  {
    gesture: 'Roda do mouse',
    description: 'Ajusta o zoom ao redor do ponteiro.',
  },
];

const DEFINITION_BY_ID = Object.fromEntries(
  COMMAND_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Record<EditorCommandId, CommandDefinition>;

export function createEditorCommands(bindings: EditorCommandBindings): EditorCommandMap {
  return Object.fromEntries(
    COMMAND_DEFINITIONS.map((definition) => {
      const binding = bindings[definition.id];
      const enabled = binding.enabled ?? true;
      const command: EditorCommand = {
        ...definition,
        label: binding.label ?? definition.label,
        description: binding.description ?? definition.description,
        enabled,
        checked: binding.checked,
        run: () => {
          if (enabled) binding.run();
        },
      };
      return [definition.id, command];
    }),
  ) as EditorCommandMap;
}

export function commandDefinition(id: EditorCommandId): CommandDefinition {
  return DEFINITION_BY_ID[id];
}

export function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutSpec): boolean {
  if (event.repeat && shortcut.allowRepeat === false) return false;

  const primaryPressed = event.ctrlKey || event.metaKey;
  if (primaryPressed !== Boolean(shortcut.primary)) return false;
  if (event.altKey !== Boolean(shortcut.alt)) return false;
  if (shortcut.shift !== 'any' && event.shiftKey !== Boolean(shortcut.shift)) return false;

  if (shortcut.code && event.code === shortcut.code) return true;
  if (!shortcut.key) return false;
  return event.key.toLowerCase() === shortcut.key.toLowerCase();
}

export function commandShortcutLabel(
  command: Pick<CommandDefinition, 'shortcuts'>,
  platform = currentPlatform(),
): string {
  return command.shortcuts
    .filter((shortcut) => shortcut.display !== false)
    .map((shortcut) => shortcutLabel(shortcut, platform))
    .join(' / ');
}

function shortcutLabel(shortcut: ShortcutSpec, platform: string): string {
  const apple = /Mac|iPhone|iPad|iPod/i.test(platform);
  const parts: string[] = [];
  if (shortcut.primary) parts.push(apple ? '⌘' : 'Ctrl');
  if (shortcut.alt) parts.push(apple ? '⌥' : 'Alt');
  if (shortcut.shift === true) parts.push(apple ? '⇧' : 'Shift');
  parts.push(shortcut.displayKey ?? shortcut.key ?? shortcut.code ?? '');
  return parts.filter(Boolean).join('+');
}

function currentPlatform(): string {
  return typeof navigator === 'undefined' ? '' : navigator.platform;
}
