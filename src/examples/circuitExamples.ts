import type { CircuitDocument } from '../core/types';

export type CircuitDifficulty = 1 | 2 | 3 | 4 | 5;
export type CircuitLevel = 'concept' | 'composition' | 'system';
export type CircuitExampleMode = 'demo' | 'guided' | 'incomplete' | 'challenge' | 'test';

export type CurriculumModule = { id: string; title: string; description: string };
export type CurriculumTrack = { id: string; title: string; description: string };
export type CurriculumFamily = { id: string; title: string; description: string };

export type CircuitExample = {
  id: string;
  name: string;
  description: string;
  moduleId: string;
  familyIds: string[];
  trackIds: string[];
  difficulty: CircuitDifficulty;
  level: CircuitLevel;
  prerequisites: string[];
  concepts: string[];
  next: string[];
  extensions: string[];
  modes: CircuitExampleMode[];
  observe: string[];
  experiments: string[];
  challenge?: string;
  circuit: CircuitDocument;
};

type RawCircuitExample = { id: string; name: string; description?: string; circuit: CircuitDocument };
type ExampleMetadata = Omit<CircuitExample, 'id' | 'name' | 'circuit'>;

export type CircuitLesson = { id: string; title: string; description: string; exampleIds: string[]; examples: CircuitExample[] };

const RAW_CIRCUIT_EXAMPLES: RawCircuitExample[] = [
  {
    id: 'signal-led-basic',
    name: 'Sinal, fio e LED',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 90, y: 140, label: 'A', state: false },
        { id: 'OUT', type: 'led', x: 320, y: 140, label: 'OUT' },
        { id: 'TXT1', type: 'text', x: 80, y: 250, width: 520, label: 'Primeiro contato: um switch gera um sinal 0 ou 1, o fio transporta esse sinal e o LED mostra o resultado. Ligue e desligue A para ver o mesmo valor chegar em OUT.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'xor',
    name: 'XOR básico',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 80, y: 100, label: 'A', state: false },
        { id: 'B', type: 'input', x: 80, y: 190, label: 'B', state: false },
        { id: 'X1', type: 'xor', x: 250, y: 130, label: 'XOR' },
        { id: 'OUT', type: 'led', x: 430, y: 139, label: 'OUT' },
        { id: 'TXT1', type: 'text', x: 80, y: 280, width: 380, label: 'XOR acende a saída quando A e B são diferentes. Use os switches e acompanhe a linha destacada na tabela verdade.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'X1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'X1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'nand-not',
    name: 'NAND como NOT',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 80, y: 140, label: 'A', state: false },
        { id: 'N1', type: 'nand', x: 250, y: 130, label: 'NAND' },
        { id: 'OUT', type: 'led', x: 450, y: 139, label: 'OUT' },
        { id: 'TXT1', type: 'text', x: 80, y: 250, width: 410, label: 'Uma porta NAND pode funcionar como NOT quando a mesma entrada alimenta os dois pinos. Assim OUT é o inverso de A.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'N1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'N1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'N1', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'and-basic',
    name: 'AND básico',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 80, y: 100, label: 'A', state: false },
        { id: 'B', type: 'input', x: 80, y: 190, label: 'B', state: false },
        { id: 'G1', type: 'and', x: 260, y: 130, label: 'AND' },
        { id: 'OUT', type: 'led', x: 450, y: 139, label: 'OUT' },
        { id: 'TXT1', type: 'text', x: 80, y: 280, width: 430, label: 'Porta AND: a saída liga somente quando A=1 e B=1. Use os switches e observe a tabela verdade.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'G1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'G1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'G1', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'or-basic',
    name: 'OR básico',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 80, y: 100, label: 'A', state: false },
        { id: 'B', type: 'input', x: 80, y: 190, label: 'B', state: false },
        { id: 'G1', type: 'or', x: 260, y: 130, label: 'OR' },
        { id: 'OUT', type: 'led', x: 450, y: 139, label: 'OUT' },
        { id: 'TXT1', type: 'text', x: 80, y: 280, width: 430, label: 'Porta OR: a saída liga quando A=1 ou B=1. Ela só fica desligada quando todas as entradas são 0.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'G1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'G1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'G1', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'not-basic',
    name: 'NOT básico',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 80, y: 140, label: 'A', state: false },
        { id: 'N1', type: 'not', x: 260, y: 138, label: 'NOT' },
        { id: 'OUT', type: 'led', x: 440, y: 140, label: '!A' },
        { id: 'TXT1', type: 'text', x: 80, y: 250, width: 430, label: 'Porta NOT, ou inversor: OUT é sempre o contrário de A. Se A=0, OUT=1; se A=1, OUT=0.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'N1', pinId: 'in' } },
        { id: 'W2', from: { componentId: 'N1', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'd-latch-basic',
    name: 'Latch D básico',
    circuit: {
      version: 1,
      components: [
        { id: 'D', type: 'input', x: 70, y: 110, label: 'D', state: false },
        { id: 'EN', type: 'input', x: 70, y: 230, label: 'EN', state: false },
        { id: 'L1', type: 'd-latch', x: 280, y: 130, label: 'Latch D', memory: { q: false } },
        { id: 'Q', type: 'led', x: 500, y: 151, label: 'Q' },
        { id: 'TXT1', type: 'text', x: 70, y: 340, width: 610, label: 'Latch D guarda 1 bit. Com EN=1, Q acompanha D. Com EN=0, Q mantém o último valor salvo. Use os inputs e observe o painel de estado sequencial.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'D', pinId: 'out' }, to: { componentId: 'L1', pinId: 'D' } },
        { id: 'W2', from: { componentId: 'EN', pinId: 'out' }, to: { componentId: 'L1', pinId: 'EN' } },
        { id: 'W3', from: { componentId: 'L1', pinId: 'Q' }, to: { componentId: 'Q', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'd-flip-flop-basic',
    name: 'Flip-Flop D básico',
    circuit: {
      version: 1,
      components: [
        { id: 'D', type: 'input', x: 70, y: 130, label: 'D', state: false },
        { id: 'CLK', type: 'clock', x: 70, y: 250, label: 'Clock', state: false },
        { id: 'FF1', type: 'd-flip-flop', x: 300, y: 150, label: 'Flip-Flop D', memory: { q: false, previousClk: false } },
        { id: 'Q', type: 'led', x: 560, y: 171, label: 'Q' },
        { id: 'TXT1', type: 'text', x: 70, y: 360, width: 650, label: 'Flip-Flop D guarda D somente na borda de subida do clock. Clique em Tick: quando o Clock alterna de 0 para 1, Q recebe D; nas outras etapas, Q mantém o valor.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'D', pinId: 'out' }, to: { componentId: 'FF1', pinId: 'D' } },
        { id: 'W2', from: { componentId: 'CLK', pinId: 'CLK' }, to: { componentId: 'FF1', pinId: 'CLK' } },
        { id: 'W3', from: { componentId: 'FF1', pinId: 'Q' }, to: { componentId: 'Q', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'register-4-basic',
    name: 'Registrador 4 bits básico',
    circuit: {
      version: 1,
      components: [
        { id: 'D0', type: 'input', x: 70, y: 80, label: 'D0', state: false },
        { id: 'D1', type: 'input', x: 70, y: 150, label: 'D1', state: false },
        { id: 'D2', type: 'input', x: 70, y: 220, label: 'D2', state: false },
        { id: 'D3', type: 'input', x: 70, y: 290, label: 'D3', state: false },
        { id: 'CLK', type: 'clock', x: 70, y: 390, label: 'Clock', state: false },
        { id: 'REG1', type: 'register-4', x: 320, y: 140, label: 'Registrador 4 bits', memory: { q0: false, q1: false, q2: false, q3: false, previousClk: false } },
        { id: 'Q0', type: 'led', x: 610, y: 157, label: 'Q0' },
        { id: 'Q1', type: 'led', x: 610, y: 181, label: 'Q1' },
        { id: 'Q2', type: 'led', x: 610, y: 205, label: 'Q2' },
        { id: 'Q3', type: 'led', x: 610, y: 229, label: 'Q3' },
        { id: 'TXT1', type: 'text', x: 70, y: 490, width: 690, label: 'Registrador de 4 bits. Ajuste D0–D3 e pressione Tick ou rode o clock automático. Na borda de subida do clock, Q0–Q3 copiam D0–D3 e depois mantêm o valor salvo.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'D0', pinId: 'out' }, to: { componentId: 'REG1', pinId: 'D0' } },
        { id: 'W2', from: { componentId: 'D1', pinId: 'out' }, to: { componentId: 'REG1', pinId: 'D1' } },
        { id: 'W3', from: { componentId: 'D2', pinId: 'out' }, to: { componentId: 'REG1', pinId: 'D2' } },
        { id: 'W4', from: { componentId: 'D3', pinId: 'out' }, to: { componentId: 'REG1', pinId: 'D3' } },
        { id: 'W5', from: { componentId: 'CLK', pinId: 'CLK' }, to: { componentId: 'REG1', pinId: 'CLK' } },
        { id: 'W6', from: { componentId: 'REG1', pinId: 'Q0' }, to: { componentId: 'Q0', pinId: 'in' } },
        { id: 'W7', from: { componentId: 'REG1', pinId: 'Q1' }, to: { componentId: 'Q1', pinId: 'in' } },
        { id: 'W8', from: { componentId: 'REG1', pinId: 'Q2' }, to: { componentId: 'Q2', pinId: 'in' } },
        { id: 'W9', from: { componentId: 'REG1', pinId: 'Q3' }, to: { componentId: 'Q3', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'sr-latch-nor-experiment',
    name: 'Experimento: latch SR com NOR',
    circuit: {
      version: 1,
      components: [
        { id: 'S', type: 'input', x: 70, y: 90, label: 'S', state: false },
        { id: 'R', type: 'input', x: 70, y: 250, label: 'R', state: false },
        { id: 'GQ', type: 'nor', x: 280, y: 90, label: 'NOR Q' },
        { id: 'GQB', type: 'nor', x: 280, y: 250, label: 'NOR !Q' },
        { id: 'Q', type: 'led', x: 500, y: 99, label: 'Q' },
        { id: 'QB', type: 'led', x: 500, y: 259, label: '!Q' },
        { id: 'TXT1', type: 'text', x: 70, y: 370, width: 620, label: 'Latch SR feito com duas portas NOR cruzadas. S=1 seta Q, R=1 reseta Q e S=R=0 mantém o estado anterior. S=R=1 é a condição proibida.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'R', pinId: 'out' }, to: { componentId: 'GQ', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'S', pinId: 'out' }, to: { componentId: 'GQB', pinId: 'a' } },
        { id: 'W3', from: { componentId: 'GQ', pinId: 'out' }, to: { componentId: 'Q', pinId: 'in' } },
        { id: 'W4', from: { componentId: 'GQB', pinId: 'out' }, to: { componentId: 'QB', pinId: 'in' } },
        { id: 'W5', from: { componentId: 'GQ', pinId: 'out' }, to: { componentId: 'GQB', pinId: 'b' } },
        { id: 'W6', from: { componentId: 'GQB', pinId: 'out' }, to: { componentId: 'GQ', pinId: 'b' } },
      ],
    },
  },
  {
    id: 'sr-latch-nand-active-low',
    name: 'Latch SR com NAND ativo baixo',
    circuit: {
      version: 1,
      components: [
        { id: 'SB', type: 'input', x: 60, y: 90, label: 'S̅', state: true },
        { id: 'RB', type: 'input', x: 60, y: 250, label: 'R̅', state: true },
        { id: 'GQ', type: 'nand', x: 280, y: 90, label: 'NAND Q' },
        { id: 'GQB', type: 'nand', x: 280, y: 250, label: 'NAND !Q' },
        { id: 'Q', type: 'led', x: 530, y: 99, label: 'Q' },
        { id: 'QB', type: 'led', x: 530, y: 259, label: '!Q' },
        { id: 'TXT1', type: 'text', x: 60, y: 370, width: 720, label: 'Latch SR com NAND ativo em nível baixo. Repouso: S̅=1 e R̅=1. Para SET, coloque S̅=0 e volte para 1. Para RESET, coloque R̅=0 e volte para 1. S̅=R̅=0 é proibido.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'SB', pinId: 'out' }, to: { componentId: 'GQ', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'RB', pinId: 'out' }, to: { componentId: 'GQB', pinId: 'a' } },
        { id: 'W3', from: { componentId: 'GQ', pinId: 'out' }, to: { componentId: 'Q', pinId: 'in' } },
        { id: 'W4', from: { componentId: 'GQB', pinId: 'out' }, to: { componentId: 'QB', pinId: 'in' } },
        { id: 'W5', from: { componentId: 'GQ', pinId: 'out' }, to: { componentId: 'GQB', pinId: 'b' } },
        { id: 'W6', from: { componentId: 'GQB', pinId: 'out' }, to: { componentId: 'GQ', pinId: 'b' } },
      ],
    },
  },
  {
    id: 'gated-d-latch-from-nand',
    name: 'Latch D com NANDs',
    circuit: {
      version: 1,
      components: [
        { id: 'D', type: 'input', x: 50, y: 120, label: 'D', state: false },
        { id: 'EN', type: 'input', x: 50, y: 300, label: 'EN', state: false },
        { id: 'ND', type: 'not', x: 210, y: 200, label: '!D' },
        { id: 'GS', type: 'nand', x: 390, y: 115, label: 'gera S̅' },
        { id: 'GR', type: 'nand', x: 390, y: 280, label: 'gera R̅' },
        { id: 'LQ', type: 'nand', x: 620, y: 130, label: 'Latch Q' },
        { id: 'LQB', type: 'nand', x: 620, y: 295, label: 'Latch !Q' },
        { id: 'Q', type: 'led', x: 870, y: 139, label: 'Q' },
        { id: 'QB', type: 'led', x: 870, y: 304, label: '!Q' },
        { id: 'TXT1', type: 'text', x: 50, y: 430, width: 760, label: 'Latch D construído só com portas comuns. Com EN=1, Q acompanha D. Com EN=0, Q mantém o último valor, mesmo se D mudar.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'D', pinId: 'out' }, to: { componentId: 'ND', pinId: 'in' } },
        { id: 'W2', from: { componentId: 'D', pinId: 'out' }, to: { componentId: 'GS', pinId: 'a' } },
        { id: 'W3', from: { componentId: 'EN', pinId: 'out' }, to: { componentId: 'GS', pinId: 'b' } },
        { id: 'W4', from: { componentId: 'ND', pinId: 'out' }, to: { componentId: 'GR', pinId: 'a' } },
        { id: 'W5', from: { componentId: 'EN', pinId: 'out' }, to: { componentId: 'GR', pinId: 'b' } },
        { id: 'W6', from: { componentId: 'GS', pinId: 'out' }, to: { componentId: 'LQ', pinId: 'a' } },
        { id: 'W7', from: { componentId: 'GR', pinId: 'out' }, to: { componentId: 'LQB', pinId: 'a' } },
        { id: 'W8', from: { componentId: 'LQ', pinId: 'out' }, to: { componentId: 'Q', pinId: 'in' } },
        { id: 'W9', from: { componentId: 'LQB', pinId: 'out' }, to: { componentId: 'QB', pinId: 'in' } },
        { id: 'W10', from: { componentId: 'LQ', pinId: 'out' }, to: { componentId: 'LQB', pinId: 'b' } },
        { id: 'W11', from: { componentId: 'LQB', pinId: 'out' }, to: { componentId: 'LQ', pinId: 'b' } },
      ],
    },
  },
  {
    id: 'half-adder',
    name: 'Meio somador',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 80, y: 110, label: 'A', state: false },
        { id: 'B', type: 'input', x: 80, y: 210, label: 'B', state: false },
        { id: 'X1', type: 'xor', x: 250, y: 105, label: 'SUM' },
        { id: 'A1', type: 'and', x: 250, y: 220, label: 'CARRY' },
        { id: 'SUM', type: 'led', x: 450, y: 114, label: 'SUM' },
        { id: 'CARRY', type: 'led', x: 450, y: 229, label: 'CARRY' },
        { id: 'TXT1', type: 'text', x: 80, y: 330, width: 440, label: 'Meio somador soma dois bits. SUM é A XOR B e CARRY é A AND B. Ele não considera carry de entrada.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'X1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'X1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'A1', pinId: 'a' } },
        { id: 'W4', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'A1', pinId: 'b' } },
        { id: 'W5', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'SUM', pinId: 'in' } },
        { id: 'W6', from: { componentId: 'A1', pinId: 'out' }, to: { componentId: 'CARRY', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'full-adder',
    name: 'Somador completo',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 70, y: 80, label: 'A', state: false },
        { id: 'B', type: 'input', x: 70, y: 170, label: 'B', state: false },
        { id: 'Cin', type: 'input', x: 70, y: 310, label: 'Cin', state: false },
        { id: 'X1', type: 'xor', x: 240, y: 120, label: 'A⊕B' },
        { id: 'X2', type: 'xor', x: 430, y: 160, label: 'SUM' },
        { id: 'A1', type: 'and', x: 240, y: 250, label: 'A·B' },
        { id: 'A2', type: 'and', x: 430, y: 300, label: 'Cin·(A⊕B)' },
        { id: 'O1', type: 'or', x: 620, y: 275, label: 'Cout' },
        { id: 'SUM', type: 'led', x: 640, y: 169, label: 'SUM' },
        { id: 'Cout', type: 'led', x: 800, y: 284, label: 'Cout' },
        { id: 'TXT1', type: 'text', x: 70, y: 410, width: 560, label: 'Somador completo soma A, B e Cin. SUM é o bit de resultado; Cout indica transporte para a próxima coluna.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'X1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'X1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'X2', pinId: 'a' } },
        { id: 'W4', from: { componentId: 'Cin', pinId: 'out' }, to: { componentId: 'X2', pinId: 'b' } },
        { id: 'W5', from: { componentId: 'X2', pinId: 'out' }, to: { componentId: 'SUM', pinId: 'in' } },
        { id: 'W6', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'A1', pinId: 'a' } },
        { id: 'W7', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'A1', pinId: 'b' } },
        { id: 'W8', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'A2', pinId: 'a' } },
        { id: 'W9', from: { componentId: 'Cin', pinId: 'out' }, to: { componentId: 'A2', pinId: 'b' } },
        { id: 'W10', from: { componentId: 'A1', pinId: 'out' }, to: { componentId: 'O1', pinId: 'a' } },
        { id: 'W11', from: { componentId: 'A2', pinId: 'out' }, to: { componentId: 'O1', pinId: 'b' } },
        { id: 'W12', from: { componentId: 'O1', pinId: 'out' }, to: { componentId: 'Cout', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'mux-2-1',
    name: 'Multiplexador 2:1',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 70, y: 80, label: 'A', state: false },
        { id: 'B', type: 'input', x: 70, y: 220, label: 'B', state: false },
        { id: 'Sel', type: 'input', x: 70, y: 360, label: 'Sel', state: false },
        { id: 'N1', type: 'not', x: 240, y: 340, label: 'NOT Sel' },
        { id: 'A1', type: 'and', x: 420, y: 105, label: 'A·!Sel' },
        { id: 'A2', type: 'and', x: 420, y: 250, label: 'B·Sel' },
        { id: 'O1', type: 'or', x: 620, y: 180, label: 'OUT' },
        { id: 'OUT', type: 'led', x: 800, y: 189, label: 'OUT' },
        { id: 'TXT1', type: 'text', x: 70, y: 470, width: 560, label: 'Multiplexador 2:1 escolhe qual entrada chega à saída. Quando Sel=0, OUT=A. Quando Sel=1, OUT=B.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'Sel', pinId: 'out' }, to: { componentId: 'N1', pinId: 'in' } },
        { id: 'W2', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'A1', pinId: 'a' } },
        { id: 'W3', from: { componentId: 'N1', pinId: 'out' }, to: { componentId: 'A1', pinId: 'b' } },
        { id: 'W4', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'A2', pinId: 'a' } },
        { id: 'W5', from: { componentId: 'Sel', pinId: 'out' }, to: { componentId: 'A2', pinId: 'b' } },
        { id: 'W6', from: { componentId: 'A1', pinId: 'out' }, to: { componentId: 'O1', pinId: 'a' } },
        { id: 'W7', from: { componentId: 'A2', pinId: 'out' }, to: { componentId: 'O1', pinId: 'b' } },
        { id: 'W8', from: { componentId: 'O1', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },

  {
    id: 'comparator-1-bit',
    name: 'Comparador 1 bit',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 70, y: 90, label: 'A', state: false },
        { id: 'B', type: 'input', x: 70, y: 210, label: 'B', state: false },
        { id: 'NB', type: 'not', x: 230, y: 80, label: '!B' },
        { id: 'NA', type: 'not', x: 230, y: 250, label: '!A' },
        { id: 'GTG', type: 'and', x: 400, y: 85, label: 'A>B' },
        { id: 'EQG', type: 'xnor', x: 400, y: 185, label: 'A=B' },
        { id: 'LTG', type: 'and', x: 400, y: 285, label: 'A<B' },
        { id: 'GT', type: 'led', x: 590, y: 94, label: 'A>B' },
        { id: 'EQ', type: 'led', x: 590, y: 194, label: 'A=B' },
        { id: 'LT', type: 'led', x: 590, y: 294, label: 'A<B' },
        { id: 'TXT1', type: 'text', x: 70, y: 390, width: 520, label: 'Comparador de 1 bit. Ele indica se A é maior, igual ou menor que B usando NOT, AND e XNOR.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'NB', pinId: 'in' } },
        { id: 'W2', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'NA', pinId: 'in' } },
        { id: 'W3', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'GTG', pinId: 'a' } },
        { id: 'W4', from: { componentId: 'NB', pinId: 'out' }, to: { componentId: 'GTG', pinId: 'b' } },
        { id: 'W5', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'EQG', pinId: 'a' } },
        { id: 'W6', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'EQG', pinId: 'b' } },
        { id: 'W7', from: { componentId: 'NA', pinId: 'out' }, to: { componentId: 'LTG', pinId: 'a' } },
        { id: 'W8', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'LTG', pinId: 'b' } },
        { id: 'W9', from: { componentId: 'GTG', pinId: 'out' }, to: { componentId: 'GT', pinId: 'in' } },
        { id: 'W10', from: { componentId: 'EQG', pinId: 'out' }, to: { componentId: 'EQ', pinId: 'in' } },
        { id: 'W11', from: { componentId: 'LTG', pinId: 'out' }, to: { componentId: 'LT', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'decoder-2-4',
    name: 'Decodificador 2 para 4',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 70, y: 90, label: 'A', state: false },
        { id: 'B', type: 'input', x: 70, y: 210, label: 'B', state: false },
        { id: 'NA', type: 'not', x: 230, y: 70, label: '!A' },
        { id: 'NB', type: 'not', x: 230, y: 210, label: '!B' },
        { id: 'Y0G', type: 'and', x: 410, y: 40, label: 'Y0' },
        { id: 'Y1G', type: 'and', x: 410, y: 130, label: 'Y1' },
        { id: 'Y2G', type: 'and', x: 410, y: 220, label: 'Y2' },
        { id: 'Y3G', type: 'and', x: 410, y: 310, label: 'Y3' },
        { id: 'Y0', type: 'led', x: 600, y: 49, label: 'Y0' },
        { id: 'Y1', type: 'led', x: 600, y: 139, label: 'Y1' },
        { id: 'Y2', type: 'led', x: 600, y: 229, label: 'Y2' },
        { id: 'Y3', type: 'led', x: 600, y: 319, label: 'Y3' },
        { id: 'TXT1', type: 'text', x: 70, y: 430, width: 560, label: 'Decodificador 2 para 4. Para cada combinação de A e B, exatamente uma saída Y0 a Y3 fica ligada.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'NA', pinId: 'in' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'NB', pinId: 'in' } },
        { id: 'W3', from: { componentId: 'NA', pinId: 'out' }, to: { componentId: 'Y0G', pinId: 'a' } },
        { id: 'W4', from: { componentId: 'NB', pinId: 'out' }, to: { componentId: 'Y0G', pinId: 'b' } },
        { id: 'W5', from: { componentId: 'NA', pinId: 'out' }, to: { componentId: 'Y1G', pinId: 'a' } },
        { id: 'W6', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'Y1G', pinId: 'b' } },
        { id: 'W7', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'Y2G', pinId: 'a' } },
        { id: 'W8', from: { componentId: 'NB', pinId: 'out' }, to: { componentId: 'Y2G', pinId: 'b' } },
        { id: 'W9', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'Y3G', pinId: 'a' } },
        { id: 'W10', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'Y3G', pinId: 'b' } },
        { id: 'W11', from: { componentId: 'Y0G', pinId: 'out' }, to: { componentId: 'Y0', pinId: 'in' } },
        { id: 'W12', from: { componentId: 'Y1G', pinId: 'out' }, to: { componentId: 'Y1', pinId: 'in' } },
        { id: 'W13', from: { componentId: 'Y2G', pinId: 'out' }, to: { componentId: 'Y2', pinId: 'in' } },
        { id: 'W14', from: { componentId: 'Y3G', pinId: 'out' }, to: { componentId: 'Y3', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'demux-1-2',
    name: 'Demultiplexador 1 para 2',
    circuit: {
      version: 1,
      components: [
        { id: 'D', type: 'input', x: 70, y: 100, label: 'D', state: false },
        { id: 'Sel', type: 'input', x: 70, y: 250, label: 'Sel', state: false },
        { id: 'N1', type: 'not', x: 240, y: 230, label: '!Sel' },
        { id: 'Y0G', type: 'and', x: 430, y: 110, label: 'Y0' },
        { id: 'Y1G', type: 'and', x: 430, y: 250, label: 'Y1' },
        { id: 'Y0', type: 'led', x: 630, y: 119, label: 'Y0' },
        { id: 'Y1', type: 'led', x: 630, y: 259, label: 'Y1' },
        { id: 'TXT1', type: 'text', x: 70, y: 370, width: 520, label: 'Demultiplexador 1 para 2. O seletor Sel decide se o dado D vai para Y0 ou para Y1.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'Sel', pinId: 'out' }, to: { componentId: 'N1', pinId: 'in' } },
        { id: 'W2', from: { componentId: 'D', pinId: 'out' }, to: { componentId: 'Y0G', pinId: 'a' } },
        { id: 'W3', from: { componentId: 'N1', pinId: 'out' }, to: { componentId: 'Y0G', pinId: 'b' } },
        { id: 'W4', from: { componentId: 'D', pinId: 'out' }, to: { componentId: 'Y1G', pinId: 'a' } },
        { id: 'W5', from: { componentId: 'Sel', pinId: 'out' }, to: { componentId: 'Y1G', pinId: 'b' } },
        { id: 'W6', from: { componentId: 'Y0G', pinId: 'out' }, to: { componentId: 'Y0', pinId: 'in' } },
        { id: 'W7', from: { componentId: 'Y1G', pinId: 'out' }, to: { componentId: 'Y1', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'odd-parity-3',
    name: 'Paridade ímpar 3 bits',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 70, y: 80, label: 'A', state: false },
        { id: 'B', type: 'input', x: 70, y: 170, label: 'B', state: false },
        { id: 'C', type: 'input', x: 70, y: 260, label: 'C', state: false },
        { id: 'X1', type: 'xor', x: 260, y: 120, label: 'A⊕B' },
        { id: 'X2', type: 'xor', x: 460, y: 180, label: 'OUT' },
        { id: 'OUT', type: 'led', x: 660, y: 189, label: 'Ímpar' },
        { id: 'TXT1', type: 'text', x: 70, y: 370, width: 560, label: 'Paridade ímpar. A saída liga quando a quantidade de entradas ligadas é ímpar: 1 ou 3 bits em nível 1.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'X1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'X1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'X2', pinId: 'a' } },
        { id: 'W4', from: { componentId: 'C', pinId: 'out' }, to: { componentId: 'X2', pinId: 'b' } },
        { id: 'W5', from: { componentId: 'X2', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'majority-3',
    name: 'Detector de maioria 3 bits',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 70, y: 70, label: 'A', state: false },
        { id: 'B', type: 'input', x: 70, y: 160, label: 'B', state: false },
        { id: 'C', type: 'input', x: 70, y: 250, label: 'C', state: false },
        { id: 'AB', type: 'and', x: 250, y: 70, label: 'AB' },
        { id: 'AC', type: 'and', x: 250, y: 170, label: 'AC' },
        { id: 'BC', type: 'and', x: 250, y: 270, label: 'BC' },
        { id: 'O1', type: 'or', x: 450, y: 125, label: 'AB+AC' },
        { id: 'O2', type: 'or', x: 650, y: 190, label: 'OUT' },
        { id: 'OUT', type: 'led', x: 850, y: 199, label: 'Maioria' },
        { id: 'TXT1', type: 'text', x: 70, y: 390, width: 560, label: 'Detector de maioria. A saída liga quando pelo menos duas das três entradas estão ligadas.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'AB', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'AB', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'AC', pinId: 'a' } },
        { id: 'W4', from: { componentId: 'C', pinId: 'out' }, to: { componentId: 'AC', pinId: 'b' } },
        { id: 'W5', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'BC', pinId: 'a' } },
        { id: 'W6', from: { componentId: 'C', pinId: 'out' }, to: { componentId: 'BC', pinId: 'b' } },
        { id: 'W7', from: { componentId: 'AB', pinId: 'out' }, to: { componentId: 'O1', pinId: 'a' } },
        { id: 'W8', from: { componentId: 'AC', pinId: 'out' }, to: { componentId: 'O1', pinId: 'b' } },
        { id: 'W9', from: { componentId: 'O1', pinId: 'out' }, to: { componentId: 'O2', pinId: 'a' } },
        { id: 'W10', from: { componentId: 'BC', pinId: 'out' }, to: { componentId: 'O2', pinId: 'b' } },
        { id: 'W11', from: { componentId: 'O2', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'half-subtractor',
    name: 'Meio subtrator',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 70, y: 110, label: 'A', state: false },
        { id: 'B', type: 'input', x: 70, y: 210, label: 'B', state: false },
        { id: 'NA', type: 'not', x: 250, y: 240, label: '!A' },
        { id: 'X1', type: 'xor', x: 250, y: 105, label: 'DIFF' },
        { id: 'BRG', type: 'and', x: 430, y: 230, label: 'BORROW' },
        { id: 'DIFF', type: 'led', x: 620, y: 114, label: 'DIFF' },
        { id: 'BORROW', type: 'led', x: 620, y: 239, label: 'BORROW' },
        { id: 'TXT1', type: 'text', x: 70, y: 340, width: 560, label: 'Meio subtrator calcula A - B. DIFF é A XOR B e BORROW liga quando é preciso emprestar: !A AND B.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'X1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'X1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'NA', pinId: 'in' } },
        { id: 'W4', from: { componentId: 'NA', pinId: 'out' }, to: { componentId: 'BRG', pinId: 'a' } },
        { id: 'W5', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'BRG', pinId: 'b' } },
        { id: 'W6', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'DIFF', pinId: 'in' } },
        { id: 'W7', from: { componentId: 'BRG', pinId: 'out' }, to: { componentId: 'BORROW', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'full-subtractor',
    name: 'Subtrator completo',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 60, y: 70, label: 'A', state: false },
        { id: 'B', type: 'input', x: 60, y: 160, label: 'B', state: false },
        { id: 'Bin', type: 'input', x: 60, y: 310, label: 'Bin', state: false },
        { id: 'X1', type: 'xor', x: 230, y: 110, label: 'A⊕B' },
        { id: 'X2', type: 'xor', x: 430, y: 160, label: 'DIFF' },
        { id: 'NA', type: 'not', x: 230, y: 250, label: '!A' },
        { id: 'B1', type: 'and', x: 410, y: 260, label: '!A·B' },
        { id: 'NX1', type: 'not', x: 410, y: 360, label: '!(A⊕B)' },
        { id: 'B2', type: 'and', x: 590, y: 350, label: 'Bin·!(A⊕B)' },
        { id: 'O1', type: 'or', x: 780, y: 305, label: 'Bout' },
        { id: 'DIFF', type: 'led', x: 650, y: 169, label: 'DIFF' },
        { id: 'Bout', type: 'led', x: 960, y: 314, label: 'Bout' },
        { id: 'TXT1', type: 'text', x: 60, y: 470, width: 620, label: 'Subtrator completo calcula A - B - Bin. DIFF é o resultado e Bout indica empréstimo para a próxima coluna.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'X1', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'X1', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'X2', pinId: 'a' } },
        { id: 'W4', from: { componentId: 'Bin', pinId: 'out' }, to: { componentId: 'X2', pinId: 'b' } },
        { id: 'W5', from: { componentId: 'X2', pinId: 'out' }, to: { componentId: 'DIFF', pinId: 'in' } },
        { id: 'W6', from: { componentId: 'A', pinId: 'out' }, to: { componentId: 'NA', pinId: 'in' } },
        { id: 'W7', from: { componentId: 'NA', pinId: 'out' }, to: { componentId: 'B1', pinId: 'a' } },
        { id: 'W8', from: { componentId: 'B', pinId: 'out' }, to: { componentId: 'B1', pinId: 'b' } },
        { id: 'W9', from: { componentId: 'X1', pinId: 'out' }, to: { componentId: 'NX1', pinId: 'in' } },
        { id: 'W10', from: { componentId: 'Bin', pinId: 'out' }, to: { componentId: 'B2', pinId: 'a' } },
        { id: 'W11', from: { componentId: 'NX1', pinId: 'out' }, to: { componentId: 'B2', pinId: 'b' } },
        { id: 'W12', from: { componentId: 'B1', pinId: 'out' }, to: { componentId: 'O1', pinId: 'a' } },
        { id: 'W13', from: { componentId: 'B2', pinId: 'out' }, to: { componentId: 'O1', pinId: 'b' } },
        { id: 'W14', from: { componentId: 'O1', pinId: 'out' }, to: { componentId: 'Bout', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'encoder-4-2',
    name: 'Encoder 4 para 2',
    circuit: {
      version: 1,
      components: [
        { id: 'D0', type: 'input', x: 70, y: 60, label: 'D0', state: false },
        { id: 'D1', type: 'input', x: 70, y: 140, label: 'D1', state: false },
        { id: 'D2', type: 'input', x: 70, y: 220, label: 'D2', state: false },
        { id: 'D3', type: 'input', x: 70, y: 300, label: 'D3', state: false },
        { id: 'Y0G', type: 'or', x: 300, y: 130, label: 'Y0' },
        { id: 'Y1G', type: 'or', x: 300, y: 260, label: 'Y1' },
        { id: 'Y0', type: 'led', x: 500, y: 139, label: 'Y0' },
        { id: 'Y1', type: 'led', x: 500, y: 269, label: 'Y1' },
        { id: 'TXT1', type: 'text', x: 70, y: 410, width: 560, label: 'Encoder 4 para 2. Pressupondo uma entrada ativa por vez, ele codifica D0..D3 em dois bits Y1Y0.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'D1', pinId: 'out' }, to: { componentId: 'Y0G', pinId: 'a' } },
        { id: 'W2', from: { componentId: 'D3', pinId: 'out' }, to: { componentId: 'Y0G', pinId: 'b' } },
        { id: 'W3', from: { componentId: 'D2', pinId: 'out' }, to: { componentId: 'Y1G', pinId: 'a' } },
        { id: 'W4', from: { componentId: 'D3', pinId: 'out' }, to: { componentId: 'Y1G', pinId: 'b' } },
        { id: 'W5', from: { componentId: 'Y0G', pinId: 'out' }, to: { componentId: 'Y0', pinId: 'in' } },
        { id: 'W6', from: { componentId: 'Y1G', pinId: 'out' }, to: { componentId: 'Y1', pinId: 'in' } },
      ],
    },
  },
  {
    id: 'mux-4-1',
    name: 'Multiplexador 4:1',
    circuit: {
      version: 1,
      components: [
        { id: 'D0', type: 'input', x: 50, y: 50, label: 'D0', state: false },
        { id: 'D1', type: 'input', x: 50, y: 130, label: 'D1', state: false },
        { id: 'D2', type: 'input', x: 50, y: 210, label: 'D2', state: false },
        { id: 'D3', type: 'input', x: 50, y: 290, label: 'D3', state: false },
        { id: 'S0', type: 'input', x: 50, y: 390, label: 'S0', state: false },
        { id: 'S1', type: 'input', x: 50, y: 480, label: 'S1', state: false },
        { id: 'NS0', type: 'not', x: 210, y: 380, label: '!S0' },
        { id: 'NS1', type: 'not', x: 210, y: 480, label: '!S1' },
        { id: 'T0A', type: 'and', x: 390, y: 40, label: 'D0·!S1' },
        { id: 'T0', type: 'and', x: 570, y: 50, label: 'T0' },
        { id: 'T1A', type: 'and', x: 390, y: 130, label: 'D1·!S1' },
        { id: 'T1', type: 'and', x: 570, y: 140, label: 'T1' },
        { id: 'T2A', type: 'and', x: 390, y: 220, label: 'D2·S1' },
        { id: 'T2', type: 'and', x: 570, y: 230, label: 'T2' },
        { id: 'T3A', type: 'and', x: 390, y: 310, label: 'D3·S1' },
        { id: 'T3', type: 'and', x: 570, y: 320, label: 'T3' },
        { id: 'O1', type: 'or', x: 760, y: 95, label: 'T0+T1' },
        { id: 'O2', type: 'or', x: 760, y: 275, label: 'T2+T3' },
        { id: 'O3', type: 'or', x: 960, y: 185, label: 'OUT' },
        { id: 'OUT', type: 'led', x: 1160, y: 194, label: 'OUT' },
        { id: 'TXT1', type: 'text', x: 50, y: 590, width: 620, label: 'Multiplexador 4:1. S1 e S0 escolhem qual das quatro entradas D0, D1, D2 ou D3 aparece na saída OUT.' },
      ],
      wires: [
        { id: 'W1', from: { componentId: 'S0', pinId: 'out' }, to: { componentId: 'NS0', pinId: 'in' } },
        { id: 'W2', from: { componentId: 'S1', pinId: 'out' }, to: { componentId: 'NS1', pinId: 'in' } },
        { id: 'W3', from: { componentId: 'D0', pinId: 'out' }, to: { componentId: 'T0A', pinId: 'a' } },
        { id: 'W4', from: { componentId: 'NS1', pinId: 'out' }, to: { componentId: 'T0A', pinId: 'b' } },
        { id: 'W5', from: { componentId: 'T0A', pinId: 'out' }, to: { componentId: 'T0', pinId: 'a' } },
        { id: 'W6', from: { componentId: 'NS0', pinId: 'out' }, to: { componentId: 'T0', pinId: 'b' } },
        { id: 'W7', from: { componentId: 'D1', pinId: 'out' }, to: { componentId: 'T1A', pinId: 'a' } },
        { id: 'W8', from: { componentId: 'NS1', pinId: 'out' }, to: { componentId: 'T1A', pinId: 'b' } },
        { id: 'W9', from: { componentId: 'T1A', pinId: 'out' }, to: { componentId: 'T1', pinId: 'a' } },
        { id: 'W10', from: { componentId: 'S0', pinId: 'out' }, to: { componentId: 'T1', pinId: 'b' } },
        { id: 'W11', from: { componentId: 'D2', pinId: 'out' }, to: { componentId: 'T2A', pinId: 'a' } },
        { id: 'W12', from: { componentId: 'S1', pinId: 'out' }, to: { componentId: 'T2A', pinId: 'b' } },
        { id: 'W13', from: { componentId: 'T2A', pinId: 'out' }, to: { componentId: 'T2', pinId: 'a' } },
        { id: 'W14', from: { componentId: 'NS0', pinId: 'out' }, to: { componentId: 'T2', pinId: 'b' } },
        { id: 'W15', from: { componentId: 'D3', pinId: 'out' }, to: { componentId: 'T3A', pinId: 'a' } },
        { id: 'W16', from: { componentId: 'S1', pinId: 'out' }, to: { componentId: 'T3A', pinId: 'b' } },
        { id: 'W17', from: { componentId: 'T3A', pinId: 'out' }, to: { componentId: 'T3', pinId: 'a' } },
        { id: 'W18', from: { componentId: 'S0', pinId: 'out' }, to: { componentId: 'T3', pinId: 'b' } },
        { id: 'W19', from: { componentId: 'T0', pinId: 'out' }, to: { componentId: 'O1', pinId: 'a' } },
        { id: 'W20', from: { componentId: 'T1', pinId: 'out' }, to: { componentId: 'O1', pinId: 'b' } },
        { id: 'W21', from: { componentId: 'T2', pinId: 'out' }, to: { componentId: 'O2', pinId: 'a' } },
        { id: 'W22', from: { componentId: 'T3', pinId: 'out' }, to: { componentId: 'O2', pinId: 'b' } },
        { id: 'W23', from: { componentId: 'O1', pinId: 'out' }, to: { componentId: 'O3', pinId: 'a' } },
        { id: 'W24', from: { componentId: 'O2', pinId: 'out' }, to: { componentId: 'O3', pinId: 'b' } },
        { id: 'W25', from: { componentId: 'O3', pinId: 'out' }, to: { componentId: 'OUT', pinId: 'in' } },
      ],
    },
  },
];

export const CURRICULUM_MODULES: CurriculumModule[] = [
  { id: 'fundamentals', title: 'Fundamentos', description: 'Sinais, entradas, saídas, fios, portas e tabelas-verdade.' },
  { id: 'combinational', title: 'Lógica combinacional', description: 'Circuitos cuja saída depende somente das entradas atuais.' },
  { id: 'time-and-state', title: 'Tempo e estado', description: 'Clock, realimentação, latches, flip-flops e registradores.' },
  { id: 'systems', title: 'Sistemas digitais', description: 'Composição de blocos para criar circuitos maiores.' },
];

export const CURRICULUM_TRACKS: CurriculumTrack[] = [
  { id: 'boolean', title: 'Lógica booleana', description: 'Portas, expressões e equivalências.' },
  { id: 'selection', title: 'Seleção e codificação', description: 'MUX, DEMUX, encoders e decoders.' },
  { id: 'arithmetic', title: 'Aritmética', description: 'Somadores, subtratores e composição numérica.' },
  { id: 'sequential', title: 'Tempo e memória', description: 'Estado, clock, latches, flip-flops e registradores.' },
  { id: 'architecture', title: 'Arquitetura', description: 'Blocos que aparecem em datapaths e CPUs didáticas.' },
];

export const CURRICULUM_FAMILIES: CurriculumFamily[] = [
  { id: 'gates', title: 'Portas', description: 'Portas lógicas fundamentais e universais.' },
  { id: 'truth-table', title: 'Tabela verdade', description: 'Observação exaustiva de entradas e saídas.' },
  { id: 'mux-decoder', title: 'Seleção e decodificação', description: 'Circuitos que selecionam, distribuem ou codificam sinais.' },
  { id: 'adders', title: 'Aritmética', description: 'Soma, subtração, comparação e composição de bits.' },
  { id: 'latches', title: 'Latches', description: 'Memória sensível a nível e realimentação.' },
  { id: 'flip-flops', title: 'Flip-flops', description: 'Memória acionada por borda de clock.' },
  { id: 'registers', title: 'Registradores', description: 'Armazenamento de palavras binárias.' },
];

function metadataFor(example: RawCircuitExample): ExampleMetadata {
  const description = example.description ?? extractExampleDescription(example.circuit);
  const common = {
    description,
    extensions: [],
    modes: ['demo'] as CircuitExampleMode[],
    observe: ['Altere as entradas e observe as saídas no circuito.', 'Compare o comportamento com a descrição dentro do canvas.'],
    experiments: ['Teste todas as combinações de entrada.', 'Renomeie sinais importantes para reforçar o significado do circuito.'],
  };

  if (example.id === 'signal-led-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: [],
      concepts: ['sinal binário', 'switch', 'fio', 'LED', 'nível lógico 0/1'],
      next: ['not-basic', 'and-basic'],
      observe: ['Clique no switch A.', 'Observe que o LED OUT copia exatamente o valor de A.', 'Veja a linha atual destacada na tabela verdade.'],
      experiments: ['Renomeie A para Entrada e OUT para Saída.', 'Apague o fio e reconecte a saída de A ao LED.', 'Exporte o circuito e importe novamente.'],
      challenge: 'Adicione um segundo LED ligado ao mesmo switch e confirme que uma saída pode alimentar várias entradas.',
    };
  }

  if (example.id === 'not-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['signal-led-basic'],
      concepts: ['inversão', 'complemento lógico', 'entrada e saída'],
      next: ['and-basic', 'or-basic', 'nand-not'],
      observe: ['Compare A e OUT: eles devem estar sempre opostos.', 'Use a tabela verdade para confirmar os dois casos possíveis.'],
      experiments: ['Ligue A e observe OUT apagar.', 'Desligue A e observe OUT acender.', 'Tente prever OUT antes de clicar no switch.'],
      challenge: 'Monte outro inversor usando uma porta NAND com as duas entradas ligadas ao mesmo sinal.',
    };
  }

  if (example.id === 'and-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['signal-led-basic'],
      concepts: ['conjunção lógica', 'condição simultânea', 'tabela verdade de 2 entradas'],
      next: ['or-basic', 'xor', 'half-adder'],
      observe: ['OUT só acende quando A e B estão ligados ao mesmo tempo.', 'Compare as quatro combinações da tabela verdade.'],
      experiments: ['Teste 00, 01, 10 e 11 em ordem.', 'Use AND como uma condição: “A e B precisam ser verdadeiros”.'],
      challenge: 'Explique uma situação real que precise de duas condições simultâneas, como chave de segurança E botão pressionado.',
    };
  }

  if (example.id === 'or-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['signal-led-basic'],
      concepts: ['disjunção lógica', 'condição alternativa', 'tabela verdade de 2 entradas'],
      next: ['and-basic', 'xor', 'mux-2-1'],
      observe: ['OUT acende se A ou B estiver ligado.', 'A única forma de OUT apagar é A=0 e B=0.'],
      experiments: ['Teste as quatro combinações e diga em voz alta quando a saída deveria ligar.', 'Compare mentalmente OR com AND.'],
      challenge: 'Modifique o circuito para que dois switches diferentes possam acender dois LEDs ao mesmo tempo.',
    };
  }

  if (example.id === 'xor') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean', 'arithmetic'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['and-basic', 'or-basic', 'not-basic'],
      concepts: ['diferença entre bits', 'paridade simples', 'base da soma binária'],
      next: ['half-adder', 'odd-parity-3'],
      observe: ['OUT acende quando A e B são diferentes.', 'OUT apaga quando A e B são iguais.'],
      experiments: ['Compare XOR com OR quando A=B=1.', 'Tente prever a saída antes de cada clique.'],
      challenge: 'Explique por que XOR parece uma soma de 1 bit sem carry.',
    };
  }

  if (example.id === 'nand-not') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['and-basic', 'not-basic'],
      concepts: ['porta universal', 'equivalência lógica', 'reutilização de portas'],
      next: ['sr-latch-nand-active-low', 'gated-d-latch-from-nand'],
      observe: ['A alimenta as duas entradas da NAND.', 'Quando as duas entradas são iguais, NAND se comporta como NOT.'],
      experiments: ['Compare este circuito com o NOT básico.', 'Desconecte uma entrada da NAND e veja por que a equivalência deixa de fazer sentido.'],
      challenge: 'Pesquise mentalmente: se NAND pode virar NOT, como construir AND usando NAND + NOT?',
    };
  }
  if (['half-adder', 'full-adder', 'half-subtractor', 'full-subtractor', 'comparator-1-bit'].includes(example.id)) {
    return { ...common, moduleId: 'combinational', familyIds: ['adders', 'truth-table'], trackIds: ['arithmetic', 'architecture'], difficulty: example.id === 'full-adder' || example.id === 'full-subtractor' ? 3 : 2, level: 'composition', prerequisites: ['and-basic', 'or-basic', 'xor'], concepts: ['composição', 'carry/borrow', 'comparação'], next: ['register-4-basic'], challenge: 'Preveja a saída antes de alternar cada entrada.' };
  }
  if (['mux-2-1', 'mux-4-1', 'decoder-2-4', 'demux-1-2', 'encoder-4-2', 'odd-parity-3', 'majority-3'].includes(example.id)) {
    return { ...common, moduleId: 'combinational', familyIds: ['mux-decoder'], trackIds: ['selection', 'architecture'], difficulty: example.id === 'mux-4-1' ? 3 : 2, level: 'composition', prerequisites: ['and-basic', 'or-basic', 'not-basic'], concepts: ['seleção', 'codificação', 'roteamento de sinais'], next: ['register-4-basic'], challenge: 'Explique qual entrada controla cada caminho até a saída.' };
  }
  if (['d-latch-basic', 'sr-latch-nor-experiment', 'sr-latch-nand-active-low', 'gated-d-latch-from-nand'].includes(example.id)) {
    return { ...common, moduleId: 'time-and-state', familyIds: ['latches'], trackIds: ['sequential'], difficulty: example.id === 'gated-d-latch-from-nand' ? 3 : 2, level: 'concept', prerequisites: ['not-basic', 'nand-not'], concepts: ['estado anterior', 'realimentação', 'memória de 1 bit'], next: ['d-flip-flop-basic'], observe: ['Mude as entradas de controle.', 'Volte para a condição de repouso.', 'Observe que Q pode manter o valor anterior.'], experiments: ['Sete o latch, volte para repouso e confirme que Q permanece.', 'Resete o latch e confirme a mudança de estado.'], challenge: 'Compare o latch nativo com o latch construído usando portas comuns.' };
  }
  if (example.id === 'd-flip-flop-basic') {
    return { ...common, moduleId: 'time-and-state', familyIds: ['flip-flops'], trackIds: ['sequential', 'architecture'], difficulty: 2, level: 'concept', prerequisites: ['d-latch-basic'], concepts: ['clock', 'borda de subida', 'estado atual'], next: ['register-4-basic'], observe: ['Altere D antes do Tick.', 'Pressione Tick e observe se houve borda de subida.', 'Compare D e Q antes/depois do clock.'], experiments: ['Altere D na borda de descida e veja que Q não captura.', 'Use o clock automático em 1 Hz.'], challenge: 'Explique por que Q não muda imediatamente quando D muda.' };
  }
  if (example.id === 'register-4-basic') {
    return { ...common, moduleId: 'time-and-state', familyIds: ['registers'], trackIds: ['sequential', 'architecture'], difficulty: 2, level: 'composition', prerequisites: ['d-flip-flop-basic'], concepts: ['palavra binária', 'carga paralela', 'fronteira temporal'], next: [], observe: ['Ajuste D0–D3 antes do clock.', 'Dê Tick até uma borda de subida.', 'Observe Q0–Q3 copiando a palavra de entrada.'], experiments: ['Mude D0–D3 sem dar clock e confira que Q mantém.', 'Rode o clock automático e capture várias palavras.'], challenge: 'Adicione um enable usando multiplexadores antes das entradas D.' };
  }
  return { ...common, moduleId: 'systems', familyIds: [], trackIds: [], difficulty: 2, level: 'concept', prerequisites: [], concepts: [], next: [] };
}

export const CIRCUIT_EXAMPLES: CircuitExample[] = RAW_CIRCUIT_EXAMPLES.map((example) => ({
  ...example,
  ...metadataFor(example),
}));

function lesson(id: string, title: string, description: string, exampleIds: string[]): CircuitLesson {
  const examples = exampleIds.map((exampleId) => {
    const example = CIRCUIT_EXAMPLES.find((candidate) => candidate.id === exampleId);
    if (!example) throw new Error(`Exemplo não encontrado: ${exampleId}`);
    return example;
  });
  return { id, title, description, exampleIds, examples };
}

function extractExampleDescription(circuit: CircuitDocument): string {
  return circuit.components.find((component) => component.type === 'text')?.label ?? '';
}

export const CIRCUIT_LESSONS: CircuitLesson[] = [
  lesson('first-steps', 'Aula 1 — Sinais e portas básicas', 'Começa do zero: o que é um sinal 0/1, como fios transportam sinais, como LEDs observam saídas e como NOT, AND, OR, XOR e NAND transformam entradas.', ['signal-led-basic', 'not-basic', 'and-basic', 'or-basic', 'xor', 'nand-not']),
  lesson('truth-tables', 'Aula 2 — Tabela verdade e aritmética', 'Circuitos combinacionais clássicos observados pela tabela verdade.', ['half-adder', 'full-adder', 'comparator-1-bit', 'half-subtractor', 'full-subtractor']),
  lesson('combinational-blocks', 'Aula 3 — Seleção e codificação', 'Multiplexadores, decodificadores, encoders e detectores combinacionais.', ['mux-2-1', 'mux-4-1', 'decoder-2-4', 'demux-1-2', 'encoder-4-2', 'odd-parity-3', 'majority-3']),
  lesson('memory-latches', 'Aula 4 — Memória e latches', 'Primeiros circuitos que mantêm estado, tanto nativos quanto por realimentação.', ['d-latch-basic', 'sr-latch-nor-experiment', 'sr-latch-nand-active-low', 'gated-d-latch-from-nand']),
  lesson('clocked-systems', 'Aula 5 — Clock, flip-flops e registradores', 'Circuitos sincronizados pelo Tick ou pelo clock automático.', ['d-flip-flop-basic', 'register-4-basic']),
];
