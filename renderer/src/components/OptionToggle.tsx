import type { LucideIcon } from 'lucide-react';

import { Button } from '#ui/button';
import { Tip } from '#components/Tip';

export interface ToggleOption<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
}

interface OptionToggleProps<T extends string> {
  value: T;
  options: readonly ToggleOption<T>[];
  onChange: (value: T) => void;
  /** Nome do grupo para leitores de tela (ex.: "Modo de visualização"). */
  label: string;
  /** Mostra o nome ao lado do ícone (abas de visualização); sem isso, só o ícone. */
  showLabels?: boolean;
}

/**
 * Grupo de botões de ícone para escolher UMA opção (modo de visualização, layout…).
 * Base de `ViewToggle` e de qualquer alternância nova: reutilize em vez de recriar.
 */
export function OptionToggle<T extends string>({
  value,
  options,
  onChange,
  label,
  showLabels = false,
}: OptionToggleProps<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-1">
      {options.map(({ id, label: optionLabel, icon: Icon }) => (
        <Tip key={id} content={optionLabel}>
          <Button
            type="button"
            size={showLabels ? 'sm' : 'icon-sm'}
            variant={value === id ? 'default' : 'outline'}
            aria-label={optionLabel}
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            <Icon />
            {showLabels && optionLabel}
          </Button>
        </Tip>
      ))}
    </div>
  );
}
