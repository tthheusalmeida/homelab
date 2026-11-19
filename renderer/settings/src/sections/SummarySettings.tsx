import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

import { Button } from '#ui/button';
import { Label } from '#ui/label';
import { SettingsGroup, SettingsPanel, SettingsRow } from '#components/SettingsGroup';
import { useAppearance } from '#hooks/use-appearance';
import { DEFAULT_SUMMARY, type SummaryPreferences } from '#shared/contracts/document-views';

import { Strings } from '../strings';

const text = Strings.appearance.summary;

/**
 * Ajustes só dos resumos: sumário no painel lateral.
 * Fica junto da Leitura (mesmo nível nos dados salvos e na tela); cada escolha vale na hora.
 */
export function SummarySettings() {
  const { appearance, updateSummary, resetSummary } = useAppearance();
  const [error, setError] = useState<string | null>(null);
  const preferences = appearance.summary;

  const run = (action: Promise<void>) => {
    setError(null);
    action.catch((failure: Error) => setError(failure.message));
  };

  const change = (patch: Partial<SummaryPreferences>) => run(updateSummary(patch));

  const isDefault = (Object.keys(DEFAULT_SUMMARY) as (keyof SummaryPreferences)[]).every(
    (key) => preferences[key] === DEFAULT_SUMMARY[key],
  );

  return (
    <SettingsGroup title={text.title} hint={text.hint}>
      <SettingsPanel className="gap-2.5 p-3">
        <SettingsRow label={text.outline} hint={text.outlineHint}>
          <div className="flex items-center gap-2">
            <input
              id="summary-outline"
              type="checkbox"
              className="size-4 shrink-0 cursor-pointer accent-primary"
              checked={preferences.outline}
              onChange={(event) => change({ outline: event.target.checked })}
            />

            <Label htmlFor="summary-outline" className="cursor-pointer text-sm font-normal">
              {text.outlineOption}
            </Label>
          </div>
        </SettingsRow>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={isDefault}
            onClick={() => run(resetSummary())}
          >
            <RotateCcw /> {text.restore}
          </Button>
        </div>

        {error && (
          <p role="alert" className="animate-enter-fade text-sm text-destructive">
            {error}
          </p>
        )}
      </SettingsPanel>
    </SettingsGroup>
  );
}
