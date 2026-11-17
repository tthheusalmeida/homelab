import { Check } from 'lucide-react';

import { readingColorLabels, readingSwatch } from '#lib/reading';
import { cn } from '#lib/utils';
import { READING_COLOR_NAMES, type ReadingColorId } from '#shared/contracts/reading';

interface ReadingColorPickerProps {
  /** Nome do grupo (ex.: "Cor de fundo"). */
  label: string;
  value: ReadingColorId;
  onChange: (color: ReadingColorId) => void;
}

/**
 * Escolha de cor da leitura: "Padrão" (as cores do tema) e as cores do Tailwind. O usuário só
 * escolhe a cor; a intensidade é automática (ver `readingColor` em `lib/reading.ts`).
 */
export function ReadingColorPicker({ label, value, onChange }: ReadingColorPickerProps) {
  const swatch =
    'flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-shadow duration-200 hover:ring-2 hover:ring-foreground/30';

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'default'}
        aria-label={readingColorLabels.default}
        title={readingColorLabels.default}
        className={cn(
          swatch,
          'border border-dashed border-foreground/40 bg-card text-foreground',
          value === 'default' && 'ring-2 ring-foreground',
        )}
        onClick={() => onChange('default')}
      >
        {value === 'default' && <Check className="size-3.5" aria-hidden />}
      </button>

      {READING_COLOR_NAMES.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={readingColorLabels[color]}
          title={readingColorLabels[color]}
          className={cn(swatch, value === color && 'ring-2 ring-foreground')}
          style={{ backgroundColor: readingSwatch(color) }}
          onClick={() => onChange(color)}
        >
          {value === color && <Check className="size-3.5 text-white" aria-hidden />}
        </button>
      ))}
    </div>
  );
}
