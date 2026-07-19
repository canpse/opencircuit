import { useState } from 'react';
import type { LogicComponent } from '../../core/types';

// Campos que afetam a geometria do canvas (bounds, posição dos pinos e
// roteamento dos fios). `state` e `memory` ficam de fora de propósito:
// um tick de clock muda apenas o estado lógico, nunca o layout.
export function sameCanvasLayout(a: LogicComponent[], b: LogicComponent[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    const previous = a[index];
    const next = b[index];
    if (previous === next) continue;
    if (
      previous.id !== next.id ||
      previous.type !== next.type ||
      previous.x !== next.x ||
      previous.y !== next.y ||
      previous.label !== next.label ||
      previous.width !== next.width
    ) {
      return false;
    }
  }
  return true;
}

// Devolve a lista anterior enquanto o layout não muda, preservando a
// identidade referencial de componentById e das rotas entre ticks do clock.
export function useCanvasLayoutComponents(components: LogicComponent[]): LogicComponent[] {
  const [stable, setStable] = useState(components);
  if (sameCanvasLayout(stable, components)) return stable;
  // Ajuste de estado durante o render (padrão "derivar de renders
  // anteriores" da documentação do React): não re-renderiza os filhos.
  setStable(components);
  return components;
}

// Igualdade rasa entre as fatias de avaliação de um componente
// (Record<pinId, boolean>). A simulação recria os objetos a cada tick,
// então a comparação precisa ser por valor.
export function sameEvaluationValues(
  a: Record<string, boolean> | undefined,
  b: Record<string, boolean> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => a[key] === b[key]);
}
