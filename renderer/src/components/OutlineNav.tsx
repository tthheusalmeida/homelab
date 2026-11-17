import { cn } from '#lib/utils';

export interface OutlineItem {
  id: string;
  label: string;
  /** Nível do título (1 a 3); níveis mais fundos ficam recuados. */
  level?: number;
}

interface OutlineNavProps {
  items: OutlineItem[];
  /** Item sendo lido agora; fica destacado. */
  activeId?: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Lista de títulos clicáveis (sumário). A hierarquia é visível: título em negrito e cor cheia,
 * subtítulo recuado e médio, sub-subtítulo menor, leve e esmaecido. O item que está sendo lido
 * aparece em destaque (fundo e negrito, sem borda colorida; ver `OUTLINE_ACTIVE`) e com `aria-current`.
 */
export function OutlineNav({ items, activeId, onSelect, ariaLabel, className }: OutlineNavProps) {
  return (
    <nav aria-label={ariaLabel}>
      <ul className={cn('space-y-1 overflow-y-auto pr-1', className)}>
        {items.map((item) => {
          const active = item.id === activeId;
          const level = Math.min(item.level ?? 1, 3);

          return (
            <li
              key={item.id}
              data-level={level}
              // Títulos (nível 1) abrem um grupo; os subtítulos ficam recuados e mais leves.
              className={cn(level === 1 && 'mt-2.5 first:mt-0')}
              style={{ paddingLeft: `${(level - 1) * 0.875}rem` }}
            >
              <button
                type="button"
                aria-current={active ? 'location' : undefined}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'w-full rounded-md px-2 py-0.5 text-left hover:underline',
                  levelStyle[level],
                  active && OUTLINE_ACTIVE,
                )}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Item em leitura ou clicado: fundo derivado da cor do texto, texto em cor cheia e negrito, sem
 * borda colorida. Só usa `foreground`, então contrasta com qualquer fundo (tema ou as
 * cores escolhidas na leitura), o que a cor de destaque sozinha não garante.
 */
export const OUTLINE_ACTIVE = "bg-foreground/12 font-semibold text-foreground";

/** Peso, tamanho e cor por nível: do título (forte) ao subtítulo (leve e esmaecido). */
const levelStyle: Record<number, string> = {
  1: 'text-sm font-bold text-foreground',
  2: 'text-sm font-medium text-foreground/75 hover:text-foreground',
  3: 'text-xs font-normal text-muted-foreground hover:text-foreground',
};
