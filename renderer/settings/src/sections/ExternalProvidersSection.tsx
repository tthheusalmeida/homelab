import { useState } from 'react';

import { Badge } from '#ui/badge';
import { ExternalLink } from '#components/ExternalLink';
import { SettingsGroup } from '#components/SettingsGroup';
import { PROVIDER_CONSOLES } from '#lib/provider-consoles';
import { SetupGuide } from '#components/SetupGuide';

import type { ExternalProviderInfo } from '#shared/contracts/providers';
import { Field } from '../components/Field';
import { ProviderCard } from '#components/ProviderCard';
import { ProviderLogo } from '#components/ProviderLogo';
import { useSnackbar } from '#components/Snackbar';
import {
  ProviderActions,
  ProviderCardList,
  ProviderFeedback,
  ProvidersGate,
  testResultOf,
} from '../components/ProviderParts';
import { useExternalProviders, useSaveExternalProvider, useTestExternalProvider } from '../hooks';
import {
  EXTERNAL_PROVIDER_COMPANIES,
  EXTERNAL_PROVIDER_GUIDES,
  EXTERNAL_PROVIDER_HINTS,
  Strings,
} from '../strings';

interface SectionProps {
  onSaved: (restartRequired: boolean) => void;
}

export function ExternalProvidersSection({ onSaved }: SectionProps) {
  const providers = useExternalProviders();

  return (
    <ProvidersGate query={providers}>
      {(data) => (
        <SettingsGroup title={Strings.groups.external} hint={Strings.groups.externalHint}>
          <ProviderCardList>
            {data.map((provider, index) => (
              <ExternalProviderCard
                key={provider.id}
                provider={provider}
                index={index}
                onSaved={onSaved}
              />
            ))}
          </ProviderCardList>
        </SettingsGroup>
      )}
    </ProvidersGate>
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
      icon={<ProviderLogo
          provider={provider.id}
          label={EXTERNAL_PROVIDER_COMPANIES[provider.id] ?? provider.label}
        />}
      title={EXTERNAL_PROVIDER_COMPANIES[provider.id] ?? provider.label}
      description={EXTERNAL_PROVIDER_HINTS[provider.id] ?? ''}
      badge={
        <Badge variant={provider.configured ? 'secondary' : 'outline'}>
          {provider.configured ? 'Configurada' : 'Não configurada'}
        </Badge>
      }
      footer={
        <ProviderActions
          testing={test.isPending}
          testDisabled={!canTest}
          onTest={() => test.mutate({ id: provider.id, apiKey: typedKey || undefined })}
          saving={save.isPending}
          saveDisabled={typedKey.length === 0}
          onSave={() =>
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
        />
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

      <ProviderFeedback
        testResult={testResultOf(test)}
        saveError={save.isError ? save.error.message : undefined}
      />
    </ProviderCard>
  );
}
