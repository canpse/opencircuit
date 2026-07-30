import type { WorkspaceDocument } from '../../state/workspaceStorage';
import type { LocalAutosaveStatus } from '../hooks/localAutosaveState';
import type { RemoteSyncState } from '../hooks/workspaceTypes';

export const MAX_PERSISTENCE_NAME_LENGTH = 120;

export type DocumentDestination = 'draft' | 'remote' | 'library';
export type CopyDestination = Exclude<DocumentDestination, 'draft'>;
export type PersistenceTone = 'neutral' | 'success' | 'progress' | 'warning' | 'danger';

export interface PersistencePresentation {
  destination: DocumentDestination;
  destinationLabel: string;
  statusLabel: string;
  footerLabel: string;
  tone: PersistenceTone;
}

export interface PersistenceCommandPresentation {
  label: string;
  description: string;
  enabled: boolean;
}

export interface ClosePersistencePresentation {
  description: string;
  saveLabel: string;
}

export interface PersistenceSaveRequest {
  documentId: string;
  mode: 'bind' | 'copy';
  destination: CopyDestination;
  initialName: string;
  closeAfterSave: boolean;
}

export function documentDestination(document: WorkspaceDocument): DocumentDestination {
  if (document.libraryId) return 'library';
  if (document.remoteId) return 'remote';
  return 'draft';
}

export function copyDestination(document: WorkspaceDocument): CopyDestination {
  return documentDestination(document) === 'library' ? 'library' : 'remote';
}

export function persistencePresentation(
  document: WorkspaceDocument,
  syncState: RemoteSyncState,
): PersistencePresentation {
  const destination = documentDestination(document);
  const destinationLabel = {
    draft: 'Rascunho local',
    remote: 'Circuito no servidor',
    library: 'Componente da biblioteca',
  }[destination];

  if (syncState === 'saving') {
    const statusLabel =
      destination === 'draft'
        ? 'Enviando ao servidor…'
        : destination === 'remote'
          ? 'Sincronizando…'
          : 'Atualizando…';
    return {
      destination,
      destinationLabel,
      statusLabel,
      footerLabel: `${destinationLabel}: ${statusLabel.toLocaleLowerCase('pt-BR')}`,
      tone: 'progress',
    };
  }

  if (syncState === 'conflict') {
    return {
      destination,
      destinationLabel,
      statusLabel: 'Conflito de versão',
      footerLabel: `${destinationLabel}: conflito de versão`,
      tone: 'danger',
    };
  }

  if (syncState === 'offline') {
    return {
      destination,
      destinationLabel,
      statusLabel:
        destination === 'draft'
          ? 'Servidor offline; mantido localmente'
          : 'Offline; alterações mantidas localmente',
      footerLabel:
        destination === 'draft'
          ? 'Rascunho local: servidor offline'
          : `${destinationLabel}: offline, alterações mantidas localmente`,
      tone: 'warning',
    };
  }

  if (syncState === 'error') {
    return {
      destination,
      destinationLabel,
      statusLabel: destination === 'draft' ? 'Não foi possível enviar' : 'Erro de sincronização',
      footerLabel:
        destination === 'draft'
          ? 'Rascunho local: erro ao enviar'
          : `${destinationLabel}: erro de sincronização`,
      tone: 'danger',
    };
  }

  if (destination === 'draft') {
    return {
      destination,
      destinationLabel,
      statusLabel: 'Ainda não enviado ao servidor',
      footerLabel: 'Rascunho local: ainda não enviado ao servidor',
      tone: 'neutral',
    };
  }

  if (!document.saved) {
    return {
      destination,
      destinationLabel,
      statusLabel: 'Alterações pendentes',
      footerLabel: `${destinationLabel}: alterações pendentes`,
      tone: 'warning',
    };
  }

  return {
    destination,
    destinationLabel,
    statusLabel: 'Sincronizado',
    footerLabel: `${destinationLabel}: sincronizado`,
    tone: 'success',
  };
}

export function saveCommandPresentation(
  document: WorkspaceDocument,
  syncState: RemoteSyncState,
): PersistenceCommandPresentation {
  const destination = documentDestination(document);
  if (destination === 'draft') {
    return {
      label: 'Salvar no servidor…',
      description: 'Cria um circuito no servidor e vincula a aba atual ao novo registro.',
      enabled: syncState !== 'saving',
    };
  }

  const alreadySynchronized = document.saved && syncState !== 'offline' && syncState !== 'error';
  if (destination === 'library') {
    return {
      label: 'Atualizar componente',
      description: alreadySynchronized
        ? 'Este componente já está sincronizado com a biblioteca.'
        : 'Atualiza o componente da biblioteca vinculado a esta aba.',
      enabled: syncState !== 'saving' && !alreadySynchronized,
    };
  }

  return {
    label: 'Atualizar circuito',
    description: alreadySynchronized
      ? 'Este circuito já está sincronizado com o servidor.'
      : 'Atualiza o circuito no servidor vinculado a esta aba.',
    enabled: syncState !== 'saving' && !alreadySynchronized,
  };
}

export function copyCommandPresentation(
  document: WorkspaceDocument,
  syncState: RemoteSyncState,
): PersistenceCommandPresentation {
  const destination = copyDestination(document);
  return {
    label: destination === 'library' ? 'Criar cópia na biblioteca…' : 'Criar cópia no servidor…',
    description:
      destination === 'library'
        ? 'Cria um componente independente e abre a cópia em uma nova aba.'
        : 'Cria um circuito independente e abre a cópia em uma nova aba.',
    enabled: syncState !== 'saving',
  };
}

export function closePersistencePresentation(
  document: WorkspaceDocument,
): ClosePersistencePresentation {
  const destination = documentDestination(document);
  if (destination === 'library') {
    return {
      description:
        'Há alterações desde a última versão da biblioteca. Atualize o componente antes de fechar para não perdê-las.',
      saveLabel: 'Atualizar e fechar',
    };
  }
  if (destination === 'remote') {
    return {
      description:
        'Há alterações desde a última versão do servidor. Atualize o circuito antes de fechar para não perdê-las.',
      saveLabel: 'Atualizar e fechar',
    };
  }
  return {
    description:
      'Este rascunho será removido deste navegador. Salve-o no servidor antes de fechar para não perdê-lo.',
    saveLabel: 'Salvar no servidor e fechar…',
  };
}

export function persistenceNameSuggestion(name: string): string {
  const withoutExtension = name
    .trim()
    .replace(/\.json$/i, '')
    .trim();
  return withoutExtension || 'Sem título';
}

export function persistenceCopyNameSuggestion(name: string): string {
  return `${persistenceNameSuggestion(name)} - cópia`;
}

export function normalizedPersistenceName(name: string): string {
  return name.trim();
}

export function persistenceNameError(name: string): string | null {
  const normalized = normalizedPersistenceName(name);
  if (!normalized) return 'Informe um nome.';
  if (normalized.length > MAX_PERSISTENCE_NAME_LENGTH) {
    return `Use no máximo ${MAX_PERSISTENCE_NAME_LENGTH} caracteres.`;
  }
  if (/\.json$/i.test(normalized)) {
    return 'Use o nome sem .json. A extensão é adicionada somente ao baixar uma cópia.';
  }
  return null;
}

export function localProtectionLabel(status: LocalAutosaveStatus): string {
  return {
    saving: 'Proteção local: salvando…',
    saved: 'Proteção local: atualizada',
    failed: 'Proteção local: falhou',
    recovered: 'Proteção local: recuperada',
  }[status];
}
