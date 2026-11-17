import { Check } from 'lucide-react';

import { readingColorLabels, readingShadeSwatch, readingSwatch } from '#lib/reading';
import { cn } from '#lib/utils';
import {
  READING_COLOR_NAMES,
  READING_SHADES_LIST,
  type ReadingColorId,
  type ReadingShade,
} from '#shared/contracts/reading';

interface ReadingColorPickerProps {
  /** Nome do grupo (ex.: "Cor de fundo"). */
  label: string;
  color: ReadingColorId;
  shade: ReadingShade;
  /** Quem muda a cor mantém a intensidade; quem muda a intensidade mantém a cor. */
  onChange: (change: { color?: ReadingColorId; shade?: ReadingShade }) => void;
}

/**
 * Escolha de cor da leitura: "Padrão" (as cores do tema) ou uma das cores do Tailwind, com a
 * intensidade (50 a 950) logo abaixo, da mais clara à mais escura, na própria cor escolhida.
 */
export function ReadingColorPicker({ label, color, shade, onChange }: ReadingColorPickerProps) {
  const swatch =
    'flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-shadow duration-200 hover:ring-2 hover:ring-foreground/30';

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          role="radio"
          aria-checked={color === 'default'}
          aria-label={readingColorLabels.default}
          title={readingColorLabels.default}
          className={cn(
            swatch,
            'border border-dashed border-foreground/40 bg-card text-foreground',
            color === 'default' && 'ring-2 ring-foreground',
          )}
          onClick={() => onChange({ color: 'default' })}
        >
          {color === 'default' && <Check className="size-3.5" aria-hidden />}
        </button>

        {READING_COLOR_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={color === name}
            aria-label={readingColorLabels[name]}
            title={readingColorLabels[name]}
            className={cn(swatch, color === name && 'ring-2 ring-foreground')}
            style={{ backgroundColor: readingSwatch(name) }}
            onClick={() => onChange({ color: name })}
          >
            {color === name && <Check className="size-3.5 text-white" aria-hidden />}
          </button>
        ))}
      </div>

      {color !== 'default' && (
        <div
          role="radiogroup"
          aria-label={`Intensidade: ${label}`}
          className="flex animate-enter-fade items-center gap-1"
        >
          <span aria-hidden className="mr-1 text-[10px] text-muted-foreground">
            Clara
          </span>

          {READING_SHADES_LIST.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={shade === value}
              aria-label={`${value}`}
              title={`${value}`}
              className={cn(
                'flex h-5 min-w-0 flex-1 items-center justify-center rounded-sm border border-foreground/10 transition-shadow duration-200 hover:ring-2 hover:ring-foreground/30',
                shade === value && 'ring-2 ring-foreground ring-offset-1 ring-offset-card',
              )}
              style={{ backgroundColor: readingShadeSwatch(color, value) }}
              onClick={() => onChange({ shade: value })}
            />
          ))}

          <span aria-hidden className="ml-1 text-[10px] text-muted-foreground">
            Escura
          </span>
        </div>
      )}
    </div>
  );
}
