import type { GateType } from '../../core/types';

export type EditorTool = GateType | 'select' | 'wire' | 'pan';
export type Selection = { componentIds: string[]; wireIds: string[] };
export type WireStyle = 'orthogonal' | 'bezier';
