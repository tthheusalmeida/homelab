import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';

import { Button } from '#ui/button';
import { HexSwatch } from '#components/HexSwatch';
import { SettingsGroup, SettingsPanel, SettingsRow } from '#components/SettingsGroup';
import { useAppearance } from '#hooks/use-appearance';
import { accentLabels, themeLabels } from '#lib/appearance';
import {
  ACCENT_IDS,
  DEFAULT_APPEARANCE,
  THEME_MODES,
  type Appearance,
} from '#shared/contracts/appearance';

import { Strings } from '../strings';
import { ReadingSettings } from './ReadingSettings';
import { SummarySettings } from './SummarySettings';
import { TranscriptSettings } from './TranscriptSettings';

/**
 * Tema e cor de destaque. Diferente das outras seções, vale na hora e não pede reinício:
 * cada escolha já troca o app inteiro (as duas janelas) e é gravada em seguida.
 */
export function AppearanceSection() {
  const { appearance, update } = useAppearance();
  const [error, setError] = useState<string | null>(null);

  const change = (patch: Partial<Appearance>) => {
    setError(null);
    update(patch).catch((failure: Error) => setError(failure.message));
  };

  const isDefault =
    appearance.theme === DEFAULT_APPEARANCE.theme &&
    appearance.accent === DEFAULT_APPEARANCE.accent;

  return (
    <div className="flex flex-col gap-4">
      <SettingsGroup title={Strings.appearance.group} hint={Strings.appearance.groupHint}>
        <SettingsPanel className="gap-2.5 p-3">
          <SettingsRow label={Strings.appearance.theme} hint={Strings.appearance.themeHint}>
            <div
              role="radiogroup"
              aria-label={Strings.appearance.theme}
              className="inline-flex w-fit gap-1"
            >
              {THEME_MODES.map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={appearance.theme === mode}
                  variant={appearance.theme === mode ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => change({ theme: mode })}
                >
                  {themeLabels[mode]}
                </Button>
              ))}
            </div>
          </SettingsRow>

          <SettingsRow label={Strings.appearance.accent} hint={Strings.appearance.accentHint}>
            <div
              role="radiogroup"
              aria-label={Strings.appearance.accent}
              className="flex flex-wrap gap-1"
            >
              {ACCENT_IDS.map((accent) => {
                const selected = appearance.accent === accent;

                return (
                  <HexSwatch
                    key={accent}
                    selected={selected}
                    aria-label={accentLabels[accent]}
                    title={accentLabels[accent]}
                    // `data-accent` + `dark` fazem `bg-primary` mostrar a cor de destaque deste hexágono.
                    data-accent={accent}
                    className="dark"
                    fillClassName="bg-primary text-primary-foreground"
                    onClick={() => change({ accent })}
                  >
                    {selected && <Check className="size-3" aria-hidden />}
                  </HexSwatch>
                );
              })}
            </div>
          </SettingsRow>
        </SettingsPanel>
      </SettingsGroup>

      <ReadingSettings />
      <TranscriptSettings />
      <SummarySettings />

      {error && (
        <p role="alert" className="animate-enter-fade text-sm text-destructive">
          {error}
        </p>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDefault}
          onClick={() => {
            setError(null);
            update({ theme: DEFAULT_APPEARANCE.theme, accent: DEFAULT_APPEARANCE.accent }).catch(
              (failure: Error) => setError(failure.message),
            );
          }}
        >
          <RotateCcw /> {Strings.appearance.restore}
        </Button>
      </div>
    </div>
  );
}
