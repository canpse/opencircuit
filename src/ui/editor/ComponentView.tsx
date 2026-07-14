import { MouseEvent } from 'react';
import { COMPONENT_DEFINITIONS } from '../../core/catalog';
import type { EvaluationResult, GateType, LogicComponent, PinRef } from '../../core/types';
import andGateAsset from '../../assets/components/and_gate.png';
import inputSwitchOffAsset from '../../assets/components/input_switch_off.png';
import inputSwitchOnAsset from '../../assets/components/input_switch_on.png';
import ledOffAsset from '../../assets/components/led_off.png';
import ledOnAsset from '../../assets/components/led_green_on.png';
import nandGateAsset from '../../assets/components/nand_gate.png';
import norGateAsset from '../../assets/components/nor_gate.png';
import notGateAsset from '../../assets/components/not_gate.png';
import orGateAsset from '../../assets/components/or_gate.png';
import clockSourceAsset from '../../assets/components/clock_source.png';
import outputPortAsset from '../../assets/components/output_port.png';
import xnorGateAsset from '../../assets/components/xnor_gate.png';
import xorGateAsset from '../../assets/components/xor_gate.png';
import { textComponentWidth, wrapText } from './wireRouting';

const GATE_ASSETS: Partial<Record<GateType, string>> = {
  and: andGateAsset,
  nand: nandGateAsset,
  or: orGateAsset,
  nor: norGateAsset,
  xor: xorGateAsset,
  xnor: xnorGateAsset,
  not: notGateAsset,
};

export function ComponentView({
  component,
  evaluation,
  selected,
  onMouseDown,
  onContextMenu,
  onToggleInput,
  onSetButtonPressed,
  onRemove,
  onRenameStart,
  onResizeStart,
  onPinMouseDown,
  onPinMouseUp,
  onPinClick,
}: {
  component: LogicComponent;
  evaluation: EvaluationResult;
  selected: boolean;
  onMouseDown: (event: MouseEvent<SVGGElement>) => void;
  onContextMenu: (event: MouseEvent<SVGGElement>) => void;
  onToggleInput: () => void;
  onSetButtonPressed: (pressed: boolean) => void;
  onRemove: () => void;
  onRenameStart: () => void;
  onResizeStart: (event: MouseEvent<SVGRectElement>) => void;
  onPinMouseDown: (pin: PinRef, kind: 'input' | 'output') => void;
  onPinMouseUp: (pin: PinRef, kind: 'input' | 'output') => void;
  onPinClick: (pin: PinRef, kind: 'input' | 'output') => void;
}) {
  const definition = COMPONENT_DEFINITIONS[component.type];
  const bodyWidth = component.type === 'text' ? textComponentWidth(component) : definition.width;
  const labelLines =
    component.type === 'text' ? wrapText(component.label ?? definition.label, bodyWidth - 42) : [];
  const textBodyHeight = Math.max(definition.height, labelLines.length * 18 + 24);
  const bodyHeight = component.type === 'text' ? textBodyHeight : definition.height;
  const outputValue = Boolean(evaluation[component.id]?.out);
  const ledValue = Boolean(evaluation[component.id]?.in);
  const buttonPressed = component.type === 'button' && Boolean(component.state);
  const clockValue = component.type === 'clock' && Boolean(evaluation[component.id]?.CLK);
  const gateAsset = GATE_ASSETS[component.type];
  const isCombinationalBlock =
    !gateAsset && !['input', 'button', 'led', 'text'].includes(component.type);

  return (
    <g
      transform={`translate(${component.x}, ${component.y})`}
      className={`component ${selected ? 'selected' : ''}`}
      onMouseDown={onMouseDown}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu(event);
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRenameStart();
      }}
    >
      <rect
        className={component.type === 'text' ? 'text-note-body' : 'gate-body'}
        width={bodyWidth}
        height={bodyHeight}
        rx="14"
      />
      <g
        className="remove-component"
        transform={`translate(${bodyWidth - 8}, 8)`}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        <circle r="10" />
        <text y="4" textAnchor="middle">
          ×
        </text>
      </g>
      {component.type === 'led' && (
        <image
          className="component-asset led-asset"
          href={ledValue ? ledOnAsset : ledOffAsset}
          x={definition.width / 2 - 23}
          y="3"
          width="46"
          height="46"
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {component.type === 'input' && (
        <image
          className="component-asset input-asset"
          href={outputValue ? inputSwitchOnAsset : inputSwitchOffAsset}
          x="12"
          y="5"
          width="54"
          height="42"
          preserveAspectRatio="xMidYMid meet"
          onClick={(event) => {
            event.stopPropagation();
            onToggleInput();
          }}
        />
      )}
      {component.type === 'clock' && (
        <image
          className={`component-asset clock-asset ${clockValue ? 'on' : ''}`}
          href={clockSourceAsset}
          x="18"
          y="8"
          width={definition.width - 36}
          height={definition.height - 16}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {component.type === 'button' && (
        <g
          className="pulse-button"
          onMouseDown={(event) => {
            event.stopPropagation();
            onSetButtonPressed(true);
          }}
          onMouseUp={(event) => {
            event.stopPropagation();
            onSetButtonPressed(false);
          }}
          onMouseLeave={() => onSetButtonPressed(false)}
        >
          <rect className="component-hitbox" x="12" y="4" width="62" height="46" rx="10" />
          <image
            className={`component-asset button-asset ${buttonPressed ? 'pressed' : ''}`}
            href={outputPortAsset}
            x="17"
            y={buttonPressed ? 8 : 5}
            width="52"
            height="42"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      )}
      {component.type === 'text' && (
        <>
          <text
            className="text-note-label editable-label"
            x="14"
            y="22"
            textAnchor="start"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRenameStart();
            }}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRenameStart();
            }}
          >
            {labelLines.map((line, index) => (
              <tspan key={`${line}-${index}`} x="14" dy={index === 0 ? 0 : 18}>
                {line}
              </tspan>
            ))}
          </text>
          <rect
            className="text-resize-handle"
            x={bodyWidth - 12}
            y={bodyHeight - 12}
            width="12"
            height="12"
            rx="3"
            onMouseDown={onResizeStart}
          />
        </>
      )}
      {isCombinationalBlock && (
        <text
          className="block-component-title editable-label"
          x={definition.width / 2}
          y="18"
          textAnchor="middle"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRenameStart();
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRenameStart();
          }}
        >
          {component.label ?? definition.label}
        </text>
      )}
      {gateAsset && (
        <image
          className="component-asset gate-asset"
          href={gateAsset}
          x="8"
          y="6"
          width={definition.width - 16}
          height={definition.height - 12}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {component.type !== 'text' && !isCombinationalBlock && (
        <text
          className="component-label editable-label"
          x={definition.width / 2}
          y={definition.height + 18}
          textAnchor="middle"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRenameStart();
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRenameStart();
          }}
        >
          {component.label ?? definition.label}
        </text>
      )}
      {definition.pins.map((pin) => {
        const value = Boolean(evaluation[component.id]?.[pin.id]);
        return (
          <g
            key={pin.id}
            className="pin-hitbox"
            onMouseDown={(event) => {
              event.stopPropagation();
              if (event.button !== 0) return;
              onPinMouseDown({ componentId: component.id, pinId: pin.id }, pin.kind);
            }}
            onMouseUp={(event) => {
              if (event.button !== 0) return;
              event.stopPropagation();
              onPinMouseUp({ componentId: component.id, pinId: pin.id }, pin.kind);
            }}
            onClick={(event) => {
              event.stopPropagation();
              onPinClick({ componentId: component.id, pinId: pin.id }, pin.kind);
            }}
          >
            <circle
              className={`pin ${pin.kind} ${value ? 'on' : ''}`}
              cx={pin.offset.x}
              cy={pin.offset.y}
              r="7"
            />
            {pin.kind === 'input' && component.type !== 'led' && component.type !== 'not' && (
              <text
                className="pin-label"
                x={pin.offset.x + 12}
                y={pin.offset.y + 4}
                textAnchor="start"
              >
                {pin.label}
              </text>
            )}
            {pin.kind === 'output' &&
              definition.pins.filter((candidate) => candidate.kind === 'output').length > 1 && (
                <text
                  className="pin-label"
                  x={pin.offset.x - 12}
                  y={pin.offset.y + 4}
                  textAnchor="end"
                >
                  {pin.label}
                </text>
              )}
          </g>
        );
      })}
    </g>
  );
}
