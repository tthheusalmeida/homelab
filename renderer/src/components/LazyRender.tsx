import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '#lib/utils';

interface LazyRenderProps {
  children: ReactNode;
  /** Tamanho do espaço reservado (ex.: `aspect-square w-16`): o layout não muda quando o conteúdo entra. */
  className?: string;
  /** Distância da borda da tela em que o conteúdo já começa a ser montado. */
  rootMargin?: string;
}

/**
 * Monta o conteúdo só quando o espaço chega perto da tela, e o mantém montado depois. Serve para
 * listas longas com itens pesados (ex.: as peças do infográfico): a lista e a busca trabalham com
 * os dados, e só o desenho espera aparecer. Sem `IntersectionObserver`, monta na hora.
 */
export function LazyRender({ children, className, rootMargin = '300px' }: LazyRenderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const node = ref.current;

    if (ready || !node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [ready, rootMargin]);

  return (
    <div ref={ref} data-slot="lazy-render" data-ready={ready} className={className}>
      {ready ? (
        children
      ) : (
        <span aria-hidden className={cn('block size-full rounded-md bg-muted/40')} />
      )}
    </div>
  );
}
