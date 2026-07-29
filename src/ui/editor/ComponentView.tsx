import { memo, type MouseEvent } from 'react';
import { resolveComponentDefinition } from '../../core/catalog';
import { formatBusHex } from '../../core/simulation/signals';
import type {
  CircuitDefinition,
  GateType,
  LogicComponent,
  LogicValue,
  PinRef,
} from '../../core/types';
import { textComponentWidth, wrapText } from './wireRouting';
import { isPinActive, sameEvaluationValues } from './canvasMemo';
import { COMPONENT_ASSETS } from './componentAssets';

const GATE_ASSET_TYPES: GateType[] = ['and', 'nand', 'or', 'nor', 'xor', 'xnor', 'not'];

type ComponentViewProps = {
  component: LogicComponent;
  values: Record<string, LogicValue> | undefined;
  changedPins: ReadonlyMap<string, number> | undefined;
  selected: boolean;
  onMouseDown: (event: MouseEvent<SVGGElement>, componentId: string) => void;
  onContextMenu: (event: MouseEvent<SVGGElement>, componentId: string) => void;
  onToggleInput: (componentId: string) => void;
  onSetButtonPressed: (componentId: string, pressed: boolean) => void;
  onRemove: (componentId: string) => void;
  onRenameStart: (componentId: string) => void;
  onEnterInstance: (componentId: string) => void;
  onResizeStart: (event: MouseEvent<SVGRectElement>, componentId: string) => void;
  onPinMouseDown: (pin: PinRef, kind: 'input' | 'output') => void;
  onPinMouseUp: (pin: PinRef, kind: 'input' | 'output') => void;
  onPinClick: (pin: PinRef, kind: 'input' | 'output') => void;
  definitions?: CircuitDefinition[];
};

// A simulação recria o objeto de avaliação a cada tick; comparar `values`
// por valor (e o resto por identidade) é o que impede a re-renderização
// dos componentes cujo estado lógico não mudou.
function componentViewPropsAreEqual(
  previous: ComponentViewProps,
  next: ComponentViewProps,
): boolean {
  return (
    previous.component === next.component &&
    previous.selected === next.selected &&
    sameEvaluationValues(previous.values, next.values) &&
    previous.changedPins === next.changedPins &&
    previous.onMouseDown === next.onMouseDown &&
    previous.onContextMenu === next.onContextMenu &&
    previous.onToggleInput === next.onToggleInput &&
    previous.onSetButtonPressed === next.onSetButtonPressed &&
    previous.onRemove === next.onRemove &&
    previous.onRenameStart === next.onRenameStart &&
    previous.onEnterInstance === next.onEnterInstance &&
    previous.onResizeStart === next.onResizeStart &&
    previous.onPinMouseDown === next.onPinMouseDown &&
    previous.onPinMouseUp === next.onPinMouseUp &&
    previous.onPinClick === next.onPinClick &&
    previous.definitions === next.definitions
  );
}

export const ComponentView = memo(function ComponentView({
  component,
  values,
  changedPins,
  selected,
  onMouseDown,
  onContextMenu,
  onToggleInput,
  onSetButtonPressed,
  onRemove,
  onRenameStart,
  onEnterInstance,
  onResizeStart,
  onPinMouseDown,
  onPinMouseUp,
  onPinClick,
  definitions = [],
}: ComponentViewProps) {
  const definition = resolveComponentDefinition(component, definitions);
  const isDanglingSubcircuit =
    component.type === 'subcircuit' &&
    !definitions.some((candidate) => candidate.id === component.definitionId);
  const bodyWidth = component.type === 'text' ? textComponentWidth(component) : definition.width;
  const labelLines =
    component.type === 'text' ? wrapText(component.label ?? definition.label, bodyWidth - 42) : [];
  const textBodyHeight = Math.max(definition.height, labelLines.length * 18 + 24);
  const bodyHeight = component.type === 'text' ? textBodyHeight : definition.height;
  const outputValue = Boolean(values?.out);
  const ledValue = Boolean(values?.in);
  const buttonPressed = component.type === 'button' && Boolean(component.state);
  const clockValue = component.type === 'clock' && Boolean(values?.CLK);
  const gateAsset = GATE_ASSET_TYPES.includes(component.type)
    ? COMPONENT_ASSETS[component.type]?.body
    : undefined;
  const isCombinationalBlock =
    !gateAsset && !['input', 'button', 'led', 'text'].includes(component.type);
  // A valid subcircuit instance drills into its definition on double-click (Figma-style);
  // a dangling one (definitionId doesn't resolve) falls back to rename, same as before.
  const handleDoubleClick =
    component.type === 'subcircuit' && !isDanglingSubcircuit
      ? () => onEnterInstance(component.id)
      : () => onRenameStart(component.id);

  return (
    <g
      transform={`translate(${component.x}, ${component.y})`}
      className={`component ${selected ? 'selected' : ''} ${isDanglingSubcircuit ? 'subcircuit-dangling' : ''}`}
      onMouseDown={(event) => onMouseDown(event, component.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu(event, component.id);
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        handleDoubleClick();
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
          onRemove(component.id);
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
          href={ledValue ? COMPONENT_ASSETS.led?.on : COMPONENT_ASSETS.led?.body}
          x={definition.width / 2 - 23}
          y="3"
          width="46"
          height="46"
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {component.type === 'display-4' && (
        <text
          className="display-value"
          x={definition.width / 2}
          y={definition.height / 2 + 26}
          textAnchor="middle"
        >
          {formatBusHex(values?.IN)}
        </text>
      )}
      {component.type === 'input' && (
        <image
          className="component-asset input-asset"
          href={outputValue ? COMPONENT_ASSETS.input?.on : COMPONENT_ASSETS.input?.body}
          x="12"
          y="5"
          width="54"
          height="42"
          preserveAspectRatio="xMidYMid meet"
          onClick={(event) => {
            event.stopPropagation();
            onToggleInput(component.id);
          }}
        />
      )}
      {component.type === 'clock' && (
        <image
          className={`component-asset clock-asset ${clockValue ? 'on' : ''}`}
          href={COMPONENT_ASSETS.clock?.body}
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
            onSetButtonPressed(component.id, true);
          }}
          onMouseUp={(event) => {
            event.stopPropagation();
            onSetButtonPressed(component.id, false);
          }}
          onMouseLeave={() => onSetButtonPressed(component.id, false)}
        >
          <rect className="component-hitbox" x="12" y="4" width="62" height="46" rx="10" />
          <image
            className={`component-asset button-asset ${buttonPressed ? 'pressed' : ''}`}
            href={COMPONENT_ASSETS.button?.body}
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
              onRenameStart(component.id);
            }}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRenameStart(component.id);
            }}
          >
            {labelLines.map((line, index) => (
              // Linhas repetidas não possuem outra identidade além da posição no texto.
              // eslint-disable-next-line @eslint-react/no-array-index-key
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
            onMouseDown={(event) => onResizeStart(event, component.id)}
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
            // A subcircuit instance's single click stays a no-op here (it's already
            // selected via mousedown): renaming on click would flash open right before
            // a double-click enters the instance, since click always fires first.
            if (component.type === 'subcircuit') return;
            onRenameStart(component.id);
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleDoubleClick();
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
            onRenameStart(component.id);
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRenameStart(component.id);
          }}
        >
          {component.label ?? definition.label}
        </text>
      )}
      {definition.pins.map((pin) => {
        const value = isPinActive(values?.[pin.id]);
        const isBus = Boolean(pin.width && pin.width > 1);
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
              className={`pin ${pin.kind} ${value ? 'on' : ''} ${isBus ? 'bus' : ''}`}
              cx={pin.offset.x}
              cy={pin.offset.y}
              r={isBus ? 9 : 7}
            />
            {changedPins?.has(pin.id) && (
              <circle
                key={`flash-${changedPins.get(pin.id)}`}
                className="pin-flash"
                cx={pin.offset.x}
                cy={pin.offset.y}
                r="7"
              />
            )}
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
              (component.type === 'subcircuit' ||
                definition.pins.filter((candidate) => candidate.kind === 'output').length > 1) && (
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
}, componentViewPropsAreEqual);
