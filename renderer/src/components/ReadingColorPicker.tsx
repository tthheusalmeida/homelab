import { HexColorPicker, type HexColorOption } from '#components/HexColorPicker';
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

const colorOptions: HexColorOption<ReadingColorId>[] = [
  {
    id: 'default',
    label: readingColorLabels.default,
    // Metade clara, metade escura: "as cores do tema".
    style: { backgroundImage: 'linear-gradient(135deg, var(--card) 50%, var(--foreground) 50%)' },
    checkClassName: 'text-foreground mix-blend-difference invert',
  },
  ...READING_COLOR_NAMES.map((name) => ({
    id: name,
    label: readingColorLabels[name],
    color: readingSwatch(name),
  })),
];

/**
 * Escolha de cor da leitura em hexágonos (a colmeia da marca): "Padrão" (as cores do tema) ou uma
 * das 15 cores do Tailwind, com a intensidade (50 a 950) num controle deslizante logo abaixo, na
 * própria cor escolhida (`ShadeSlider`). Os hexágonos são o `HexColorPicker` genérico.
 */
export function ReadingColorPicker({ label, color, shade, onChange }: ReadingColorPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <HexColorPicker
        label={label}
        options={colorOptions}
        value={color}
        onChange={(next) => onChange({ color: next })}
        className="items-center"
      />

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
