import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '#lib/utils';

/** Duração da saída (a mesma de `--duration-exit`): depois dela o painel sai da árvore. */
const EXIT_MS = 240;
/** Tempo de tolerância ao sair com o mouse, para ir da margem até os itens sem fechar. */
const LEAVE_MS = 200;

/**
 * Itens laterais do modo leitura quando não estão fixos. Não há botão nem moldura de painel: só os
 * próprios cartões, que aparecem quando o mouse passa na margem vazia ao lado do texto (a faixa
 * `data-slot="reading-edge-*"`, invisível) e somem quando o mouse sai. A margem acompanha o espaço
 * livre ao lado do texto (que muda com o zoom) e deixa a barra de rolagem livre. Entram e saem com as
 * transições `animate-enter-*` e `animate-exit-*`.
 */
export function ReadingSidePanel({
  children,
  side = 'right',
  label = 'Sumário da leitura',
  width = 'w-56',
}: {
  children: ReactNode;
  /** Margem em que os itens aparecem. O acompanhamento usa a esquerda. */
  side?: 'left' | 'right';
  /** Nome dos itens abertos (marco de navegação). */
  label?: string;
  /** Largura dos itens (classe do Tailwind). */
  width?: string;
}) {
  const left = side === 'left';
  const [open, setOpen] = useState(false);
  // Fechando: os itens ainda estão na tela, saindo com a transição.
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Eventos nativos de propósito: o `onMouseEnter/Leave` do React segue a árvore do React, e itens
  // desenhados por portal (como a linha do tempo da transcrição) estão dentro da faixa no DOM mas
  // fora dela no React. Com ele, passar o mouse sobre eles contava como "sair" e a faixa piscava.
  useEffect(() => {
    const element = strip.current;
    const clear = () => window.clearTimeout(timer.current);
    const enter = () => {
      clear();
      setLeaving(false);
      setOpen(true);
    };
    const leave = () => {
      clear();
      timer.current = window.setTimeout(() => {
        setOpen(false);
        setLeaving(true);
        // Reserva para quando o navegador não dispara o fim da animação (movimento reduzido).
        timer.current = window.setTimeout(() => setLeaving(false), EXIT_MS + 60);
      }, LEAVE_MS);
    };

    element?.addEventListener('mouseenter', enter);
    element?.addEventListener('mouseleave', leave);

    return () => {
      element?.removeEventListener('mouseenter', enter);
      element?.removeEventListener('mouseleave', leave);
    };
  }, []);

  // Os itens ficam DENTRO da faixa: o mouse indo da faixa para eles não "sai" dela, então não há
  // fecha-e-abre (pisca) ao mexer o mouse sobre os cartões.
  return (
    <div
      ref={strip}
      data-slot={`reading-edge-${side}`}
      className={cn(
        'fixed top-14 bottom-0 z-10 w-[max(5rem,calc((100vw_-_8rem_-_48rem*var(--reading-zoom,1))/2))]',
        left ? 'left-0' : 'right-4',
      )}
    >
      {(open || leaving) && (
        <aside
          aria-label={label}
          data-state={open ? 'open' : 'closing'}
          onAnimationEnd={(event) => {
            // Só o fim da animação do próprio painel (as dos cartões de dentro também sobem até aqui).
            if (event.target === event.currentTarget && !open) {
              window.clearTimeout(timer.current);
              setLeaving(false);
            }
          }}
          // Sem fundo nem borda: só os cartões. `reading-chrome` traz as cores suaves deles.
          className={cn(
            'reading-chrome fixed top-14 bottom-0 z-20 max-w-[85vw] overflow-y-auto border-0 !bg-transparent p-3 font-sans',
            width,
            left ? 'left-4' : 'right-6',
            open
              ? left
                ? 'animate-enter-left'
                : 'animate-enter-right'
              : left
                ? 'pointer-events-none animate-exit-left'
                : 'pointer-events-none animate-exit-right',
          )}
        >
          <div className="space-y-2">{children}</div>
        </aside>
      )}
    </div>
  );
}
