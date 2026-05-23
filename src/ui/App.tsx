import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { COMPONENT_DEFINITIONS } from '../core/catalog';
import { evaluateCircuit } from '../core/evaluateCircuit';
import type { CircuitDocument, GateType, LogicComponent, PinRef, Point, Wire } from '../core/types';
import { downloadJson, loadCircuit, saveCircuit, STARTER_CIRCUIT } from '../state/storage';
import andGateAsset from '../assets/components/and_gate.png';
import inputSwitchOffAsset from '../assets/components/input_switch_off.png';
import ledOffAsset from '../assets/components/led_off.png';
import nandGateAsset from '../assets/components/nand_gate.png';
import norGateAsset from '../assets/components/nor_gate.png';
import notGateAsset from '../assets/components/not_gate.png';
import orGateAsset from '../assets/components/or_gate.png';
import outputPortAsset from '../assets/components/output_port.png';
import xnorGateAsset from '../assets/components/xnor_gate.png';
import xorGateAsset from '../assets/components/xor_gate.png';
import { CircuitCanvas, type WireStyle } from './editor/CircuitCanvas';

const GRID = 20;
const HISTORY_LIMIT = 100;
const WIRE_STYLE_STORAGE_KEY = 'opencircuit-wire-style';

type Selection = { componentIds: string[]; wireIds: string[] };
type HistoryState = { past: CircuitDocument[]; future: CircuitDocument[] };
type ContextMenu =
  | { kind: 'canvas'; x: number; y: number; point: Point }
  | { kind: 'component'; x: number; y: number; componentId: string }
  | { kind: 'wire'; x: number; y: number; wireId: string }
  | null;

const EMPTY_SELECTION: Selection = { componentIds: [], wireIds: [] };
const COMPONENT_TOOL_ASSETS: Partial<Record<GateType, string>> = {
  input: inputSwitchOffAsset,
  button: outputPortAsset,
  led: ledOffAsset,
  and: andGateAsset,
  nand: nandGateAsset,
  or: orGateAsset,
  nor: norGateAsset,
  xor: xorGateAsset,
  xnor: xnorGateAsset,
  not: notGateAsset,
};

const TOOL_GROUPS: Array<{ title: string; tools: GateType[] }> = [
  { title: 'Entradas', tools: ['input', 'button'] },
  { title: 'Saídas', tools: ['led'] },
  { title: 'Portas Lógicas', tools: ['and', 'nand', 'or', 'nor', 'xor', 'xnor', 'not'] },
  {
    title: 'Blocos Combinacionais',
    tools: ['half-adder', 'full-adder', 'mux-2-1', 'mux-4-1', 'decoder-2-4', 'comparator-1-bit', 'encoder-4-2', 'odd-parity-3', 'majority-3', 'half-subtractor', 'full-subtractor'],
  },
  { title: 'Anotações', tools: ['text'] },
];

const CIRCUIT_EXAMPLES: Array<{ id: string; name: string; circuit: CircuitDocument }> = [
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

export function App() {
  const [circuit, setCircuit] = useState<CircuitDocument>(() => loadCircuit());
  const [selectedTool, setSelectedTool] = useState<GateType | 'select' | 'wire' | 'pan'>('select');
  const [pendingWire, setPendingWire] = useState<PinRef | null>(null);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [message, setMessage] = useState('Pronto para testar lógica.');
  const [wireStyle, setWireStyle] = useState<WireStyle>(() => loadWireStyle());
  const [truthPanelWidth, setTruthPanelWidth] = useState(320);
  const [resizingTruthPanel, setResizingTruthPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const evaluation = useMemo(() => evaluateCircuit(circuit), [circuit]);

  useEffect(() => {
    localStorage.setItem(WIRE_STYLE_STORAGE_KEY, wireStyle);
  }, [wireStyle]);

  useEffect(() => {
    saveCircuit(circuit);
  }, [circuit]);

  useEffect(() => {
    if (!resizingTruthPanel) return;

    function onMouseMove(event: globalThis.MouseEvent) {
      const nextWidth = Math.min(620, Math.max(260, window.innerWidth - event.clientX));
      setTruthPanelWidth(nextWidth);
    }

    function onMouseUp() {
      setResizingTruthPanel(false);
    }

    document.body.classList.add('resizing-panel');
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      document.body.classList.remove('resizing-panel');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingTruthPanel]);

  useEffect(() => {
    function closeContextMenu() {
      setContextMenu(null);
    }

    window.addEventListener('click', closeContextMenu);
    window.addEventListener('resize', closeContextMenu);
    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('resize', closeContextMenu);
    };
  }, []);

  useEffect(() => {
    function releaseButtons() {
      setCircuit((current) => ({
        ...current,
        components: current.components.map((component) =>
          component.type === 'button' && component.state ? { ...component, state: false } : component,
        ),
      }));
    }

    window.addEventListener('mouseup', releaseButtons);
    window.addEventListener('blur', releaseButtons);
    return () => {
      window.removeEventListener('mouseup', releaseButtons);
      window.removeEventListener('blur', releaseButtons);
    };
  }, []);

  useEffect(() => {
    function isEditingText(target: EventTarget | null): boolean {
      const element = target as HTMLElement | null;
      return element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA' || Boolean(element?.isContentEditable);
    }

    function onSpaceDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || event.repeat || isEditingText(event.target)) return;
      event.preventDefault();
      event.stopPropagation();

      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement?.tagName === 'BUTTON') activeElement.blur();

      setSelectedTool('pan');
      setMessage('Ferramenta Mão ativa.');
    }

    window.addEventListener('keydown', onSpaceDown, true);
    return () => {
      window.removeEventListener('keydown', onSpaceDown, true);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditingText = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isEditingText) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (contextMenu) {
          setContextMenu(null);
          return;
        }
        const hadPendingWire = Boolean(pendingWire);
        setPendingWire(null);
        setSelectedTool('select');
        setMessage(hadPendingWire ? 'Conexão cancelada. Modo selecionar.' : 'Modo selecionar.');
        return;
      }

      const key = event.key.toLowerCase();
      const command = event.ctrlKey || event.metaKey;
      const isUndo = command && key === 'z' && !event.shiftKey;
      const isRedo = command && ((key === 'z' && event.shiftKey) || key === 'y');

      if (isUndo) {
        event.preventDefault();
        undo();
        return;
      }

      if (isRedo) {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (!hasSelection(selection)) return;

      event.preventDefault();
      removeSelection();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selection, pendingWire, history, circuit, contextMenu]);

  function rememberCircuit(snapshot: CircuitDocument = circuit) {
    setHistory((current) => ({
      past: [...current.past, snapshot].slice(-HISTORY_LIMIT),
      future: [],
    }));
  }

  function restoreCircuit(nextCircuit: CircuitDocument, nextMessage: string) {
    setCircuit(nextCircuit);
    setPendingWire(null);
    setSelection(EMPTY_SELECTION);
    setSelectedTool('select');
    setMessage(nextMessage);
  }

  function undo() {
    const previous = history.past[history.past.length - 1];
    if (!previous) {
      setMessage('Nada para desfazer.');
      return;
    }

    setHistory((current) => ({
      past: current.past.slice(0, -1),
      future: [circuit, ...current.future].slice(0, HISTORY_LIMIT),
    }));
    restoreCircuit(previous, 'Desfeito.');
  }

  function redo() {
    const next = history.future[0];
    if (!next) {
      setMessage('Nada para refazer.');
      return;
    }

    setHistory((current) => ({
      past: [...current.past, circuit].slice(-HISTORY_LIMIT),
      future: current.future.slice(1),
    }));
    restoreCircuit(next, 'Refeito.');
  }

  function openCanvasMenu(x: number, y: number, point: Point) {
    if (pendingWire) {
      setPendingWire(null);
      setSelectedTool('select');
    }
    setContextMenu({ kind: 'canvas', x, y, point });
  }

  function openComponentMenu(x: number, y: number, componentId: string) {
    if (!selection.componentIds.includes(componentId)) {
      selectComponent(componentId);
    }
    setContextMenu({ kind: 'component', x, y, componentId });
  }

  function openWireMenu(x: number, y: number, wireId: string) {
    if (!selection.wireIds.includes(wireId)) {
      selectWire(wireId);
    }
    setContextMenu({ kind: 'wire', x, y, wireId });
  }

  function addComponent(type: GateType, point: Point) {
    const snapped = snap(point);
    const id = nextId(type, circuit.components);
    const component: LogicComponent = {
      id,
      type,
      x: snapped.x,
      y: snapped.y,
      label: defaultLabel(type, id),
      state: type === 'input' || type === 'button' ? false : undefined,
    };
    rememberCircuit();
    setCircuit((current) => ({ ...current, components: [...current.components, component] }));
    setSelection({ componentIds: [id], wireIds: [] });
    setMessage(`${COMPONENT_DEFINITIONS[type].label} adicionado.`);
  }

  function addComponentFromContextMenu(type: GateType) {
    if (!contextMenu || contextMenu.kind !== 'canvas') return;
    addComponent(type, contextMenu.point);
    setContextMenu(null);
  }

  function beginMoveComponent() {
    rememberCircuit();
  }

  function moveComponents(moves: Array<{ componentId: string; point: Point }>) {
    const positions = new Map(
      moves.map((move) => [move.componentId, snap(move.point)]),
    );
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) => {
        const position = positions.get(component.id);
        return position ? { ...component, x: position.x, y: position.y } : component;
      }),
    }));
  }

  function toggleInput(componentId: string) {
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === componentId && component.type === 'input'
          ? { ...component, state: !component.state }
          : component,
      ),
    }));
  }

  function setButtonPressed(componentId: string, pressed: boolean) {
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === componentId && component.type === 'button'
          ? { ...component, state: pressed }
          : component,
      ),
    }));
  }

  function onPinClick(pin: PinRef, kind: 'input' | 'output') {
    if (kind === 'output') {
      setPendingWire(pin);
      setSelectedTool('wire');
      setMessage('Agora clique em um pino de entrada.');
      return;
    }

    if (!pendingWire) {
      setMessage('Comece o fio clicando em uma saída.');
      return;
    }

    if (pendingWire.componentId === pin.componentId) {
      setMessage('Não conectei: origem e destino são o mesmo componente.');
      setPendingWire(null);
      return;
    }

    const inputAlreadyUsed = circuit.wires.some(
      (wire) => wire.to.componentId === pin.componentId && wire.to.pinId === pin.pinId,
    );
    const duplicate = circuit.wires.some(
      (wire) =>
        wire.from.componentId === pendingWire.componentId &&
        wire.from.pinId === pendingWire.pinId &&
        wire.to.componentId === pin.componentId &&
        wire.to.pinId === pin.pinId,
    );

    if (inputAlreadyUsed || duplicate) {
      setMessage(inputAlreadyUsed ? 'Entrada já conectada.' : 'Esse fio já existe.');
      setPendingWire(null);
      setSelectedTool('select');
      return;
    }

    const wire: Wire = { id: `W${Date.now()}`, from: pendingWire, to: pin };
    rememberCircuit();
    setCircuit((current) => ({ ...current, wires: [...current.wires, wire] }));
    setSelection({ componentIds: [], wireIds: [wire.id] });
    setMessage('Fio conectado.');
    setPendingWire(null);
    setSelectedTool('select');
  }

  function clearSelection() {
    setSelection(EMPTY_SELECTION);
  }

  function selectComponent(componentId: string) {
    setSelection({ componentIds: [componentId], wireIds: [] });
  }

  function selectWire(wireId: string) {
    setSelection({ componentIds: [], wireIds: [wireId] });
  }

  function selectItems(nextSelection: Selection) {
    setSelection(nextSelection);
    const count = nextSelection.componentIds.length + nextSelection.wireIds.length;
    setMessage(count === 0 ? 'Nada selecionado.' : `${count} item(ns) selecionado(s).`);
  }

  function removeSelection() {
    if (!hasSelection(selection)) return;
    const componentIds = new Set(selection.componentIds);
    const wireIds = new Set(selection.wireIds);
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      components: current.components.filter((component) => !componentIds.has(component.id)),
      wires: current.wires.filter(
        (wire) =>
          !wireIds.has(wire.id) &&
          !componentIds.has(wire.from.componentId) &&
          !componentIds.has(wire.to.componentId),
      ),
    }));
    if (pendingWire && componentIds.has(pendingWire.componentId)) {
      setPendingWire(null);
      setSelectedTool('select');
    }
    setSelection(EMPTY_SELECTION);
    setMessage('Seleção removida.');
  }

  function cancelPendingWire() {
    if (!pendingWire) return;
    setSelectedTool('select');
    setPendingWire(null);
    setMessage('Conexão cancelada.');
  }

  function removeContextTarget() {
    if (!contextMenu || contextMenu.kind === 'canvas') return;
    const targetIsSelected =
      contextMenu.kind === 'component'
        ? selection.componentIds.includes(contextMenu.componentId)
        : selection.wireIds.includes(contextMenu.wireId);

    if (targetIsSelected && hasSelection(selection)) {
      removeSelection();
    } else if (contextMenu.kind === 'component') {
      removeComponent(contextMenu.componentId);
    } else {
      removeWire(contextMenu.wireId);
    }
    setContextMenu(null);
  }

  function removeWire(wireId: string) {
    rememberCircuit();
    setCircuit((current) => ({ ...current, wires: current.wires.filter((wire) => wire.id !== wireId) }));
    setSelection((current) => ({
      componentIds: current.componentIds,
      wireIds: current.wireIds.filter((id) => id !== wireId),
    }));
    setMessage('Fio removido.');
  }

  function renameComponent(componentId: string, label: string) {
    const currentComponent = circuit.components.find((component) => component.id === componentId);
    if (!currentComponent || currentComponent.label === label) return;
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === componentId ? { ...component, label } : component,
      ),
    }));
    setMessage(`Componente renomeado para ${label}.`);
  }

  function resizeTextComponent(componentId: string, width: number) {
    setCircuit((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === componentId && component.type === 'text'
          ? { ...component, width: Math.round(width) }
          : component,
      ),
    }));
  }

  function removeComponent(componentId: string) {
    rememberCircuit();
    setCircuit((current) => ({
      ...current,
      components: current.components.filter((component) => component.id !== componentId),
      wires: current.wires.filter(
        (wire) => wire.from.componentId !== componentId && wire.to.componentId !== componentId,
      ),
    }));
    if (pendingWire?.componentId === componentId) {
      setPendingWire(null);
      setSelectedTool('select');
    }
    setSelection((current) => ({
      componentIds: current.componentIds.filter((id) => id !== componentId),
      wireIds: [],
    }));
    setMessage('Componente removido.');
  }

  function resetCircuit() {
    rememberCircuit();
    setCircuit(STARTER_CIRCUIT);
    setPendingWire(null);
    setSelection(EMPTY_SELECTION);
    setSelectedTool('select');
    setMessage('Circuito de exemplo restaurado.');
  }

  function loadExample(exampleId: string) {
    const example = CIRCUIT_EXAMPLES.find((candidate) => candidate.id === exampleId);
    if (!example) return;
    rememberCircuit();
    setCircuit(cloneCircuit(example.circuit));
    setPendingWire(null);
    setSelection(EMPTY_SELECTION);
    setSelectedTool('select');
    setMessage(`Exemplo carregado: ${example.name}.`);
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text()
      .then((text) => {
        const parsed = JSON.parse(text) as CircuitDocument;
        if (parsed.version !== 1 || !Array.isArray(parsed.components) || !Array.isArray(parsed.wires)) {
          throw new Error('Formato inválido');
        }
        rememberCircuit();
        setCircuit(parsed);
        setSelection(EMPTY_SELECTION);
        setMessage('Circuito importado.');
      })
      .catch(() => setMessage('Não foi possível importar esse JSON.'));
    event.target.value = '';
  }

  return (
    <main className="app-shell">
      <header className="app-titlebar">
        <div className="brand-block">
          <span className="app-icon">OC</span>
          <strong>OpenCircuit</strong>
          <span className="project-name">Projeto: circuito_logico.json</span>
        </div>

      </header>

      <div className="commandbar">
        <button onClick={() => fileInputRef.current?.click()}>Abrir</button>
        <button onClick={() => downloadJson('circuito-logico.json', circuit)}>Salvar</button>
        <select
          className="examples-select"
          value=""
          onChange={(event) => {
            loadExample(event.target.value);
            event.target.value = '';
          }}
          aria-label="Exemplos"
        >
          <option value="" disabled>Exemplos</option>
          {CIRCUIT_EXAMPLES.map((example) => (
            <option key={example.id} value={example.id}>{example.name}</option>
          ))}
        </select>
        <span className="command-separator" />
        <button onClick={undo} disabled={history.past.length === 0}>Desfazer</button>
        <button onClick={redo} disabled={history.future.length === 0}>Refazer</button>
        <span className="command-separator" />
        <button onClick={() => setSelectedTool('pan')} className={selectedTool === 'pan' ? 'active' : ''}>Mão</button>
        <button onClick={() => setSelectedTool('select')} className={selectedTool === 'select' ? 'active' : ''}>Selecionar</button>
        <label className="wire-style-control">
          Fios
          <select value={wireStyle} onChange={(event) => setWireStyle(event.target.value as WireStyle)}>
            <option value="orthogonal">Ortogonal</option>
            <option value="bezier">Curvo</option>
          </select>
        </label>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={importJson} hidden />
      </div>

      <section
        className="app-layout"
        style={{ gridTemplateColumns: `250px minmax(520px, 1fr) 8px ${truthPanelWidth}px` }}
      >
        <aside className="library-panel" aria-label="Biblioteca de componentes">
          <div className="panel-header">Biblioteca</div>
          <div className="tool-groups">
            {TOOL_GROUPS.map((group) => (
              <section className="tool-group" key={group.title}>
                <h2>{group.title}</h2>
                <div className="tool-grid">
                  {group.tools.map((type) => (
                    <button
                      key={type}
                      className={`tool-card ${selectedTool === type ? 'active' : ''}`}
                      draggable
                      onClick={() => setSelectedTool(type)}
                      onDragStart={(event) => event.dataTransfer.setData('application/opencircuit-gate', type)}
                    >
                      <ToolButtonContent type={type} />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <div className="center-panel">
          <div className="document-tabs">
            <button className="document-tab active">circuito_logico.json</button>
            <button className="document-tab add-tab">+</button>
          </div>
          <div className="editor-panel">
            <CircuitCanvas
              circuit={circuit}
              evaluation={evaluation}
              selectedTool={selectedTool}
              wireStyle={wireStyle}
              pendingWire={pendingWire}
              selection={selection}
              onCanvasAdd={addComponent}
              onBeginMoveComponent={beginMoveComponent}
              onMoveComponents={moveComponents}
              onResizeTextComponent={resizeTextComponent}
              onToggleInput={toggleInput}
              onSetButtonPressed={setButtonPressed}
              onPinClick={onPinClick}
              onRemoveWire={removeWire}
              onRemoveComponent={removeComponent}
              onRenameComponent={renameComponent}
              onCancelPendingWire={cancelPendingWire}
              onOpenCanvasMenu={openCanvasMenu}
              onOpenComponentMenu={openComponentMenu}
              onOpenWireMenu={openWireMenu}
              onSelectComponent={selectComponent}
              onSelectWire={selectWire}
              onSelectItems={selectItems}
              onClearSelection={clearSelection}
              onSelectTool={setSelectedTool}
            />
          </div>
        </div>

        <div
          className="panel-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar tabela verdade"
          onMouseDown={(event) => {
            event.preventDefault();
            setResizingTruthPanel(true);
          }}
        />

        <aside className="properties-panel truth-panel">
          <div className="panel-header">Tabela Verdade</div>
          <CircuitTruthTable circuit={circuit} />
        </aside>
      </section>

      <footer className="statusbar app-footer">
        <span>{message}</span>
        <span>{circuit.components.length} componentes · {circuit.wires.length} fios</span>
      </footer>

      {contextMenu && (
        <ContextMenuView
          menu={contextMenu}
          selection={selection}
          onAddComponent={addComponentFromContextMenu}
          onRemove={removeContextTarget}
        />
      )}
    </main>
  );
}

function CircuitTruthTable({ circuit }: { circuit: CircuitDocument }) {
  const inputs = circuit.components.filter((component) => component.type === 'input');
  const outputs = circuit.components.filter((component) => component.type === 'led');
  const maxInputs = 6;

  if (inputs.length === 0) {
    return <div className="properties-card muted-card">Adicione componentes Input para gerar a tabela verdade do circuito.</div>;
  }

  if (outputs.length === 0) {
    return <div className="properties-card muted-card">Adicione LEDs para observar as saídas do circuito.</div>;
  }

  if (inputs.length > maxInputs) {
    return (
      <div className="properties-card muted-card">
        Este circuito tem {inputs.length} entradas, gerando {2 ** inputs.length} combinações. O limite atual é {maxInputs} entradas.
      </div>
    );
  }

  const rows = buildCircuitTruthRows(circuit, inputs, outputs);
  const currentInputValues = inputs.map((input) => Boolean(input.state));

  return (
    <div className="properties-card truth-table-card">
      <span className="property-subtitle">Circuito inteiro</span>
      <div className="truth-table-wrap">
        <table className="truth-table circuit-truth-table">
          <thead>
            <tr>
              {inputs.map((input) => <th key={input.id}>{input.label ?? input.id}</th>)}
              {outputs.map((output) => <th key={output.id}>{output.label ?? output.id}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const isCurrent = sameBooleanValues(row.inputs, currentInputValues);
              return (
                <tr key={rowIndex} className={isCurrent ? 'current-truth-row' : undefined}>
                  {row.inputs.map((value, index) => <td key={`i-${index}`}>{bit(value)}</td>)}
                  {row.outputs.map((value, index) => <td key={`o-${index}`} className={truthOutputClass(value)}>{bit(value)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ToolButtonContent({ type }: { type: GateType }) {
  const asset = COMPONENT_TOOL_ASSETS[type];
  return (
    <span className="tool-button-content">
      {asset && <img className="tool-icon" src={asset} alt="" aria-hidden="true" />}
      <span>{COMPONENT_DEFINITIONS[type].label}</span>
    </span>
  );
}

function ContextMenuView({ menu, selection, onAddComponent, onRemove }: {
  menu: NonNullable<ContextMenu>;
  selection: Selection;
  onAddComponent: (type: GateType) => void;
  onRemove: () => void;
}) {
  const selectedCount = selection.componentIds.length + selection.wireIds.length;
  const canRemove = menu.kind !== 'canvas';

  return (
    <div
      className="context-menu"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      role="menu"
    >
      {menu.kind === 'canvas' ? (
        <>
          <div className="context-menu-title">Adicionar</div>
          {LOGIC_COMPONENT_TOOLS.map((type) => (
            <button key={type} onClick={() => onAddComponent(type)} role="menuitem">
              <ToolButtonContent type={type} />
            </button>
          ))}
        </>
      ) : (
        <button disabled={!canRemove} onClick={onRemove} role="menuitem">
          {selectedCount > 1 ? `Excluir seleção (${selectedCount})` : 'Excluir'}
        </button>
      )}
    </div>
  );
}

function buildCircuitTruthRows(circuit: CircuitDocument, inputs: LogicComponent[], outputs: LogicComponent[]) {
  const rowCount = 2 ** inputs.length;
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const inputValues = inputs.map((_, inputIndex) => {
      const bitIndex = inputs.length - inputIndex - 1;
      return Boolean((rowIndex >> bitIndex) & 1);
    });
    const inputValueById = new Map(inputs.map((input, index) => [input.id, inputValues[index]]));
    const testCircuit: CircuitDocument = {
      ...circuit,
      components: circuit.components.map((component) =>
        component.type === 'input'
          ? { ...component, state: inputValueById.get(component.id) ?? false }
          : component,
      ),
    };
    const result = evaluateCircuit(testCircuit);
    return {
      inputs: inputValues,
      outputs: outputs.map((output) => Boolean(result[output.id]?.in)),
    };
  });
}

function sameBooleanValues(left: boolean[], right: boolean[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function bit(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

function truthOutputClass(value: boolean): string {
  return value ? 'truth-output on' : 'truth-output';
}

function loadWireStyle(): WireStyle {
  const stored = localStorage.getItem(WIRE_STYLE_STORAGE_KEY);
  return stored === 'bezier' ? 'bezier' : 'orthogonal';
}

function cloneCircuit(circuit: CircuitDocument): CircuitDocument {
  return {
    version: circuit.version,
    components: circuit.components.map((component) => ({ ...component })),
    wires: circuit.wires.map((wire) => ({
      id: wire.id,
      from: { ...wire.from },
      to: { ...wire.to },
    })),
  };
}

function hasSelection(selection: Selection): boolean {
  return selection.componentIds.length > 0 || selection.wireIds.length > 0;
}

function snap(point: Point): Point {
  return { x: Math.round(point.x / GRID) * GRID, y: Math.round(point.y / GRID) * GRID };
}

const LOGIC_COMPONENT_TOOLS: GateType[] = TOOL_GROUPS.flatMap((group) => group.tools);

function nextId(type: GateType, components: LogicComponent[]): string {
  const prefixByType: Record<GateType, string> = {
    input: 'I',
    button: 'P',
    led: 'L',
    and: 'A',
    nand: 'NA',
    or: 'O',
    nor: 'NO',
    xor: 'X',
    xnor: 'XN',
    not: 'N',
    text: 'T',
    'half-adder': 'HS',
    'full-adder': 'FS',
    'mux-2-1': 'M2',
    'mux-4-1': 'M4',
    'decoder-2-4': 'D',
    'comparator-1-bit': 'C',
    'encoder-4-2': 'E',
    'odd-parity-3': 'P',
    'majority-3': 'MJ',
    'half-subtractor': 'HSub',
    'full-subtractor': 'FSub',
  };
  const prefix = prefixByType[type];
  let index = components.length + 1;
  let id = `${prefix}${index}`;
  const ids = new Set(components.map((component) => component.id));
  while (ids.has(id)) {
    index += 1;
    id = `${prefix}${index}`;
  }
  return id;
}

function defaultLabel(type: GateType, id: string): string {
  if (type === 'input') return id;
  if (type === 'button') return 'Pulso';
  if (type === 'led') return 'LED';
  if (type === 'text') return 'Texto';
  return COMPONENT_DEFINITIONS[type].label;
}
