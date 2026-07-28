import type { GateType, Point } from '../../core/types';

export type EditorTool = GateType | 'select' | 'wire' | 'pan';
export type Selection = { componentIds: string[]; wireIds: string[] };
export type WireStyle = 'orthogonal' | 'bezier';
export type ContextMenu =
  | { kind: 'canvas'; x: number; y: number; point: Point }
  | { kind: 'component'; x: number; y: number; componentId: string }
  | { kind: 'wire'; x: number; y: number; wireId: string }
  | { kind: 'waypoint'; x: number; y: number; wireId: string; waypointIndex: number }
  | null;
