import type { GateType } from '../../core/types';
import andGateAsset from '../../assets/components/and_gate.png';
import clockSourceAsset from '../../assets/components/clock_source.png';
import inputSwitchOffAsset from '../../assets/components/input_switch_off.png';
import inputSwitchOnAsset from '../../assets/components/input_switch_on.png';
import ledOffAsset from '../../assets/components/led_off.png';
import ledOnAsset from '../../assets/components/led_green_on.png';
import nandGateAsset from '../../assets/components/nand_gate.png';
import norGateAsset from '../../assets/components/nor_gate.png';
import notGateAsset from '../../assets/components/not_gate.png';
import orGateAsset from '../../assets/components/or_gate.png';
import outputPortAsset from '../../assets/components/output_port.png';
import xnorGateAsset from '../../assets/components/xnor_gate.png';
import xorGateAsset from '../../assets/components/xor_gate.png';

type ComponentAssets = {
  library?: string;
  body?: string;
  on?: string;
};

export const COMPONENT_ASSETS: Partial<Record<GateType, ComponentAssets>> = {
  input: { library: inputSwitchOffAsset, body: inputSwitchOffAsset, on: inputSwitchOnAsset },
  button: { library: outputPortAsset, body: outputPortAsset },
  led: { library: ledOffAsset, body: ledOffAsset, on: ledOnAsset },
  and: { library: andGateAsset, body: andGateAsset },
  nand: { library: nandGateAsset, body: nandGateAsset },
  or: { library: orGateAsset, body: orGateAsset },
  nor: { library: norGateAsset, body: norGateAsset },
  xor: { library: xorGateAsset, body: xorGateAsset },
  xnor: { library: xnorGateAsset, body: xnorGateAsset },
  not: { library: notGateAsset, body: notGateAsset },
  clock: { library: clockSourceAsset, body: clockSourceAsset },
};
