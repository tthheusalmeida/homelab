import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

import { Button } from '#ui/button';
import { Label } from '#ui/label';
import { TranscriptPreview } from '#components/TranscriptPreview';
import { SettingsGroup, SettingsPanel, SettingsRow } from '#components/SettingsGroup';
import { useAppearance } from '#hooks/use-appearance';
import { DEFAULT_TRANSCRIPT, type TranscriptPreferences } from '#shared/contracts/document-views';

import { Strings } from '../strings';

const text = Strings.appearance.transcript;

/**
 * Ajustes só das transcrições com tempo: começo dos trechos e barra de progresso.
 * Fica junto da Leitura (mesmo nível nos dados salvos e na tela); cada escolha vale na hora.
 */
export function TranscriptSettings() {
  const { appearance, updateTranscript, resetTranscript } = useAppearance();
  const [error, setError] = useState<string | null>(null);
  const preferences = appearance.transcript;

  const run = (action: Promise<void>) => {
    setError(null);
    action.catch((failure: Error) => setError(failure.message));
  };

  const change = (patch: Partial<TranscriptPreferences>) => run(updateTranscript(patch));

  const isDefault = (Object.keys(DEFAULT_TRANSCRIPT) as (keyof TranscriptPreferences)[]).every(
    (key) => preferences[key] === DEFAULT_TRANSCRIPT[key],
  );

  return (
    <SettingsGroup title={text.title} hint={text.hint}>
      <SettingsPanel className="gap-2.5 p-3">
        <TranscriptPreview />

        <SettingsRow label={text.preview} hint={text.previewHint}>
          <div className="flex items-center gap-2">
            <input
              id="transcript-preview"
              type="checkbox"
              className="size-4 shrink-0 cursor-pointer accent-primary"
              checked={preferences.preview}
              onChange={(event) => change({ preview: event.target.checked })}
            />

            <Label htmlFor="transcript-preview" className="cursor-pointer text-sm font-normal">
              {text.previewOption}
            </Label>
          </div>
        </SettingsRow>

        <SettingsRow label={text.progress} hint={text.progressHint}>
          <div className="flex items-center gap-2">
            <input
              id="transcript-progress"
              type="checkbox"
              className="size-4 shrink-0 cursor-pointer accent-primary"
              checked={preferences.progress}
              onChange={(event) => change({ progress: event.target.checked })}
            />

            <Label htmlFor="transcript-progress" className="cursor-pointer text-sm font-normal">
              {text.progressOption}
            </Label>
          </div>
        </SettingsRow>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={isDefault}
            onClick={() => run(resetTranscript())}
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
