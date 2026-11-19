import { useEffect, useState, type RefObject } from 'react';

import { computeExcerptProgress, railFill, readingLine } from '#lib/transcript-progress';

/** Área com rolagem que contém o elemento: a mais próxima que rola, ou a própria página. */
function findScrollParent(element: HTMLElement): HTMLElement {
  let node = element.parentElement;

  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);

    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }

    node = node.parentElement;
  }

  return (document.scrollingElement ?? document.documentElement) as HTMLElement;
}

/**
 * Acompanha a rolagem e diz qual trecho (`[data-excerpt]` dentro de `root`) está sendo lido.
 * O quanto foi lido de cada trecho vai direto para o elemento como `--f` (0 a 1), e o da linha da
 * barra lateral para `rail` como `--g`: assim a rolagem não renderiza o React a cada quadro (só a
 * troca do trecho atual renderiza), o que mantém a leitura fluida em PCs fracos.
 */
export function useExcerptProgress(
  root: HTMLElement | null,
  count: number,
  rail?: RefObject<HTMLElement | null>,
): number {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!root || count === 0) {
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const elements = [...root.querySelectorAll<HTMLElement>('[data-excerpt]')];

      if (elements.length === 0) {
        return;
      }

      const parent = findScrollParent(root);
      const isPage = parent === document.scrollingElement || parent === document.documentElement;
      const viewTop = isPage ? 0 : parent.getBoundingClientRect().top;
      const viewHeight = isPage ? window.innerHeight : parent.clientHeight;
      const maxScroll = parent.scrollHeight - viewHeight;
      const line = readingLine(viewTop, viewHeight, parent.scrollTop, maxScroll);

      const { fractions, active: current } = computeExcerptProgress(
        elements.map((element) => {
          const rect = element.getBoundingClientRect();

          return { top: rect.top, height: rect.height };
        }),
        line,
      );

      elements.forEach((element, index) =>
        element.style.setProperty('--f', fractions[index].toFixed(3)),
      );
      rail?.current?.style.setProperty(
        '--g',
        railFill(current, fractions[current] ?? 0, elements.length).toFixed(3),
      );
      setActive(current);
    };

    const schedule = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    // `capture` pega a rolagem de qualquer área, não só a da janela (o modo leitura rola por dentro).
    document.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      document.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);

      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [root, count, rail]);

  return active;
}
