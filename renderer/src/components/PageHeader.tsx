import { useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "#lib/utils";

import { PageHeaderSlotContext } from "./PageHeaderSlot";

interface PageHeaderProps {
  /** Nome da tela, igual ao do item da sidebar. */
  title: string;
  description?: string;
  /** Comando de terminal mostrado acima do título (ex.: `jobs --new`). */
  command: string;
  /** Linha de status em fonte mono, logo abaixo da descrição. */
  status?: ReactNode;
  /** Botões à direita. */
  actions?: ReactNode;
  /** Filtros, busca ou abas da tela: ficam presos junto com o cabeçalho, abaixo da descrição. */
  toolbar?: ReactNode;
  className?: string;
}

/**
 * Cabeçalho padrão das telas com cara de homelab: prompt de terminal, título, descrição e ações.
 * O título deve ser o mesmo texto do item da sidebar.
 *
 * **Fica fixo no topo:** dentro do `AppLayout` ele é desenhado (portal) no lugar fixo acima da
 * área de rolagem, então só o conteúdo da tela rola; o cabeçalho, a descrição e os filtros em
 * `toolbar` nunca saem de vista nem mudam de tamanho. Fora do layout (testes), aparece onde foi
 * escrito.
 */
export function PageHeader({
  title,
  description,
  command,
  status,
  actions,
  toolbar,
  className,
}: PageHeaderProps) {
  const slot = useContext(PageHeaderSlotContext);

  const header = (
    <header
      data-slot="page-header"
      className={cn(
        "space-y-3 border-b border-border bg-background px-4 pt-4 pb-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground select-none">
        <span>root@homelab:~$</span>
        <span>{command}</span>
        <span aria-hidden="true" className="inline-block h-3.5 w-1.5 animate-pulse bg-brand" />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

          {description && <p className="text-sm text-muted-foreground">{description}</p>}

          {status && <div className="pt-1 font-mono text-xs text-muted-foreground">{status}</div>}
        </div>

        {actions}
      </div>

      {toolbar}
    </header>
  );

  return slot ? createPortal(header, slot) : header;
}
