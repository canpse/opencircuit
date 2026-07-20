import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { CircuitDocument } from '../../core/types';

export function useReleaseMomentaryButtons(setCircuit: Dispatch<SetStateAction<CircuitDocument>>) {
  useEffect(() => {
    function releaseButtons() {
      setCircuit((current) => {
        const hasPressedButton = current.components.some(
          (component) => component.type === 'button' && component.state,
        );
        // Sem botão pressionado, devolve o mesmo objeto para não marcar o
        // documento como modificado a cada mouseup/blur.
        if (!hasPressedButton) return current;
        return {
          ...current,
          components: current.components.map((component) =>
            component.type === 'button' && component.state
              ? { ...component, state: false }
              : component,
          ),
        };
      });
    }

    window.addEventListener('mouseup', releaseButtons);
    window.addEventListener('blur', releaseButtons);
    return () => {
      window.removeEventListener('mouseup', releaseButtons);
      window.removeEventListener('blur', releaseButtons);
    };
  }, [setCircuit]);
}
