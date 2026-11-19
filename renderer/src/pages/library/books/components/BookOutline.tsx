import { Check } from 'lucide-react';

import { OUTLINE_ACTIVE } from '#components/OutlineNav';
import { HexDot } from '#components/Hex';
import { cn } from '#lib/utils';

import type { BookReading } from '../types';

interface BookOutlineProps {
  modules: BookReading['modules'];
  /** Capítulo sendo lido agora (id do documento); fica destacado. */
  activeChapterId?: string;
  /** Capítulos já lidos (id do documento): ganham um visto no sumário. */
  readIds?: string[];
  onSelectChapter: (documentId: string) => void;
  /** Com esta função o visto vira um botão que marca ou desmarca o capítulo como lido. */
  onToggleRead?: (documentId: string, read: boolean) => void;
  className?: string;
}

/**
 * Sumário do livro: o módulo é o título (negrito, caixa alta, cor cheia) e os capítulos numerados
 * ficam embaixo, mais leves; o capítulo em leitura fica em destaque.
 */
export function BookOutline({
  modules,
  activeChapterId,
  readIds = [],
  onSelectChapter,
  onToggleRead,
  className,
}: BookOutlineProps) {
  let chapterNumber = 0;
  const order = modules.flatMap((module) => module.chapters);
  const activeIndex = order.findIndex((chapter) => chapter.documentId === activeChapterId);

  return (
    <nav aria-label="Sumário do livro">
      <ul className={cn('space-y-3 overflow-y-auto pr-1', className)}>
        {modules.map((module) => (
          <li key={module.id} className="space-y-1">
            {module.title && (
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                {module.title}
              </p>
            )}

            <ul className="ml-1 space-y-1">
              {module.chapters.map((chapter) => {
                chapterNumber += 1;
                const active = chapter.documentId === activeChapterId;
                const read = readIds.includes(chapter.documentId);

                return (
                  <li key={chapter.documentId} className="flex items-start gap-1">
                    <button
                      type="button"
                      aria-current={active ? 'location' : undefined}
                      onClick={() => onSelectChapter(chapter.documentId)}
                      className={cn(
                        'flex min-w-0 flex-1 items-start gap-2 rounded-md px-2 py-0.5 text-left text-sm hover:underline',
                        active
                          ? OUTLINE_ACTIVE
                          : 'font-normal text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <HexDot
                          className={cn(
                            'mr-1.5 h-2.5 w-2 align-middle transition-[background-color,transform]',
                            activeIndex >= 0 && chapterNumber - 1 < activeIndex && 'bg-emerald-500',
                            active && 'scale-125 bg-primary',
                            !active &&
                              !(activeIndex >= 0 && chapterNumber - 1 < activeIndex) &&
                              'bg-muted-foreground/40',
                          )}
                        />
                        {chapterNumber}. {chapter.title}
                      </span>
                    </button>

                    <span
                      data-slot="read-mark"
                      className="flex h-5 w-6 shrink-0 items-center justify-center"
                    >
                      {onToggleRead ? (
                        <button
                          type="button"
                          aria-pressed={read}
                          aria-label={`${read ? 'Desmarcar' : 'Marcar'} "${chapter.title}" como lido`}
                          onClick={() => onToggleRead(chapter.documentId, !read)}
                          className="flex size-5 cursor-pointer items-center justify-center rounded-md hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <Check
                            className={cn(
                              'size-3.5',
                              read
                                ? 'text-emerald-500'
                                : 'text-muted-foreground/40 hover:text-emerald-500',
                            )}
                          />
                        </button>
                      ) : (
                        read && (
                          <>
                            <Check className="size-3.5 text-emerald-500" />
                            <span className="sr-only">, lido</span>
                          </>
                        )
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
