import { ChevronRight, Info } from "lucide-react";

import { Button } from "#ui/button";
import { cn } from "#lib/utils";
import type { Heading } from "#lib/markdown";

import { ReadingQuickControls } from "#components/ReadingQuickControls";

import { DocumentOutline } from "./DocumentOutline";

interface DocumentSidebarProps {
  /** Títulos do texto, para o "Sumário". */
  headings: Heading[];
  /** Título sendo lido agora (destacado no sumário). */
  activeId?: string;
  /** Abre a janela "Sobre a página" (só no painel do modo leitura; na página ele fica na linha de cima). */
  onOpenAbout?: () => void;
  /**
   * Dentro do painel do modo leitura: o sumário, os ajustes de leitura e "Sobre a página", sem
   * fixar no topo e sem repetir o marco de navegação (o painel já é um).
   */
  embedded?: boolean;
  /** Não mostra o "Sumário" aqui (na página ele fica na coluna da esquerda, ver `DocumentOutline`). */
  hideOutline?: boolean;
}

/**
 * Painel fixo ao lado do texto, **só com os ajustes rápidos de leitura** (letra e zoom). Fica visível
 * enquanto o texto rola (em telas largas). "Modo leitura" e "Sobre a página" ficam na linha de cima
 * da página (`DocumentActions`); o "Sumário", que mostra onde você está, na coluna da esquerda (e
 * aqui dentro só no painel do modo leitura, que também traz o "Sobre a página").
 */
export function DocumentSidebar({
  headings,
  activeId,
  onOpenAbout,
  embedded = false,
  hideOutline = false,
}: DocumentSidebarProps) {
  const Root = embedded ? "div" : "aside";

  return (
    <Root
      {...(embedded ? {} : { "aria-label": "Informações da página" })}
      className={cn(
        embedded ? "space-y-2" : "space-y-4 lg:sticky lg:top-4 lg:self-start",
      )}
    >
      {!hideOutline && <DocumentOutline headings={headings} activeId={activeId} />}

      <ReadingQuickControls />

      {embedded && onOpenAbout && (
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
      )}
    </Root>
  );
}
