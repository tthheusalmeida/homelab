import { Button } from '#ui/button';
import { ReadingColorPicker } from '#components/ReadingColorPicker';
import { ReadingPreview } from '#components/ReadingPreview';
import { ReadingSteppers } from '#components/ReadingSteppers';
import { SettingsGroup, SettingsPanel, SettingsRow } from '#components/SettingsGroup';
import { Tip } from '#components/Tip';
import { useAppearance } from '#hooks/use-appearance';
import {
  readingFontFamilies,
  readingFontHints,
  readingFontLabels,
} from '#lib/reading';
import {
  DEFAULT_READING,
  READING_FONT_IDS,
  type ReadingPreferences,
} from '#shared/contracts/reading';

import { CheckboxField } from '../components/CheckboxField';
import { PreferenceError, RestoreButton, usePreferenceAction } from '../components/PreferenceForm';
import { Strings } from '../strings';

const text = Strings.appearance.reading;

/**
 * Preferências de leitura (fonte, tamanho da letra, zoom, cores e painel lateral) com o preview ao
 * vivo no topo. Minimalista: uma linha por ajuste, sem textos de ajuda soltos. Como o resto da
 * Aparência, cada escolha vale na hora e é gravada em seguida.
 */
export function ReadingSettings() {
  const { appearance, updateReading, resetReading } = useAppearance();
  const { reading } = appearance;

  const { error, run } = usePreferenceAction();

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
              <Tip key={font} content={readingFontHints[font]}>
                <Button
                  type="button"
                  role="radio"
                  aria-checked={reading.font === font}
                  variant={reading.font === font ? 'default' : 'outline'}
                  size="xs"
                  style={{ fontFamily: readingFontFamilies[font] }}
                  onClick={() => change({ font })}
                >
                  {readingFontLabels[font]}
                </Button>
              </Tip>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow label={text.size}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <ReadingSteppers
              reading={reading}
              change={change}
              fontLabel={text.fontSize}
              zoomLabel={text.zoom}
            />
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
            <CheckboxField
              id="reading-pin-sidebar"
              label={text.sidePanelOption}
              checked={reading.pinSidebar}
              onChange={(checked) => change({ pinSidebar: checked })}
            />

            <RestoreButton disabled={isDefault} onClick={() => run(resetReading())}>
              {text.restore}
            </RestoreButton>
          </div>
        </SettingsRow>

        <SettingsRow label={text.sides} hint={text.sidesHint}>
          <CheckboxField
            id="reading-swap-sides"
            label={text.swapOption}
            checked={reading.swapSides}
            onChange={(checked) => change({ swapSides: checked })}
          />
        </SettingsRow>

        <PreferenceError message={error} />
      </SettingsPanel>
    </SettingsGroup>
  );
}
