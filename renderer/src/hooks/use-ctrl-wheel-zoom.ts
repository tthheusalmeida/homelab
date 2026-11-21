import { useEffect, useRef } from 'react';

/** Quanto a roda precisa girar (soma de `deltaY`) para dar um passo: um clique do mouse (~100) é um passo. */
const STEP_DELTA = 100;

/**
 * Ctrl + roda do mouse (ou pinça do touchpad) dá um passo de zoom: para cima aumenta (`1`), para
 * baixo diminui (`-1`). Segura o zoom do navegador do app e deixa a roda sem Ctrl rolar a página
 * como sempre. O touchpad manda muitos eventos pequenos, então o giro é somado até valer um passo.
 */
export function useCtrlWheelZoom(onStep: (direction: 1 | -1) => void, enabled = true) {
  const step = useRef(onStep);

  step.current = onStep;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let pending = 0;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) {
        return;
      }

      // Sem isso o Electron amplia a janela inteira.
      event.preventDefault();

      pending += event.deltaY;

      while (Math.abs(pending) >= STEP_DELTA) {
        step.current(pending < 0 ? 1 : -1);
        pending += pending < 0 ? STEP_DELTA : -STEP_DELTA;
      }
    };

    document.addEventListener('wheel', onWheel, { passive: false });

    return () => document.removeEventListener('wheel', onWheel);
  }, [enabled]);
}
