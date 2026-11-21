import { useState } from 'react';
import { Button } from '#ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#ui/dialog';
import { CheckboxField } from './CheckboxField';
import { Label } from '#ui/label';
import { ProgressBar } from '#components/ProgressBar';
import { useIpcEvent } from '#hooks/use-ipc-event';
import type { ProgressEventPayload } from '#shared/contracts/events';
import type { LibraryFolderInfo, MoveLibraryResult } from '#shared/contracts/settings';
import { IpcEvents } from '#shared/events';

import { useMoveLibrary } from '../hooks';
import { Strings } from '../strings';
import { useErrorAlert } from '#hooks/use-error-alert';

interface LibraryChangeDialogProps {
  /** Pasta escolhida e o que há nela; o diálogo abre enquanto houver uma pasta. */
  folder: LibraryFolderInfo | null;
  onClose: () => void;
  onDone: (result: MoveLibraryResult) => void;
}

const progressText = (progress: ProgressEventPayload | null): string => {
  if (!progress || progress.phase === 'preparing') {
    return Strings.library.progressPreparing;
  }

  if (progress.phase === 'verifying') {
    return Strings.library.progressVerifying;
  }

  return Strings.library.progressRunning(progress.processed, progress.total);
};

/**
 * Pergunta como trocar a pasta da biblioteca, conforme o destino: vazio (mover a atual para lá ou
 * começar vazia) ou já com arquivos (só usar). Durante a cópia mostra o progresso e não deixa fechar.
 */
export function LibraryChangeDialog({ folder, onClose, onDone }: LibraryChangeDialogProps) {
  const [choice, setChoice] = useState<'move' | 'use'>('move');
  const [deleteOrigin, setDeleteOrigin] = useState(false);
  const [progress, setProgress] = useState<ProgressEventPayload | null>(null);
  const move = useMoveLibrary();
  useErrorAlert(move.isError && move.error.message);

  useIpcEvent(IpcEvents.libraryMoveProgress, setProgress);

  const empty = folder?.empty ?? true;
  const mode = empty ? choice : 'use';

  const confirm = () => {
    if (!folder) {
      return;
    }

    setProgress(null);
    move.mutate(
      { to: folder.path, mode, deleteOrigin: mode === 'move' ? deleteOrigin : false },
      { onSuccess: onDone },
    );
  };

  const close = () => {
    if (!move.isPending) {
      move.reset();
      setChoice('move');
      setDeleteOrigin(false);
      onClose();
    }
  };

  return (
    <Dialog open={folder !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{Strings.library.dialogTitle}</DialogTitle>

          <DialogDescription className="break-all font-mono text-xs">
            {folder?.path}
          </DialogDescription>
        </DialogHeader>

        {folder && !empty && (
          <p className="text-sm">{Strings.library.useExisting(folder.fileCount)}</p>
        )}

        {folder && empty && (
          <fieldset className="flex flex-col gap-3" disabled={move.isPending}>
            <ChoiceOption
              id="library-move"
              checked={choice === 'move'}
              onSelect={() => setChoice('move')}
              label={Strings.library.moveOption}
              hint={Strings.library.moveHint}
            />

            <ChoiceOption
              id="library-empty"
              checked={choice === 'use'}
              onSelect={() => setChoice('use')}
              label={Strings.library.emptyOption}
              hint={Strings.library.emptyHint}
            />

            {choice === 'move' && (
              <CheckboxField
                id="library-delete-origin"
                label={Strings.library.deleteOrigin}
                checked={deleteOrigin}
                onChange={setDeleteOrigin}
                className="pl-6"
              />
            )}
          </fieldset>
        )}

        {move.isPending && (
          <div className="flex flex-col gap-2" role="status">
            <ProgressBar
              value={progress?.processed ?? 0}
              total={progress && progress.phase !== 'preparing' ? progress.total : 0}
              label={Strings.library.progressLabel}
            />

            <p className="text-xs text-muted-foreground">{progressText(progress)}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={move.isPending} onClick={close}>
            {Strings.library.cancel}
          </Button>

          <Button disabled={move.isPending} onClick={confirm} loading={move.isPending}>
            {mode === 'move' ? Strings.library.confirmMove : Strings.library.confirmUse}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ChoiceOptionProps {
  id: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  hint: string;
}

function ChoiceOption({ id, checked, onSelect, label, hint }: ChoiceOptionProps) {
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type="radio"
        name="library-choice"
        className="mt-0.5 size-4 accent-primary"
        checked={checked}
        onChange={onSelect}
      />

      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id}>{label}</Label>

        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
