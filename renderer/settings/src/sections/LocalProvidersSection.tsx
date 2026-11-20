import { useState } from 'react';

import { Badge } from '#ui/badge';
import { SettingsGroup } from '#components/SettingsGroup';

import type { LocalProviderInfo } from '#shared/contracts/providers';
import { Field } from '../components/Field';
import { ProviderCard } from '#components/ProviderCard';
import { useSnackbar } from '#components/Snackbar';
import {
  ProviderActions,
  ProviderCardList,
  ProviderFeedback,
  ProvidersGate,
  testResultOf,
} from '../components/ProviderParts';
import { useLocalProviders, useSaveLocalProvider, useTestLocalProvider } from '../hooks';
import {
  LOCAL_FIELD_LABELS,
  LOCAL_PROVIDER_HINTS,
  Strings,
} from '../strings';

interface SectionProps {
  onSaved: (restartRequired: boolean) => void;
}

export function LocalProvidersSection({ onSaved }: SectionProps) {
  const providers = useLocalProviders();

  return (
    <ProvidersGate query={providers}>
      {(data) => (
        <div className="flex flex-col gap-6">
          <LocalGroup
            title={Strings.groups.localTools}
            hint={Strings.groups.localToolsHint}
            providers={data.filter((provider) => !provider.editable)}
            onSaved={onSaved}
          />
          <LocalGroup
            title={Strings.groups.localOllama}
            hint={Strings.groups.localOllamaHint}
            providers={data.filter((provider) => provider.editable)}
            onSaved={onSaved}
          />
        </div>
      )}
    </ProvidersGate>
  );
}

function LocalGroup({
  title,
  hint,
  providers,
  onSaved,
}: SectionProps & { title: string; hint: string; providers: LocalProviderInfo[] }) {
  if (providers.length === 0) {
    return null;
  }

  return (
    <SettingsGroup title={title} hint={hint}>
      <ProviderCardList>
        {providers.map((provider, index) => (
          <LocalProviderCard key={provider.id} provider={provider} index={index} onSaved={onSaved} />
        ))}
      </ProviderCardList>
    </SettingsGroup>
  );
}

function LocalProviderCard({
  provider,
  index,
  onSaved,
}: SectionProps & { provider: LocalProviderInfo; index: number }) {
  const [config, setConfig] = useState(provider.config);
  const save = useSaveLocalProvider();
  const test = useTestLocalProvider();
  const snackbar = useSnackbar();

  const keys = Object.keys(config);
  const dirty = keys.some((key) => config[key] !== provider.config[key]);

  const change = (key: string, value: string) => {
    save.reset();
    test.reset();
    setConfig((current) => ({ ...current, [key]: value }));
  };

  return (
    <ProviderCard
      index={index}
      title={provider.label}
      description={LOCAL_PROVIDER_HINTS[provider.id] ?? ''}
      badge={!provider.editable && <Badge variant="outline">Somente teste</Badge>}
      footer={
        <ProviderActions
          testing={test.isPending}
          onTest={() => test.mutate({ id: provider.id, config: dirty ? config : undefined })}
          saving={save.isPending}
          saveDisabled={provider.editable ? !dirty : undefined}
          onSave={() =>
            save.mutate(
              { id: provider.id, config },
              {
                onSuccess: (result) => {
                  snackbar.show(Strings.saved);
                  onSaved(result.restartRequired);
                },
              },
            )
          }
        />
      }
    >
      {keys.map((key) => (
        <Field
          key={key}
          id={`local-${provider.id}-${key}`}
          label={LOCAL_FIELD_LABELS[key] ?? key}
          value={config[key]}
          onChange={(value) => change(key, value)}
        />
      ))}

      <ProviderFeedback
        testResult={testResultOf(test)}
        saveError={save.isError ? save.error.message : undefined}
      />
    </ProviderCard>
  );
}
