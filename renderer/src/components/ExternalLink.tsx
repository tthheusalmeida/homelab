import type { ReactNode } from "react";

import { ArrowUpRight } from "lucide-react";

import { cn } from "#lib/utils";

/**
 * Link para fora do app (abre no navegador do sistema; o Electron cuida disso).
 * Use sempre este componente para endereços externos: cor de ação e ícone padronizados.
 */
export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-0.5 font-medium text-brand-text underline underline-offset-4 decoration-primary/40 hover:decoration-primary",
        className,
      )}
    >
      {children}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </a>
  );
}
