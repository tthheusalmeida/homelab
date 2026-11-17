import { Check } from 'lucide-react';

import { HexSwatch } from '#components/HexSwatch';
import { ShadeSlider } from '#components/ShadeSlider';
import { readingColorLabels, readingSwatch } from '#lib/reading';
import {
  READING_COLOR_NAMES,
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
 * Escolha de cor da leitura em hexágonos (a colmeia da marca): "Padrão" (as cores do tema) ou uma
 * das 15 cores do Tailwind, com a intensidade (50 a 950) num controle deslizante logo abaixo, na
 * própria cor escolhida (`ShadeSlider`).
 */
export function ReadingColorPicker({ label, color, shade, onChange }: ReadingColorPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1">
        <HexSwatch
          selected={color === 'default'}
          aria-label={readingColorLabels.default}
          title={readingColorLabels.default}
          // Metade clara, metade escura: "as cores do tema".
          style={{
            backgroundImage: 'linear-gradient(135deg, var(--card) 50%, var(--foreground) 50%)',
          }}
          onClick={() => onChange({ color: 'default' })}
        >
          {color === 'default' && (
            <Check className="size-3 text-foreground mix-blend-difference invert" aria-hidden />
          )}
        </HexSwatch>

        {READING_COLOR_NAMES.map((name) => (
          <HexSwatch
            key={name}
            selected={color === name}
            color={readingSwatch(name)}
            aria-label={readingColorLabels[name]}
            title={readingColorLabels[name]}
            onClick={() => onChange({ color: name })}
          >
            {color === name && (
              <Check className="size-3 text-white mix-blend-difference" aria-hidden />
            )}
          </HexSwatch>
        ))}
      </div>

      {color !== 'default' && (
        <div className="animate-enter-fade">
          <ShadeSlider
            label={`Intensidade: ${label}`}
            color={color}
            value={shade}
            onChange={(next) => onChange({ shade: next })}
          />
        </div>
      )}
    </div>
  );
}
