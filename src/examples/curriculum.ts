import type { CurriculumFamily, CurriculumModule, CurriculumTrack } from './circuitExampleTypes';

export const CURRICULUM_MODULES: CurriculumModule[] = [
  {
    id: 'fundamentals',
    title: 'Fundamentos',
    description: 'Sinais, entradas, saídas, fios, portas e tabelas-verdade.',
  },
  {
    id: 'combinational',
    title: 'Lógica combinacional',
    description: 'Circuitos cuja saída depende somente das entradas atuais.',
  },
  {
    id: 'time-and-state',
    title: 'Tempo e estado',
    description: 'Clock, realimentação, latches, flip-flops e registradores.',
  },
  {
    id: 'systems',
    title: 'Sistemas digitais',
    description: 'Composição de blocos para criar circuitos maiores.',
  },
];

export const CURRICULUM_TRACKS: CurriculumTrack[] = [
  { id: 'boolean', title: 'Lógica booleana', description: 'Portas, expressões e equivalências.' },
  {
    id: 'selection',
    title: 'Seleção e codificação',
    description: 'MUX, DEMUX, encoders e decoders.',
  },
  {
    id: 'arithmetic',
    title: 'Aritmética',
    description: 'Somadores, subtratores e composição numérica.',
  },
  {
    id: 'sequential',
    title: 'Tempo e memória',
    description: 'Estado, clock, latches, flip-flops e registradores.',
  },
  {
    id: 'architecture',
    title: 'Arquitetura',
    description: 'Blocos que aparecem em datapaths e CPUs didáticas.',
  },
];

export const CURRICULUM_FAMILIES: CurriculumFamily[] = [
  { id: 'gates', title: 'Portas', description: 'Portas lógicas fundamentais e universais.' },
  {
    id: 'truth-table',
    title: 'Tabela verdade',
    description: 'Observação exaustiva de entradas e saídas.',
  },
  {
    id: 'mux-decoder',
    title: 'Seleção e decodificação',
    description: 'Circuitos que selecionam, distribuem ou codificam sinais.',
  },
  {
    id: 'adders',
    title: 'Aritmética',
    description: 'Soma, subtração, comparação e composição de bits.',
  },
  { id: 'latches', title: 'Latches', description: 'Memória sensível a nível e realimentação.' },
  { id: 'flip-flops', title: 'Flip-flops', description: 'Memória acionada por borda de clock.' },
  { id: 'registers', title: 'Registradores', description: 'Armazenamento de palavras binárias.' },
  {
    id: 'counters',
    title: 'Contadores',
    description: 'Sequências de estado avançando a cada borda de clock.',
  },
];
