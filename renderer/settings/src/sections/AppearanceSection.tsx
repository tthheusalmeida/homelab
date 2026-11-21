import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

import { Button } from '#ui/button';
import { HexColorPicker } from '#components/HexColorPicker';
import { SettingsGroup, SettingsPanel, SettingsRow, SettingsStack } from '#components/SettingsGroup';
import { useAppearance } from '#hooks/use-appearance';
import { accentOptions, themeLabels } from '#lib/appearance';
import {
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
    <SettingsStack>
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
            <HexColorPicker
              label={Strings.appearance.accent}
              options={accentOptions}
              value={appearance.accent}
              onChange={(accent) => change({ accent })}
            />
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
    </SettingsStack>
  );
}
