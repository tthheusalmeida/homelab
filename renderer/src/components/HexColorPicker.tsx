import { Check } from 'lucide-react';

import { HexSwatch } from '#components/HexSwatch';
import { cn } from '#lib/utils';
import type { AccentId } from '#shared/contracts/appearance';

/** Uma opção de cor do seletor: a cor do tema (`accent`) ou um valor de CSS (`color`). */
export interface HexColorOption<T extends string = string> {
  id: T;
  label: string;
  /** Cor de destaque do tema que o hexágono mostra (as 15 cores de Configurações > Aparência). */
  accent?: AccentId;
  /** Qualquer valor de CSS, quando a cor não é uma cor de destaque. */
  color?: string;
}

interface HexColorPickerProps<T extends string> {
  /** Nome do grupo para leitores de tela (ex.: "Cor da capa"). */
  label: string;
  options: readonly HexColorOption<T>[];
  /** Opção escolhida; `undefined` deixa todas desmarcadas. */
  value: T | undefined;
  onChange: (id: T) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Seletor de cor em hexágonos (a colmeia da marca), genérico: recebe a lista de opções e devolve a
 * escolhida. É o mesmo da cor de destaque em Configurações > Aparência; qualquer tela que precise
 * de uma escolha de cor usa este componente (ver `accentOptions` em `#lib/appearance`).
 */
export function HexColorPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  size,
  className,
}: HexColorPickerProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-1', className)}>
      {options.map((option) => {
        const selected = option.id === value;

        return (
          <HexSwatch
            key={option.id}
            selected={selected}
            size={size}
            disabled={disabled}
            aria-label={option.label}
            title={option.label}
            color={option.color}
            // `data-accent` + `dark` fazem `bg-primary` mostrar a cor de destaque deste hexágono.
            data-accent={option.accent}
            className={cn(option.accent && 'dark')}
            fillClassName={option.accent ? 'bg-primary text-primary-foreground' : undefined}
            onClick={() => onChange(option.id)}
          >
            {selected && (
              <Check
                className={cn('size-3', !option.accent && 'text-white mix-blend-difference')}
                aria-hidden
              />
            )}
          </HexSwatch>
        );
      })}
    </div>
  );
}
