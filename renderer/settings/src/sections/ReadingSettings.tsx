import { useState } from 'react';
import { Minus, Plus, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '#ui/button';
import { ReadingColorPicker } from '#components/ReadingColorPicker';
import { ReadingPreview } from '#components/ReadingPreview';
import { SettingsGroup, SettingsPanel } from '#components/SettingsGroup';
import { ValueStepper } from '#components/ValueStepper';
import { useAppearance } from '#hooks/use-appearance';
import {
  readingFontFamilies,
  readingFontHints,
  readingFontLabels,
  stepFontSize,
  stepZoom,
} from '#lib/reading';
import { cn } from '#lib/utils';
import {
  DEFAULT_READING,
  READING_FONT_IDS,
  READING_FONT_SIZE,
  READING_ZOOM,
  type ReadingPreferences,
} from '#shared/contracts/reading';

import { Strings } from '../strings';

const text = Strings.appearance.reading;

/** Linha de um ajuste: rótulo curto à esquerda, controle à direita (empilha em janela estreita). */
function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="sm:w-28 sm:shrink-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * Preferências de leitura (fonte, tamanho da letra, zoom, cores) com o preview ao vivo no topo.
 * Como o resto da Aparência, cada escolha vale na hora e é gravada em seguida.
 */
export function ReadingSettings() {
  const { appearance, updateReading, resetReading } = useAppearance();
  const [error, setError] = useState<string | null>(null);
  const { reading } = appearance;

  const run = (action: Promise<void>) => {
    setError(null);
    action.catch((failure: Error) => setError(failure.message));
  };

  const change = (patch: Partial<ReadingPreferences>) => run(updateReading(patch));

  const isDefault = (Object.keys(DEFAULT_READING) as (keyof ReadingPreferences)[]).every(
    (key) => reading[key] === DEFAULT_READING[key],
  );

  return (
    <SettingsGroup title={text.title} hint={text.hint}>
      <SettingsPanel>
        <ReadingPreview />

        <Row label={text.font}>
          <div role="radiogroup" aria-label={text.font} className="flex flex-wrap gap-1.5">
            {READING_FONT_IDS.map((font) => (
              <Button
                key={font}
                type="button"
                role="radio"
                aria-checked={reading.font === font}
                title={readingFontHints[font]}
                variant={reading.font === font ? 'default' : 'outline'}
                size="sm"
                style={{ fontFamily: readingFontFamilies[font] }}
                onClick={() => change({ font })}
              >
                {readingFontLabels[font]}
              </Button>
            ))}
          </div>
        </Row>

        <Row label={text.fontSize}>
          <div className="max-w-52">
            <ValueStepper
              label={text.fontSize}
              value={`${reading.fontSize}`}
              decreaseLabel="Diminuir a letra"
              increaseLabel="Aumentar a letra"
              canDecrease={reading.fontSize > READING_FONT_SIZE.min}
              canIncrease={reading.fontSize < READING_FONT_SIZE.max}
              decreaseIcon={<Minus />}
              increaseIcon={<Plus />}
              onDecrease={() => change({ fontSize: stepFontSize(reading.fontSize, -1) })}
              onIncrease={() => change({ fontSize: stepFontSize(reading.fontSize, 1) })}
              hideLabel
            />
          </div>
        </Row>

        <Row label={text.zoom} hint={text.zoomHint}>
          <div className="max-w-52">
            <ValueStepper
              label={text.zoom}
              value={`${reading.zoom}%`}
              decreaseLabel="Diminuir o zoom"
              increaseLabel="Aumentar o zoom"
              canDecrease={reading.zoom > READING_ZOOM.min}
              canIncrease={reading.zoom < READING_ZOOM.max}
              decreaseIcon={<ZoomOut />}
              increaseIcon={<ZoomIn />}
              onDecrease={() => change({ zoom: stepZoom(reading.zoom, -1) })}
              onIncrease={() => change({ zoom: stepZoom(reading.zoom, 1) })}
              hideLabel
            />
          </div>
        </Row>

        <Row label={text.background}>
          <ReadingColorPicker
            label={text.background}
            value={reading.background}
            onChange={(background) => change({ background })}
          />
        </Row>

        <Row label={text.text}>
          <ReadingColorPicker
            label={text.text}
            value={reading.text}
            onChange={(color) => change({ text: color })}
          />
        </Row>

        {error && (
          <p role="alert" className={cn('animate-enter-fade text-sm text-destructive')}>
            {error}
          </p>
        )}

        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDefault}
            onClick={() => run(resetReading())}
          >
            <RotateCcw /> {text.restore}
          </Button>
        </div>
      </SettingsPanel>
    </SettingsGroup>
  );
}
