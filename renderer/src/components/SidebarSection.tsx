import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#ui/collapsible';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from '#ui/sidebar';

interface SidebarSectionProps {
  /** Rótulo da seção (também é a chave lembrada em `useCollapsedGroups`). */
  label: string;
  open: boolean;
  onToggle: () => void;
  /** A página atual está nesta seção: com ela recolhida, aparece um ponto de destaque. */
  hasActive?: boolean;
  /** Texto acessível do ponto de destaque; por padrão "Página atual em <rótulo>". */
  activeLabel?: string;
  children: ReactNode;
}

/**
 * Seção recolhível de uma barra lateral: rótulo com seta, ponto de destaque quando recolhida com a
 * página atual dentro, e o menu como conteúdo. Usada pela barra do app e pela das Configurações.
 */
export function SidebarSection({
  label,
  open,
  onToggle,
  hasActive = false,
  activeLabel,
  children,
}: SidebarSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onToggle} render={<SidebarGroup />}>
      <SidebarGroupLabel
        render={
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between rounded-md select-none hover:text-sidebar-foreground" />
        }
      >
        <span>{label}</span>

        <span className="flex items-center gap-1.5">
          {!open && hasActive && (
            <span
              aria-label={activeLabel ?? `Página atual em ${label}`}
              className="size-1.5 rounded-full bg-primary"
            />
          )}

          <ChevronDown
            className={`size-3.5 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
          />
        </span>
      </SidebarGroupLabel>

      <CollapsibleContent>
        <SidebarGroupContent>{children}</SidebarGroupContent>
      </CollapsibleContent>
    </Collapsible>
  );
}
