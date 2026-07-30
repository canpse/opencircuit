import { describe, expect, it } from 'vitest';
import type { WorkspaceDocument } from '../../src/state/workspaceStorage';
import {
  closePersistencePresentation,
  copyCommandPresentation,
  documentDestination,
  localProtectionLabel,
  persistenceCopyNameSuggestion,
  persistenceNameError,
  persistenceNameSuggestion,
  persistencePresentation,
  saveCommandPresentation,
} from '../../src/ui/persistence/documentPersistence';

const draft: WorkspaceDocument = {
  id: 'draft',
  name: 'rascunho.json',
  circuit: { version: 1, components: [], wires: [] },
  exampleId: null,
  saved: false,
  everSaved: false,
  remoteId: null,
  revision: null,
  libraryId: null,
};

const remote: WorkspaceDocument = {
  ...draft,
  id: 'remote',
  name: 'Circuito remoto',
  saved: true,
  everSaved: true,
  remoteId: 'remote-1',
  revision: 2,
};

const library: WorkspaceDocument = {
  ...remote,
  id: 'library',
  name: 'Componente',
  remoteId: null,
  libraryId: 'library-1',
};

describe('modelo de apresentação da persistência', () => {
  it('classifica rascunho, circuito remoto e componente de biblioteca', () => {
    expect(documentDestination(draft)).toBe('draft');
    expect(documentDestination(remote)).toBe('remote');
    expect(documentDestination(library)).toBe('library');
  });

  it('expõe destino e estado sem confundir autosave local com sincronização', () => {
    expect(persistencePresentation(draft, 'idle')).toMatchObject({
      destinationLabel: 'Rascunho local',
      statusLabel: 'Ainda não enviado ao servidor',
      tone: 'neutral',
    });
    expect(persistencePresentation(remote, 'saved')).toMatchObject({
      destinationLabel: 'Circuito no servidor',
      statusLabel: 'Sincronizado',
      tone: 'success',
    });
    expect(persistencePresentation(library, 'offline')).toMatchObject({
      destinationLabel: 'Componente da biblioteca',
      statusLabel: 'Offline; alterações mantidas localmente',
      tone: 'warning',
    });
    expect(persistencePresentation(remote, 'conflict')).toMatchObject({
      statusLabel: 'Conflito de versão',
      tone: 'danger',
    });
  });

  it('adapta salvar, criar cópia e fechar ao destino da aba', () => {
    expect(saveCommandPresentation(draft, 'idle').label).toBe('Salvar no servidor…');
    expect(saveCommandPresentation(remote, 'saved')).toMatchObject({
      label: 'Atualizar circuito',
      enabled: false,
    });
    expect(saveCommandPresentation({ ...library, saved: false }, 'idle')).toMatchObject({
      label: 'Atualizar componente',
      enabled: true,
    });
    expect(copyCommandPresentation(remote, 'idle').label).toBe('Criar cópia no servidor…');
    expect(copyCommandPresentation(library, 'idle').label).toBe('Criar cópia na biblioteca…');
    expect(closePersistencePresentation(draft).saveLabel).toBe('Salvar no servidor e fechar…');
    expect(closePersistencePresentation(library).description).toContain('biblioteca');
  });

  it('sugere nomes sem extensão e rejeita nomes remotos ambíguos', () => {
    expect(persistenceNameSuggestion('  projeto.JSON ')).toBe('projeto');
    expect(persistenceCopyNameSuggestion('projeto.json')).toBe('projeto - cópia');
    expect(persistenceNameError('')).toBe('Informe um nome.');
    expect(persistenceNameError('projeto.json')).toContain('sem .json');
    expect(persistenceNameError('projeto')).toBeNull();
  });

  it('nomeia separadamente o estado da proteção local', () => {
    expect(localProtectionLabel('saving')).toBe('Proteção local: salvando…');
    expect(localProtectionLabel('failed')).toBe('Proteção local: falhou');
    expect(localProtectionLabel('recovered')).toBe('Proteção local: recuperada');
  });
});
