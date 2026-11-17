import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '#lib/utils';

interface SettingsGroupProps {
  title: string;
  /** Uma linha curta sob o título. */
  hint?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Bloco de uma tela de Configurações: título em fonte mono (como um comando de terminal), dica e o
 * conteúdo. É o padrão visual de todas as seções (Componentes, Biblioteca, Aparência, Serviços...).
 */
export function SettingsGroup({ title, hint, children, className }: SettingsGroupProps) {
  return (
    <section aria-label={title} className={cn('flex animate-enter flex-col gap-2', className)}>
      <div>
        <h3 className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>

      {children}
    </section>
  );
}

/** Caixa de um item de configuração: borda fina, fundo de card e destaque opcional (item ativo). */
export function SettingsPanel({
  highlight = false,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { highlight?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border bg-card p-4 transition-colors',
        highlight && 'border-primary/40 bg-primary/5',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Linha de um ajuste, compacta: rótulo curto à esquerda e o controle à direita (empilha em janela
 * estreita). A dica vai no `title` para não ocupar espaço.
 */
export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div title={hint} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <p className="text-xs font-medium text-muted-foreground sm:w-24 sm:shrink-0">{label}</p>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
