import type { ReactNode } from "react";

import { cn } from "#lib/utils";

interface ReadingSectionProps {
  /** Âncora da seção (ex.: o capítulo, para o sumário rolar até ela). */
  id?: string;
  /** Linha pequena acima do título (ex.: "Capítulo 2"). */
  label?: ReactNode;
  title: string;
  /** Nível do título: 1 numa página, 2 num capítulo dentro de um livro. */
  headingLevel?: 1 | 2;
  /** O texto (Markdown) a ler. */
  children: ReactNode;
  /** Rodapé discreto da seção (ex.: marcar como lido, próximo capítulo). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Uma seção de texto no modo leitura: sem moldura, direto no fundo da
 * plataforma, com título centralizado e o texto embaixo. É o mesmo desenho
 * para uma página e para cada capítulo de um livro. Título e rótulo usam `em`:
 * acompanham o tamanho da letra escolhido (ver `ReadingSurface`).
 */
export function ReadingSection({
  id,
  label,
  title,
  headingLevel = 1,
  children,
  footer,
  className,
}: ReadingSectionProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <section
      id={id}
      aria-label={title}
      className={cn("scroll-mt-20", className)}
    >
      <header className="space-y-2 text-center">
        {label && (
          <p className="flex items-center justify-center gap-1.5 text-[0.75em] font-semibold uppercase leading-[1.35] tracking-widest text-primary">
            {label}
          </p>
        )}

        <Heading className="text-[1.875em] font-semibold leading-[1.2] tracking-tight">
          {title}
        </Heading>
      </header>

      <div className="mt-8">{children}</div>

      {footer && (
        <footer className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {footer}
        </footer>
      )}
    </section>
  );
}
