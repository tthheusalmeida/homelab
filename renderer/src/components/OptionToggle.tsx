import type { LucideIcon } from "lucide-react";

import { Button } from "#ui/button";

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
}: OptionToggleProps<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-1">
      {options.map(({ id, label: optionLabel, icon: Icon }) => (
        <Button
          key={id}
          type="button"
          size="icon-sm"
          variant={value === id ? "default" : "outline"}
          aria-label={optionLabel}
          aria-pressed={value === id}
          title={optionLabel}
          onClick={() => onChange(id)}
        >
          <Icon />
        </Button>
      ))}
    </div>
  );
}
