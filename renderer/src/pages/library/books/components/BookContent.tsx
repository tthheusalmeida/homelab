import { ArrowRight, Check } from "lucide-react";

import { Button } from "#ui/button";

import { DocumentBody } from "#components/DocumentBody";
import { ModuleDivider } from "#components/ModuleDivider";
import { ReadingSection } from "#components/ReadingSection";
import { cn } from "#lib/utils";

import { chapterElementId } from "../reader";
import type { BookReading } from "../types";

interface BookContentProps {
  modules: BookReading["modules"];
  /** Capítulos já lidos (id do documento). */
  readIds?: string[];
  /** Sem esta função o botão de marcar como lido não aparece. */
  onToggleRead?: (documentId: string, read: boolean) => void;
  onGoToChapter: (documentId: string) => void;
}

/**
 * Os capítulos do livro em sequência, no mesmo desenho da página e do modo leitura: sem moldura,
 * direto no fundo (`ReadingSection`), com filetes sutis entre capítulos e módulos e a marcação de
 * lido discreta. Fonte, tamanho e cores vêm do `ReadingSurface` ao redor.
 */
export function BookContent({
  modules,
  readIds = [],
  onToggleRead,
  onGoToChapter,
}: BookContentProps) {
  // Capítulos na ordem de leitura (para o "Próximo" do fim de cada um).
  const order = modules.flatMap((module) => module.chapters);
  let number = 0;

  return (
    <div className="space-y-14">
      {modules.map((module) => (
        <div key={module.id} className="space-y-14">
          {module.title && <ModuleDivider title={module.title} />}

          {module.chapters.map((chapter) => {
            number += 1;
            const position = number;
            const next = order[position];
            const read = readIds.includes(chapter.documentId);

            return (
              <div
                key={chapter.documentId}
                // Separação sutil: um filete entre capítulos (não antes do primeiro).
                className={cn(
                  position > 1 &&
                    !(module.chapters[0] === chapter && module.title) &&
                    "reading-sep-border border-t pt-14",
                )}
              >
                <ReadingSection
                  id={chapterElementId(chapter.documentId)}
                  headingLevel={2}
                  title={chapter.title}
                  label={
                    <>
                      Capítulo {position}
                      {read && (
                        <Check
                          aria-hidden
                          className="size-3.5 text-emerald-500"
                        />
                      )}
                    </>
                  }
                  footer={
                    <>
                      {onToggleRead && (
                        <Button
                          variant="ghost"
                          size="xs"
                          aria-pressed={read}
                          className={cn(
                            read
                              ? "text-emerald-500 hover:text-emerald-500"
                              : "text-muted-foreground",
                          )}
                          onClick={() =>
                            onToggleRead(chapter.documentId, !read)
                          }
                        >
                          <Check /> {read ? "Lido" : "Marcar como lido"}
                        </Button>
                      )}

                      {next && (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-muted-foreground"
                          onClick={() => onGoToChapter(next.documentId)}
                        >
                          Próximo: {next.title} <ArrowRight />
                        </Button>
                      )}
                    </>
                  }
                >
                  {/* O capítulo não informa o tipo: transcrição com tempo é reconhecida pelo texto. */}
                  <DocumentBody
                    content={chapter.content}
                    isTranscription
                    compact
                    idPrefix={chapter.documentId}
                  />
                </ReadingSection>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
