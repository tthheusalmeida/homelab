import { useState } from 'react';

import { Badge } from '#ui/badge';
import { Button } from '#ui/button';
import { ErrorState } from '#components/ErrorState';
import { ExternalLink } from '#components/ExternalLink';
import { LoadingState } from '#components/LoadingState';
import { SettingsGroup } from '#components/SettingsGroup';
import { PROVIDER_CONSOLES } from '#lib/provider-consoles';
import { SetupGuide } from '#components/SetupGuide';

import type { ExternalProviderInfo } from '#shared/contracts/providers';
import { Field } from '../components/Field';
import { ProviderCard } from '#components/ProviderCard';
import { useSnackbar } from '#components/Snackbar';
import { TestResultSlot } from '../components/TestResultMessage';
import { useExternalProviders, useSaveExternalProvider, useTestExternalProvider } from '../hooks';
import { EXTERNAL_PROVIDER_GUIDES, EXTERNAL_PROVIDER_HINTS, Strings } from '../strings';

interface SectionProps {
  onSaved: (restartRequired: boolean) => void;
}

export function ExternalProvidersSection({ onSaved }: SectionProps) {
  const providers = useExternalProviders();

  if (providers.isPending) {
    return <LoadingState message={Strings.loading} />;
  }

  if (providers.isError) {
    return (
      <ErrorState
        primaryMessage={Strings.loadError}
        secondaryMessage={providers.error.message}
        action={() => void providers.refetch()}
      />
    );
  }

  return (
    <SettingsGroup title={Strings.groups.external} hint={Strings.groups.externalHint}>
      <div className="flex flex-col gap-2">
        {providers.data.map((provider, index) => (
          <ExternalProviderCard key={provider.id} provider={provider} index={index} onSaved={onSaved} />
        ))}
      </div>
    </SettingsGroup>
  );
}

function ExternalProviderCard({
  provider,
  index,
  onSaved,
}: SectionProps & { provider: ExternalProviderInfo; index: number }) {
  const [apiKey, setApiKey] = useState('');
  const save = useSaveExternalProvider();
  const test = useTestExternalProvider();
  const snackbar = useSnackbar();

  const guide = EXTERNAL_PROVIDER_GUIDES[provider.id];
  const typedKey = apiKey.trim();
  const canTest = provider.configured || typedKey.length > 0;

  const change = (value: string) => {
    save.reset();
    test.reset();
    setApiKey(value);
  };

  return (
    <ProviderCard
      index={index}
      defaultOpen={!provider.configured}
      title={provider.label}
      description={EXTERNAL_PROVIDER_HINTS[provider.id] ?? ''}
      badge={
        <Badge variant={provider.configured ? 'secondary' : 'outline'}>
          {provider.configured ? 'Configurada' : 'Não configurada'}
        </Badge>
      }
      footer={
        <>
          <Button
            variant="outline"
            className="min-w-24"
            disabled={!canTest || test.isPending}
            onClick={() => test.mutate({ id: provider.id, apiKey: typedKey || undefined })}
          >
            {test.isPending ? Strings.testing : Strings.test}
          </Button>

          <Button
            disabled={typedKey.length === 0 || save.isPending}
            onClick={() =>
              save.mutate(
                { id: provider.id, apiKey: typedKey },
                {
                  onSuccess: (result) => {
                    test.reset();
                    setApiKey('');
                    snackbar.show(Strings.saved);
                    onSaved(result.restartRequired);
                  },
                },
              )
            }
          >
            {save.isPending ? Strings.saving : Strings.save}
          </Button>
        </>
      }
    >
      {guide && (
        <SetupGuide
          title={guide.title}
          steps={guide.steps}
          note={guide.note}
          visible={!provider.configured}
        />
      )}

      <p className="text-sm text-muted-foreground">
        {provider.configured
          ? `Chave atual: ${provider.maskedKey}`
          : 'Informe a chave da API para usar este serviço.'}
      </p>

      <Field
        id={`external-${provider.id}-key`}
        label={provider.configured ? 'Nova chave da API' : 'Chave da API'}
        hint="A chave fica guardada com criptografia do sistema e nunca é exibida por inteiro."
        type="password"
        placeholder="Cole a chave aqui"
        value={apiKey}
        onChange={change}
      />

      {provider.configured && PROVIDER_CONSOLES[provider.id] && (
        <p className="text-sm text-muted-foreground">
          O gasto real da conta só aparece no painel do provedor:{' '}
          <ExternalLink href={PROVIDER_CONSOLES[provider.id].usageUrl}>
            ver consumo no {PROVIDER_CONSOLES[provider.id].label}
          </ExternalLink>
          . O app também registra o consumo na tela Consumo.
        </p>
      )}

      <TestResultSlot
        result={test.data ?? (test.isError ? { ok: false, message: test.error.message } : null)}
      />
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {save.error.message}
        </p>
      )}
    </ProviderCard>
  );
}
