import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  buildVideoLink,
  formatClock,
  supportsTimedLink,
  type TimedExcerpt,
} from '#shared/transcript';
import { useExcerptProgress } from '#hooks/use-excerpt-progress';
import { useTranscriptPreferences } from '#hooks/use-appearance';
import { cn } from '#lib/utils';
import { excerptSpans } from '#lib/transcript-progress';
import { TranscriptStrings } from '#lib/transcript-text';

import { ExternalLink } from './ExternalLink';
import { HexDot } from './Hex';
import { HEX_CHIP_CLIP } from './HexButton';
import { TranscriptRail } from './TranscriptRail';

interface TranscriptViewProps {
  excerpts: TimedExcerpt[];
  /** Endereço do vídeo original: o horário de cada trecho abre o vídeo nesse momento. */
  sourceUrl?: string;
  /**
   * Onde pôr a barra lateral. Sem isto ela fica à esquerda do texto (modo leitura); com um elemento
   * da página (ex.: a coluna ao lado do texto), ela vai para lá e alinha com a barra da direita.
   * `null` espera o elemento ficar pronto.
   */
  railSlot?: HTMLElement | null;
}

type State = 'played' | 'active' | 'idle';

/** Horário do trecho com as pontas de um hexágono; vira link quando há vídeo de origem. */
function TimeChip({
  seconds,
  sourceUrl,
  state,
}: {
  seconds: number;
  sourceUrl?: string;
  state: State;
}) {
  const clock = formatClock(seconds);
  const href = sourceUrl ? buildVideoLink(sourceUrl, seconds) : null;
  const className = cn(
    'inline-block px-4 py-0.5 font-mono text-xs tabular-nums transition-colors',
    HEX_CHIP_CLIP,
    state === 'active' && 'bg-primary text-primary-foreground',
    state === 'played' && 'bg-primary/20 text-foreground',
    state === 'idle' && 'bg-muted text-foreground',
    href && 'hover:bg-primary hover:text-primary-foreground',
  );

  if (!href || !sourceUrl) {
    return <span className={className}>{clock}</span>;
  }

  return (
    <ExternalLink
      bare
      href={href}
      className={className}
      title={supportsTimedLink(sourceUrl) ? TranscriptStrings.openAt : TranscriptStrings.openVideo}
    >
      {clock}
    </ExternalLink>
  );
}

/**
 * Transcrição com tempo: cada trecho tem o horário (link para o vídeo no momento certo) e uma
 * barra fina que enche conforme a leitura passa por ele. À esquerda, a barra lateral flutuante
 * (`TranscriptRail`) liga os trechos por hexágonos e leva a cada um com um clique. O texto é
 * inteiro e sem divisórias; quem acompanha a rolagem é só a marcação (ver `useExcerptProgress`).
 * Documentos antigos, sem tempo, não passam por aqui.
 */
export function TranscriptView({ excerpts, sourceUrl, railSlot }: TranscriptViewProps) {
  const preferences = useTranscriptPreferences();
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const spans = useMemo(() => excerptSpans(excerpts.map((e) => e.seconds)), [excerpts]);
  const active = useExcerptProgress(root, excerpts.length, fillRef);

  const goTo = (index: number) =>
    root
      ?.querySelectorAll<HTMLElement>('[data-excerpt]')
      [index]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });

  const docked = railSlot !== undefined;
  const rail = (
    <TranscriptRail
      excerpts={excerpts}
      active={active}
      showPreview={preferences.preview}
      onSelect={goTo}
      fillRef={fillRef}
      stickyClassName={docked ? 'top-4 max-h-[calc(100dvh-2rem)] w-full' : undefined}
    />
  );

  return (
    <div
      data-slot="transcript"
      className={cn('items-start gap-6', !docked && 'grid md:grid-cols-[auto_minmax(0,1fr)]')}
    >
      {docked ? railSlot && createPortal(rail, railSlot) : rail}

      <div ref={setRoot} className="min-w-0">
        {excerpts.map((excerpt, index) => {
          const span = spans[index];
          const state: State = index < active ? 'played' : index === active ? 'active' : 'idle';

          return (
            <section
              key={index}
              data-excerpt=""
              data-state={state}
              aria-label={TranscriptStrings.excerptLabel(formatClock(excerpt.seconds))}
              className="scroll-mt-20 pb-6"
            >
              <div className="mb-1.5 flex items-center gap-3">
                <TimeChip seconds={excerpt.seconds} sourceUrl={sourceUrl} state={state} />

                {preferences.progress && (
                  <span
                    role="progressbar"
                    aria-label={TranscriptStrings.excerptProgress}
                    className="relative h-3 min-w-0 flex-1 max-w-md"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted"
                    />
                    <span
                      data-slot="excerpt-elapsed"
                      aria-hidden="true"
                      className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-l-full bg-emerald-500/60"
                      style={{ width: `${span.start * 100}%` }}
                    />
                    <span
                      data-slot="excerpt-span"
                      aria-hidden="true"
                      className={cn(
                        'absolute top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full',
                        state === 'played' ? 'bg-emerald-500/30' : 'bg-primary/30',
                      )}
                      style={{
                        left: `${span.start * 100}%`,
                        width: `${Math.max(span.end - span.start, 0.01) * 100}%`,
                      }}
                    >
                      <span
                        data-slot="excerpt-fill"
                        className={cn(
                          'block h-full',
                          state === 'played' ? 'bg-emerald-500' : 'bg-primary',
                        )}
                        style={{ width: 'calc(var(--f, 0) * 100%)' }}
                      />
                    </span>
                    <span
                      data-slot="excerpt-start"
                      aria-hidden="true"
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${span.start * 100}%` }}
                    >
                      <HexDot
                        className={cn(
                          'h-3 w-2.5',
                          state === 'played' ? 'bg-emerald-500' : 'bg-primary',
                        )}
                      />
                    </span>
                  </span>
                )}
              </div>

              <p className="min-w-0">{excerpt.text}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
