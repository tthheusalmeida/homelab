import { PanelRightOpen } from 'lucide-react';

import { cn } from '#lib/utils';

/**
 * Aba hexagonal na borda direita do modo leitura: o que o usuário procura para abrir o painel
 * lateral. É **invertida** em relação ao fundo da leitura (tinta como fundo da aba e fundo como
 * cor do ícone), para sempre contrastar com a página, qualquer que seja a cor escolhida. Usada no modo leitura (`ReadingSidePanel`) e no preview das Configurações.
 */
export function ReadingSideTab({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-10 w-[2.1rem] items-center justify-center bg-[var(--reading-tab-bg,var(--foreground))] text-[var(--reading-tab-fg,var(--background))] opacity-80 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]',
        className,
      )}
    >
      <PanelRightOpen className="size-4" />
    </span>
  );
}
