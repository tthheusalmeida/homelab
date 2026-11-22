
import { Card, CardContent, CardHeader, CardTitle } from "#ui/card";

import { ReadingQuickControls } from "#components/ReadingQuickControls";

import type { BookReading, BookSearchHit } from "../types";
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
  /** Texto digitado na busca (decide se os resultados aparecem). */
  query: string;
  /** `undefined` enquanto a pesquisa não rodou (consulta curta). */
  hits?: BookSearchHit[];
  isSearching?: boolean;
  onSelectChapter: (documentId: string) => void;
  onSelectHit: (hit: BookSearchHit) => void;
  /** Marca ou desmarca um capítulo como lido direto pelo sumário. */
  onToggleRead?: (documentId: string, read: boolean) => void;
  /**
   * Dentro do painel do modo leitura: o mesmo conteúdo (progresso, ajustes de leitura, resultados e
   * sumário), sem fixar no topo e sem repetir o marco de navegação. A busca fica na barra do topo.
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
 * Painel fixo do livro: pesquisa dentro dele (com trechos que levam ao ponto)
 * e o sumário de módulos e capítulos.
 */
export function BookSidebar({
  modules,
  activeChapterId,
  readIds,
  readCount = 0,
  completedAt = null,
  query,
  hits,
  isSearching,
  onSelectChapter,
  onSelectHit,
  onToggleRead,
  embedded = false,
  hideOutline = false,
}: BookSidebarProps) {
  const Root = embedded ? "div" : "aside";

  const searching = query.trim().length >= 2;
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

      {searching && (
        <Card className="sidebar-card">
          <CardHeader>
            <CardTitle className="text-sm">
              {isSearching || !hits
                ? "Pesquisando..."
                : `${hits.length} resultado(s)`}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {hits && hits.length === 0 && !isSearching ? (
              <p className="text-sm text-muted-foreground">
                Nada encontrado neste livro.
              </p>
            ) : (
              <ul
                aria-label="Resultados da pesquisa"
                className="max-h-[45dvh] space-y-2 overflow-y-auto pr-1"
              >
                {(hits ?? []).map((hit) => (
                  <li key={`${hit.documentId}-${hit.line}`}>
                    <button
                      type="button"
                      onClick={() => onSelectHit(hit)}
                      className="w-full space-y-0.5 rounded-md border p-2 text-left hover:bg-accent"
                    >
                      <span className="block text-xs font-medium">
                        {hit.chapterTitle}
                        {hit.moduleTitle && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {hit.moduleTitle}
                          </span>
                        )}
                      </span>

                      <span className="block text-xs text-muted-foreground">
                        {hit.snippet}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

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
