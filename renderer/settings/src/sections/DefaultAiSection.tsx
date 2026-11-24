import { useState } from 'react';

import { AiPicker, isAiPreferenceComplete } from '#components/AiPicker';
import { ErrorState } from '#components/ErrorState';
import { LoadingState } from '#components/LoadingState';
import { SettingsGroup, SettingsPanel } from '#components/SettingsGroup';
import { useSnackbar } from '#components/Snackbar';
import { useAiInUse, useSaveAiDefault } from '#hooks/use-ai-in-use';
import { useErrorAlert } from '#hooks/use-error-alert';
import { AiInUseStrings, formatAiChoice } from '#lib/ai-in-use-text';
import { profileOf } from '#lib/ai-providers';
import type { AiPreference } from '#shared/contracts/ai';
import { Button } from '#ui/button';

import { Strings } from '../strings';

/**
 * IA padrão: o serviço e o modelo usados na sugestão de título, no mapa mental e no infográfico.
 * Vale na hora, sem reiniciar. A troca temporária (só até fechar o app) fica ao lado do botão de gerar.
 */
export function DefaultAiSection() {
  const { data, isPending, isError, refetch } = useAiInUse();
  const save = useSaveAiDefault();
  const snackbar = useSnackbar();
  // `undefined` = ainda não mexeu: mostra o que está salvo.
  const [draft, setDraft] = useState<AiPreference | null | undefined>(undefined);
  useErrorAlert(save.isError && AiInUseStrings.failed);

  if (isPending) {
    return <LoadingState message={Strings.loading} />;
  }

  if (isError || !data) {
    return <ErrorState primaryMessage={Strings.loadError} action={() => void refetch()} />;
  }

  const value = draft === undefined ? data.configured : draft;
  const changed = draft !== undefined && JSON.stringify(draft) !== JSON.stringify(data.configured);
  const { effective } = data;
  const serviceName = profileOf(effective.providerId)?.name ?? effective.providerId;

  return (
    <SettingsGroup title="IA padrão" hint={AiInUseStrings.settings.hint}>
      <SettingsPanel>
        <AiPicker value={value} onChange={setDraft} allowAuto disabled={save.isPending} />

        {data.session && (
          <p className="text-sm text-muted-foreground">{AiInUseStrings.settings.sessionNote}</p>
        )}

        {value === null && (
          <p className="text-sm text-muted-foreground">{AiInUseStrings.settings.autoHint}</p>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {AiInUseStrings.settings.current}:{' '}
            <span className="font-medium text-foreground">
              {formatAiChoice(serviceName, effective.modelId)}
            </span>{' '}
            ({AiInUseStrings.sources[effective.source].toLowerCase()})
          </p>

          <Button
            disabled={!changed || !isAiPreferenceComplete(value) || save.isPending}
            loading={save.isPending}
            onClick={() =>
              save.mutate(value, {
                onSuccess: () => {
                  setDraft(undefined);
                  snackbar.show(AiInUseStrings.settings.saved);
                },
              })
            }
          >
            {AiInUseStrings.settings.save}
          </Button>
        </div>
      </SettingsPanel>
    </SettingsGroup>
  );
}
