import { useRef, useState } from 'react';
import type { PinRef, Point } from '../../core/types';

export type Marquee = { start: Point; end: Point } | null;
export type ComponentDrag = {
  componentIds: string[];
  startMouse: Point;
  origins: Record<string, Point>;
  recorded: boolean;
} | null;
export type TextResize = {
  componentId: string;
  startMouse: Point;
  startWidth: number;
  recorded: boolean;
} | null;
export type WireWaypointDrag = {
  wireId: string;
  waypointIndex: number;
  isNew: boolean;
  startMouse: Point;
  recorded: boolean;
} | null;

export function useCanvasInteractionState() {
  const [dragging, setDragging] = useState<ComponentDrag>(null);
  const [mousePoint, setMousePoint] = useState<Point | null>(null);
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [resizingText, setResizingText] = useState<TextResize>(null);
  const [dragConnecting, setDragConnecting] = useState<PinRef | null>(null);
  const [wireWaypointDrag, setWireWaypointDrag] = useState<WireWaypointDrag>(null);
  const suppressNextClickRef = useRef(false);
  const suppressNextPinClickRef = useRef(false);

  return {
    dragging,
    setDragging,
    mousePoint,
    setMousePoint,
    marquee,
    setMarquee,
    resizingText,
    setResizingText,
    dragConnecting,
    setDragConnecting,
    wireWaypointDrag,
    setWireWaypointDrag,
    suppressNextClickRef,
    suppressNextPinClickRef,
  };
}
