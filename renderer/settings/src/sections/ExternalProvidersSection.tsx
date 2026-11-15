import { useState } from 'react';

import { Badge } from '#ui/badge';
import { Button } from '#ui/button';
import { ErrorState } from '#components/ErrorState';
import { LoadingState } from '#components/LoadingState';

import type { ExternalProviderInfo } from '#shared/contracts/providers';
import { Field } from '../components/Field';
import { ProviderCard } from '../components/ProviderCard';
import { useSnackbar } from '../components/Snackbar';
import { TestResultMessage } from '../components/TestResultMessage';
import { useExternalProviders, useSaveExternalProvider, useTestExternalProvider } from '../hooks';
import { EXTERNAL_PROVIDER_HINTS, Strings } from '../strings';

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
    <div className="flex flex-col gap-4">
      {providers.data.map((provider) => (
        <ExternalProviderCard key={provider.id} provider={provider} onSaved={onSaved} />
      ))}
    </div>
  );
}

function ExternalProviderCard({
  provider,
  onSaved,
}: SectionProps & { provider: ExternalProviderInfo }) {
  const [apiKey, setApiKey] = useState('');
  const save = useSaveExternalProvider();
  const test = useTestExternalProvider();
  const snackbar = useSnackbar();

  const typedKey = apiKey.trim();
  const canTest = provider.configured || typedKey.length > 0;

  const change = (value: string) => {
    save.reset();
    test.reset();
    setApiKey(value);
  };

  return (
    <ProviderCard
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

      {test.data && <TestResultMessage result={test.data} />}
      {test.isError && <TestResultMessage result={{ ok: false, message: test.error.message }} />}
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {save.error.message}
        </p>
      )}
    </ProviderCard>
  );
}
