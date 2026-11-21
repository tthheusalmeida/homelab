import { useState } from 'react';

import { Eraser } from 'lucide-react';

import { formatBytes } from '#lib/format';

import { Button } from '#ui/button';
import { ConfirmDialog } from '#components/ConfirmDialog';
import { useSnackbar } from '#components/Snackbar';

import { useCleanLeftovers, useScanLeftovers } from '../hooks/useLeftovers';
import { TrackStrings } from '../strings';

/**
 * "Limpar arquivos temporários": mede o que processos não terminados (falhos, cancelados ou
 * interrompidos) deixaram no disco, mostra o tamanho e só apaga depois de confirmar. O que um
 * processo em andamento usa e os documentos gerados nunca são apagados.
 */
export function LeftoversControl() {
  const snackbar = useSnackbar();
  const scan = useScanLeftovers();
  const clean = useCleanLeftovers();
  const [found, setFound] = useState<{ files: number; bytes: number } | null>(null);

  const open = () =>
    scan.mutate(undefined, {
      onSuccess: (result) => {
        if (result.files === 0) {
          snackbar.success(TrackStrings.leftovers.nothing);

          return;
        }

        setFound(result);
      },
      onError: (error) => snackbar.error(error.message),
    });

  const confirm = () =>
    clean.mutate(undefined, {
      onSuccess: (result) => {
        snackbar.success(
          TrackStrings.leftovers.cleaned(result.files, formatBytes(result.bytes), result.failed),
        );
        setFound(null);
      },
    });

  return (
    <>
      <Button variant="outline" loading={scan.isPending} onClick={open}>
        <Eraser />
        {TrackStrings.leftovers.button}
      </Button>

      <ConfirmDialog
        open={found !== null}
        onOpenChange={(next) => {
          if (!next && !clean.isPending) {
            clean.reset();
            setFound(null);
          }
        }}
        title={TrackStrings.leftovers.title}
        description={
          found ? TrackStrings.leftovers.description(found.files, formatBytes(found.bytes)) : ''
        }
        confirmLabel={TrackStrings.leftovers.confirm}
        destructive
        isPending={clean.isPending}
        errorMessage={clean.isError ? clean.error.message : undefined}
        onConfirm={confirm}
      />
    </>
  );
}
