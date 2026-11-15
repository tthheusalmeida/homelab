import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '#ui/button';
import { Card, CardContent, CardFooter } from '#ui/card';
import { ErrorState } from '#components/ErrorState';
import { LoadingState } from '#components/LoadingState';

import type {
  LibraryFolderInfo,
  MoveLibraryResult,
  SettingsPaths,
} from '#shared/contracts/settings';
import { Field } from '../components/Field';
import { LibraryChangeDialog } from '../components/LibraryChangeDialog';
import { useSnackbar } from '#components/Snackbar';
import { useInspectLibrary, usePaths } from '../hooks';
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

/**
 * Pasta da biblioteca (a única que o usuário escolhe). Salvar não grava direto: primeiro olha o que
 * há na pasta escolhida e pergunta como trocar (mover a biblioteca atual, começar vazia ou usar a
 * pasta como está), para os documentos não "sumirem" ao trocar de pasta.
 */
function PathsForm({ paths, onSaved }: SectionProps & { paths: SettingsPaths }) {
  const [values, setValues] = useState(paths);
  const [folder, setFolder] = useState<LibraryFolderInfo | null>(null);
  const inspect = useInspectLibrary();
  const snackbar = useSnackbar();

  const dirty = PATH_FIELDS.some(({ key }) => values[key].trim() !== paths[key]);

  const change = (key: keyof SettingsPaths, value: string) => {
    inspect.reset();
    setValues((current) => ({ ...current, [key]: value }));
  };

  const finish = (result: MoveLibraryResult) => {
    setFolder(null);
    snackbar.show(
      result.originRemoveError
        ? Strings.library.originKept(result.originRemoveError)
        : Strings.library.moved,
    );
    onSaved(result.restartRequired);
  };

  return (
    <Card className="animate-enter">
      <CardContent className="flex flex-col gap-5">
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
          {inspect.isError && (
            <p role="alert" className="text-destructive">
              {inspect.error.message}
            </p>
          )}
        </div>

        <Button
          disabled={!dirty || inspect.isPending}
          onClick={() => inspect.mutate({ path: values.libraryDir.trim() }, { onSuccess: setFolder })}
        >
          {inspect.isPending && <Loader2 className="animate-spin" />}
          {inspect.isPending ? Strings.library.inspecting : Strings.save}
        </Button>
      </CardFooter>

      <LibraryChangeDialog folder={folder} onClose={() => setFolder(null)} onDone={finish} />
    </Card>
  );
}
