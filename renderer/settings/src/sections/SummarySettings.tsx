
import { SummaryPreview } from '#components/SummaryPreview';
import { SettingsGroup, SettingsPanel, SettingsRow } from '#components/SettingsGroup';
import { useAppearance } from '#hooks/use-appearance';
import { DEFAULT_SUMMARY, type SummaryPreferences } from '#shared/contracts/document-views';

import { CheckboxField } from '../components/CheckboxField';
import { PreferenceError, RestoreButton, usePreferenceAction } from '../components/PreferenceForm';
import { Strings } from '../strings';

const text = Strings.appearance.summary;

/**
 * Ajustes só dos resumos: sumário no painel lateral.
 * Fica junto da Leitura (mesmo nível nos dados salvos e na tela); cada escolha vale na hora.
 */
export function SummarySettings() {
  const { appearance, updateSummary, resetSummary } = useAppearance();
  const preferences = appearance.summary;

  const { error, run } = usePreferenceAction();

  const change = (patch: Partial<SummaryPreferences>) => run(updateSummary(patch));

  const isDefault = (Object.keys(DEFAULT_SUMMARY) as (keyof SummaryPreferences)[]).every(
    (key) => preferences[key] === DEFAULT_SUMMARY[key],
  );

  return (
    <SettingsGroup title={text.title} hint={text.hint}>
      <SettingsPanel className="gap-2.5 p-3">
        <SummaryPreview />

        <SettingsRow label={text.outline} hint={text.outlineHint}>
          <CheckboxField
            id="summary-outline"
            label={text.outlineOption}
            checked={preferences.outline}
            onChange={(checked) => change({ outline: checked })}
          />
        </SettingsRow>

        <div className="flex justify-end">
          <RestoreButton disabled={isDefault} onClick={() => run(resetSummary())}>
            {text.restore}
          </RestoreButton>
        </div>

        <PreferenceError message={error} />
      </SettingsPanel>
    </SettingsGroup>
  );
}
