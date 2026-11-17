import { BookOpenText, ChevronRight, Info } from "lucide-react";

import { Button } from "#ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#ui/card";
import { scrollToId } from "#lib/scroll";
import { cn } from "#lib/utils";
import type { Heading } from "#lib/markdown";

import { OutlineNav } from "#components/OutlineNav";
import { ReadingQuickControls } from "#components/ReadingQuickControls";

interface DocumentSidebarProps {
  /** Títulos do texto, para o "Sumário". */
  headings: Heading[];
  /** Título sendo lido agora (destacado no sumário). */
  activeId?: string;
  /** Abre a janela "Sobre a página". */
  onOpenAbout: () => void;
  /** Entra no modo leitura. */
  onStartReading: () => void;
  /**
   * Dentro do painel do modo leitura: o mesmo conteúdo (sumário, ajustes de leitura e "Sobre a
   * página"), sem o botão "Modo leitura" (já estamos nele), sem fixar no topo e sem repetir o
   * marco de navegação (o painel já é um).
   */
  embedded?: boolean;
}

/**
 * Painel fixo ao lado do texto: "Sumário" dos títulos (com o trecho em leitura
 * em destaque), os ajustes rápidos de leitura (letra e zoom), o botão do modo leitura e o botão que abre a janela "Sobre a
 * página". Fica visível enquanto o texto rola (em telas largas).
 */
export function DocumentSidebar({
  headings,
  activeId,
  onOpenAbout,
  onStartReading,
  embedded = false,
}: DocumentSidebarProps) {
  const Root = embedded ? "div" : "aside";

  return (
    <Root
      {...(embedded ? {} : { "aria-label": "Informações da página" })}
      className={cn(
        embedded ? "space-y-2" : "space-y-4 lg:sticky lg:top-4 lg:self-start",
      )}
    >
      {headings.length >= 2 && (
        <Card className="sidebar-card">
          <CardHeader>
            <CardTitle className="text-sm">Sumário</CardTitle>
          </CardHeader>

          <CardContent>
            <OutlineNav
              ariaLabel="Sumário"
              className="max-h-[60dvh]"
              items={headings.map((heading) => ({
                id: heading.id,
                label: heading.text,
                level: heading.level,
              }))}
              activeId={activeId}
              onSelect={scrollToId}
            />
          </CardContent>
        </Card>
      )}

      <ReadingQuickControls />

      {!embedded && (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={onStartReading}
        >
          <BookOpenText /> Modo leitura
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        onClick={onOpenAbout}
      >
        <span className="inline-flex items-center gap-2">
          <Info /> Sobre a página
        </span>

        <ChevronRight />
      </Button>
    </Root>
  );
}
