import { memo, type ReactNode } from "react";

import { Link } from "react-router";

import { Card, CardContent, CardHeader } from "#ui/card";
import { PaperPage } from "#components/PaperPage";
import { TiltCard } from "#components/TiltCard";
import { Tip } from "#components/Tip";
import { formatDate } from "#lib/format";

import type { DocumentSummary } from "../types/library.types";

import { CategoryBreadcrumb } from "./CategoryBreadcrumb";
import { DocumentTypeBadge, GeneratedMarks } from "./DocumentBadges";
import { TagBadges } from "./TagBadges";

interface DocumentCardProps {
  document: DocumentSummary;
  /** Botões de ação (ex.: na Entrada), exibidos no rodapé do cartão. */
  actions?: ReactNode;
  /**
   * `list`: uma linha por documento (sem prévia); `card`: cartão com prévia
   * (padrão); `grid`: miniatura de página (folha de papel com título e prévia).
   */
  variant?: "list" | "card" | "grid";
}

/** A prévia vem do começo do texto, que costuma repetir o título; na miniatura isso só atrapalha. */
export function previewWithoutTitle(preview: string, title: string): string {
  const text = preview.trim();

  return text.toLowerCase().startsWith(title.trim().toLowerCase())
    ? text.slice(title.trim().length).trim()
    : text;
}

function DocumentDate({ document }: { document: DocumentSummary }) {
  return (
    <span className="shrink-0 text-xs text-muted-foreground">
      {document.matchedIn === "content" && "Encontrado no conteúdo · "}
      {formatDate(document.createdAt)}
    </span>
  );
}

/** Memoizado: digitar na busca da biblioteca não redesenha as dezenas de cartões da lista. */
export const DocumentCard = memo(function DocumentCard({
  document,
  actions,
  variant = "card",
}: DocumentCardProps) {
  const title = (
    <Link
      to={`/library/${document.id}`}
      className="min-w-0 truncate text-sm font-semibold hover:underline"
    >
      {document.title}
    </Link>
  );

  if (variant === "grid") {
    // Miniatura de página: como o livro aparece com capa em Livros, a página aparece como folha.
    return (
      // Mesmo tamanho da capa de livro da estante (BooksPage): 176 px de largura, proporção 3:4.
      <div data-tilt-group className="group relative mx-auto w-full max-w-44">
        <TiltCard glareClassName="rounded-md">
        <PaperPage variant="sheet" size="thumb">
          <div className="flex h-full flex-col gap-2">
            <p className="truncate text-[9px] tracking-[0.18em] text-stone-500 uppercase">
              {document.category.join(" › ") || "Sem categoria"}
            </p>

            <Tip content={document.title}>
              <Link
                to={`/library/${document.id}`}
                // Altura fixa de 3 linhas (3 x 15px x 1,375): títulos curtos e longos ocupam o mesmo espaço e o
                // texto abaixo começa sempre no mesmo ponto; o que passar vira reticências (o nome inteiro fica no tooltip).
                className="line-clamp-3 h-[3.875rem] overflow-hidden font-serif text-[15px] leading-snug font-semibold text-stone-900 after:absolute after:inset-0 hover:underline"
              >
                {document.title}
              </Link>
            </Tip>

            <span aria-hidden className="block h-px w-8 bg-stone-300" />

            {previewWithoutTitle(document.preview ?? "", document.title) && (
              <p className="line-clamp-4 font-serif text-[11px] leading-relaxed text-stone-600">
                {previewWithoutTitle(document.preview ?? "", document.title)}
              </p>
            )}

            <div className="mt-auto flex items-end justify-between gap-x-2 text-[10px] text-stone-500">
              <span className="min-w-0 flex-1 truncate">
                {document.tags.slice(0, 2).map((tag) => `#${tag}`).join(" ")}
              </span>

              <span className="shrink-0">
                {document.matchedIn === "content" && "No conteúdo · "}
                {formatDate(document.createdAt)}
              </span>
            </div>
          </div>
        </PaperPage>
        </TiltCard>

        {/* As marcas ficam **abaixo** da folha, sobre o fundo do app: não mexem no desenho do cartão e contrastam com o tema. A faixa tem altura fixa (com ou sem marcas) para todos os cartões terem a mesma altura. */}
        <div className="mt-2 flex h-5 items-center justify-center">
          <GeneratedMarks document={document} variant="icon" />
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-[box-shadow,border-color,background-color] duration-200 hover:border-primary/50 hover:ring-3 hover:ring-primary/15">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            {title}

            <DocumentTypeBadge type={document.type} />

            <GeneratedMarks document={document} />
          </div>

          <CategoryBreadcrumb category={document.category} />
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 md:flex">
          <TagBadges tags={document.tags} />
        </div>

        <DocumentDate document={document} />

        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <Card className="transition-[box-shadow,border-color,background-color] duration-200 hover:border-primary/50 hover:ring-3 hover:ring-primary/15">
      <CardHeader className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {title}

          <DocumentTypeBadge type={document.type} />

          <GeneratedMarks document={document} />
        </div>

        <CategoryBreadcrumb category={document.category} />
      </CardHeader>

      <CardContent className="space-y-3">
        {document.preview && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {document.preview}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <TagBadges tags={document.tags} />

          <span className="ml-auto">
            <DocumentDate document={document} />
          </span>
        </div>

        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
      </CardContent>
    </Card>
  );
});
