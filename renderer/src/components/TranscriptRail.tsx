import { useEffect, useRef, type RefObject } from 'react';

import { formatClock, type TimedExcerpt } from '#shared/transcript';
import { cn } from '#lib/utils';
import { excerptPreview, TranscriptStrings } from '#lib/transcript-text';

import { HexDot } from './Hex';

interface TranscriptRailProps {
  excerpts: TimedExcerpt[];
  /** Índice do trecho que está sendo lido. */
  active: number;
  /** Mostra o começo do texto ao lado do horário (preferência de leitura). */
  showPreview: boolean;
  onSelect: (index: number) => void;
  /** Recebe `--g` (0 a 1): quanto da linha já está preenchido (ver `useExcerptProgress`). */
  fillRef: RefObject<HTMLDivElement | null>;
  /** Posição fixa e altura máxima da barra (padrão: abaixo do cabeçalho do modo leitura). */
  stickyClassName?: string;
}

/**
 * Barra lateral flutuante da transcrição: o título "Linha do tempo" e um hexágono por trecho, ligados por uma linha que passa
 * pelo centro de cada um. A linha já concluída fica verde (a mesma cor do hexágono lido); a do trecho
 * em leitura enche na cor de destaque. Clicar num hexágono volta (ou avança) ao trecho. Fica à esquerda do texto e acompanha a rolagem (sticky),
 * sem separar o texto em seções. Some em telas estreitas, onde não há espaço ao lado do texto.
 */
export function TranscriptRail({
  excerpts,
  active,
  showPreview,
  onSelect,
  fillRef,
  stickyClassName = 'top-20 max-h-[calc(100dvh-7rem)]',
}: TranscriptRailProps) {
  const box = useRef<HTMLElement>(null);
  // Depois que a pessoa rola a barra à mão, ela não volta sozinha ao trecho atual (até um clique).
  const manualScroll = useRef(false);

  // Com muitos trechos a barra rola por dentro: mantém o atual à vista sem mexer na página.
  useEffect(() => {
    const container = box.current;

    if (manualScroll.current) {
      return;
    }
    const item = container?.querySelector<HTMLElement>('[aria-current="step"]');

    if (!container || !item) {
      return;
    }

    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;

    if (top < container.scrollTop || bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = top - container.clientHeight / 2 + item.offsetHeight / 2;
    }
  }, [active]);

  const row = showPreview ? 'h-10' : 'h-7';

  return (
    <aside
      ref={box}
      onWheel={() => (manualScroll.current = true)}
      onTouchMove={() => (manualScroll.current = true)}
      aria-label={TranscriptStrings.railLabel}
      data-slot="transcript-rail"
      className={cn(
        'sidebar-card animate-enter sticky hidden self-start overflow-y-auto rounded-xl p-1.5 font-sans md:block',
        stickyClassName,
      )}
    >
      <h2 className="px-2 pt-1 pb-1.5 text-sm font-semibold">{TranscriptStrings.railTitle}</h2>

      <div ref={fillRef} className="relative">
        <ol>
          {excerpts.map((excerpt, index) => {
            const clock = formatClock(excerpt.seconds);
            const current = index === active;
            const played = index < active;

            return (
              <li key={index} className="relative">
                {index < excerpts.length - 1 && (
                  <span
                    aria-hidden="true"
                    data-slot="transcript-rail-link"
                    data-state={played ? 'done' : current ? 'reading' : 'idle'}
                    className="absolute top-1/2 left-[calc(0.75rem-1px)] h-full w-0.5 overflow-hidden rounded-full bg-border"
                  >
                    {played && <span className="block h-full w-full bg-emerald-500" />}
                    {current && (
                      <span
                        data-slot="transcript-rail-fill"
                        className="block w-full bg-primary"
                        style={{
                          height: `clamp(0%, calc((var(--g, 0) * ${excerpts.length - 1} - ${index}) * 100%), 100%)`,
                        }}
                      />
                    )}
                  </span>
                )}

                <button
                  type="button"
                  aria-current={current ? 'step' : undefined}
                  aria-label={TranscriptStrings.goTo(clock)}
                  onClick={() => {
                    manualScroll.current = false;
                    onSelect(index);
                  }}
                  className={cn(
                    'relative flex w-full cursor-pointer items-center gap-1.5 rounded-lg pr-1.5 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    row,
                  )}
                >
                  <span className="relative z-10 flex w-6 shrink-0 justify-center">
                    <HexDot
                      className={cn(
                        'h-3.5 w-3 transition-[background-color,transform]',
                        played && 'bg-emerald-500',
                        current && 'scale-110 bg-primary',
                        !played && !current && 'bg-muted-foreground/40',
                      )}
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block font-mono text-xs tabular-nums',
                        current ? 'font-semibold text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {clock}
                    </span>

                    {showPreview && (
                      <span
                        data-slot="transcript-rail-preview"
                        className={cn(
                          'block truncate text-xs',
                          current ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {excerptPreview(excerpt.text)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
