import type { ReactNode } from "react";

import { cn } from "#lib/utils";

interface PaperPageProps {
  children: ReactNode;
  className?: string;
  /**
   * `card` (padrão): cartão do tema. `sheet`: folha de papel de verdade — papel claro com tinta
   * escura mesmo no tema escuro, serifa, proporção de página, sombra em camadas e número no rodapé.
   * Use `MarkdownMessage tone="paper"` para o texto dentro dela.
   */
  variant?: "card" | "sheet";
  /** Número (ou rótulo) no rodapé da folha; só vale em `sheet`. */
  pageNumber?: ReactNode;
  /** Só em `sheet`: `thumb` é a miniatura de página (retrato 3:4, canto dobrado) das listas. */
  size?: "full" | "thumb";
}

/** Folha de leitura (cartão do tema ou folha de papel). */
export function PaperPage({
  children,
  className,
  variant = "card",
  pageNumber,
  size = "full",
}: PaperPageProps) {
  if (variant === "sheet") {
    const thumb = size === "thumb";

    return (
      <div
        data-slot="paper-page"
        data-variant="sheet"
        data-size={size}
        className={cn(
          "paper-sheet relative mx-auto flex w-full flex-col rounded-[3px] bg-[#f3f1ea] font-serif text-stone-900",
          thumb
            ? "aspect-[3/4] px-4 pt-5 pb-3"
            : "min-h-[40rem] max-w-[48rem] px-8 pt-12 pb-8 sm:px-16 sm:pt-16",
          className,
        )}
      >
        <div className="flex-1">{children}</div>

        {pageNumber && (
          <p className="pt-10 text-center font-serif text-xs tracking-widest text-stone-500">
            {pageNumber}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      data-slot="paper-page"
      className={cn(
        "mx-auto w-full max-w-3xl rounded-lg border bg-card px-6 py-8 text-card-foreground shadow-sm sm:px-12 sm:py-12",
        className,
      )}
    >
      {children}
    </div>
  );
}
