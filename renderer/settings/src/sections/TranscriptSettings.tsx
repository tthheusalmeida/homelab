
import { TranscriptPreview } from '#components/TranscriptPreview';
import { SettingsGroup, SettingsPanel, SettingsRow } from '#components/SettingsGroup';
import { useAppearance } from '#hooks/use-appearance';
import { DEFAULT_TRANSCRIPT, type TranscriptPreferences } from '#shared/contracts/document-views';

import { CheckboxField } from '../components/CheckboxField';
import { PreferenceError, RestoreButton, usePreferenceAction } from '../components/PreferenceForm';
import { Strings } from '../strings';

const text = Strings.appearance.transcript;

/**
 * Ajustes só das transcrições com tempo: começo dos trechos e barra de progresso.
 * Fica junto da Leitura (mesmo nível nos dados salvos e na tela); cada escolha vale na hora.
 */
export function TranscriptSettings() {
  const { appearance, updateTranscript, resetTranscript } = useAppearance();
  const preferences = appearance.transcript;

  const { error, run } = usePreferenceAction();

  const change = (patch: Partial<TranscriptPreferences>) => run(updateTranscript(patch));

  const isDefault = (Object.keys(DEFAULT_TRANSCRIPT) as (keyof TranscriptPreferences)[]).every(
    (key) => preferences[key] === DEFAULT_TRANSCRIPT[key],
  );

  return (
    <SettingsGroup title={text.title} hint={text.hint}>
      <SettingsPanel className="gap-2.5 p-3">
        <TranscriptPreview />

        <SettingsRow label={text.preview} hint={text.previewHint}>
          <CheckboxField
            id="transcript-preview"
            label={text.previewOption}
            checked={preferences.preview}
            onChange={(checked) => change({ preview: checked })}
          />
        </SettingsRow>

        <SettingsRow label={text.progress} hint={text.progressHint}>
          <CheckboxField
            id="transcript-progress"
            label={text.progressOption}
            checked={preferences.progress}
            onChange={(checked) => change({ progress: checked })}
          />
        </SettingsRow>

        <div className="flex justify-end">
          <RestoreButton disabled={isDefault} onClick={() => run(resetTranscript())}>
            {text.restore}
          </RestoreButton>
        </div>

        <PreferenceError message={error} />
      </SettingsPanel>
    </SettingsGroup>
  );
}
