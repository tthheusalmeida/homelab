import type { ComponentProps, ReactNode } from "react";

import { ArrowUpRight } from "lucide-react";

import { cn } from "#lib/utils";

/**
 * Link para fora do app (abre no navegador do sistema; o Electron cuida disso).
 * Use sempre este componente para endereços externos: cor de ação e ícone padronizados.
 * `bare` tira o desenho de link (sublinhado e ícone) para quem tem forma própria, como o
 * horário de um trecho da transcrição; o clique continua abrindo fora do app.
 */
export function ExternalLink({
  href,
  children,
  className,
  bare = false,
  ...props
}: Omit<ComponentProps<"a">, "target" | "rel"> & {
  href: string;
  children: ReactNode;
  bare?: boolean;
}) {
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        !bare &&
          "inline-flex items-center gap-0.5 font-medium text-brand-text underline underline-offset-4 decoration-primary/40 hover:decoration-primary",
        className,
      )}
    >
      {children}
      {!bare && <ArrowUpRight className="size-3.5" aria-hidden="true" />}
    </a>
  );
}
