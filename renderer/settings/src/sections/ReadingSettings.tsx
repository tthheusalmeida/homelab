import { useState } from 'react';
import { Minus, Plus, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '#ui/button';
import { Label } from '#ui/label';
import { ReadingColorPicker } from '#components/ReadingColorPicker';
import { ReadingPreview } from '#components/ReadingPreview';
import { SettingsGroup, SettingsPanel, SettingsRow } from '#components/SettingsGroup';
import { ValueStepper } from '#components/ValueStepper';
import { useAppearance } from '#hooks/use-appearance';
import {
  readingFontFamilies,
  readingFontHints,
  readingFontLabels,
  stepFontSize,
  stepZoom,
} from '#lib/reading';
import {
  DEFAULT_READING,
  READING_FONT_IDS,
  READING_FONT_SIZE,
  READING_ZOOM,
  type ReadingPreferences,
} from '#shared/contracts/reading';

import { Strings } from '../strings';

const text = Strings.appearance.reading;

/**
 * Preferências de leitura (fonte, tamanho da letra, zoom, cores e painel lateral) com o preview ao
 * vivo no topo. Minimalista: uma linha por ajuste, sem textos de ajuda soltos. Como o resto da
 * Aparência, cada escolha vale na hora e é gravada em seguida.
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
      <SettingsPanel className="gap-2.5 p-3">
        <ReadingPreview />

        <SettingsRow label={text.font}>
          <div role="radiogroup" aria-label={text.font} className="flex flex-wrap gap-1">
            {READING_FONT_IDS.map((font) => (
              <Button
                key={font}
                type="button"
                role="radio"
                aria-checked={reading.font === font}
                title={readingFontHints[font]}
                variant={reading.font === font ? 'default' : 'outline'}
                size="xs"
                style={{ fontFamily: readingFontFamilies[font] }}
                onClick={() => change({ font })}
              >
                {readingFontLabels[font]}
              </Button>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow label={text.size}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
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
            />

            <span title={text.zoomHint}>
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
              />
            </span>
          </div>
        </SettingsRow>

        <SettingsRow label={text.background}>
          <ReadingColorPicker
            label={text.background}
            color={reading.background}
            shade={reading.backgroundShade}
            onChange={({ color, shade }) =>
              change({
                ...(color && { background: color }),
                ...(shade && { backgroundShade: shade }),
              })
            }
          />
        </SettingsRow>

        <SettingsRow label={text.text}>
          <ReadingColorPicker
            label={text.text}
            color={reading.text}
            shade={reading.textShade}
            onChange={({ color, shade }) =>
              change({
                ...(color && { text: color }),
                ...(shade && { textShade: shade }),
              })
            }
          />
        </SettingsRow>

        <SettingsRow label={text.separator}>
          <ReadingColorPicker
            label={text.separator}
            color={reading.separator}
            shade={reading.separatorShade}
            onChange={({ color, shade }) =>
              change({
                ...(color && { separator: color }),
                ...(shade && { separatorShade: shade }),
              })
            }
          />
        </SettingsRow>

        <SettingsRow label={text.sidePanel} hint={text.sidePanelHint}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                id="reading-pin-sidebar"
                type="checkbox"
                className="size-4 shrink-0 cursor-pointer accent-primary"
                checked={reading.pinSidebar}
                onChange={(event) => change({ pinSidebar: event.target.checked })}
              />

              <Label htmlFor="reading-pin-sidebar" className="cursor-pointer text-sm font-normal">
                {text.sidePanelOption}
              </Label>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={isDefault}
              onClick={() => run(resetReading())}
            >
              <RotateCcw /> {text.restore}
            </Button>
          </div>
        </SettingsRow>

        {error && (
          <p role="alert" className="animate-enter-fade text-sm text-destructive">
            {error}
          </p>
        )}
      </SettingsPanel>
    </SettingsGroup>
  );
}
