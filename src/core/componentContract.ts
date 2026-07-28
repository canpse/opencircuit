import contract from './component-contract.json';
import limits from './document-limits.json';
import type { GateType, PinKind } from './types';

export const COMPONENT_CONTRACT = contract;
export const DOCUMENT_LIMITS = limits;

export type ContractPin = {
  kind: PinKind;
  width: number;
};

export function getContractPin(type: GateType, pinId: string): ContractPin | undefined {
  const pins = COMPONENT_CONTRACT[type].pins as Record<string, ContractPin>;
  return pins[pinId];
}
