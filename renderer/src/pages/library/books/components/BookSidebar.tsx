
import { Card, CardContent, CardHeader, CardTitle } from "#ui/card";

import { ReadingQuickControls } from "#components/ReadingQuickControls";

import type { BookReading } from "../types";
import { BookOutline } from "./BookOutline";
import { BookProgressCard } from "./BookProgressCard";

interface BookSidebarProps {
  modules: BookReading["modules"];
  /** Capítulo sendo lido agora (id do documento). */
  activeChapterId?: string;
  /** Capítulos já lidos (id do documento). */
  readIds?: string[];
  /** Quantos capítulos disponíveis já foram lidos (para a barra de progresso). */
  readCount?: number;
  /** Quando o livro foi concluído; com ele o quadro mostra a data no lugar do progresso. */
  completedAt?: string | null;
  onSelectChapter: (documentId: string) => void;
  /** Marca ou desmarca um capítulo como lido direto pelo sumário. */
  onToggleRead?: (documentId: string, read: boolean) => void;
  /**
   * Dentro do painel do modo leitura: o mesmo conteúdo (progresso, ajustes de leitura e sumário),
   * sem fixar no topo e sem repetir o marco de navegação. A busca e os resultados ficam no `FindBar`.
   */
  embedded?: boolean;
  /** Na página o sumário fica numa coluna própria à esquerda (`BookOutlineCard`), não aqui. */
  hideOutline?: boolean;
}

/** Cartão "Sumário do livro": módulos e capítulos, com o capítulo em leitura em destaque. */
export function BookOutlineCard({
  modules,
  activeChapterId,
  readIds,
  onSelectChapter,
  onToggleRead,
}: Pick<
  BookSidebarProps,
  "modules" | "activeChapterId" | "readIds" | "onSelectChapter" | "onToggleRead"
>) {
  return (
    <Card className="sidebar-card">
      <CardHeader>
        <CardTitle className="text-sm">Sumário do livro</CardTitle>
      </CardHeader>

      <CardContent>
        <BookOutline
          modules={modules}
          activeChapterId={activeChapterId}
          readIds={readIds}
          onSelectChapter={onSelectChapter}
          onToggleRead={onToggleRead}
          className="max-h-[50dvh]"
        />
      </CardContent>
    </Card>
  );
}

/**
 * Painel fixo do livro: progresso, ajustes de leitura e o sumário de módulos e capítulos.
 */
export function BookSidebar({
  modules,
  activeChapterId,
  readIds,
  readCount = 0,
  completedAt = null,
  onSelectChapter,
  onToggleRead,
  embedded = false,
  hideOutline = false,
}: BookSidebarProps) {
  const Root = embedded ? "div" : "aside";

  const totalChapters = modules.reduce(
    (sum, module) => sum + module.chapters.length,
    0,
  );

  return (
    <Root
      {...(embedded ? {} : { "aria-label": "Painel do livro" })}
      className={
        embedded ? "space-y-2" : "space-y-4 lg:sticky lg:top-4 lg:self-start"
      }
    >
      <BookProgressCard
        read={readCount}
        total={totalChapters}
        completedAt={completedAt}
      />

      <ReadingQuickControls />

      {!hideOutline && (
        <BookOutlineCard
          modules={modules}
          activeChapterId={activeChapterId}
          readIds={readIds}
          onSelectChapter={onSelectChapter}
          onToggleRead={onToggleRead}
        />
      )}
    </Root>
  );
}
