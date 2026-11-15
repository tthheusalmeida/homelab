import { useState } from 'react';

import { Badge } from '#ui/badge';
import { Button } from '#ui/button';
import { ErrorState } from '#components/ErrorState';
import { LoadingState } from '#components/LoadingState';

import type { LocalProviderInfo } from '#shared/contracts/providers';
import { Field } from '../components/Field';
import { ProviderCard } from '../components/ProviderCard';
import { useSnackbar } from '../components/Snackbar';
import { TestResultMessage } from '../components/TestResultMessage';
import { useLocalProviders, useSaveLocalProvider, useTestLocalProvider } from '../hooks';
import {
  LOCAL_FIELD_LABELS,
  LOCAL_PROVIDER_HINTS,
  PICKABLE_LOCAL_FIELDS,
  Strings,
} from '../strings';

interface SectionProps {
  onSaved: (restartRequired: boolean) => void;
}

export function LocalProvidersSection({ onSaved }: SectionProps) {
  const providers = useLocalProviders();

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
        <LocalProviderCard key={provider.id} provider={provider} onSaved={onSaved} />
      ))}
    </div>
  );
}

function LocalProviderCard({ provider, onSaved }: SectionProps & { provider: LocalProviderInfo }) {
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
      title={provider.label}
      description={LOCAL_PROVIDER_HINTS[provider.id] ?? ''}
      badge={!provider.editable && <Badge variant="outline">Somente teste</Badge>}
      footer={
        <>
          <Button
            variant="outline"
            disabled={test.isPending}
            onClick={() => test.mutate({ id: provider.id, config: dirty ? config : undefined })}
          >
            {test.isPending ? Strings.testing : Strings.test}
          </Button>

          {provider.editable && (
            <Button
              disabled={!dirty || save.isPending}
              onClick={() =>
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
            >
              {save.isPending ? Strings.saving : Strings.save}
            </Button>
          )}
        </>
      }
    >
      {keys.map((key) => (
        <Field
          key={key}
          id={`local-${provider.id}-${key}`}
          label={LOCAL_FIELD_LABELS[key] ?? key}
          pickable={PICKABLE_LOCAL_FIELDS.has(key)}
          value={config[key]}
          onChange={(value) => change(key, value)}
        />
      ))}

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
