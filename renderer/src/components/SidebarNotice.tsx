import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '#lib/utils';

interface SidebarNoticeProps {
  icon: LucideIcon;
  title: string;
  /** Uma linha curta sob o título (ou sob a barra de progresso). */
  hint?: ReactNode;
  /** Barra de progresso (`ProgressBar` com `className="h-1.5"`), entre o título e a dica. */
  progress?: ReactNode;
  /** Torna título, progresso e dica um único botão (clicar abre a tela do assunto). */
  onOpen?: () => void;
  /** Nome do botão acima para leitores de tela; use junto com `onOpen`. */
  openLabel?: string;
  /** Botões do cartão, no rodapé: ocupam a largura toda e usam `size="xs"`. */
  action?: ReactNode;
  role?: 'alert' | 'status';
  className?: string;
}

/**
 * Cartão de aviso da barra lateral, acima de Configurações (atualização do app, reinício pendente,
 * instalação de componentes). **Fonte única do visual**: ícone no tamanho dos ícones do menu
 * (`size-4`, cor `primary`), título em 13 px com peso médio, dica em 11 px, progresso fino (`h-1.5`)
 * e botões `xs` na largura toda. Quem usa só informa o conteúdo.
 */
export function SidebarNotice({
  icon: Icon,
  title,
  hint,
  progress,
  onOpen,
  openLabel,
  action,
  role,
  className,
}: SidebarNoticeProps) {
  const content = (
    <>
      <span className="flex items-center gap-2 text-[13px] leading-tight font-medium">
        <Icon aria-hidden className="size-4 shrink-0 text-primary" />
        {title}
      </span>

      {progress}

      {hint && <span className="text-[11px] leading-snug text-muted-foreground">{hint}</span>}
    </>
  );

  return (
    <div
      role={role}
      data-slot="sidebar-notice"
      className={cn(
        'flex w-full animate-enter-fade flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 transition-colors select-none',
        onOpen && 'hover:bg-primary/10',
        className,
      )}
    >
      {onOpen ? (
        <button
          type="button"
          aria-label={openLabel}
          onClick={onOpen}
          className="flex w-full cursor-pointer flex-col gap-1.5 text-left"
        >
          {content}
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">{content}</div>
      )}

      {action && <div className="flex flex-col gap-1.5 [&>button]:w-full">{action}</div>}
    </div>
  );
}
