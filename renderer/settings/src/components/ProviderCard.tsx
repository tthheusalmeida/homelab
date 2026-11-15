import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { Card } from '#ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#ui/collapsible';

interface ProviderCardProps {
  title: string;
  /** Uma linha curta sob o título. */
  description: string;
  /** Indicador ao lado do título (ex.: "Configurada"), visível mesmo recolhido. */
  badge?: ReactNode;
  children: ReactNode;
  /** Ações do card (Testar, Salvar), no rodapé do conteúdo. */
  footer?: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Item de configuração recolhível: título e descrição sempre visíveis;
 * o conteúdo abre ao clicar. O estado dos campos vive em quem usa o card,
 * então o que foi digitado não se perde ao recolher.
 */
export function ProviderCard({
  title,
  description,
  badge,
  children,
  footer,
  defaultOpen = false,
}: ProviderCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="gap-0 py-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-4 text-left">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-2 font-medium">
              {title}
              {badge}
            </span>
            <span className="text-sm font-normal text-muted-foreground">{description}</span>
          </span>

          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-aria-expanded:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="flex flex-col gap-4 border-t px-6 py-5">
            {children}

            {footer && <div className="flex justify-end gap-2">{footer}</div>}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
