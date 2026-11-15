import { FolderOpen } from 'lucide-react';

import { Button } from '#ui/button';
import { Input } from '#ui/input';
import { Label } from '#ui/label';

import { pickFolder } from '../hooks';
import { Strings } from '../strings';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  /** Mostra o botão que abre o seletor de pasta do sistema. */
  pickable?: boolean;
  type?: 'text' | 'password';
  placeholder?: string;
}

export function Field({
  id,
  label,
  value,
  onChange,
  hint,
  pickable = false,
  type = 'text',
  placeholder,
}: FieldProps) {
  const choose = async () => {
    const chosen = await pickFolder(value || undefined);

    if (chosen) {
      onChange(chosen);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>

      <div className="flex gap-2">
        <Input
          id={id}
          type={type}
          value={value}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />

        {pickable && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`${Strings.pickFolder}: ${label}`}
            onClick={() => void choose()}
          >
            <FolderOpen />
          </Button>
        )}
      </div>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
