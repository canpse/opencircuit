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
  goal: string;
  steps: string[];
  ideas: string[];
  next: string[];
  extensions: string[];
  modes: CircuitExampleMode[];
  observe: string[];
  experiments: string[];
  challenge?: string;
  exercises: string[];
  circuit: CircuitDocument;
};

type RawCircuitExample = {
  id: string;
  name: string;
  description?: string;
  circuit: CircuitDocument;
};
type ExampleMetadata = Omit<CircuitExample, 'id' | 'name' | 'circuit'>;

export type CircuitLesson = {
  id: string;
  title: string;
  description: string;
  exampleIds: string[];
  examples: CircuitExample[];
};

const RAW_CIRCUIT_EXAMPLES: RawCircuitExample[] = [
  {
    id: 'signal-led-basic',
    name: 'Sinal, fio e LED',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 90, y: 140, label: 'A', state: false },
        { id: 'OUT1', type: 'led', x: 320, y: 105, label: 'OUT 1' },
        { id: 'OUT2', type: 'led', x: 320, y: 185, label: 'OUT 2' },
        {
          id: 'TXT1',
          type: 'text',
          x: 80,
          y: 280,
          width: 620,
          label:
            'Primeiro contato: um switch gera um sinal 0 ou 1, e o fio transporta esse sinal. A mesma saída A alimenta dois LEDs ao mesmo tempo: OUT 1 e OUT 2 mostram o mesmo valor.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'OUT1', pinId: 'in' },
        },
        {
          id: 'W2',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'OUT2', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 80,
          y: 280,
          width: 380,
          label:
            'XOR acende a saída quando A e B são diferentes. Use os switches e acompanhe a linha destacada na tabela verdade.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'X1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'X1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'X1', pinId: 'out' },
          to: { componentId: 'OUT', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 80,
          y: 250,
          width: 410,
          label:
            'Uma porta NAND pode funcionar como NOT quando a mesma entrada alimenta os dois pinos. Assim OUT é o inverso de A.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'N1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'N1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'N1', pinId: 'out' },
          to: { componentId: 'OUT', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 80,
          y: 280,
          width: 430,
          label:
            'Porta AND: a saída liga somente quando A=1 e B=1. Use os switches e observe a tabela verdade.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'G1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'G1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'G1', pinId: 'out' },
          to: { componentId: 'OUT', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 80,
          y: 280,
          width: 430,
          label:
            'Porta OR: a saída liga quando A=1 ou B=1. Ela só fica desligada quando todas as entradas são 0.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'G1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'G1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'G1', pinId: 'out' },
          to: { componentId: 'OUT', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 80,
          y: 250,
          width: 430,
          label:
            'Porta NOT, ou inversor: OUT é sempre o contrário de A. Se A=0, OUT=1; se A=1, OUT=0.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'N1', pinId: 'in' },
        },
        {
          id: 'W2',
          from: { componentId: 'N1', pinId: 'out' },
          to: { componentId: 'OUT', pinId: 'in' },
        },
      ],
    },
  },
  {
    id: 'nand-basic',
    name: 'NAND básico',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 80, y: 100, label: 'A', state: false },
        { id: 'B', type: 'input', x: 80, y: 190, label: 'B', state: false },
        { id: 'G1', type: 'nand', x: 260, y: 130, label: 'NAND' },
        { id: 'OUT', type: 'led', x: 470, y: 139, label: 'OUT' },
        {
          id: 'TXT1',
          type: 'text',
          x: 80,
          y: 280,
          width: 560,
          label:
            'Porta NAND: é o contrário da AND. A saída só desliga quando A=1 e B=1; em todos os outros casos OUT fica ligada.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'G1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'G1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'G1', pinId: 'out' },
          to: { componentId: 'OUT', pinId: 'in' },
        },
      ],
    },
  },
  {
    id: 'nor-basic',
    name: 'NOR básico',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 80, y: 100, label: 'A', state: false },
        { id: 'B', type: 'input', x: 80, y: 190, label: 'B', state: false },
        { id: 'G1', type: 'nor', x: 260, y: 130, label: 'NOR' },
        { id: 'OUT', type: 'led', x: 470, y: 139, label: 'OUT' },
        {
          id: 'TXT1',
          type: 'text',
          x: 80,
          y: 280,
          width: 560,
          label:
            'Porta NOR: é o contrário da OR. A saída só liga quando A=0 e B=0; se qualquer entrada ligar, OUT desliga.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'G1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'G1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'G1', pinId: 'out' },
          to: { componentId: 'OUT', pinId: 'in' },
        },
      ],
    },
  },
  {
    id: 'xnor-basic',
    name: 'XNOR básico',
    circuit: {
      version: 1,
      components: [
        { id: 'A', type: 'input', x: 80, y: 100, label: 'A', state: false },
        { id: 'B', type: 'input', x: 80, y: 190, label: 'B', state: false },
        { id: 'G1', type: 'xnor', x: 260, y: 130, label: 'XNOR' },
        { id: 'OUT', type: 'led', x: 480, y: 139, label: 'OUT' },
        {
          id: 'TXT1',
          type: 'text',
          x: 80,
          y: 280,
          width: 570,
          label:
            'Porta XNOR: é o contrário da XOR. A saída liga quando A e B são iguais: ambos 0 ou ambos 1.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'G1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'G1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'G1', pinId: 'out' },
          to: { componentId: 'OUT', pinId: 'in' },
        },
      ],
    },
  },
  {
    id: 'microwave-safety-challenge',
    name: 'Desafio: micro-ondas seguro',
    circuit: {
      version: 1,
      components: [
        { id: 'PORTA', type: 'input', x: 70, y: 80, label: 'Porta fechada', state: false },
        { id: 'START', type: 'input', x: 70, y: 180, label: 'Start', state: false },
        { id: 'TIMER', type: 'input', x: 70, y: 300, label: 'Tempo > 0', state: false },
        { id: 'G1', type: 'and', x: 310, y: 125, label: 'Segurança' },
        { id: 'G2', type: 'and', x: 500, y: 200, label: 'Motor' },
        { id: 'MOTOR', type: 'led', x: 720, y: 209, label: 'Motor' },
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 410,
          width: 760,
          label:
            'Joãozinho está montando a lógica de segurança de um micro-ondas. O motor só pode ligar se a porta estiver fechada, se o botão Start estiver pressionado e se ainda houver tempo no timer. Teste todas as condições antes de confiar no circuito.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'PORTA', pinId: 'out' },
          to: { componentId: 'G1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'START', pinId: 'out' },
          to: { componentId: 'G1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'G1', pinId: 'out' },
          to: { componentId: 'G2', pinId: 'a' },
        },
        {
          id: 'W4',
          from: { componentId: 'TIMER', pinId: 'out' },
          to: { componentId: 'G2', pinId: 'b' },
        },
        {
          id: 'W5',
          from: { componentId: 'G2', pinId: 'out' },
          to: { componentId: 'MOTOR', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 340,
          width: 610,
          label:
            'Latch D guarda 1 bit. Com EN=1, Q acompanha D. Com EN=0, Q mantém o último valor salvo. Use os inputs e observe o painel de estado sequencial.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'D', pinId: 'out' },
          to: { componentId: 'L1', pinId: 'D' },
        },
        {
          id: 'W2',
          from: { componentId: 'EN', pinId: 'out' },
          to: { componentId: 'L1', pinId: 'EN' },
        },
        {
          id: 'W3',
          from: { componentId: 'L1', pinId: 'Q' },
          to: { componentId: 'Q', pinId: 'in' },
        },
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
        {
          id: 'FF1',
          type: 'd-flip-flop',
          x: 300,
          y: 150,
          label: 'Flip-Flop D',
          memory: { q: false, previousClk: false },
        },
        { id: 'Q', type: 'led', x: 560, y: 171, label: 'Q' },
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 360,
          width: 650,
          label:
            'Flip-Flop D guarda D somente na borda de subida do clock. Clique em Tick: quando o Clock alterna de 0 para 1, Q recebe D; nas outras etapas, Q mantém o valor.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'D', pinId: 'out' },
          to: { componentId: 'FF1', pinId: 'D' },
        },
        {
          id: 'W2',
          from: { componentId: 'CLK', pinId: 'CLK' },
          to: { componentId: 'FF1', pinId: 'CLK' },
        },
        {
          id: 'W3',
          from: { componentId: 'FF1', pinId: 'Q' },
          to: { componentId: 'Q', pinId: 'in' },
        },
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
        {
          id: 'REG1',
          type: 'register-4',
          x: 320,
          y: 140,
          label: 'Registrador 4 bits',
          memory: { q0: false, q1: false, q2: false, q3: false, previousClk: false },
        },
        { id: 'Q0', type: 'led', x: 610, y: 157, label: 'Q0' },
        { id: 'Q1', type: 'led', x: 610, y: 181, label: 'Q1' },
        { id: 'Q2', type: 'led', x: 610, y: 205, label: 'Q2' },
        { id: 'Q3', type: 'led', x: 610, y: 229, label: 'Q3' },
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 490,
          width: 690,
          label:
            'Registrador de 4 bits. Ajuste D0–D3 e pressione Tick ou rode o clock automático. Na borda de subida do clock, Q0–Q3 copiam D0–D3 e depois mantêm o valor salvo.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'D0', pinId: 'out' },
          to: { componentId: 'REG1', pinId: 'D0' },
        },
        {
          id: 'W2',
          from: { componentId: 'D1', pinId: 'out' },
          to: { componentId: 'REG1', pinId: 'D1' },
        },
        {
          id: 'W3',
          from: { componentId: 'D2', pinId: 'out' },
          to: { componentId: 'REG1', pinId: 'D2' },
        },
        {
          id: 'W4',
          from: { componentId: 'D3', pinId: 'out' },
          to: { componentId: 'REG1', pinId: 'D3' },
        },
        {
          id: 'W5',
          from: { componentId: 'CLK', pinId: 'CLK' },
          to: { componentId: 'REG1', pinId: 'CLK' },
        },
        {
          id: 'W6',
          from: { componentId: 'REG1', pinId: 'Q0' },
          to: { componentId: 'Q0', pinId: 'in' },
        },
        {
          id: 'W7',
          from: { componentId: 'REG1', pinId: 'Q1' },
          to: { componentId: 'Q1', pinId: 'in' },
        },
        {
          id: 'W8',
          from: { componentId: 'REG1', pinId: 'Q2' },
          to: { componentId: 'Q2', pinId: 'in' },
        },
        {
          id: 'W9',
          from: { componentId: 'REG1', pinId: 'Q3' },
          to: { componentId: 'Q3', pinId: 'in' },
        },
      ],
    },
  },
  {
    id: 'sync-counter-8bit',
    name: 'Contador binário síncrono (8 bits)',
    circuit: {
      version: 1,
      components: [
        {
          id: 'EN',
          type: 'input',
          x: 20,
          y: 80,
          label: 'Enable',
          state: true,
        },
        {
          id: 'CLK',
          type: 'clock',
          x: 420,
          y: 20,
          label: 'Clock',
          state: false,
        },
        {
          id: 'FF0',
          type: 'd-flip-flop',
          x: 420,
          y: 180,
          label: 'Bit 0',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'X0',
          type: 'xor',
          x: 640,
          y: 182,
          label: 'T0',
        },
        {
          id: 'L0',
          type: 'led',
          x: 840,
          y: 191,
          label: 'Q0',
        },
        {
          id: 'A1',
          type: 'and',
          x: 200,
          y: 195,
          label: 'T1',
        },
        {
          id: 'FF1',
          type: 'd-flip-flop',
          x: 420,
          y: 280,
          label: 'Bit 1',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'X1',
          type: 'xor',
          x: 640,
          y: 282,
          label: 'T1',
        },
        {
          id: 'L1',
          type: 'led',
          x: 840,
          y: 291,
          label: 'Q1',
        },
        {
          id: 'A2',
          type: 'and',
          x: 200,
          y: 295,
          label: 'T2',
        },
        {
          id: 'FF2',
          type: 'd-flip-flop',
          x: 420,
          y: 380,
          label: 'Bit 2',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'X2',
          type: 'xor',
          x: 640,
          y: 382,
          label: 'T2',
        },
        {
          id: 'L2',
          type: 'led',
          x: 840,
          y: 391,
          label: 'Q2',
        },
        {
          id: 'A3',
          type: 'and',
          x: 200,
          y: 395,
          label: 'T3',
        },
        {
          id: 'FF3',
          type: 'd-flip-flop',
          x: 420,
          y: 480,
          label: 'Bit 3',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'X3',
          type: 'xor',
          x: 640,
          y: 482,
          label: 'T3',
        },
        {
          id: 'L3',
          type: 'led',
          x: 840,
          y: 491,
          label: 'Q3',
        },
        {
          id: 'A4',
          type: 'and',
          x: 200,
          y: 495,
          label: 'T4',
        },
        {
          id: 'FF4',
          type: 'd-flip-flop',
          x: 420,
          y: 580,
          label: 'Bit 4',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'X4',
          type: 'xor',
          x: 640,
          y: 582,
          label: 'T4',
        },
        {
          id: 'L4',
          type: 'led',
          x: 840,
          y: 591,
          label: 'Q4',
        },
        {
          id: 'A5',
          type: 'and',
          x: 200,
          y: 595,
          label: 'T5',
        },
        {
          id: 'FF5',
          type: 'd-flip-flop',
          x: 420,
          y: 680,
          label: 'Bit 5',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'X5',
          type: 'xor',
          x: 640,
          y: 682,
          label: 'T5',
        },
        {
          id: 'L5',
          type: 'led',
          x: 840,
          y: 691,
          label: 'Q5',
        },
        {
          id: 'A6',
          type: 'and',
          x: 200,
          y: 695,
          label: 'T6',
        },
        {
          id: 'FF6',
          type: 'd-flip-flop',
          x: 420,
          y: 780,
          label: 'Bit 6',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'X6',
          type: 'xor',
          x: 640,
          y: 782,
          label: 'T6',
        },
        {
          id: 'L6',
          type: 'led',
          x: 840,
          y: 791,
          label: 'Q6',
        },
        {
          id: 'A7',
          type: 'and',
          x: 200,
          y: 795,
          label: 'T7',
        },
        {
          id: 'FF7',
          type: 'd-flip-flop',
          x: 420,
          y: 880,
          label: 'Bit 7',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'X7',
          type: 'xor',
          x: 640,
          y: 882,
          label: 'T7',
        },
        {
          id: 'L7',
          type: 'led',
          x: 840,
          y: 891,
          label: 'Q7',
        },
        {
          id: 'TXT1',
          type: 'text',
          x: 20,
          y: 1000,
          width: 900,
          label:
            'Contador binário síncrono de 8 bits. Todo bit é clocado pelo mesmo Clock mestre; a cadeia de portas AND à esquerda calcula, para cada bit, se todos os bits menos significativos já estão em 1 (a condição clássica de "vai um" de um contador síncrono). Cada Flip-Flop D alterna (XOR com o próprio Q) só quando essa condição está ativa. Desligue Enable para pausar a contagem sem perder o valor atual. Rode o clock automático e acompanhe os LEDs contando em binário de 0 a 255 — ou abra as Formas de onda e use o cursor de tempo para inspecionar qualquer instante do histórico. Importante: este simulador resolve cada Tick como um único passo síncrono — toda a lógica combinacional é calculada de uma vez a partir do estado anterior, e só então todos os Flip-Flops travam o novo valor ao mesmo tempo. Por isso um projeto como este, com um clock único compartilhado, sempre conta certo. Veja o exemplo "Ripple counter (não funciona)" para o caso em que essa premissa é quebrada.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF0',
            pinId: 'CLK',
          },
        },
        {
          id: 'W2',
          from: {
            componentId: 'FF0',
            pinId: 'Q',
          },
          to: {
            componentId: 'X0',
            pinId: 'a',
          },
        },
        {
          id: 'W3',
          from: {
            componentId: 'EN',
            pinId: 'out',
          },
          to: {
            componentId: 'X0',
            pinId: 'b',
          },
        },
        {
          id: 'W4',
          from: {
            componentId: 'X0',
            pinId: 'out',
          },
          to: {
            componentId: 'FF0',
            pinId: 'D',
          },
        },
        {
          id: 'W5',
          from: {
            componentId: 'FF0',
            pinId: 'Q',
          },
          to: {
            componentId: 'L0',
            pinId: 'in',
          },
        },
        {
          id: 'W6',
          from: {
            componentId: 'FF0',
            pinId: 'Q',
          },
          to: {
            componentId: 'A1',
            pinId: 'a',
          },
        },
        {
          id: 'W7',
          from: {
            componentId: 'EN',
            pinId: 'out',
          },
          to: {
            componentId: 'A1',
            pinId: 'b',
          },
        },
        {
          id: 'W8',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF1',
            pinId: 'CLK',
          },
        },
        {
          id: 'W9',
          from: {
            componentId: 'FF1',
            pinId: 'Q',
          },
          to: {
            componentId: 'X1',
            pinId: 'a',
          },
        },
        {
          id: 'W10',
          from: {
            componentId: 'A1',
            pinId: 'out',
          },
          to: {
            componentId: 'X1',
            pinId: 'b',
          },
        },
        {
          id: 'W11',
          from: {
            componentId: 'X1',
            pinId: 'out',
          },
          to: {
            componentId: 'FF1',
            pinId: 'D',
          },
        },
        {
          id: 'W12',
          from: {
            componentId: 'FF1',
            pinId: 'Q',
          },
          to: {
            componentId: 'L1',
            pinId: 'in',
          },
        },
        {
          id: 'W13',
          from: {
            componentId: 'FF1',
            pinId: 'Q',
          },
          to: {
            componentId: 'A2',
            pinId: 'a',
          },
        },
        {
          id: 'W14',
          from: {
            componentId: 'A1',
            pinId: 'out',
          },
          to: {
            componentId: 'A2',
            pinId: 'b',
          },
        },
        {
          id: 'W15',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF2',
            pinId: 'CLK',
          },
        },
        {
          id: 'W16',
          from: {
            componentId: 'FF2',
            pinId: 'Q',
          },
          to: {
            componentId: 'X2',
            pinId: 'a',
          },
        },
        {
          id: 'W17',
          from: {
            componentId: 'A2',
            pinId: 'out',
          },
          to: {
            componentId: 'X2',
            pinId: 'b',
          },
        },
        {
          id: 'W18',
          from: {
            componentId: 'X2',
            pinId: 'out',
          },
          to: {
            componentId: 'FF2',
            pinId: 'D',
          },
        },
        {
          id: 'W19',
          from: {
            componentId: 'FF2',
            pinId: 'Q',
          },
          to: {
            componentId: 'L2',
            pinId: 'in',
          },
        },
        {
          id: 'W20',
          from: {
            componentId: 'FF2',
            pinId: 'Q',
          },
          to: {
            componentId: 'A3',
            pinId: 'a',
          },
        },
        {
          id: 'W21',
          from: {
            componentId: 'A2',
            pinId: 'out',
          },
          to: {
            componentId: 'A3',
            pinId: 'b',
          },
        },
        {
          id: 'W22',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF3',
            pinId: 'CLK',
          },
        },
        {
          id: 'W23',
          from: {
            componentId: 'FF3',
            pinId: 'Q',
          },
          to: {
            componentId: 'X3',
            pinId: 'a',
          },
        },
        {
          id: 'W24',
          from: {
            componentId: 'A3',
            pinId: 'out',
          },
          to: {
            componentId: 'X3',
            pinId: 'b',
          },
        },
        {
          id: 'W25',
          from: {
            componentId: 'X3',
            pinId: 'out',
          },
          to: {
            componentId: 'FF3',
            pinId: 'D',
          },
        },
        {
          id: 'W26',
          from: {
            componentId: 'FF3',
            pinId: 'Q',
          },
          to: {
            componentId: 'L3',
            pinId: 'in',
          },
        },
        {
          id: 'W27',
          from: {
            componentId: 'FF3',
            pinId: 'Q',
          },
          to: {
            componentId: 'A4',
            pinId: 'a',
          },
        },
        {
          id: 'W28',
          from: {
            componentId: 'A3',
            pinId: 'out',
          },
          to: {
            componentId: 'A4',
            pinId: 'b',
          },
        },
        {
          id: 'W29',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF4',
            pinId: 'CLK',
          },
        },
        {
          id: 'W30',
          from: {
            componentId: 'FF4',
            pinId: 'Q',
          },
          to: {
            componentId: 'X4',
            pinId: 'a',
          },
        },
        {
          id: 'W31',
          from: {
            componentId: 'A4',
            pinId: 'out',
          },
          to: {
            componentId: 'X4',
            pinId: 'b',
          },
        },
        {
          id: 'W32',
          from: {
            componentId: 'X4',
            pinId: 'out',
          },
          to: {
            componentId: 'FF4',
            pinId: 'D',
          },
        },
        {
          id: 'W33',
          from: {
            componentId: 'FF4',
            pinId: 'Q',
          },
          to: {
            componentId: 'L4',
            pinId: 'in',
          },
        },
        {
          id: 'W34',
          from: {
            componentId: 'FF4',
            pinId: 'Q',
          },
          to: {
            componentId: 'A5',
            pinId: 'a',
          },
        },
        {
          id: 'W35',
          from: {
            componentId: 'A4',
            pinId: 'out',
          },
          to: {
            componentId: 'A5',
            pinId: 'b',
          },
        },
        {
          id: 'W36',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF5',
            pinId: 'CLK',
          },
        },
        {
          id: 'W37',
          from: {
            componentId: 'FF5',
            pinId: 'Q',
          },
          to: {
            componentId: 'X5',
            pinId: 'a',
          },
        },
        {
          id: 'W38',
          from: {
            componentId: 'A5',
            pinId: 'out',
          },
          to: {
            componentId: 'X5',
            pinId: 'b',
          },
        },
        {
          id: 'W39',
          from: {
            componentId: 'X5',
            pinId: 'out',
          },
          to: {
            componentId: 'FF5',
            pinId: 'D',
          },
        },
        {
          id: 'W40',
          from: {
            componentId: 'FF5',
            pinId: 'Q',
          },
          to: {
            componentId: 'L5',
            pinId: 'in',
          },
        },
        {
          id: 'W41',
          from: {
            componentId: 'FF5',
            pinId: 'Q',
          },
          to: {
            componentId: 'A6',
            pinId: 'a',
          },
        },
        {
          id: 'W42',
          from: {
            componentId: 'A5',
            pinId: 'out',
          },
          to: {
            componentId: 'A6',
            pinId: 'b',
          },
        },
        {
          id: 'W43',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF6',
            pinId: 'CLK',
          },
        },
        {
          id: 'W44',
          from: {
            componentId: 'FF6',
            pinId: 'Q',
          },
          to: {
            componentId: 'X6',
            pinId: 'a',
          },
        },
        {
          id: 'W45',
          from: {
            componentId: 'A6',
            pinId: 'out',
          },
          to: {
            componentId: 'X6',
            pinId: 'b',
          },
        },
        {
          id: 'W46',
          from: {
            componentId: 'X6',
            pinId: 'out',
          },
          to: {
            componentId: 'FF6',
            pinId: 'D',
          },
        },
        {
          id: 'W47',
          from: {
            componentId: 'FF6',
            pinId: 'Q',
          },
          to: {
            componentId: 'L6',
            pinId: 'in',
          },
        },
        {
          id: 'W48',
          from: {
            componentId: 'FF6',
            pinId: 'Q',
          },
          to: {
            componentId: 'A7',
            pinId: 'a',
          },
        },
        {
          id: 'W49',
          from: {
            componentId: 'A6',
            pinId: 'out',
          },
          to: {
            componentId: 'A7',
            pinId: 'b',
          },
        },
        {
          id: 'W50',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF7',
            pinId: 'CLK',
          },
        },
        {
          id: 'W51',
          from: {
            componentId: 'FF7',
            pinId: 'Q',
          },
          to: {
            componentId: 'X7',
            pinId: 'a',
          },
        },
        {
          id: 'W52',
          from: {
            componentId: 'A7',
            pinId: 'out',
          },
          to: {
            componentId: 'X7',
            pinId: 'b',
          },
        },
        {
          id: 'W53',
          from: {
            componentId: 'X7',
            pinId: 'out',
          },
          to: {
            componentId: 'FF7',
            pinId: 'D',
          },
        },
        {
          id: 'W54',
          from: {
            componentId: 'FF7',
            pinId: 'Q',
          },
          to: {
            componentId: 'L7',
            pinId: 'in',
          },
        },
      ],
    },
  },
  {
    id: 'ripple-counter-broken',
    name: 'Ripple counter assíncrono (não funciona)',
    circuit: {
      version: 1,
      components: [
        {
          id: 'CLK',
          type: 'clock',
          x: 40,
          y: 72,
          label: 'Clock',
          state: false,
        },
        {
          id: 'FF0',
          type: 'd-flip-flop',
          x: 280,
          y: 60,
          label: 'Bit 0',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'N0',
          type: 'not',
          x: 480,
          y: 69,
          label: 'T0',
        },
        {
          id: 'L0',
          type: 'led',
          x: 650,
          y: 71,
          label: 'Q0',
        },
        {
          id: 'FF1',
          type: 'd-flip-flop',
          x: 280,
          y: 160,
          label: 'Bit 1',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'N1',
          type: 'not',
          x: 480,
          y: 169,
          label: 'T1',
        },
        {
          id: 'L1',
          type: 'led',
          x: 650,
          y: 171,
          label: 'Q1',
        },
        {
          id: 'FF2',
          type: 'd-flip-flop',
          x: 280,
          y: 260,
          label: 'Bit 2',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'N2',
          type: 'not',
          x: 480,
          y: 269,
          label: 'T2',
        },
        {
          id: 'L2',
          type: 'led',
          x: 650,
          y: 271,
          label: 'Q2',
        },
        {
          id: 'FF3',
          type: 'd-flip-flop',
          x: 280,
          y: 360,
          label: 'Bit 3',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'N3',
          type: 'not',
          x: 480,
          y: 369,
          label: 'T3',
        },
        {
          id: 'L3',
          type: 'led',
          x: 650,
          y: 371,
          label: 'Q3',
        },
        {
          id: 'TXT1',
          type: 'text',
          x: 40,
          y: 480,
          width: 780,
          label:
            'Contador ripple assíncrono de 4 bits — QUEBRADO DE PROPÓSITO. Cada bit é um Flip-Flop T (D = NOT(Q), alterna a cada borda de subida do próprio clock) e o clock de cada bit vem do Q do bit anterior — o desenho clássico de livro-texto para um contador assíncrono. Antes de dar Tick, preveja: o valor deveria contar 1, 2, 3, 4, 5, 6... Rode e compare com o que os LEDs realmente mostram. Ele não conta certo neste simulador: cada Tick resolve o circuito inteiro em um único passo síncrono (toda a lógica é calculada de uma vez a partir do estado anterior, e só depois os Flip-Flops travam o novo valor) — não existe um "meio do caminho" entre um tick e o outro onde o atraso de propagação de um estágio para o outro possa se resolver, como aconteceria em hardware de verdade. O resultado é um valor que pula de forma imprevisível em vez de contar. Veja o exemplo "Contador binário síncrono (8 bits)" para a versão que funciona: todos os bits no mesmo clock, com uma cadeia de portas decidindo quem deve alternar — sem depender de nenhum atraso entre estágios.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: {
            componentId: 'FF0',
            pinId: 'Q',
          },
          to: {
            componentId: 'N0',
            pinId: 'in',
          },
        },
        {
          id: 'W2',
          from: {
            componentId: 'N0',
            pinId: 'out',
          },
          to: {
            componentId: 'FF0',
            pinId: 'D',
          },
        },
        {
          id: 'W3',
          from: {
            componentId: 'FF0',
            pinId: 'Q',
          },
          to: {
            componentId: 'L0',
            pinId: 'in',
          },
        },
        {
          id: 'W4',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF0',
            pinId: 'CLK',
          },
        },
        {
          id: 'W5',
          from: {
            componentId: 'FF1',
            pinId: 'Q',
          },
          to: {
            componentId: 'N1',
            pinId: 'in',
          },
        },
        {
          id: 'W6',
          from: {
            componentId: 'N1',
            pinId: 'out',
          },
          to: {
            componentId: 'FF1',
            pinId: 'D',
          },
        },
        {
          id: 'W7',
          from: {
            componentId: 'FF1',
            pinId: 'Q',
          },
          to: {
            componentId: 'L1',
            pinId: 'in',
          },
        },
        {
          id: 'W8',
          from: {
            componentId: 'FF0',
            pinId: 'Q',
          },
          to: {
            componentId: 'FF1',
            pinId: 'CLK',
          },
        },
        {
          id: 'W9',
          from: {
            componentId: 'FF2',
            pinId: 'Q',
          },
          to: {
            componentId: 'N2',
            pinId: 'in',
          },
        },
        {
          id: 'W10',
          from: {
            componentId: 'N2',
            pinId: 'out',
          },
          to: {
            componentId: 'FF2',
            pinId: 'D',
          },
        },
        {
          id: 'W11',
          from: {
            componentId: 'FF2',
            pinId: 'Q',
          },
          to: {
            componentId: 'L2',
            pinId: 'in',
          },
        },
        {
          id: 'W12',
          from: {
            componentId: 'FF1',
            pinId: 'Q',
          },
          to: {
            componentId: 'FF2',
            pinId: 'CLK',
          },
        },
        {
          id: 'W13',
          from: {
            componentId: 'FF3',
            pinId: 'Q',
          },
          to: {
            componentId: 'N3',
            pinId: 'in',
          },
        },
        {
          id: 'W14',
          from: {
            componentId: 'N3',
            pinId: 'out',
          },
          to: {
            componentId: 'FF3',
            pinId: 'D',
          },
        },
        {
          id: 'W15',
          from: {
            componentId: 'FF3',
            pinId: 'Q',
          },
          to: {
            componentId: 'L3',
            pinId: 'in',
          },
        },
        {
          id: 'W16',
          from: {
            componentId: 'FF2',
            pinId: 'Q',
          },
          to: {
            componentId: 'FF3',
            pinId: 'CLK',
          },
        },
      ],
    },
  },
  {
    id: 'johnson-counter-8bit',
    name: 'Contador em anel de Johnson (8 bits)',
    circuit: {
      version: 1,
      components: [
        {
          id: 'CLK',
          type: 'clock',
          x: 320,
          y: 20,
          label: 'Clock',
          state: false,
        },
        {
          id: 'INV',
          type: 'not',
          x: 40,
          y: 110,
          label: 'Feedback',
        },
        {
          id: 'FF0',
          type: 'd-flip-flop',
          x: 320,
          y: 140,
          label: 'Estágio 0',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'L0',
          type: 'led',
          x: 540,
          y: 151,
          label: 'Q0',
        },
        {
          id: 'FF1',
          type: 'd-flip-flop',
          x: 320,
          y: 240,
          label: 'Estágio 1',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'L1',
          type: 'led',
          x: 540,
          y: 251,
          label: 'Q1',
        },
        {
          id: 'FF2',
          type: 'd-flip-flop',
          x: 320,
          y: 340,
          label: 'Estágio 2',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'L2',
          type: 'led',
          x: 540,
          y: 351,
          label: 'Q2',
        },
        {
          id: 'FF3',
          type: 'd-flip-flop',
          x: 320,
          y: 440,
          label: 'Estágio 3',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'L3',
          type: 'led',
          x: 540,
          y: 451,
          label: 'Q3',
        },
        {
          id: 'FF4',
          type: 'd-flip-flop',
          x: 320,
          y: 540,
          label: 'Estágio 4',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'L4',
          type: 'led',
          x: 540,
          y: 551,
          label: 'Q4',
        },
        {
          id: 'FF5',
          type: 'd-flip-flop',
          x: 320,
          y: 640,
          label: 'Estágio 5',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'L5',
          type: 'led',
          x: 540,
          y: 651,
          label: 'Q5',
        },
        {
          id: 'FF6',
          type: 'd-flip-flop',
          x: 320,
          y: 740,
          label: 'Estágio 6',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'L6',
          type: 'led',
          x: 540,
          y: 751,
          label: 'Q6',
        },
        {
          id: 'FF7',
          type: 'd-flip-flop',
          x: 320,
          y: 840,
          label: 'Estágio 7',
          memory: {
            q: false,
            previousClk: false,
          },
        },
        {
          id: 'L7',
          type: 'led',
          x: 540,
          y: 851,
          label: 'Q7',
        },
        {
          id: 'TXT1',
          type: 'text',
          x: 40,
          y: 960,
          width: 760,
          label:
            'Contador em anel de Johnson (8 bits). Cada Flip-Flop D copia o Q do estágio anterior a cada borda de subida do Clock; o último estágio realimenta o primeiro, invertido. O padrão de bits "1"s crescendo e depois "0"s crescendo caminha pelos LEDs — 16 estados distintos antes de repetir (2×8). Rode o clock automático e observe o efeito de luz correndo, ou use o cursor de tempo na forma de onda para revisitar qualquer instante.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF0',
            pinId: 'CLK',
          },
        },
        {
          id: 'W2',
          from: {
            componentId: 'FF0',
            pinId: 'Q',
          },
          to: {
            componentId: 'L0',
            pinId: 'in',
          },
        },
        {
          id: 'W3',
          from: {
            componentId: 'INV',
            pinId: 'out',
          },
          to: {
            componentId: 'FF0',
            pinId: 'D',
          },
        },
        {
          id: 'W4',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF1',
            pinId: 'CLK',
          },
        },
        {
          id: 'W5',
          from: {
            componentId: 'FF1',
            pinId: 'Q',
          },
          to: {
            componentId: 'L1',
            pinId: 'in',
          },
        },
        {
          id: 'W6',
          from: {
            componentId: 'FF0',
            pinId: 'Q',
          },
          to: {
            componentId: 'FF1',
            pinId: 'D',
          },
        },
        {
          id: 'W7',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF2',
            pinId: 'CLK',
          },
        },
        {
          id: 'W8',
          from: {
            componentId: 'FF2',
            pinId: 'Q',
          },
          to: {
            componentId: 'L2',
            pinId: 'in',
          },
        },
        {
          id: 'W9',
          from: {
            componentId: 'FF1',
            pinId: 'Q',
          },
          to: {
            componentId: 'FF2',
            pinId: 'D',
          },
        },
        {
          id: 'W10',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF3',
            pinId: 'CLK',
          },
        },
        {
          id: 'W11',
          from: {
            componentId: 'FF3',
            pinId: 'Q',
          },
          to: {
            componentId: 'L3',
            pinId: 'in',
          },
        },
        {
          id: 'W12',
          from: {
            componentId: 'FF2',
            pinId: 'Q',
          },
          to: {
            componentId: 'FF3',
            pinId: 'D',
          },
        },
        {
          id: 'W13',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF4',
            pinId: 'CLK',
          },
        },
        {
          id: 'W14',
          from: {
            componentId: 'FF4',
            pinId: 'Q',
          },
          to: {
            componentId: 'L4',
            pinId: 'in',
          },
        },
        {
          id: 'W15',
          from: {
            componentId: 'FF3',
            pinId: 'Q',
          },
          to: {
            componentId: 'FF4',
            pinId: 'D',
          },
        },
        {
          id: 'W16',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF5',
            pinId: 'CLK',
          },
        },
        {
          id: 'W17',
          from: {
            componentId: 'FF5',
            pinId: 'Q',
          },
          to: {
            componentId: 'L5',
            pinId: 'in',
          },
        },
        {
          id: 'W18',
          from: {
            componentId: 'FF4',
            pinId: 'Q',
          },
          to: {
            componentId: 'FF5',
            pinId: 'D',
          },
        },
        {
          id: 'W19',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF6',
            pinId: 'CLK',
          },
        },
        {
          id: 'W20',
          from: {
            componentId: 'FF6',
            pinId: 'Q',
          },
          to: {
            componentId: 'L6',
            pinId: 'in',
          },
        },
        {
          id: 'W21',
          from: {
            componentId: 'FF5',
            pinId: 'Q',
          },
          to: {
            componentId: 'FF6',
            pinId: 'D',
          },
        },
        {
          id: 'W22',
          from: {
            componentId: 'CLK',
            pinId: 'CLK',
          },
          to: {
            componentId: 'FF7',
            pinId: 'CLK',
          },
        },
        {
          id: 'W23',
          from: {
            componentId: 'FF7',
            pinId: 'Q',
          },
          to: {
            componentId: 'L7',
            pinId: 'in',
          },
        },
        {
          id: 'W24',
          from: {
            componentId: 'FF6',
            pinId: 'Q',
          },
          to: {
            componentId: 'FF7',
            pinId: 'D',
          },
        },
        {
          id: 'W25',
          from: {
            componentId: 'FF7',
            pinId: 'Q',
          },
          to: {
            componentId: 'INV',
            pinId: 'in',
          },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 370,
          width: 620,
          label:
            'Latch SR feito com duas portas NOR cruzadas. S=1 seta Q, R=1 reseta Q e S=R=0 mantém o estado anterior. S=R=1 é a condição proibida.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'R', pinId: 'out' },
          to: { componentId: 'GQ', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'S', pinId: 'out' },
          to: { componentId: 'GQB', pinId: 'a' },
        },
        {
          id: 'W3',
          from: { componentId: 'GQ', pinId: 'out' },
          to: { componentId: 'Q', pinId: 'in' },
        },
        {
          id: 'W4',
          from: { componentId: 'GQB', pinId: 'out' },
          to: { componentId: 'QB', pinId: 'in' },
        },
        {
          id: 'W5',
          from: { componentId: 'GQ', pinId: 'out' },
          to: { componentId: 'GQB', pinId: 'b' },
        },
        {
          id: 'W6',
          from: { componentId: 'GQB', pinId: 'out' },
          to: { componentId: 'GQ', pinId: 'b' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 60,
          y: 370,
          width: 720,
          label:
            'Latch SR com NAND ativo em nível baixo. Repouso: S̅=1 e R̅=1. Para SET, coloque S̅=0 e volte para 1. Para RESET, coloque R̅=0 e volte para 1. S̅=R̅=0 é proibido.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'SB', pinId: 'out' },
          to: { componentId: 'GQ', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'RB', pinId: 'out' },
          to: { componentId: 'GQB', pinId: 'a' },
        },
        {
          id: 'W3',
          from: { componentId: 'GQ', pinId: 'out' },
          to: { componentId: 'Q', pinId: 'in' },
        },
        {
          id: 'W4',
          from: { componentId: 'GQB', pinId: 'out' },
          to: { componentId: 'QB', pinId: 'in' },
        },
        {
          id: 'W5',
          from: { componentId: 'GQ', pinId: 'out' },
          to: { componentId: 'GQB', pinId: 'b' },
        },
        {
          id: 'W6',
          from: { componentId: 'GQB', pinId: 'out' },
          to: { componentId: 'GQ', pinId: 'b' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 50,
          y: 430,
          width: 760,
          label:
            'Latch D construído só com portas comuns. Com EN=1, Q acompanha D. Com EN=0, Q mantém o último valor, mesmo se D mudar.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'D', pinId: 'out' },
          to: { componentId: 'ND', pinId: 'in' },
        },
        {
          id: 'W2',
          from: { componentId: 'D', pinId: 'out' },
          to: { componentId: 'GS', pinId: 'a' },
        },
        {
          id: 'W3',
          from: { componentId: 'EN', pinId: 'out' },
          to: { componentId: 'GS', pinId: 'b' },
        },
        {
          id: 'W4',
          from: { componentId: 'ND', pinId: 'out' },
          to: { componentId: 'GR', pinId: 'a' },
        },
        {
          id: 'W5',
          from: { componentId: 'EN', pinId: 'out' },
          to: { componentId: 'GR', pinId: 'b' },
        },
        {
          id: 'W6',
          from: { componentId: 'GS', pinId: 'out' },
          to: { componentId: 'LQ', pinId: 'a' },
        },
        {
          id: 'W7',
          from: { componentId: 'GR', pinId: 'out' },
          to: { componentId: 'LQB', pinId: 'a' },
        },
        {
          id: 'W8',
          from: { componentId: 'LQ', pinId: 'out' },
          to: { componentId: 'Q', pinId: 'in' },
        },
        {
          id: 'W9',
          from: { componentId: 'LQB', pinId: 'out' },
          to: { componentId: 'QB', pinId: 'in' },
        },
        {
          id: 'W10',
          from: { componentId: 'LQ', pinId: 'out' },
          to: { componentId: 'LQB', pinId: 'b' },
        },
        {
          id: 'W11',
          from: { componentId: 'LQB', pinId: 'out' },
          to: { componentId: 'LQ', pinId: 'b' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 80,
          y: 330,
          width: 620,
          label:
            'Meio somador: soma A + B. Leia o resultado como CARRY SUM. Quando A=1 e B=1, a soma é 10 em binário: CARRY=1 e SUM=0.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'X1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'X1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'A1', pinId: 'a' },
        },
        {
          id: 'W4',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'A1', pinId: 'b' },
        },
        {
          id: 'W5',
          from: { componentId: 'X1', pinId: 'out' },
          to: { componentId: 'SUM', pinId: 'in' },
        },
        {
          id: 'W6',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'CARRY', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 410,
          width: 680,
          label:
            'Somador completo: soma A + B + Cin. Cin é o carry que veio da coluna anterior; Cout é o carry enviado para a próxima coluna.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'X1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'X1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'X1', pinId: 'out' },
          to: { componentId: 'X2', pinId: 'a' },
        },
        {
          id: 'W4',
          from: { componentId: 'Cin', pinId: 'out' },
          to: { componentId: 'X2', pinId: 'b' },
        },
        {
          id: 'W5',
          from: { componentId: 'X2', pinId: 'out' },
          to: { componentId: 'SUM', pinId: 'in' },
        },
        {
          id: 'W6',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'A1', pinId: 'a' },
        },
        {
          id: 'W7',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'A1', pinId: 'b' },
        },
        {
          id: 'W8',
          from: { componentId: 'X1', pinId: 'out' },
          to: { componentId: 'A2', pinId: 'a' },
        },
        {
          id: 'W9',
          from: { componentId: 'Cin', pinId: 'out' },
          to: { componentId: 'A2', pinId: 'b' },
        },
        {
          id: 'W10',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'O1', pinId: 'a' },
        },
        {
          id: 'W11',
          from: { componentId: 'A2', pinId: 'out' },
          to: { componentId: 'O1', pinId: 'b' },
        },
        {
          id: 'W12',
          from: { componentId: 'O1', pinId: 'out' },
          to: { componentId: 'Cout', pinId: 'in' },
        },
      ],
    },
  },
  {
    id: 'adder-2-bit',
    name: 'Somador de 2 bits',
    circuit: {
      version: 1,
      components: [
        { id: 'A0', type: 'input', x: 60, y: 70, label: 'A0', state: false },
        { id: 'B0', type: 'input', x: 60, y: 150, label: 'B0', state: false },
        { id: 'A1', type: 'input', x: 60, y: 280, label: 'A1', state: false },
        { id: 'B1', type: 'input', x: 60, y: 360, label: 'B1', state: false },
        { id: 'HA0', type: 'half-adder', x: 300, y: 80, label: 'Bit 0' },
        { id: 'FA1', type: 'full-adder', x: 300, y: 270, label: 'Bit 1' },
        { id: 'S0', type: 'led', x: 560, y: 105, label: 'S0' },
        { id: 'S1', type: 'led', x: 560, y: 283, label: 'S1' },
        { id: 'Cout', type: 'led', x: 560, y: 331, label: 'Cout' },
        {
          id: 'TXT1',
          type: 'text',
          x: 60,
          y: 480,
          width: 760,
          label:
            'Somador de 2 bits: soma A1A0 + B1B0. O carry do bit 0 entra no somador do bit 1. Leia o resultado final como Cout S1 S0.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A0', pinId: 'out' },
          to: { componentId: 'HA0', pinId: 'A' },
        },
        {
          id: 'W2',
          from: { componentId: 'B0', pinId: 'out' },
          to: { componentId: 'HA0', pinId: 'B' },
        },
        {
          id: 'W3',
          from: { componentId: 'HA0', pinId: 'SUM' },
          to: { componentId: 'S0', pinId: 'in' },
        },
        {
          id: 'W4',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'FA1', pinId: 'A' },
        },
        {
          id: 'W5',
          from: { componentId: 'B1', pinId: 'out' },
          to: { componentId: 'FA1', pinId: 'B' },
        },
        {
          id: 'W6',
          from: { componentId: 'HA0', pinId: 'CARRY' },
          to: { componentId: 'FA1', pinId: 'Cin' },
        },
        {
          id: 'W7',
          from: { componentId: 'FA1', pinId: 'SUM' },
          to: { componentId: 'S1', pinId: 'in' },
        },
        {
          id: 'W8',
          from: { componentId: 'FA1', pinId: 'Cout' },
          to: { componentId: 'Cout', pinId: 'in' },
        },
      ],
    },
  },
  {
    id: 'adder-4-bit',
    name: 'Somador de 4 bits',
    circuit: {
      version: 1,
      components: [
        { id: 'A0', type: 'input', x: 60, y: 70, label: 'A0', state: false },
        { id: 'B0', type: 'input', x: 60, y: 150, label: 'B0', state: false },
        { id: 'A1', type: 'input', x: 60, y: 260, label: 'A1', state: false },
        { id: 'B1', type: 'input', x: 60, y: 340, label: 'B1', state: false },
        { id: 'A2', type: 'input', x: 60, y: 450, label: 'A2', state: false },
        { id: 'B2', type: 'input', x: 60, y: 530, label: 'B2', state: false },
        { id: 'A3', type: 'input', x: 60, y: 640, label: 'A3', state: false },
        { id: 'B3', type: 'input', x: 60, y: 720, label: 'B3', state: false },
        { id: 'HA0', type: 'half-adder', x: 320, y: 80, label: 'Bit 0' },
        { id: 'FA1', type: 'full-adder', x: 320, y: 260, label: 'Bit 1' },
        { id: 'FA2', type: 'full-adder', x: 320, y: 450, label: 'Bit 2' },
        { id: 'FA3', type: 'full-adder', x: 320, y: 640, label: 'Bit 3' },
        { id: 'S0', type: 'led', x: 620, y: 79, label: 'S0' },
        { id: 'S1', type: 'led', x: 620, y: 269, label: 'S1' },
        { id: 'S2', type: 'led', x: 620, y: 459, label: 'S2' },
        { id: 'S3', type: 'led', x: 620, y: 649, label: 'S3' },
        { id: 'Cout', type: 'led', x: 620, y: 730, label: 'Cout' },
        {
          id: 'TXT1',
          type: 'text',
          x: 60,
          y: 830,
          width: 780,
          label:
            'Somador de 4 bits (ripple carry): soma A3A2A1A0 + B3B2B1B0. O carry de cada coluna entra no Cin da coluna seguinte. Leia o resultado como Cout S3 S2 S1 S0.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A0', pinId: 'out' },
          to: { componentId: 'HA0', pinId: 'A' },
        },
        {
          id: 'W2',
          from: { componentId: 'B0', pinId: 'out' },
          to: { componentId: 'HA0', pinId: 'B' },
        },
        {
          id: 'W3',
          from: { componentId: 'HA0', pinId: 'SUM' },
          to: { componentId: 'S0', pinId: 'in' },
        },
        {
          id: 'W4',
          from: { componentId: 'HA0', pinId: 'CARRY' },
          to: { componentId: 'FA1', pinId: 'Cin' },
        },
        {
          id: 'W5',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'FA1', pinId: 'A' },
        },
        {
          id: 'W6',
          from: { componentId: 'B1', pinId: 'out' },
          to: { componentId: 'FA1', pinId: 'B' },
        },
        {
          id: 'W7',
          from: { componentId: 'FA1', pinId: 'SUM' },
          to: { componentId: 'S1', pinId: 'in' },
        },
        {
          id: 'W8',
          from: { componentId: 'FA1', pinId: 'Cout' },
          to: { componentId: 'FA2', pinId: 'Cin' },
        },
        {
          id: 'W9',
          from: { componentId: 'A2', pinId: 'out' },
          to: { componentId: 'FA2', pinId: 'A' },
        },
        {
          id: 'W10',
          from: { componentId: 'B2', pinId: 'out' },
          to: { componentId: 'FA2', pinId: 'B' },
        },
        {
          id: 'W11',
          from: { componentId: 'FA2', pinId: 'SUM' },
          to: { componentId: 'S2', pinId: 'in' },
        },
        {
          id: 'W12',
          from: { componentId: 'FA2', pinId: 'Cout' },
          to: { componentId: 'FA3', pinId: 'Cin' },
        },
        {
          id: 'W13',
          from: { componentId: 'A3', pinId: 'out' },
          to: { componentId: 'FA3', pinId: 'A' },
        },
        {
          id: 'W14',
          from: { componentId: 'B3', pinId: 'out' },
          to: { componentId: 'FA3', pinId: 'B' },
        },
        {
          id: 'W15',
          from: { componentId: 'FA3', pinId: 'SUM' },
          to: { componentId: 'S3', pinId: 'in' },
        },
        {
          id: 'W16',
          from: { componentId: 'FA3', pinId: 'Cout' },
          to: { componentId: 'Cout', pinId: 'in' },
        },
      ],
    },
  },
  {
    id: 'subtractor-4-bit',
    name: 'Subtrator de 4 bits (complemento de 2)',
    circuit: {
      version: 1,
      components: [
        { id: 'UM', type: 'input', x: 300, y: 20, label: '+1', state: true },
        { id: 'A0', type: 'input', x: 40, y: 70, label: 'A0', state: false },
        { id: 'B0', type: 'input', x: 40, y: 150, label: 'B0', state: false },
        { id: 'A1', type: 'input', x: 40, y: 260, label: 'A1', state: false },
        { id: 'B1', type: 'input', x: 40, y: 340, label: 'B1', state: false },
        { id: 'A2', type: 'input', x: 40, y: 450, label: 'A2', state: false },
        { id: 'B2', type: 'input', x: 40, y: 530, label: 'B2', state: false },
        { id: 'A3', type: 'input', x: 40, y: 640, label: 'A3', state: false },
        { id: 'B3', type: 'input', x: 40, y: 720, label: 'B3', state: false },
        { id: 'N0', type: 'not', x: 260, y: 150, label: '!B0' },
        { id: 'N1', type: 'not', x: 260, y: 340, label: '!B1' },
        { id: 'N2', type: 'not', x: 260, y: 530, label: '!B2' },
        { id: 'N3', type: 'not', x: 260, y: 720, label: '!B3' },
        { id: 'FA0', type: 'full-adder', x: 520, y: 80, label: 'Bit 0' },
        { id: 'FA1', type: 'full-adder', x: 520, y: 270, label: 'Bit 1' },
        { id: 'FA2', type: 'full-adder', x: 520, y: 460, label: 'Bit 2' },
        { id: 'FA3', type: 'full-adder', x: 520, y: 650, label: 'Bit 3' },
        { id: 'D0', type: 'led', x: 800, y: 89, label: 'D0' },
        { id: 'D1', type: 'led', x: 800, y: 279, label: 'D1' },
        { id: 'D2', type: 'led', x: 800, y: 469, label: 'D2' },
        { id: 'D3', type: 'led', x: 800, y: 659, label: 'D3' },
        { id: 'Cout', type: 'led', x: 800, y: 740, label: 'Cout' },
        {
          id: 'TXT1',
          type: 'text',
          x: 40,
          y: 830,
          width: 880,
          label:
            'Subtrator de 4 bits por complemento de 2: A − B = A + !B + 1. As portas NOT invertem os bits de B e a entrada +1 (mantenha ligada) soma o 1 do complemento. Leia o resultado em D3 D2 D1 D0. Cout=1 indica A ≥ B; Cout=0 indica resultado negativo em complemento de 2.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'UM', pinId: 'out' },
          to: { componentId: 'FA0', pinId: 'Cin' },
        },
        {
          id: 'W2',
          from: { componentId: 'A0', pinId: 'out' },
          to: { componentId: 'FA0', pinId: 'A' },
        },
        {
          id: 'W3',
          from: { componentId: 'B0', pinId: 'out' },
          to: { componentId: 'N0', pinId: 'in' },
        },
        {
          id: 'W4',
          from: { componentId: 'N0', pinId: 'out' },
          to: { componentId: 'FA0', pinId: 'B' },
        },
        {
          id: 'W5',
          from: { componentId: 'FA0', pinId: 'SUM' },
          to: { componentId: 'D0', pinId: 'in' },
        },
        {
          id: 'W6',
          from: { componentId: 'FA0', pinId: 'Cout' },
          to: { componentId: 'FA1', pinId: 'Cin' },
        },
        {
          id: 'W7',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'FA1', pinId: 'A' },
        },
        {
          id: 'W8',
          from: { componentId: 'B1', pinId: 'out' },
          to: { componentId: 'N1', pinId: 'in' },
        },
        {
          id: 'W9',
          from: { componentId: 'N1', pinId: 'out' },
          to: { componentId: 'FA1', pinId: 'B' },
        },
        {
          id: 'W10',
          from: { componentId: 'FA1', pinId: 'SUM' },
          to: { componentId: 'D1', pinId: 'in' },
        },
        {
          id: 'W11',
          from: { componentId: 'FA1', pinId: 'Cout' },
          to: { componentId: 'FA2', pinId: 'Cin' },
        },
        {
          id: 'W12',
          from: { componentId: 'A2', pinId: 'out' },
          to: { componentId: 'FA2', pinId: 'A' },
        },
        {
          id: 'W13',
          from: { componentId: 'B2', pinId: 'out' },
          to: { componentId: 'N2', pinId: 'in' },
        },
        {
          id: 'W14',
          from: { componentId: 'N2', pinId: 'out' },
          to: { componentId: 'FA2', pinId: 'B' },
        },
        {
          id: 'W15',
          from: { componentId: 'FA2', pinId: 'SUM' },
          to: { componentId: 'D2', pinId: 'in' },
        },
        {
          id: 'W16',
          from: { componentId: 'FA2', pinId: 'Cout' },
          to: { componentId: 'FA3', pinId: 'Cin' },
        },
        {
          id: 'W17',
          from: { componentId: 'A3', pinId: 'out' },
          to: { componentId: 'FA3', pinId: 'A' },
        },
        {
          id: 'W18',
          from: { componentId: 'B3', pinId: 'out' },
          to: { componentId: 'N3', pinId: 'in' },
        },
        {
          id: 'W19',
          from: { componentId: 'N3', pinId: 'out' },
          to: { componentId: 'FA3', pinId: 'B' },
        },
        {
          id: 'W20',
          from: { componentId: 'FA3', pinId: 'SUM' },
          to: { componentId: 'D3', pinId: 'in' },
        },
        {
          id: 'W21',
          from: { componentId: 'FA3', pinId: 'Cout' },
          to: { componentId: 'Cout', pinId: 'in' },
        },
      ],
    },
  },
  {
    id: 'adder-4-bit-gates',
    name: 'Somador de 4 bits (portas lógicas)',
    circuit: {
      version: 1,
      components: [
        { id: 'A0', type: 'input', x: 40, y: 40, label: 'A0', state: false },
        { id: 'B0', type: 'input', x: 40, y: 120, label: 'B0', state: false },
        { id: 'XS0', type: 'xor', x: 240, y: 60, label: 'S0=A0⊕B0' },
        { id: 'AC0', type: 'and', x: 240, y: 150, label: 'C0=A0·B0' },
        { id: 'S0', type: 'led', x: 800, y: 69, label: 'S0' },
        { id: 'A1', type: 'input', x: 40, y: 280, label: 'A1', state: false },
        { id: 'B1', type: 'input', x: 40, y: 360, label: 'B1', state: false },
        { id: 'XP1', type: 'xor', x: 240, y: 300, label: 'A1⊕B1' },
        { id: 'AP1', type: 'and', x: 240, y: 390, label: 'A1·B1' },
        { id: 'XS1', type: 'xor', x: 440, y: 310, label: 'S1' },
        { id: 'AC1', type: 'and', x: 440, y: 400, label: 'C0·(A1⊕B1)' },
        { id: 'OC1', type: 'or', x: 620, y: 390, label: 'C1' },
        { id: 'S1', type: 'led', x: 800, y: 319, label: 'S1' },
        { id: 'A2', type: 'input', x: 40, y: 520, label: 'A2', state: false },
        { id: 'B2', type: 'input', x: 40, y: 600, label: 'B2', state: false },
        { id: 'XP2', type: 'xor', x: 240, y: 540, label: 'A2⊕B2' },
        { id: 'AP2', type: 'and', x: 240, y: 630, label: 'A2·B2' },
        { id: 'XS2', type: 'xor', x: 440, y: 550, label: 'S2' },
        { id: 'AC2', type: 'and', x: 440, y: 640, label: 'C1·(A2⊕B2)' },
        { id: 'OC2', type: 'or', x: 620, y: 630, label: 'C2' },
        { id: 'S2', type: 'led', x: 800, y: 559, label: 'S2' },
        { id: 'A3', type: 'input', x: 40, y: 760, label: 'A3', state: false },
        { id: 'B3', type: 'input', x: 40, y: 840, label: 'B3', state: false },
        { id: 'XP3', type: 'xor', x: 240, y: 780, label: 'A3⊕B3' },
        { id: 'AP3', type: 'and', x: 240, y: 870, label: 'A3·B3' },
        { id: 'XS3', type: 'xor', x: 440, y: 790, label: 'S3' },
        { id: 'AC3', type: 'and', x: 440, y: 880, label: 'C2·(A3⊕B3)' },
        { id: 'OC3', type: 'or', x: 620, y: 870, label: 'Cout' },
        { id: 'S3', type: 'led', x: 800, y: 799, label: 'S3' },
        { id: 'Cout', type: 'led', x: 800, y: 879, label: 'Cout' },
        {
          id: 'TXT1',
          type: 'text',
          x: 40,
          y: 980,
          width: 840,
          label:
            'Somador de 4 bits construído só com portas primitivas. O bit 0 é um meio somador (XOR + AND). Cada bit seguinte é um somador completo expandido: SUM = (A⊕B)⊕Cin e Cout = A·B + Cin·(A⊕B). O carry de cada coluna alimenta a próxima. Leia o resultado como Cout S3 S2 S1 S0.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A0', pinId: 'out' },
          to: { componentId: 'XS0', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B0', pinId: 'out' },
          to: { componentId: 'XS0', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'A0', pinId: 'out' },
          to: { componentId: 'AC0', pinId: 'a' },
        },
        {
          id: 'W4',
          from: { componentId: 'B0', pinId: 'out' },
          to: { componentId: 'AC0', pinId: 'b' },
        },
        {
          id: 'W5',
          from: { componentId: 'XS0', pinId: 'out' },
          to: { componentId: 'S0', pinId: 'in' },
        },
        {
          id: 'W6',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'XP1', pinId: 'a' },
        },
        {
          id: 'W7',
          from: { componentId: 'B1', pinId: 'out' },
          to: { componentId: 'XP1', pinId: 'b' },
        },
        {
          id: 'W8',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'AP1', pinId: 'a' },
        },
        {
          id: 'W9',
          from: { componentId: 'B1', pinId: 'out' },
          to: { componentId: 'AP1', pinId: 'b' },
        },
        {
          id: 'W10',
          from: { componentId: 'XP1', pinId: 'out' },
          to: { componentId: 'XS1', pinId: 'a' },
        },
        {
          id: 'W11',
          from: { componentId: 'AC0', pinId: 'out' },
          to: { componentId: 'XS1', pinId: 'b' },
        },
        {
          id: 'W12',
          from: { componentId: 'XP1', pinId: 'out' },
          to: { componentId: 'AC1', pinId: 'a' },
        },
        {
          id: 'W13',
          from: { componentId: 'AC0', pinId: 'out' },
          to: { componentId: 'AC1', pinId: 'b' },
        },
        {
          id: 'W14',
          from: { componentId: 'AP1', pinId: 'out' },
          to: { componentId: 'OC1', pinId: 'a' },
        },
        {
          id: 'W15',
          from: { componentId: 'AC1', pinId: 'out' },
          to: { componentId: 'OC1', pinId: 'b' },
        },
        {
          id: 'W16',
          from: { componentId: 'XS1', pinId: 'out' },
          to: { componentId: 'S1', pinId: 'in' },
        },
        {
          id: 'W17',
          from: { componentId: 'A2', pinId: 'out' },
          to: { componentId: 'XP2', pinId: 'a' },
        },
        {
          id: 'W18',
          from: { componentId: 'B2', pinId: 'out' },
          to: { componentId: 'XP2', pinId: 'b' },
        },
        {
          id: 'W19',
          from: { componentId: 'A2', pinId: 'out' },
          to: { componentId: 'AP2', pinId: 'a' },
        },
        {
          id: 'W20',
          from: { componentId: 'B2', pinId: 'out' },
          to: { componentId: 'AP2', pinId: 'b' },
        },
        {
          id: 'W21',
          from: { componentId: 'XP2', pinId: 'out' },
          to: { componentId: 'XS2', pinId: 'a' },
        },
        {
          id: 'W22',
          from: { componentId: 'OC1', pinId: 'out' },
          to: { componentId: 'XS2', pinId: 'b' },
        },
        {
          id: 'W23',
          from: { componentId: 'XP2', pinId: 'out' },
          to: { componentId: 'AC2', pinId: 'a' },
        },
        {
          id: 'W24',
          from: { componentId: 'OC1', pinId: 'out' },
          to: { componentId: 'AC2', pinId: 'b' },
        },
        {
          id: 'W25',
          from: { componentId: 'AP2', pinId: 'out' },
          to: { componentId: 'OC2', pinId: 'a' },
        },
        {
          id: 'W26',
          from: { componentId: 'AC2', pinId: 'out' },
          to: { componentId: 'OC2', pinId: 'b' },
        },
        {
          id: 'W27',
          from: { componentId: 'XS2', pinId: 'out' },
          to: { componentId: 'S2', pinId: 'in' },
        },
        {
          id: 'W28',
          from: { componentId: 'A3', pinId: 'out' },
          to: { componentId: 'XP3', pinId: 'a' },
        },
        {
          id: 'W29',
          from: { componentId: 'B3', pinId: 'out' },
          to: { componentId: 'XP3', pinId: 'b' },
        },
        {
          id: 'W30',
          from: { componentId: 'A3', pinId: 'out' },
          to: { componentId: 'AP3', pinId: 'a' },
        },
        {
          id: 'W31',
          from: { componentId: 'B3', pinId: 'out' },
          to: { componentId: 'AP3', pinId: 'b' },
        },
        {
          id: 'W32',
          from: { componentId: 'XP3', pinId: 'out' },
          to: { componentId: 'XS3', pinId: 'a' },
        },
        {
          id: 'W33',
          from: { componentId: 'OC2', pinId: 'out' },
          to: { componentId: 'XS3', pinId: 'b' },
        },
        {
          id: 'W34',
          from: { componentId: 'XP3', pinId: 'out' },
          to: { componentId: 'AC3', pinId: 'a' },
        },
        {
          id: 'W35',
          from: { componentId: 'OC2', pinId: 'out' },
          to: { componentId: 'AC3', pinId: 'b' },
        },
        {
          id: 'W36',
          from: { componentId: 'AP3', pinId: 'out' },
          to: { componentId: 'OC3', pinId: 'a' },
        },
        {
          id: 'W37',
          from: { componentId: 'AC3', pinId: 'out' },
          to: { componentId: 'OC3', pinId: 'b' },
        },
        {
          id: 'W38',
          from: { componentId: 'XS3', pinId: 'out' },
          to: { componentId: 'S3', pinId: 'in' },
        },
        {
          id: 'W39',
          from: { componentId: 'OC3', pinId: 'out' },
          to: { componentId: 'Cout', pinId: 'in' },
        },
      ],
    },
  },
  {
    id: 'subtractor-4-bit-gates',
    name: 'Subtrator de 4 bits (portas lógicas)',
    circuit: {
      version: 1,
      components: [
        { id: 'UM', type: 'input', x: 200, y: 0, label: '+1', state: true },
        { id: 'A0', type: 'input', x: 40, y: 60, label: 'A0', state: false },
        { id: 'B0', type: 'input', x: 40, y: 140, label: 'B0', state: false },
        { id: 'N0', type: 'not', x: 200, y: 138, label: '!B0' },
        { id: 'XP0', type: 'xor', x: 360, y: 80, label: 'A0⊕!B0' },
        { id: 'AP0', type: 'and', x: 360, y: 170, label: 'A0·!B0' },
        { id: 'XS0', type: 'xor', x: 560, y: 90, label: 'D0' },
        { id: 'AC0', type: 'and', x: 560, y: 180, label: 'carry' },
        { id: 'OC0', type: 'or', x: 740, y: 170, label: 'C0' },
        { id: 'D0', type: 'led', x: 920, y: 99, label: 'D0' },
        { id: 'A1', type: 'input', x: 40, y: 300, label: 'A1', state: false },
        { id: 'B1', type: 'input', x: 40, y: 380, label: 'B1', state: false },
        { id: 'N1', type: 'not', x: 200, y: 378, label: '!B1' },
        { id: 'XP1', type: 'xor', x: 360, y: 320, label: 'A1⊕!B1' },
        { id: 'AP1', type: 'and', x: 360, y: 410, label: 'A1·!B1' },
        { id: 'XS1', type: 'xor', x: 560, y: 330, label: 'D1' },
        { id: 'AC1', type: 'and', x: 560, y: 420, label: 'carry' },
        { id: 'OC1', type: 'or', x: 740, y: 410, label: 'C1' },
        { id: 'D1', type: 'led', x: 920, y: 339, label: 'D1' },
        { id: 'A2', type: 'input', x: 40, y: 540, label: 'A2', state: false },
        { id: 'B2', type: 'input', x: 40, y: 620, label: 'B2', state: false },
        { id: 'N2', type: 'not', x: 200, y: 618, label: '!B2' },
        { id: 'XP2', type: 'xor', x: 360, y: 560, label: 'A2⊕!B2' },
        { id: 'AP2', type: 'and', x: 360, y: 650, label: 'A2·!B2' },
        { id: 'XS2', type: 'xor', x: 560, y: 570, label: 'D2' },
        { id: 'AC2', type: 'and', x: 560, y: 660, label: 'carry' },
        { id: 'OC2', type: 'or', x: 740, y: 650, label: 'C2' },
        { id: 'D2', type: 'led', x: 920, y: 579, label: 'D2' },
        { id: 'A3', type: 'input', x: 40, y: 780, label: 'A3', state: false },
        { id: 'B3', type: 'input', x: 40, y: 860, label: 'B3', state: false },
        { id: 'N3', type: 'not', x: 200, y: 858, label: '!B3' },
        { id: 'XP3', type: 'xor', x: 360, y: 800, label: 'A3⊕!B3' },
        { id: 'AP3', type: 'and', x: 360, y: 890, label: 'A3·!B3' },
        { id: 'XS3', type: 'xor', x: 560, y: 810, label: 'D3' },
        { id: 'AC3', type: 'and', x: 560, y: 900, label: 'carry' },
        { id: 'OC3', type: 'or', x: 740, y: 890, label: 'Cout' },
        { id: 'D3', type: 'led', x: 920, y: 819, label: 'D3' },
        { id: 'Cout', type: 'led', x: 920, y: 899, label: 'Cout' },
        {
          id: 'TXT1',
          type: 'text',
          x: 40,
          y: 1000,
          width: 920,
          label:
            'Subtrator de 4 bits por complemento de 2, só com portas primitivas: A − B = A + !B + 1. As portas NOT invertem os bits de B, a entrada +1 (mantenha ligada) entra como carry do bit 0 e cada coluna é um somador completo expandido em XOR, AND e OR. Leia o resultado em D3 D2 D1 D0. Cout=1 indica A ≥ B; Cout=0 indica resultado negativo em complemento de 2.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A0', pinId: 'out' },
          to: { componentId: 'XP0', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B0', pinId: 'out' },
          to: { componentId: 'N0', pinId: 'in' },
        },
        {
          id: 'W3',
          from: { componentId: 'N0', pinId: 'out' },
          to: { componentId: 'XP0', pinId: 'b' },
        },
        {
          id: 'W4',
          from: { componentId: 'A0', pinId: 'out' },
          to: { componentId: 'AP0', pinId: 'a' },
        },
        {
          id: 'W5',
          from: { componentId: 'N0', pinId: 'out' },
          to: { componentId: 'AP0', pinId: 'b' },
        },
        {
          id: 'W6',
          from: { componentId: 'XP0', pinId: 'out' },
          to: { componentId: 'XS0', pinId: 'a' },
        },
        {
          id: 'W7',
          from: { componentId: 'UM', pinId: 'out' },
          to: { componentId: 'XS0', pinId: 'b' },
        },
        {
          id: 'W8',
          from: { componentId: 'XP0', pinId: 'out' },
          to: { componentId: 'AC0', pinId: 'a' },
        },
        {
          id: 'W9',
          from: { componentId: 'UM', pinId: 'out' },
          to: { componentId: 'AC0', pinId: 'b' },
        },
        {
          id: 'W10',
          from: { componentId: 'AP0', pinId: 'out' },
          to: { componentId: 'OC0', pinId: 'a' },
        },
        {
          id: 'W11',
          from: { componentId: 'AC0', pinId: 'out' },
          to: { componentId: 'OC0', pinId: 'b' },
        },
        {
          id: 'W12',
          from: { componentId: 'XS0', pinId: 'out' },
          to: { componentId: 'D0', pinId: 'in' },
        },
        {
          id: 'W13',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'XP1', pinId: 'a' },
        },
        {
          id: 'W14',
          from: { componentId: 'B1', pinId: 'out' },
          to: { componentId: 'N1', pinId: 'in' },
        },
        {
          id: 'W15',
          from: { componentId: 'N1', pinId: 'out' },
          to: { componentId: 'XP1', pinId: 'b' },
        },
        {
          id: 'W16',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'AP1', pinId: 'a' },
        },
        {
          id: 'W17',
          from: { componentId: 'N1', pinId: 'out' },
          to: { componentId: 'AP1', pinId: 'b' },
        },
        {
          id: 'W18',
          from: { componentId: 'XP1', pinId: 'out' },
          to: { componentId: 'XS1', pinId: 'a' },
        },
        {
          id: 'W19',
          from: { componentId: 'OC0', pinId: 'out' },
          to: { componentId: 'XS1', pinId: 'b' },
        },
        {
          id: 'W20',
          from: { componentId: 'XP1', pinId: 'out' },
          to: { componentId: 'AC1', pinId: 'a' },
        },
        {
          id: 'W21',
          from: { componentId: 'OC0', pinId: 'out' },
          to: { componentId: 'AC1', pinId: 'b' },
        },
        {
          id: 'W22',
          from: { componentId: 'AP1', pinId: 'out' },
          to: { componentId: 'OC1', pinId: 'a' },
        },
        {
          id: 'W23',
          from: { componentId: 'AC1', pinId: 'out' },
          to: { componentId: 'OC1', pinId: 'b' },
        },
        {
          id: 'W24',
          from: { componentId: 'XS1', pinId: 'out' },
          to: { componentId: 'D1', pinId: 'in' },
        },
        {
          id: 'W25',
          from: { componentId: 'A2', pinId: 'out' },
          to: { componentId: 'XP2', pinId: 'a' },
        },
        {
          id: 'W26',
          from: { componentId: 'B2', pinId: 'out' },
          to: { componentId: 'N2', pinId: 'in' },
        },
        {
          id: 'W27',
          from: { componentId: 'N2', pinId: 'out' },
          to: { componentId: 'XP2', pinId: 'b' },
        },
        {
          id: 'W28',
          from: { componentId: 'A2', pinId: 'out' },
          to: { componentId: 'AP2', pinId: 'a' },
        },
        {
          id: 'W29',
          from: { componentId: 'N2', pinId: 'out' },
          to: { componentId: 'AP2', pinId: 'b' },
        },
        {
          id: 'W30',
          from: { componentId: 'XP2', pinId: 'out' },
          to: { componentId: 'XS2', pinId: 'a' },
        },
        {
          id: 'W31',
          from: { componentId: 'OC1', pinId: 'out' },
          to: { componentId: 'XS2', pinId: 'b' },
        },
        {
          id: 'W32',
          from: { componentId: 'XP2', pinId: 'out' },
          to: { componentId: 'AC2', pinId: 'a' },
        },
        {
          id: 'W33',
          from: { componentId: 'OC1', pinId: 'out' },
          to: { componentId: 'AC2', pinId: 'b' },
        },
        {
          id: 'W34',
          from: { componentId: 'AP2', pinId: 'out' },
          to: { componentId: 'OC2', pinId: 'a' },
        },
        {
          id: 'W35',
          from: { componentId: 'AC2', pinId: 'out' },
          to: { componentId: 'OC2', pinId: 'b' },
        },
        {
          id: 'W36',
          from: { componentId: 'XS2', pinId: 'out' },
          to: { componentId: 'D2', pinId: 'in' },
        },
        {
          id: 'W37',
          from: { componentId: 'A3', pinId: 'out' },
          to: { componentId: 'XP3', pinId: 'a' },
        },
        {
          id: 'W38',
          from: { componentId: 'B3', pinId: 'out' },
          to: { componentId: 'N3', pinId: 'in' },
        },
        {
          id: 'W39',
          from: { componentId: 'N3', pinId: 'out' },
          to: { componentId: 'XP3', pinId: 'b' },
        },
        {
          id: 'W40',
          from: { componentId: 'A3', pinId: 'out' },
          to: { componentId: 'AP3', pinId: 'a' },
        },
        {
          id: 'W41',
          from: { componentId: 'N3', pinId: 'out' },
          to: { componentId: 'AP3', pinId: 'b' },
        },
        {
          id: 'W42',
          from: { componentId: 'XP3', pinId: 'out' },
          to: { componentId: 'XS3', pinId: 'a' },
        },
        {
          id: 'W43',
          from: { componentId: 'OC2', pinId: 'out' },
          to: { componentId: 'XS3', pinId: 'b' },
        },
        {
          id: 'W44',
          from: { componentId: 'XP3', pinId: 'out' },
          to: { componentId: 'AC3', pinId: 'a' },
        },
        {
          id: 'W45',
          from: { componentId: 'OC2', pinId: 'out' },
          to: { componentId: 'AC3', pinId: 'b' },
        },
        {
          id: 'W46',
          from: { componentId: 'AP3', pinId: 'out' },
          to: { componentId: 'OC3', pinId: 'a' },
        },
        {
          id: 'W47',
          from: { componentId: 'AC3', pinId: 'out' },
          to: { componentId: 'OC3', pinId: 'b' },
        },
        {
          id: 'W48',
          from: { componentId: 'XS3', pinId: 'out' },
          to: { componentId: 'D3', pinId: 'in' },
        },
        {
          id: 'W49',
          from: { componentId: 'OC3', pinId: 'out' },
          to: { componentId: 'Cout', pinId: 'in' },
        },
      ],
    },
  },
  {
    id: 'alu-4-bit',
    name: 'ULA de 4 bits',
    circuit: {
      version: 1,
      components: [
        { id: 'OP0', type: 'input', x: 60, y: 0, label: 'Op0', state: false },
        { id: 'OP1', type: 'input', x: 240, y: 0, label: 'Op1', state: false },
        { id: 'A0', type: 'input', x: 40, y: 80, label: 'A0', state: false },
        { id: 'B0', type: 'input', x: 40, y: 160, label: 'B0', state: false },
        { id: 'XB0', type: 'xor', x: 220, y: 80, label: 'B0⊕Op0' },
        { id: 'AN0', type: 'and', x: 220, y: 170, label: 'A0·B0' },
        { id: 'OR0', type: 'or', x: 220, y: 260, label: 'A0 ou B0' },
        { id: 'FA0', type: 'full-adder', x: 420, y: 100, label: 'Bit 0' },
        { id: 'MX0', type: 'mux-4-1', x: 650, y: 90, label: 'R0' },
        { id: 'R0', type: 'led', x: 880, y: 147, label: 'R0' },
        { id: 'A1', type: 'input', x: 40, y: 360, label: 'A1', state: false },
        { id: 'B1', type: 'input', x: 40, y: 440, label: 'B1', state: false },
        { id: 'XB1', type: 'xor', x: 220, y: 360, label: 'B1⊕Op0' },
        { id: 'AN1', type: 'and', x: 220, y: 450, label: 'A1·B1' },
        { id: 'OR1', type: 'or', x: 220, y: 540, label: 'A1 ou B1' },
        { id: 'FA1', type: 'full-adder', x: 420, y: 380, label: 'Bit 1' },
        { id: 'MX1', type: 'mux-4-1', x: 650, y: 370, label: 'R1' },
        { id: 'R1', type: 'led', x: 880, y: 427, label: 'R1' },
        { id: 'A2', type: 'input', x: 40, y: 640, label: 'A2', state: false },
        { id: 'B2', type: 'input', x: 40, y: 720, label: 'B2', state: false },
        { id: 'XB2', type: 'xor', x: 220, y: 640, label: 'B2⊕Op0' },
        { id: 'AN2', type: 'and', x: 220, y: 730, label: 'A2·B2' },
        { id: 'OR2', type: 'or', x: 220, y: 820, label: 'A2 ou B2' },
        { id: 'FA2', type: 'full-adder', x: 420, y: 660, label: 'Bit 2' },
        { id: 'MX2', type: 'mux-4-1', x: 650, y: 650, label: 'R2' },
        { id: 'R2', type: 'led', x: 880, y: 707, label: 'R2' },
        { id: 'A3', type: 'input', x: 40, y: 920, label: 'A3', state: false },
        { id: 'B3', type: 'input', x: 40, y: 1000, label: 'B3', state: false },
        { id: 'XB3', type: 'xor', x: 220, y: 920, label: 'B3⊕Op0' },
        { id: 'AN3', type: 'and', x: 220, y: 1010, label: 'A3·B3' },
        { id: 'OR3', type: 'or', x: 220, y: 1100, label: 'A3 ou B3' },
        { id: 'FA3', type: 'full-adder', x: 420, y: 940, label: 'Bit 3' },
        { id: 'MX3', type: 'mux-4-1', x: 650, y: 930, label: 'R3' },
        { id: 'R3', type: 'led', x: 880, y: 987, label: 'R3' },
        { id: 'Cout', type: 'led', x: 880, y: 1060, label: 'Cout' },
        {
          id: 'TXT1',
          type: 'text',
          x: 40,
          y: 1200,
          width: 920,
          label:
            'ULA de 4 bits com 4 operações, escolhidas por Op1 Op0: 00 = A + B, 01 = A − B (complemento de 2), 10 = A AND B, 11 = A OR B. Op0 também controla o modo do somador: quando ligado, inverte B pelos XOR e entra como carry inicial, fazendo A + !B + 1. O MUX 4:1 de cada bit seleciona qual resultado vai para o LED R. Cout só tem significado na soma (estouro) e na subtração (1 indica A ≥ B).',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'OP0', pinId: 'out' },
          to: { componentId: 'FA0', pinId: 'Cin' },
        },
        {
          id: 'W2',
          from: { componentId: 'B0', pinId: 'out' },
          to: { componentId: 'XB0', pinId: 'a' },
        },
        {
          id: 'W3',
          from: { componentId: 'OP0', pinId: 'out' },
          to: { componentId: 'XB0', pinId: 'b' },
        },
        {
          id: 'W4',
          from: { componentId: 'A0', pinId: 'out' },
          to: { componentId: 'FA0', pinId: 'A' },
        },
        {
          id: 'W5',
          from: { componentId: 'XB0', pinId: 'out' },
          to: { componentId: 'FA0', pinId: 'B' },
        },
        {
          id: 'W6',
          from: { componentId: 'A0', pinId: 'out' },
          to: { componentId: 'AN0', pinId: 'a' },
        },
        {
          id: 'W7',
          from: { componentId: 'B0', pinId: 'out' },
          to: { componentId: 'AN0', pinId: 'b' },
        },
        {
          id: 'W8',
          from: { componentId: 'A0', pinId: 'out' },
          to: { componentId: 'OR0', pinId: 'a' },
        },
        {
          id: 'W9',
          from: { componentId: 'B0', pinId: 'out' },
          to: { componentId: 'OR0', pinId: 'b' },
        },
        {
          id: 'W10',
          from: { componentId: 'FA0', pinId: 'SUM' },
          to: { componentId: 'MX0', pinId: 'D0' },
        },
        {
          id: 'W11',
          from: { componentId: 'FA0', pinId: 'SUM' },
          to: { componentId: 'MX0', pinId: 'D1' },
        },
        {
          id: 'W12',
          from: { componentId: 'AN0', pinId: 'out' },
          to: { componentId: 'MX0', pinId: 'D2' },
        },
        {
          id: 'W13',
          from: { componentId: 'OR0', pinId: 'out' },
          to: { componentId: 'MX0', pinId: 'D3' },
        },
        {
          id: 'W14',
          from: { componentId: 'OP0', pinId: 'out' },
          to: { componentId: 'MX0', pinId: 'S0' },
        },
        {
          id: 'W15',
          from: { componentId: 'OP1', pinId: 'out' },
          to: { componentId: 'MX0', pinId: 'S1' },
        },
        {
          id: 'W16',
          from: { componentId: 'MX0', pinId: 'OUT' },
          to: { componentId: 'R0', pinId: 'in' },
        },
        {
          id: 'W17',
          from: { componentId: 'FA0', pinId: 'Cout' },
          to: { componentId: 'FA1', pinId: 'Cin' },
        },
        {
          id: 'W18',
          from: { componentId: 'B1', pinId: 'out' },
          to: { componentId: 'XB1', pinId: 'a' },
        },
        {
          id: 'W19',
          from: { componentId: 'OP0', pinId: 'out' },
          to: { componentId: 'XB1', pinId: 'b' },
        },
        {
          id: 'W20',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'FA1', pinId: 'A' },
        },
        {
          id: 'W21',
          from: { componentId: 'XB1', pinId: 'out' },
          to: { componentId: 'FA1', pinId: 'B' },
        },
        {
          id: 'W22',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'AN1', pinId: 'a' },
        },
        {
          id: 'W23',
          from: { componentId: 'B1', pinId: 'out' },
          to: { componentId: 'AN1', pinId: 'b' },
        },
        {
          id: 'W24',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'OR1', pinId: 'a' },
        },
        {
          id: 'W25',
          from: { componentId: 'B1', pinId: 'out' },
          to: { componentId: 'OR1', pinId: 'b' },
        },
        {
          id: 'W26',
          from: { componentId: 'FA1', pinId: 'SUM' },
          to: { componentId: 'MX1', pinId: 'D0' },
        },
        {
          id: 'W27',
          from: { componentId: 'FA1', pinId: 'SUM' },
          to: { componentId: 'MX1', pinId: 'D1' },
        },
        {
          id: 'W28',
          from: { componentId: 'AN1', pinId: 'out' },
          to: { componentId: 'MX1', pinId: 'D2' },
        },
        {
          id: 'W29',
          from: { componentId: 'OR1', pinId: 'out' },
          to: { componentId: 'MX1', pinId: 'D3' },
        },
        {
          id: 'W30',
          from: { componentId: 'OP0', pinId: 'out' },
          to: { componentId: 'MX1', pinId: 'S0' },
        },
        {
          id: 'W31',
          from: { componentId: 'OP1', pinId: 'out' },
          to: { componentId: 'MX1', pinId: 'S1' },
        },
        {
          id: 'W32',
          from: { componentId: 'MX1', pinId: 'OUT' },
          to: { componentId: 'R1', pinId: 'in' },
        },
        {
          id: 'W33',
          from: { componentId: 'FA1', pinId: 'Cout' },
          to: { componentId: 'FA2', pinId: 'Cin' },
        },
        {
          id: 'W34',
          from: { componentId: 'B2', pinId: 'out' },
          to: { componentId: 'XB2', pinId: 'a' },
        },
        {
          id: 'W35',
          from: { componentId: 'OP0', pinId: 'out' },
          to: { componentId: 'XB2', pinId: 'b' },
        },
        {
          id: 'W36',
          from: { componentId: 'A2', pinId: 'out' },
          to: { componentId: 'FA2', pinId: 'A' },
        },
        {
          id: 'W37',
          from: { componentId: 'XB2', pinId: 'out' },
          to: { componentId: 'FA2', pinId: 'B' },
        },
        {
          id: 'W38',
          from: { componentId: 'A2', pinId: 'out' },
          to: { componentId: 'AN2', pinId: 'a' },
        },
        {
          id: 'W39',
          from: { componentId: 'B2', pinId: 'out' },
          to: { componentId: 'AN2', pinId: 'b' },
        },
        {
          id: 'W40',
          from: { componentId: 'A2', pinId: 'out' },
          to: { componentId: 'OR2', pinId: 'a' },
        },
        {
          id: 'W41',
          from: { componentId: 'B2', pinId: 'out' },
          to: { componentId: 'OR2', pinId: 'b' },
        },
        {
          id: 'W42',
          from: { componentId: 'FA2', pinId: 'SUM' },
          to: { componentId: 'MX2', pinId: 'D0' },
        },
        {
          id: 'W43',
          from: { componentId: 'FA2', pinId: 'SUM' },
          to: { componentId: 'MX2', pinId: 'D1' },
        },
        {
          id: 'W44',
          from: { componentId: 'AN2', pinId: 'out' },
          to: { componentId: 'MX2', pinId: 'D2' },
        },
        {
          id: 'W45',
          from: { componentId: 'OR2', pinId: 'out' },
          to: { componentId: 'MX2', pinId: 'D3' },
        },
        {
          id: 'W46',
          from: { componentId: 'OP0', pinId: 'out' },
          to: { componentId: 'MX2', pinId: 'S0' },
        },
        {
          id: 'W47',
          from: { componentId: 'OP1', pinId: 'out' },
          to: { componentId: 'MX2', pinId: 'S1' },
        },
        {
          id: 'W48',
          from: { componentId: 'MX2', pinId: 'OUT' },
          to: { componentId: 'R2', pinId: 'in' },
        },
        {
          id: 'W49',
          from: { componentId: 'FA2', pinId: 'Cout' },
          to: { componentId: 'FA3', pinId: 'Cin' },
        },
        {
          id: 'W50',
          from: { componentId: 'B3', pinId: 'out' },
          to: { componentId: 'XB3', pinId: 'a' },
        },
        {
          id: 'W51',
          from: { componentId: 'OP0', pinId: 'out' },
          to: { componentId: 'XB3', pinId: 'b' },
        },
        {
          id: 'W52',
          from: { componentId: 'A3', pinId: 'out' },
          to: { componentId: 'FA3', pinId: 'A' },
        },
        {
          id: 'W53',
          from: { componentId: 'XB3', pinId: 'out' },
          to: { componentId: 'FA3', pinId: 'B' },
        },
        {
          id: 'W54',
          from: { componentId: 'A3', pinId: 'out' },
          to: { componentId: 'AN3', pinId: 'a' },
        },
        {
          id: 'W55',
          from: { componentId: 'B3', pinId: 'out' },
          to: { componentId: 'AN3', pinId: 'b' },
        },
        {
          id: 'W56',
          from: { componentId: 'A3', pinId: 'out' },
          to: { componentId: 'OR3', pinId: 'a' },
        },
        {
          id: 'W57',
          from: { componentId: 'B3', pinId: 'out' },
          to: { componentId: 'OR3', pinId: 'b' },
        },
        {
          id: 'W58',
          from: { componentId: 'FA3', pinId: 'SUM' },
          to: { componentId: 'MX3', pinId: 'D0' },
        },
        {
          id: 'W59',
          from: { componentId: 'FA3', pinId: 'SUM' },
          to: { componentId: 'MX3', pinId: 'D1' },
        },
        {
          id: 'W60',
          from: { componentId: 'AN3', pinId: 'out' },
          to: { componentId: 'MX3', pinId: 'D2' },
        },
        {
          id: 'W61',
          from: { componentId: 'OR3', pinId: 'out' },
          to: { componentId: 'MX3', pinId: 'D3' },
        },
        {
          id: 'W62',
          from: { componentId: 'OP0', pinId: 'out' },
          to: { componentId: 'MX3', pinId: 'S0' },
        },
        {
          id: 'W63',
          from: { componentId: 'OP1', pinId: 'out' },
          to: { componentId: 'MX3', pinId: 'S1' },
        },
        {
          id: 'W64',
          from: { componentId: 'MX3', pinId: 'OUT' },
          to: { componentId: 'R3', pinId: 'in' },
        },
        {
          id: 'W65',
          from: { componentId: 'FA3', pinId: 'Cout' },
          to: { componentId: 'Cout', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 470,
          width: 560,
          label:
            'Multiplexador 2:1 escolhe qual entrada chega à saída. Quando Sel=0, OUT=A. Quando Sel=1, OUT=B.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'Sel', pinId: 'out' },
          to: { componentId: 'N1', pinId: 'in' },
        },
        {
          id: 'W2',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'A1', pinId: 'a' },
        },
        {
          id: 'W3',
          from: { componentId: 'N1', pinId: 'out' },
          to: { componentId: 'A1', pinId: 'b' },
        },
        {
          id: 'W4',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'A2', pinId: 'a' },
        },
        {
          id: 'W5',
          from: { componentId: 'Sel', pinId: 'out' },
          to: { componentId: 'A2', pinId: 'b' },
        },
        {
          id: 'W6',
          from: { componentId: 'A1', pinId: 'out' },
          to: { componentId: 'O1', pinId: 'a' },
        },
        {
          id: 'W7',
          from: { componentId: 'A2', pinId: 'out' },
          to: { componentId: 'O1', pinId: 'b' },
        },
        {
          id: 'W8',
          from: { componentId: 'O1', pinId: 'out' },
          to: { componentId: 'OUT', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 390,
          width: 520,
          label:
            'Comparador de 1 bit. Ele indica se A é maior, igual ou menor que B usando NOT, AND e XNOR.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'NB', pinId: 'in' },
        },
        {
          id: 'W2',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'NA', pinId: 'in' },
        },
        {
          id: 'W3',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'GTG', pinId: 'a' },
        },
        {
          id: 'W4',
          from: { componentId: 'NB', pinId: 'out' },
          to: { componentId: 'GTG', pinId: 'b' },
        },
        {
          id: 'W5',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'EQG', pinId: 'a' },
        },
        {
          id: 'W6',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'EQG', pinId: 'b' },
        },
        {
          id: 'W7',
          from: { componentId: 'NA', pinId: 'out' },
          to: { componentId: 'LTG', pinId: 'a' },
        },
        {
          id: 'W8',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'LTG', pinId: 'b' },
        },
        {
          id: 'W9',
          from: { componentId: 'GTG', pinId: 'out' },
          to: { componentId: 'GT', pinId: 'in' },
        },
        {
          id: 'W10',
          from: { componentId: 'EQG', pinId: 'out' },
          to: { componentId: 'EQ', pinId: 'in' },
        },
        {
          id: 'W11',
          from: { componentId: 'LTG', pinId: 'out' },
          to: { componentId: 'LT', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 430,
          width: 560,
          label:
            'Decodificador 2 para 4. Para cada combinação de A e B, exatamente uma saída Y0 a Y3 fica ligada.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'NA', pinId: 'in' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'NB', pinId: 'in' },
        },
        {
          id: 'W3',
          from: { componentId: 'NA', pinId: 'out' },
          to: { componentId: 'Y0G', pinId: 'a' },
        },
        {
          id: 'W4',
          from: { componentId: 'NB', pinId: 'out' },
          to: { componentId: 'Y0G', pinId: 'b' },
        },
        {
          id: 'W5',
          from: { componentId: 'NA', pinId: 'out' },
          to: { componentId: 'Y1G', pinId: 'a' },
        },
        {
          id: 'W6',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'Y1G', pinId: 'b' },
        },
        {
          id: 'W7',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'Y2G', pinId: 'a' },
        },
        {
          id: 'W8',
          from: { componentId: 'NB', pinId: 'out' },
          to: { componentId: 'Y2G', pinId: 'b' },
        },
        {
          id: 'W9',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'Y3G', pinId: 'a' },
        },
        {
          id: 'W10',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'Y3G', pinId: 'b' },
        },
        {
          id: 'W11',
          from: { componentId: 'Y0G', pinId: 'out' },
          to: { componentId: 'Y0', pinId: 'in' },
        },
        {
          id: 'W12',
          from: { componentId: 'Y1G', pinId: 'out' },
          to: { componentId: 'Y1', pinId: 'in' },
        },
        {
          id: 'W13',
          from: { componentId: 'Y2G', pinId: 'out' },
          to: { componentId: 'Y2', pinId: 'in' },
        },
        {
          id: 'W14',
          from: { componentId: 'Y3G', pinId: 'out' },
          to: { componentId: 'Y3', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 370,
          width: 520,
          label:
            'Demultiplexador 1 para 2. O seletor Sel decide se o dado D vai para Y0 ou para Y1.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'Sel', pinId: 'out' },
          to: { componentId: 'N1', pinId: 'in' },
        },
        {
          id: 'W2',
          from: { componentId: 'D', pinId: 'out' },
          to: { componentId: 'Y0G', pinId: 'a' },
        },
        {
          id: 'W3',
          from: { componentId: 'N1', pinId: 'out' },
          to: { componentId: 'Y0G', pinId: 'b' },
        },
        {
          id: 'W4',
          from: { componentId: 'D', pinId: 'out' },
          to: { componentId: 'Y1G', pinId: 'a' },
        },
        {
          id: 'W5',
          from: { componentId: 'Sel', pinId: 'out' },
          to: { componentId: 'Y1G', pinId: 'b' },
        },
        {
          id: 'W6',
          from: { componentId: 'Y0G', pinId: 'out' },
          to: { componentId: 'Y0', pinId: 'in' },
        },
        {
          id: 'W7',
          from: { componentId: 'Y1G', pinId: 'out' },
          to: { componentId: 'Y1', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 370,
          width: 560,
          label:
            'Paridade ímpar. A saída liga quando a quantidade de entradas ligadas é ímpar: 1 ou 3 bits em nível 1.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'X1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'X1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'X1', pinId: 'out' },
          to: { componentId: 'X2', pinId: 'a' },
        },
        {
          id: 'W4',
          from: { componentId: 'C', pinId: 'out' },
          to: { componentId: 'X2', pinId: 'b' },
        },
        {
          id: 'W5',
          from: { componentId: 'X2', pinId: 'out' },
          to: { componentId: 'OUT', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 390,
          width: 560,
          label:
            'Detector de maioria. A saída liga quando pelo menos duas das três entradas estão ligadas.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'AB', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'AB', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'AC', pinId: 'a' },
        },
        {
          id: 'W4',
          from: { componentId: 'C', pinId: 'out' },
          to: { componentId: 'AC', pinId: 'b' },
        },
        {
          id: 'W5',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'BC', pinId: 'a' },
        },
        {
          id: 'W6',
          from: { componentId: 'C', pinId: 'out' },
          to: { componentId: 'BC', pinId: 'b' },
        },
        {
          id: 'W7',
          from: { componentId: 'AB', pinId: 'out' },
          to: { componentId: 'O1', pinId: 'a' },
        },
        {
          id: 'W8',
          from: { componentId: 'AC', pinId: 'out' },
          to: { componentId: 'O1', pinId: 'b' },
        },
        {
          id: 'W9',
          from: { componentId: 'O1', pinId: 'out' },
          to: { componentId: 'O2', pinId: 'a' },
        },
        {
          id: 'W10',
          from: { componentId: 'BC', pinId: 'out' },
          to: { componentId: 'O2', pinId: 'b' },
        },
        {
          id: 'W11',
          from: { componentId: 'O2', pinId: 'out' },
          to: { componentId: 'OUT', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 340,
          width: 560,
          label:
            'Meio subtrator calcula A - B. DIFF é A XOR B e BORROW liga quando é preciso emprestar: !A AND B.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'X1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'X1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'NA', pinId: 'in' },
        },
        {
          id: 'W4',
          from: { componentId: 'NA', pinId: 'out' },
          to: { componentId: 'BRG', pinId: 'a' },
        },
        {
          id: 'W5',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'BRG', pinId: 'b' },
        },
        {
          id: 'W6',
          from: { componentId: 'X1', pinId: 'out' },
          to: { componentId: 'DIFF', pinId: 'in' },
        },
        {
          id: 'W7',
          from: { componentId: 'BRG', pinId: 'out' },
          to: { componentId: 'BORROW', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 60,
          y: 470,
          width: 620,
          label:
            'Subtrator completo calcula A - B - Bin. DIFF é o resultado e Bout indica empréstimo para a próxima coluna.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'X1', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'X1', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'X1', pinId: 'out' },
          to: { componentId: 'X2', pinId: 'a' },
        },
        {
          id: 'W4',
          from: { componentId: 'Bin', pinId: 'out' },
          to: { componentId: 'X2', pinId: 'b' },
        },
        {
          id: 'W5',
          from: { componentId: 'X2', pinId: 'out' },
          to: { componentId: 'DIFF', pinId: 'in' },
        },
        {
          id: 'W6',
          from: { componentId: 'A', pinId: 'out' },
          to: { componentId: 'NA', pinId: 'in' },
        },
        {
          id: 'W7',
          from: { componentId: 'NA', pinId: 'out' },
          to: { componentId: 'B1', pinId: 'a' },
        },
        {
          id: 'W8',
          from: { componentId: 'B', pinId: 'out' },
          to: { componentId: 'B1', pinId: 'b' },
        },
        {
          id: 'W9',
          from: { componentId: 'X1', pinId: 'out' },
          to: { componentId: 'NX1', pinId: 'in' },
        },
        {
          id: 'W10',
          from: { componentId: 'Bin', pinId: 'out' },
          to: { componentId: 'B2', pinId: 'a' },
        },
        {
          id: 'W11',
          from: { componentId: 'NX1', pinId: 'out' },
          to: { componentId: 'B2', pinId: 'b' },
        },
        {
          id: 'W12',
          from: { componentId: 'B1', pinId: 'out' },
          to: { componentId: 'O1', pinId: 'a' },
        },
        {
          id: 'W13',
          from: { componentId: 'B2', pinId: 'out' },
          to: { componentId: 'O1', pinId: 'b' },
        },
        {
          id: 'W14',
          from: { componentId: 'O1', pinId: 'out' },
          to: { componentId: 'Bout', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 70,
          y: 410,
          width: 560,
          label:
            'Encoder 4 para 2. Pressupondo uma entrada ativa por vez, ele codifica D0..D3 em dois bits Y1Y0.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'D1', pinId: 'out' },
          to: { componentId: 'Y0G', pinId: 'a' },
        },
        {
          id: 'W2',
          from: { componentId: 'D3', pinId: 'out' },
          to: { componentId: 'Y0G', pinId: 'b' },
        },
        {
          id: 'W3',
          from: { componentId: 'D2', pinId: 'out' },
          to: { componentId: 'Y1G', pinId: 'a' },
        },
        {
          id: 'W4',
          from: { componentId: 'D3', pinId: 'out' },
          to: { componentId: 'Y1G', pinId: 'b' },
        },
        {
          id: 'W5',
          from: { componentId: 'Y0G', pinId: 'out' },
          to: { componentId: 'Y0', pinId: 'in' },
        },
        {
          id: 'W6',
          from: { componentId: 'Y1G', pinId: 'out' },
          to: { componentId: 'Y1', pinId: 'in' },
        },
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
        {
          id: 'TXT1',
          type: 'text',
          x: 50,
          y: 590,
          width: 620,
          label:
            'Multiplexador 4:1. S1 e S0 escolhem qual das quatro entradas D0, D1, D2 ou D3 aparece na saída OUT.',
        },
      ],
      wires: [
        {
          id: 'W1',
          from: { componentId: 'S0', pinId: 'out' },
          to: { componentId: 'NS0', pinId: 'in' },
        },
        {
          id: 'W2',
          from: { componentId: 'S1', pinId: 'out' },
          to: { componentId: 'NS1', pinId: 'in' },
        },
        {
          id: 'W3',
          from: { componentId: 'D0', pinId: 'out' },
          to: { componentId: 'T0A', pinId: 'a' },
        },
        {
          id: 'W4',
          from: { componentId: 'NS1', pinId: 'out' },
          to: { componentId: 'T0A', pinId: 'b' },
        },
        {
          id: 'W5',
          from: { componentId: 'T0A', pinId: 'out' },
          to: { componentId: 'T0', pinId: 'a' },
        },
        {
          id: 'W6',
          from: { componentId: 'NS0', pinId: 'out' },
          to: { componentId: 'T0', pinId: 'b' },
        },
        {
          id: 'W7',
          from: { componentId: 'D1', pinId: 'out' },
          to: { componentId: 'T1A', pinId: 'a' },
        },
        {
          id: 'W8',
          from: { componentId: 'NS1', pinId: 'out' },
          to: { componentId: 'T1A', pinId: 'b' },
        },
        {
          id: 'W9',
          from: { componentId: 'T1A', pinId: 'out' },
          to: { componentId: 'T1', pinId: 'a' },
        },
        {
          id: 'W10',
          from: { componentId: 'S0', pinId: 'out' },
          to: { componentId: 'T1', pinId: 'b' },
        },
        {
          id: 'W11',
          from: { componentId: 'D2', pinId: 'out' },
          to: { componentId: 'T2A', pinId: 'a' },
        },
        {
          id: 'W12',
          from: { componentId: 'S1', pinId: 'out' },
          to: { componentId: 'T2A', pinId: 'b' },
        },
        {
          id: 'W13',
          from: { componentId: 'T2A', pinId: 'out' },
          to: { componentId: 'T2', pinId: 'a' },
        },
        {
          id: 'W14',
          from: { componentId: 'NS0', pinId: 'out' },
          to: { componentId: 'T2', pinId: 'b' },
        },
        {
          id: 'W15',
          from: { componentId: 'D3', pinId: 'out' },
          to: { componentId: 'T3A', pinId: 'a' },
        },
        {
          id: 'W16',
          from: { componentId: 'S1', pinId: 'out' },
          to: { componentId: 'T3A', pinId: 'b' },
        },
        {
          id: 'W17',
          from: { componentId: 'T3A', pinId: 'out' },
          to: { componentId: 'T3', pinId: 'a' },
        },
        {
          id: 'W18',
          from: { componentId: 'S0', pinId: 'out' },
          to: { componentId: 'T3', pinId: 'b' },
        },
        {
          id: 'W19',
          from: { componentId: 'T0', pinId: 'out' },
          to: { componentId: 'O1', pinId: 'a' },
        },
        {
          id: 'W20',
          from: { componentId: 'T1', pinId: 'out' },
          to: { componentId: 'O1', pinId: 'b' },
        },
        {
          id: 'W21',
          from: { componentId: 'T2', pinId: 'out' },
          to: { componentId: 'O2', pinId: 'a' },
        },
        {
          id: 'W22',
          from: { componentId: 'T3', pinId: 'out' },
          to: { componentId: 'O2', pinId: 'b' },
        },
        {
          id: 'W23',
          from: { componentId: 'O1', pinId: 'out' },
          to: { componentId: 'O3', pinId: 'a' },
        },
        {
          id: 'W24',
          from: { componentId: 'O2', pinId: 'out' },
          to: { componentId: 'O3', pinId: 'b' },
        },
        {
          id: 'W25',
          from: { componentId: 'O3', pinId: 'out' },
          to: { componentId: 'OUT', pinId: 'in' },
        },
      ],
    },
  },
];

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

function metadataFor(example: RawCircuitExample): ExampleMetadata {
  const description = example.description ?? extractExampleDescription(example.circuit);
  const common = {
    description,
    goal: description,
    steps: [
      'Altere as entradas do circuito.',
      'Observe a saída no LED.',
      'Compare com a tabela verdade ou painel de estado.',
    ],
    ideas: [] as string[],
    extensions: [],
    modes: ['demo'] as CircuitExampleMode[],
    observe: [
      'Altere as entradas e observe as saídas no circuito.',
      'Compare o comportamento com a descrição dentro do canvas.',
    ],
    experiments: [
      'Teste todas as combinações de entrada.',
      'Renomeie sinais importantes para reforçar o significado do circuito.',
    ],
    exercises: [],
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
      goal: 'Entender que um switch gera um sinal 0 ou 1, que fios transportam esse sinal e que o mesmo sinal pode alimentar mais de um destino.',
      steps: [
        'Clique no switch A.',
        'Observe OUT 1 e OUT 2 acenderem juntos.',
        'Clique novamente em A e veja os dois LEDs apagarem juntos.',
        'Veja a linha destacada na tabela verdade mudar junto com o switch.',
      ],
      ideas: [
        'Um sinal digital tem apenas dois valores: 0/desligado ou 1/ligado.',
        'Um fio não cria lógica: ele apenas transporta o valor de um ponto para outro.',
        'Uma saída pode alimentar várias entradas; isso será importante para clock, reset e sinais compartilhados.',
        'Pinos de entrada não conectados são interpretados como 0 neste simulador.',
      ],
      next: ['not-basic', 'and-basic'],
      observe: [
        'OUT 1 e OUT 2 sempre mostram o mesmo valor de A.',
        'A saída A pode alimentar dois LEDs ao mesmo tempo.',
        'Veja a linha atual destacada na tabela verdade.',
      ],
      experiments: [
        'Renomeie A para Entrada e os LEDs para Saída 1 e Saída 2.',
        'Apague um dos fios e reconecte a saída de A ao LED.',
        'Adicione um terceiro LED observando o mesmo sinal.',
      ],
      challenge:
        'Desconecte um dos LEDs e explique por que ele deixa de acompanhar A enquanto o outro continua funcionando.',
      exercises: [
        'Semáforo de aviso: crie um switch chamado Energia e dois LEDs chamados Painel e Sirene. Os dois devem acompanhar Energia ao mesmo tempo.',
        'Sinal compartilhado: crie um switch chamado Sensor e três LEDs chamados A, B e C. Todos devem acender juntos quando Sensor=1.',
        'Teste de fio faltando: monte dois LEDs, mas conecte apenas um deles ao switch. Explique por que só um responde.',
      ],
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
      goal: 'Entender a ideia de inversão: a saída de uma porta NOT é sempre o contrário da entrada.',
      steps: [
        'Comece com A desligado e observe OUT ligado.',
        'Ligue A e veja OUT apagar.',
        'Alterne A algumas vezes e confira que os dois sinais nunca ficam iguais.',
      ],
      ideas: [
        'NOT transforma 0 em 1 e 1 em 0.',
        'A tabela verdade de uma entrada tem apenas duas linhas.',
        'Inversão é uma das operações mais usadas para construir circuitos maiores.',
      ],
      next: ['and-basic', 'or-basic', 'nand-basic'],
      observe: [
        'Compare A e OUT: eles devem estar sempre opostos.',
        'Use a tabela verdade para confirmar os dois casos possíveis.',
      ],
      experiments: [
        'Ligue A e observe OUT apagar.',
        'Desligue A e observe OUT acender.',
        'Tente prever OUT antes de clicar no switch.',
      ],
      challenge:
        'Monte outro inversor usando uma porta NAND com as duas entradas ligadas ao mesmo sinal.',
      exercises: [
        'Luz de porta aberta: crie uma entrada Porta fechada e um LED Aviso. O aviso deve acender quando a porta NÃO estiver fechada.',
        'Modo silencioso: crie uma entrada Som ligado e uma saída Mudo. Mudo deve ser 1 quando Som ligado for 0.',
        'Sensor invertido: crie uma entrada Escuro e um LED Claro. O LED deve acender quando não estiver escuro.',
      ],
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
      goal: 'Entender que AND representa uma condição simultânea: A e B precisam estar ligados para a saída ligar.',
      steps: [
        'Teste A=0 e B=0.',
        'Ligue apenas A.',
        'Desligue A e ligue apenas B.',
        'Ligue A e B ao mesmo tempo e observe quando OUT acende.',
      ],
      ideas: [
        'AND só produz 1 quando todas as entradas são 1.',
        'Duas entradas geram quatro combinações na tabela verdade.',
        'AND é útil para representar “isto E aquilo”.',
      ],
      next: ['or-basic', 'xor', 'nand-basic'],
      observe: [
        'OUT só acende quando A e B estão ligados ao mesmo tempo.',
        'Compare as quatro combinações da tabela verdade.',
      ],
      experiments: [
        'Teste 00, 01, 10 e 11 em ordem.',
        'Use AND como uma condição: “A e B precisam ser verdadeiros”.',
      ],
      challenge:
        'Explique uma situação real que precise de duas condições simultâneas, como chave de segurança E botão pressionado.',
      exercises: [
        'Cofre de duas chaves: a saída Abrir só deve ligar quando Chave A=1 E Chave B=1.',
        'Máquina segura: a saída Motor só deve ligar quando Proteção fechada=1 E Botão pressionado=1.',
        'Login simples: a saída Acesso só deve ligar quando Senha correta=1 E Cartão presente=1.',
      ],
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
      goal: 'Entender que OR representa uma condição alternativa: A ou B já é suficiente para ligar a saída.',
      steps: [
        'Comece com A=0 e B=0 e veja OUT apagado.',
        'Ligue apenas A.',
        'Desligue A e ligue apenas B.',
        'Ligue A e B juntos e compare com AND.',
      ],
      ideas: [
        'OR produz 1 quando pelo menos uma entrada é 1.',
        'A única linha desligada é quando todas as entradas são 0.',
        'OR é útil para representar “isto OU aquilo”.',
      ],
      next: ['xor', 'nor-basic'],
      observe: ['OUT acende se A ou B estiver ligado.', 'A única forma de OUT apagar é A=0 e B=0.'],
      experiments: [
        'Teste as quatro combinações e diga em voz alta quando a saída deveria ligar.',
        'Compare mentalmente OR com AND.',
      ],
      challenge:
        'Modifique o circuito para que dois switches diferentes possam acender dois LEDs ao mesmo tempo.',
      exercises: [
        'Campainha dupla: a saída Campainha deve ligar se Botão frente=1 OU Botão fundos=1.',
        'Alarme de janela: a saída Alarme deve ligar se Janela A aberta=1 OU Janela B aberta=1.',
        'Pedido de ajuda: a saída Chamar professor deve ligar se Aluno A chamou=1 OU Aluno B chamou=1.',
      ],
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
      goal: 'Entender que XOR detecta diferença: a saída liga quando as duas entradas têm valores diferentes.',
      steps: ['Teste 0 e 0.', 'Teste 1 e 0.', 'Teste 0 e 1.', 'Teste 1 e 1 e compare com OR.'],
      ideas: [
        'XOR liga quando existe exatamente uma entrada ligada.',
        'XOR apaga quando as entradas são iguais.',
        'XOR aparece em somadores porque parece uma soma de bits sem o carry.',
      ],
      next: ['xnor-basic', 'microwave-safety-challenge', 'half-adder'],
      observe: ['OUT acende quando A e B são diferentes.', 'OUT apaga quando A e B são iguais.'],
      experiments: [
        'Compare XOR com OR quando A=B=1.',
        'Tente prever a saída antes de cada clique.',
      ],
      challenge: 'Explique por que XOR parece uma soma de 1 bit sem carry.',
      exercises: [
        'Interruptor paralelo: a lâmpada deve acender quando Interruptor A e Interruptor B estiverem em posições diferentes.',
        'Detector de discordância: a saída Erro deve ligar quando Sensor A e Sensor B forem diferentes.',
        'Voto divergente: a saída Divergência deve ligar quando dois jurados escolherem respostas diferentes.',
      ],
    };
  }

  if (example.id === 'nand-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['and-basic', 'not-basic'],
      concepts: ['porta negada', 'NAND = NOT(AND)', 'porta universal'],
      goal: 'Entender que NAND é uma AND invertida: ela só desliga no caso em que AND ligaria.',
      steps: [
        'Teste as quatro combinações de A e B.',
        'Compare especialmente o caso A=1 e B=1.',
        'Volte ao exemplo AND básico e compare as tabelas.',
      ],
      ideas: [
        'NAND significa NOT AND.',
        'Ela é o contrário exato da AND.',
        'NAND é uma porta universal: com ela é possível construir outras portas.',
      ],
      next: ['nand-not', 'nor-basic'],
      observe: ['Compare com AND: a saída é invertida.', 'OUT só apaga no caso A=1 e B=1.'],
      experiments: [
        'Teste as quatro linhas da tabela verdade.',
        'Compare a linha A=1,B=1 com as outras três.',
      ],
      challenge: 'Explique por que NAND pode ser vista como uma AND seguida de uma inversão.',
      exercises: [
        'Alarme anti-cofre: a saída Bloqueado deve desligar apenas quando Chave A=1 E Chave B=1.',
        'Falha de dupla confirmação: a saída Falha deve ficar ligada exceto quando Operador A e Operador B confirmarem juntos.',
        'Construa uma AND usando uma NAND seguida de uma inversão.',
      ],
    };
  }

  if (example.id === 'nor-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['or-basic', 'not-basic'],
      concepts: ['porta negada', 'NOR = NOT(OR)', 'porta universal'],
      goal: 'Entender que NOR é uma OR invertida: ela só liga quando nenhuma entrada está ligada.',
      steps: [
        'Comece com A=0 e B=0 e observe OUT ligado.',
        'Ligue A ou B e veja OUT apagar.',
        'Compare com o exemplo OR básico.',
      ],
      ideas: [
        'NOR significa NOT OR.',
        'Ela é o contrário exato da OR.',
        'NOR também é uma porta universal e será útil para latches.',
      ],
      next: ['xnor-basic', 'sr-latch-nor-experiment'],
      observe: ['Compare com OR: a saída é invertida.', 'OUT só liga quando A=0 e B=0.'],
      experiments: [
        'Teste A=0,B=0 primeiro.',
        'Depois ligue qualquer entrada e observe OUT desligar.',
      ],
      challenge: 'Explique por que NOR pode ser vista como uma OR seguida de uma inversão.',
      exercises: [
        'Sistema parado: a saída Parado deve ligar apenas quando Pedido A=0 E Pedido B=0.',
        'Sala vazia: a saída Luz apagada deve ligar apenas quando Movimento A=0 E Movimento B=0.',
        'Construa uma OR usando uma NOR seguida de uma inversão.',
      ],
    };
  }

  if (example.id === 'xnor-basic') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'concept',
      prerequisites: ['xor'],
      concepts: ['igualdade entre bits', 'XNOR = NOT(XOR)', 'comparação simples'],
      goal: 'Entender que XNOR detecta igualdade: a saída liga quando as duas entradas têm o mesmo valor.',
      steps: [
        'Teste A=0 e B=0.',
        'Teste os dois casos em que A e B são diferentes.',
        'Teste A=1 e B=1.',
        'Compare com o XOR básico.',
      ],
      ideas: [
        'XNOR é o contrário da XOR.',
        'Ela liga para 00 e 11.',
        'XNOR pode ser usada como um pequeno teste de igualdade entre dois bits.',
      ],
      next: ['microwave-safety-challenge', 'comparator-1-bit'],
      observe: ['OUT liga quando A e B são iguais.', 'OUT apaga quando A e B são diferentes.'],
      experiments: ['Compare com o XOR básico.', 'Teste 00 e 11: ambos devem ligar OUT.'],
      challenge: 'Explique por que XNOR pode ser usada como teste de igualdade entre dois bits.',
      exercises: [
        'Senha de 1 bit: a saída Correto deve ligar quando Entrada e Senha salva forem iguais.',
        'Sensores concordam: a saída OK deve ligar quando Sensor A e Sensor B tiverem o mesmo valor.',
        'Comparador simples: crie duas entradas A e B e um LED Igual que acenda para 00 e 11.',
      ],
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
      prerequisites: ['nand-basic'],
      concepts: ['porta universal', 'equivalência lógica', 'reutilização de portas'],
      goal: 'Entender que uma mesma porta pode ser reaproveitada de outro jeito: NAND pode funcionar como NOT.',
      steps: [
        'Alterne A e observe OUT.',
        'Compare com o exemplo NOT básico.',
        'Perceba que A está ligado nas duas entradas da NAND.',
      ],
      ideas: [
        'Quando as duas entradas da NAND recebem o mesmo sinal, o resultado é o inverso desse sinal.',
        'Circuitos diferentes podem ter a mesma tabela verdade.',
        'Essa é a primeira ideia de equivalência entre circuitos.',
      ],
      next: ['microwave-safety-challenge', 'sr-latch-nand-active-low'],
      observe: [
        'A alimenta as duas entradas da NAND.',
        'Quando as duas entradas são iguais, NAND se comporta como NOT.',
      ],
      experiments: [
        'Compare este circuito com o NOT básico.',
        'Desconecte uma entrada da NAND e veja por que a equivalência deixa de fazer sentido.',
      ],
      challenge:
        'Pesquise mentalmente: se NAND pode virar NOT, como construir AND usando NAND + NOT?',
      exercises: [
        'Construa NOT usando NAND e compare com a porta NOT nativa usando dois LEDs.',
        'Construa AND usando apenas NANDs: primeiro faça NAND(A,B), depois inverta esse resultado com outra NAND.',
        'Construa um circuito que acenda quando A=0 usando somente NANDs.',
      ],
    };
  }
  if (example.id === 'microwave-safety-challenge') {
    return {
      ...common,
      moduleId: 'fundamentals',
      familyIds: ['gates', 'truth-table'],
      trackIds: ['boolean'],
      difficulty: 1,
      level: 'composition',
      prerequisites: ['and-basic', 'or-basic'],
      concepts: ['condição de segurança', 'composição de portas', 'teste de casos'],
      goal: 'Aplicar portas básicas em uma situação narrativa: o motor do micro-ondas só pode ligar quando todas as condições de segurança forem verdadeiras.',
      steps: [
        'Teste com a porta aberta: o motor deve ficar desligado.',
        'Feche a porta, mas deixe Start desligado.',
        'Ligue Start, mas deixe o timer zerado.',
        'Por fim, ligue Porta fechada, Start e Tempo > 0 ao mesmo tempo.',
      ],
      ideas: [
        'Problemas reais podem virar frases lógicas.',
        '“Só liga se A, B e C forem verdadeiros” é uma composição de ANDs.',
        'A tabela verdade ajuda a testar se nenhuma condição perigosa liga o motor por engano.',
      ],
      next: ['half-adder', 'mux-2-1'],
      observe: [
        'O LED Motor só deve acender quando as três entradas estão ligadas.',
        'Cada AND combina duas condições por vez.',
        'A tabela verdade mostra todos os casos possíveis.',
      ],
      experiments: [
        'Tente encontrar algum caso perigoso em que o motor ligue com a porta aberta.',
        'Renomeie as portas AND para mostrar quais condições elas combinam.',
        'Explique o circuito em voz alta como uma frase: Motor liga se...',
      ],
      challenge:
        'Adicione um LED chamado “Seguro” que acenda quando Porta fechada e Tempo > 0 estiverem verdadeiros, mesmo antes de pressionar Start.',
      exercises: [
        'Alarme de geladeira: crie um circuito em que o alarme ligue se a porta estiver aberta E a luz da cozinha estiver apagada.',
        'Luz automática do corredor: crie um circuito em que a luz acenda se houver movimento OU se o botão manual for pressionado.',
        'Cinto de segurança: crie um circuito em que o aviso ligue se o motorista estiver sentado E o cinto NÃO estiver preso.',
        'Cofre de duas chaves: crie um circuito em que o cofre abra apenas se Chave A E Chave B estiverem ligadas ao mesmo tempo.',
        'Interruptor paralelo: crie um circuito em que a lâmpada acenda quando os interruptores A e B estiverem em posições diferentes.',
        'Indicador de igualdade: crie um circuito em que o painel acenda quando Sensor A e Sensor B tiverem o mesmo valor.',
      ],
    };
  }

  if (example.id === 'half-adder') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic', 'architecture'],
      difficulty: 2,
      level: 'composition',
      prerequisites: [
        'Lembre do XOR: ele liga quando os bits são diferentes. Em uma soma de um único dígito, isso dá exatamente o bit SUM: 0+1 e 1+0 viram 1; 0+0 e 1+1 deixam SUM em 0.',
        'Lembre do AND: ele só liga quando A=1 e B=1. Esse é justamente o único caso em que a soma passa de um bit e precisa mandar 1 para a próxima coluna: o CARRY.',
        'Se quiser revisar antes, abra XOR básico e AND básico.',
      ],
      concepts: ['soma binária', 'SUM', 'CARRY'],
      goal: 'Entender como somar dois bits. Quando 1 + 1 gera 10 em binário, o resultado precisa ser dividido em SUM=0 e CARRY=1.',
      steps: [
        'Teste A=0 e B=0. Resultado esperado: SUM=0, CARRY=0.',
        'Teste A=1 e B=0. Resultado esperado: SUM=1, CARRY=0.',
        'Teste A=0 e B=1. Resultado esperado: SUM=1, CARRY=0.',
        'Teste A=1 e B=1. Em binário, 1+1=10: SUM=0 e CARRY=1.',
      ],
      ideas: [
        'Um bit sozinho só representa 0 ou 1.',
        'O resultado de 1+1 precisa de dois bits: 10.',
        'SUM é o bit da coluna atual; CARRY é o bit que vai para a próxima coluna.',
        'Por isso o meio somador tem duas saídas.',
      ],
      next: ['full-adder'],
      observe: [
        'Leia as saídas como CARRY SUM.',
        'SUM segue a mesma regra da XOR.',
        'CARRY segue a mesma regra da AND.',
        'A tabela verdade não mostra só liga/desliga: ela representa uma soma.',
      ],
      experiments: [
        'Some 1+1 e veja que o resultado é 10 em binário: CARRY=1 e SUM=0.',
        'Compare a tabela do SUM com a tabela da XOR.',
        'Compare a tabela do CARRY com a tabela da AND.',
      ],
      challenge:
        'Sem olhar a tabela, escreva o resultado de cada soma: 0+0, 0+1, 1+0, 1+1. Depois confira no circuito.',
      exercises: [
        'Monte uma tabela com A, B, soma decimal, SUM e CARRY.',
        'Explique por que SUM é igual a A XOR B.',
        'Explique por que CARRY é igual a A AND B.',
      ],
    };
  }

  if (example.id === 'full-adder') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic', 'architecture'],
      difficulty: 3,
      level: 'composition',
      prerequisites: ['half-adder'],
      concepts: ['carry de entrada', 'carry de saída', 'soma de coluna'],
      goal: 'Entender como somar uma coluna que já recebeu transporte. O somador completo soma A + B + Cin e pode produzir SUM e Cout.',
      steps: [
        'Teste A=1, B=0, Cin=0.',
        'Agora ligue Cin e observe a diferença.',
        'Teste A=1, B=1, Cin=1.',
        'Observe quando Cout liga.',
      ],
      ideas: [
        'Cin é o carry recebido da coluna anterior, como o “vai 1” da conta no papel.',
        'Cout é o carry enviado para a próxima coluna.',
        'Somadores maiores são feitos conectando Cout de uma coluna ao Cin da próxima.',
        'Quando A+B+Cin passa de 1, Cout precisa ligar.',
      ],
      next: ['adder-2-bit'],
      observe: [
        'SUM pode mudar quando Cin muda.',
        'Cout liga quando a soma da coluna passa de 1.',
        'A tabela verdade tem três entradas e duas saídas.',
      ],
      experiments: [
        'Compare 1+0 sem Cin e com Cin.',
        'Procure as combinações em que Cout=1.',
        'Explique o circuito como duas somas parciais.',
      ],
      challenge: 'Monte um somador completo usando dois meio somadores e uma porta OR.',
      exercises: [
        'Preencha a tabela de 8 linhas com A, B, Cin, SUM e Cout.',
        'Encontre todas as combinações que produzem resultado binário 10.',
        'Explique em palavras o que Cin representa.',
      ],
    };
  }

  if (example.id === 'adder-2-bit') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic', 'architecture'],
      difficulty: 3,
      level: 'composition',
      prerequisites: ['half-adder', 'full-adder'],
      concepts: ['número de 2 bits', 'propagação de carry', 'composição hierárquica'],
      goal: 'Entender como somar números com mais de um bit. Aqui somamos A1A0 + B1B0 e propagamos o carry da coluna 0 para a coluna 1.',
      steps: [
        'Escolha A1A0=01 e B1B0=01.',
        'Observe S0 e o carry que entra no bit 1.',
        'Teste uma soma que gere Cout, como 11 + 01.',
        'Leia o resultado como Cout S1 S0.',
      ],
      ideas: [
        'A0 e B0 são os bits menos significativos: a coluna da direita.',
        'A1 e B1 são a próxima coluna.',
        'O carry do primeiro bit vira Cin do segundo bit.',
        'Esse padrão de encadear carry é a base dos somadores de 4, 8 ou mais bits.',
      ],
      next: ['half-subtractor'],
      observe: [
        'O fio de CARRY do meio somador entra no Cin do somador completo.',
        'O resultado final tem três bits: Cout S1 S0.',
        'A tabela verdade tem 16 combinações.',
      ],
      experiments: ['Some 01 + 01.', 'Some 10 + 01.', 'Some 11 + 01 e veja Cout aparecer.'],
      challenge:
        'Adicione mais um somador completo para transformar este circuito em um somador de 3 bits.',
      exercises: [
        'Calcule 01 + 10 e confira S1S0.',
        'Calcule 11 + 11 e confira Cout S1 S0.',
        'Desenhe no papel a conexão necessária para criar um somador de 3 bits.',
      ],
    };
  }

  if (
    ['adder-4-bit', 'adder-4-bit-gates', 'subtractor-4-bit', 'subtractor-4-bit-gates'].includes(
      example.id,
    )
  ) {
    const isAdder = example.id.startsWith('adder');
    const isGateLevel = example.id.endsWith('-gates');
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic', 'architecture'],
      difficulty: isGateLevel ? 4 : 3,
      level: 'composition',
      prerequisites: isAdder ? ['adder-2-bit'] : ['adder-4-bit', 'full-subtractor'],
      concepts: isAdder
        ? ['ripple carry', 'número de 4 bits', 'propagação de carry']
        : ['complemento de 2', 'inversão de bits', 'subtração por soma'],
      next: isAdder ? [isGateLevel ? 'subtractor-4-bit-gates' : 'subtractor-4-bit'] : [],
    };
  }

  if (example.id === 'alu-4-bit') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'mux-decoder', 'truth-table'],
      trackIds: ['arithmetic', 'selection', 'architecture'],
      difficulty: 4,
      level: 'system',
      prerequisites: ['adder-4-bit', 'subtractor-4-bit', 'mux-4-1'],
      concepts: ['ULA', 'opcode', 'seleção de operação', 'somador/subtrator compartilhado'],
      next: [],
    };
  }

  if (example.id === 'half-subtractor') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic'],
      difficulty: 2,
      level: 'composition',
      prerequisites: ['not-basic', 'and-basic', 'xor'],
      concepts: ['subtração de bits', 'DIFF', 'BORROW'],
      goal: 'Entender como subtrair um bit de outro. Quando tentamos fazer 0 - 1, precisamos pedir emprestado: BORROW=1.',
      steps: [
        'Teste A=0 e B=0.',
        'Teste A=1 e B=0.',
        'Teste A=0 e B=1 e observe BORROW.',
        'Teste A=1 e B=1.',
      ],
      ideas: [
        'DIFF usa XOR, assim como SUM no meio somador.',
        'BORROW liga quando tentamos fazer 0 - 1.',
        'Pedir emprestado em binário é parecido com pedir emprestado em uma subtração decimal.',
        'Subtração também pode ser descrita por tabela verdade.',
      ],
      next: ['full-subtractor'],
      observe: [
        'DIFF indica o bit de diferença.',
        'BORROW indica empréstimo para a próxima coluna.',
        'O caso A=0,B=1 é o mais importante.',
      ],
      experiments: [
        'Compare meio somador e meio subtrator.',
        'Explique por que DIFF é igual ao XOR.',
        'Procure a única linha que liga BORROW.',
      ],
      challenge: 'Explique por que BORROW = !A AND B.',
      exercises: [
        'Preencha a tabela de A, B, DIFF e BORROW.',
        'Monte BORROW usando NOT e AND em uma aba vazia.',
        'Crie um enunciado real para “precisar emprestar”.',
      ],
    };
  }

  if (example.id === 'full-subtractor') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic'],
      difficulty: 3,
      level: 'composition',
      prerequisites: ['half-subtractor'],
      concepts: ['borrow de entrada', 'borrow de saída', 'subtração em colunas'],
      goal: 'Entender a subtração de uma coluna que já recebeu empréstimo. O subtrator completo calcula A - B - Bin.',
      steps: [
        'Teste Bin=0 e compare com o meio subtrator.',
        'Ligue Bin e veja como a diferença muda.',
        'Procure combinações que ligam Bout.',
        'Compare Bin com Cin do somador completo.',
      ],
      ideas: [
        'Bin é o empréstimo que chegou da coluna anterior.',
        'Bout é o empréstimo enviado para a próxima coluna.',
        'Subtratores maiores encadeiam Bout para Bin, assim como somadores encadeiam Cout para Cin.',
        'Se a coluna atual não consegue pagar a subtração, ela pede empréstimo.',
      ],
      next: ['comparator-1-bit'],
      observe: [
        'DIFF depende de A, B e Bin.',
        'Bout liga quando a coluna atual precisa emprestar.',
        'A tabela verdade tem 8 linhas.',
      ],
      experiments: [
        'Compare A=1,B=0 com Bin=0 e Bin=1.',
        'Procure todas as linhas que ligam Bout.',
        'Explique o circuito como uma subtração em coluna.',
      ],
      challenge: 'Monte um subtrator de 2 bits encadeando meio subtrator e subtrator completo.',
      exercises: [
        'Preencha a tabela de 8 linhas.',
        'Calcule 0 - 0 - 1 e explique o empréstimo.',
        'Desenhe como seria um subtrator de 2 bits.',
      ],
    };
  }

  if (example.id === 'comparator-1-bit') {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['adders', 'truth-table'],
      trackIds: ['arithmetic', 'selection'],
      difficulty: 2,
      level: 'composition',
      prerequisites: ['and-basic', 'not-basic', 'xnor-basic'],
      concepts: ['maior que', 'igualdade', 'menor que'],
      goal: 'Entender como comparar dois bits e gerar três respostas exclusivas: A>B, A=B ou A<B.',
      steps: ['Teste A=0,B=0.', 'Teste A=1,B=0.', 'Teste A=0,B=1.', 'Teste A=1,B=1 e observe EQ.'],
      ideas: [
        'GT liga quando A=1 e B=0.',
        'LT liga quando A=0 e B=1.',
        'EQ liga quando os bits são iguais, como uma XNOR.',
        'Em um comparador correto, apenas uma dessas três saídas deve ligar por vez.',
      ],
      next: ['mux-2-1'],
      observe: [
        'Apenas uma saída deve ligar por vez.',
        'EQ liga para 00 e 11.',
        'GT e LT são casos opostos.',
      ],
      experiments: [
        'Compare este circuito com o XNOR básico.',
        'Explique por que GT usa A AND !B.',
        'Explique por que LT usa !A AND B.',
      ],
      challenge: 'Pense em como comparar números de 2 bits começando pelo bit mais significativo.',
      exercises: [
        'Crie uma tabela com A, B, GT, EQ e LT.',
        'Monte apenas a saída GT em uma aba vazia.',
        'Monte apenas a saída LT em uma aba vazia.',
      ],
    };
  }
  if (
    [
      'mux-2-1',
      'mux-4-1',
      'decoder-2-4',
      'demux-1-2',
      'encoder-4-2',
      'odd-parity-3',
      'majority-3',
    ].includes(example.id)
  ) {
    return {
      ...common,
      moduleId: 'combinational',
      familyIds: ['mux-decoder'],
      trackIds: ['selection', 'architecture'],
      difficulty: example.id === 'mux-4-1' ? 3 : 2,
      level: 'composition',
      prerequisites: ['and-basic', 'or-basic', 'not-basic'],
      concepts: ['seleção', 'codificação', 'roteamento de sinais'],
      next: ['register-4-basic'],
      challenge: 'Explique qual entrada controla cada caminho até a saída.',
      exercises: [
        'Escolha uma combinação de seleção e preveja qual entrada aparecerá na saída.',
        'Crie uma situação real em que um seletor escolha entre dois sinais.',
        'Teste uma entrada de dados por vez mantendo as demais desligadas.',
      ],
    };
  }
  if (
    [
      'd-latch-basic',
      'sr-latch-nor-experiment',
      'sr-latch-nand-active-low',
      'gated-d-latch-from-nand',
    ].includes(example.id)
  ) {
    return {
      ...common,
      moduleId: 'time-and-state',
      familyIds: ['latches'],
      trackIds: ['sequential'],
      difficulty: example.id === 'gated-d-latch-from-nand' ? 3 : 2,
      level: 'concept',
      prerequisites: ['not-basic', 'nand-not'],
      concepts: ['estado anterior', 'realimentação', 'memória de 1 bit'],
      next: ['d-flip-flop-basic'],
      observe: [
        'Mude as entradas de controle.',
        'Volte para a condição de repouso.',
        'Observe que Q pode manter o valor anterior.',
      ],
      experiments: [
        'Sete o latch, volte para repouso e confirme que Q permanece.',
        'Resete o latch e confirme a mudança de estado.',
      ],
      challenge: 'Compare o latch nativo com o latch construído usando portas comuns.',
      exercises: [
        'Faça uma sequência SET, repouso, RESET, repouso e anote Q em cada etapa.',
        'Mude uma entrada por vez e explique por que o latch mantém ou altera o estado.',
        'Tente encontrar uma condição proibida ou instável e explique por que ela deve ser evitada.',
      ],
    };
  }
  if (example.id === 'd-flip-flop-basic') {
    return {
      ...common,
      moduleId: 'time-and-state',
      familyIds: ['flip-flops'],
      trackIds: ['sequential', 'architecture'],
      difficulty: 2,
      level: 'concept',
      prerequisites: ['d-latch-basic'],
      concepts: ['clock', 'borda de subida', 'estado atual'],
      next: ['register-4-basic'],
      observe: [
        'Altere D antes do Tick.',
        'Pressione Tick e observe se houve borda de subida.',
        'Compare D e Q antes/depois do clock.',
      ],
      experiments: [
        'Altere D na borda de descida e veja que Q não captura.',
        'Use o clock automático em 1 Hz.',
      ],
      challenge: 'Explique por que Q não muda imediatamente quando D muda.',
      exercises: [
        'Coloque D=1 antes da borda de subida e confirme que Q captura 1.',
        'Mude D logo depois da captura e confirme que Q mantém até a próxima subida.',
        'Faça uma tabela de ciclos com CLK, D e Q.',
      ],
    };
  }
  if (example.id === 'register-4-basic') {
    return {
      ...common,
      moduleId: 'time-and-state',
      familyIds: ['registers'],
      trackIds: ['sequential', 'architecture'],
      difficulty: 2,
      level: 'composition',
      prerequisites: ['d-flip-flop-basic'],
      concepts: ['palavra binária', 'carga paralela', 'fronteira temporal'],
      next: ['sync-counter-8bit', 'johnson-counter-8bit'],
      observe: [
        'Ajuste D0–D3 antes do clock.',
        'Dê Tick até uma borda de subida.',
        'Observe Q0–Q3 copiando a palavra de entrada.',
      ],
      experiments: [
        'Mude D0–D3 sem dar clock e confira que Q mantém.',
        'Rode o clock automático e capture várias palavras.',
      ],
      challenge: 'Adicione um enable usando multiplexadores antes das entradas D.',
      exercises: [
        'Capture a palavra 1010 e confirme os LEDs Q3..Q0.',
        'Mude as entradas para 0101 sem clock e confirme que Q não muda.',
        'Capture três palavras diferentes e anote o valor salvo após cada borda de subida.',
      ],
    };
  }
  if (example.id === 'sync-counter-8bit') {
    return {
      ...common,
      moduleId: 'systems',
      familyIds: ['counters', 'flip-flops'],
      trackIds: ['sequential', 'architecture'],
      difficulty: 4,
      level: 'system',
      prerequisites: ['d-flip-flop-basic', 'register-4-basic'],
      concepts: [
        'contador síncrono',
        'cadeia de vai-um (ripple carry enable)',
        'flip-flop T via XOR',
        'todos os estágios no mesmo clock',
      ],
      goal: 'Entender como oito flip-flops D, todos clocados pelo mesmo sinal, compõem um contador binário de 0 a 255 usando uma cadeia combinacional de "habilita a próxima" em vez de encadear os clocks.',
      steps: [
        'Dê alguns Ticks e acompanhe os LEDs Q0..Q7 em binário.',
        'Desligue Enable e confirme que a contagem para sem perder o valor.',
        'Religue Enable e continue de onde parou.',
        'Rode o clock automático e abra as Formas de onda para ver os bits mais altos mudarem de frequência cada vez mais devagar.',
      ],
      ideas: [
        'Cada bit só alterna quando todos os bits menos significativos já estão em 1 — a mesma condição de "vai um" da soma binária.',
        'Como todo Flip-Flop D é clocado pelo mesmo sinal, o valor novo inteiro é decidido em um único instante — sem os atrasos de propagação de um contador assíncrono (ripple) real.',
        'Um Flip-Flop D com D = XOR(Q, T) funciona como um Flip-Flop T: alterna quando T=1, mantém quando T=0.',
        'O bit mais significativo muda com metade da frequência do bit anterior — o padrão clássico de contagem binária.',
        'Este simulador resolve cada Tick num único passo síncrono: primeiro toda a lógica combinacional é calculada a partir do estado anterior, só depois todos os Flip-Flops travam o novo valor ao mesmo tempo. Um circuito com clock único, como este, é exatamente o que esse modelo representa fielmente.',
      ],
      next: ['ripple-counter-broken'],
      observe: [
        'Bit 0 alterna a cada clock; Bit 1 alterna a cada dois clocks; cada bit seguinte é duas vezes mais lento.',
        'Com Enable desligado, nenhum bit muda mesmo com Tick.',
        'No painel de Formas de onda, clique num tick antigo para ver o canvas voltar àquele valor.',
      ],
      experiments: [
        'Conte até 15 e confirme 00001111 nos LEDs.',
        'Desligue Enable no meio da contagem, dê 5 Ticks e confirme que nada mudou.',
        'Rode o clock automático até passar de 255 e observe voltar a 0.',
      ],
      challenge:
        'Explique por que a cadeia de portas AND (T1..T7) precisa olhar todos os bits menos significativos, não só o anterior, para decidir se um bit deve alternar.',
      exercises: [
        'Pare a contagem em 42 (00101010) usando Tick e confirme os LEDs.',
        'Meça quantos Ticks são necessários para o Bit 3 mudar de valor pela primeira vez.',
        'Modifique o circuito (ou desenhe no papel) um contador de 4 bits reaproveitando só os quatro primeiros estágios.',
      ],
    };
  }
  if (example.id === 'ripple-counter-broken') {
    return {
      ...common,
      moduleId: 'systems',
      familyIds: ['counters', 'flip-flops'],
      trackIds: ['sequential', 'architecture'],
      difficulty: 4,
      level: 'concept',
      prerequisites: ['sync-counter-8bit'],
      concepts: [
        'contador ripple assíncrono',
        'atraso de propagação',
        'passo síncrono único por Tick',
        'clock encadeado entre estágios',
      ],
      goal: 'Entender, prevendo e depois observando uma falha real, por que este simulador só representa corretamente circuitos síncronos — e não um contador ripple assíncrono clássico de livro-texto.',
      steps: [
        'Antes de clicar em qualquer coisa, escreva a sequência que você espera: 1, 2, 3, 4, 5, 6...',
        'Dê Tick uma vez e compare o valor dos LEDs com sua previsão.',
        'Continue dando Tick um a um, sempre comparando: 1, 3, 6, 14, 15, 13, 12, 12, 13, 15, 10...',
        'Volte ao exemplo "Contador binário síncrono (8 bits)" e repita os mesmos primeiros Ticks para comparar lado a lado.',
      ],
      ideas: [
        'Este circuito é o desenho clássico de contador ripple: cada Flip-Flop é um T (D = NOT(Q), alterna a cada borda), e o clock de cada estágio vem do Q do estágio anterior.',
        'Em hardware real isso funciona porque cada porta tem um atraso físico de nanossegundos, muito menor que o período do clock — dá tempo de tudo se acomodar entre uma borda e outra.',
        'Este simulador resolve cada Tick como um único passo síncrono: calcula toda a lógica combinacional de uma vez a partir do estado anterior, e só então trava os Flip-Flops — não existe um "meio do caminho" onde um atraso de propagação possa se resolver.',
        'Por isso, cada estágio só "percebe" a mudança do estágio anterior um Tick inteiro depois — e como novos Ticks continuam chegando, várias dessas ondas atrasadas se sobrepõem e o valor deixa de ser uma contagem.',
        'A correção não é uma questão de fiação: é trocar o desenho por um síncrono, com um clock único e uma lógica combinacional decidindo quem deve alternar (veja o contador de 8 bits).',
      ],
      next: [],
      observe: [
        'O valor muda a cada Tick, mas não sobe de 1 em 1 — ele salta de forma imprevisível.',
        'Volte ao contador síncrono e repita os mesmos Ticks: lá a sequência é limpa, 1, 2, 3, 4...',
        'Quanto mais bits o contador tem, mais caótica fica a sequência aqui — o oposto do que se esperaria de "só adicionar mais um atraso".',
      ],
      experiments: [
        'Grave a sequência dos primeiros 10 valores e confirme se bate com 1, 3, 6, 14, 15, 13, 12, 12, 13, 15.',
        'Pause e reinicie o clock automático algumas vezes e veja se o padrão de erro se repete sempre igual (ele deveria, já que é determinístico).',
        'Desconecte o Flip-Flop do Bit 3 e observe se os 3 bits restantes sozinhos também divergem.',
      ],
      challenge:
        'Reprojete este circuito para que ele conte corretamente neste simulador, sem mudar a quantidade de bits — qual é a mudança mínima de fiação necessária?',
      exercises: [
        'Transforme este contador de 4 bits em um síncrono, reaproveitando a ideia do exemplo de 8 bits.',
        'Explique, em uma frase, por que "mais um tick de atraso por estágio" quebra a contagem em vez de só atrasá-la.',
        'Monte uma tabela com tick, valor esperado e valor observado para os primeiros 8 Ticks.',
      ],
    };
  }
  if (example.id === 'johnson-counter-8bit') {
    return {
      ...common,
      moduleId: 'systems',
      familyIds: ['counters', 'flip-flops'],
      trackIds: ['sequential', 'architecture'],
      difficulty: 3,
      level: 'system',
      prerequisites: ['d-flip-flop-basic'],
      concepts: [
        'registrador de deslocamento',
        'realimentação invertida',
        'contador em anel',
        'sequência de estados',
      ],
      goal: 'Entender um contador em anel de Johnson: oito flip-flops em cadeia, cada um copiando o anterior a cada clock, com o último realimentando o primeiro invertido — produzindo um padrão de "luz correndo" com 16 estados.',
      steps: [
        'Dê Ticks um a um e acompanhe o LED aceso caminhando pela fileira.',
        'Continue até os LEDs acesos começarem a apagar na mesma ordem em que acenderam.',
        'Conte quantos Ticks (bordas de subida) até o padrão se repetir.',
        'Rode o clock automático para ver o efeito completo.',
      ],
      ideas: [
        'Um registrador de deslocamento simples só copia Q do estágio anterior para D do próximo, a cada clock.',
        'Realimentar o último estágio invertido no primeiro (em vez de repetir o valor) faz o padrão de 1s crescer, depois o padrão de 0s crescer, sem nunca ficar preso em um único ciclo curto.',
        'Um anel de Johnson de N estágios percorre 2×N estados distintos antes de repetir — aqui, 16.',
        'Diferente do contador binário, cada estado usa exatamente um "degrau" — mais fácil de decodificar visualmente.',
      ],
      next: [],
      observe: [
        'Um novo LED acende a cada borda de subida, sem apagar os anteriores, até todos os 8 acenderem.',
        'Depois disso, os LEDs apagam na mesma ordem em que acenderam.',
        'O ciclo completo dura 16 bordas de subida (32 Ticks).',
      ],
      experiments: [
        'Pare exatamente no estado 11110000 e confirme quantos Ticks levou.',
        'Compare a forma de onda de Q0 com a de Q4: são o mesmo sinal, defasado.',
        'Desconecte a realimentação (INV → Bit 0) e observe o padrão de 1s parar de se repetir.',
      ],
      challenge:
        'Explique por que um anel sem inversão (Q7 direto para D do estágio 0) resultaria em só 2 estados úteis (tudo 0 ou tudo 1), em vez de 16.',
      exercises: [
        'Anote a sequência completa dos 16 estados de Estágio 0..7.',
        'Identifique em qual estado o padrão é um "espelho" do estado inicial.',
        'Descreva como usar os 16 estados de um anel de Johnson para gerar um efeito de luz de neon sequencial.',
      ],
    };
  }
  return {
    ...common,
    moduleId: 'systems',
    familyIds: [],
    trackIds: [],
    difficulty: 2,
    level: 'concept',
    prerequisites: [],
    concepts: [],
    next: [],
  };
}

export const CIRCUIT_EXAMPLES: CircuitExample[] = RAW_CIRCUIT_EXAMPLES.map((example) => ({
  ...example,
  ...metadataFor(example),
}));

function lesson(
  id: string,
  title: string,
  description: string,
  exampleIds: string[],
): CircuitLesson {
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
  lesson(
    'first-steps',
    'Aula 1 — Sinais e portas básicas',
    'Começa do zero: o que é um sinal 0/1, como fios transportam sinais, como LEDs observam saídas e como NOT, AND, OR, XOR, NAND, NOR e XNOR transformam entradas.',
    [
      'signal-led-basic',
      'not-basic',
      'and-basic',
      'or-basic',
      'xor',
      'nand-basic',
      'nor-basic',
      'xnor-basic',
      'nand-not',
      'microwave-safety-challenge',
    ],
  ),
  lesson(
    'truth-tables',
    'Aula 2 — Aritmética binária',
    'Use tabela verdade para entender soma, transporte, empréstimo e comparação de bits.',
    [
      'half-adder',
      'full-adder',
      'adder-2-bit',
      'adder-4-bit',
      'adder-4-bit-gates',
      'half-subtractor',
      'full-subtractor',
      'subtractor-4-bit',
      'subtractor-4-bit-gates',
      'comparator-1-bit',
      'alu-4-bit',
    ],
  ),
  lesson(
    'combinational-blocks',
    'Aula 3 — Seleção e codificação',
    'Multiplexadores, decodificadores, encoders e detectores combinacionais.',
    ['mux-2-1', 'mux-4-1', 'decoder-2-4', 'demux-1-2', 'encoder-4-2', 'odd-parity-3', 'majority-3'],
  ),
  lesson(
    'memory-latches',
    'Aula 4 — Memória e latches',
    'Primeiros circuitos que mantêm estado, tanto nativos quanto por realimentação.',
    [
      'd-latch-basic',
      'sr-latch-nor-experiment',
      'sr-latch-nand-active-low',
      'gated-d-latch-from-nand',
    ],
  ),
  lesson(
    'clocked-systems',
    'Aula 5 — Clock, flip-flops e registradores',
    'Circuitos sincronizados pelo Tick ou pelo clock automático.',
    [
      'd-flip-flop-basic',
      'register-4-basic',
      'sync-counter-8bit',
      'ripple-counter-broken',
      'johnson-counter-8bit',
    ],
  ),
];
