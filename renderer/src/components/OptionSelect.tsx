import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "#ui/select";
import { cn } from "#lib/utils";

export interface SelectOption {
  id: string;
  label: string;
}

interface OptionSelectProps {
  value?: string;
  options: SelectOption[];
  placeholder: string;
  label?: string;

  triggerWidth?: string;
  contentWidth?: string;

  disabled?: boolean;
  /** Uma escolha diferente do padrão está valendo (um filtro aplicado): o botão ganha a cor de destaque. */
  active?: boolean;
  onValueChange: (value: string | null) => void;
}

export function OptionSelect({
  value,
  options,
  placeholder,
  label,
  triggerWidth = "w-32",
  contentWidth = "w-48",
  disabled,
  active = false,
  onValueChange,
}: OptionSelectProps) {
  const selectedOption = options.find((option) => option.id === value);

  return (
    <Select
      value={value ?? null}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        data-active={active ? "true" : undefined}
        className={cn(
          "h-8 border-0 bg-muted/50 shadow-none",
          triggerWidth,
          // Filtro aplicado: fundo e texto na cor de destaque, com um anel fino, nos dois temas.
          active &&
            "bg-primary/15 text-brand-text ring-1 ring-primary/50 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/25",
        )}
      >
        <SelectValue placeholder={placeholder}>
          {selectedOption?.label}
        </SelectValue>
      </SelectTrigger>

      <SelectContent className={contentWidth}>
        <SelectGroup>
          {label && <SelectLabel>{label}</SelectLabel>}

          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
