import { Label } from '#ui/label';
import { cn } from '#lib/utils';

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Caixa de seleção com o rótulo clicável ao lado: a única forma de opção "liga/desliga" das Configurações. */
export function CheckboxField({ id, label, checked, onChange, disabled, className }: CheckboxFieldProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        id={id}
        type="checkbox"
        className="size-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />

      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}
