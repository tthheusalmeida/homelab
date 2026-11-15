import { useState } from 'react';

import { Button } from '#ui/button';
import { Card, CardContent, CardFooter } from '#ui/card';
import { ErrorState } from '#components/ErrorState';
import { LoadingState } from '#components/LoadingState';

import type { SettingsPaths } from '#shared/contracts/settings';
import { Field } from '../components/Field';
import { useSnackbar } from '../components/Snackbar';
import { usePaths, useSavePaths } from '../hooks';
import { PATH_FIELDS, Strings } from '../strings';

interface SectionProps {
  onSaved: (restartRequired: boolean) => void;
}

export function PathsSection({ onSaved }: SectionProps) {
  const paths = usePaths();

  if (paths.isPending) {
    return <LoadingState message={Strings.loading} />;
  }

  if (paths.isError) {
    return (
      <ErrorState
        primaryMessage={Strings.loadError}
        secondaryMessage={paths.error.message}
        action={() => void paths.refetch()}
      />
    );
  }

  return <PathsForm paths={paths.data} onSaved={onSaved} />;
}

function PathsForm({ paths, onSaved }: SectionProps & { paths: SettingsPaths }) {
  const [values, setValues] = useState(paths);
  const save = useSavePaths();
  const snackbar = useSnackbar();

  const dirty = PATH_FIELDS.some(({ key }) => values[key] !== paths[key]);

  const change = (key: keyof SettingsPaths, value: string) => {
    save.reset();
    setValues((current) => ({ ...current, [key]: value }));
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        {PATH_FIELDS.map(({ key, label, hint }) => (
          <Field
            key={key}
            id={`path-${key}`}
            label={label}
            hint={hint}
            pickable
            value={values[key]}
            onChange={(value) => change(key, value)}
          />
        ))}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-4">
        <div className="min-w-0 text-sm">
          {save.isError && (
            <p role="alert" className="text-destructive">
              {save.error.message}
            </p>
          )}
        </div>

        <Button
          disabled={!dirty || save.isPending}
          onClick={() =>
            save.mutate(values, {
              onSuccess: (result) => {
                snackbar.show(Strings.saved);
                onSaved(result.restartRequired);
              },
            })
          }
        >
          {save.isPending ? Strings.saving : Strings.save}
        </Button>
      </CardFooter>
    </Card>
  );
}
