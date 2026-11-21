import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';

import { Button } from '#ui/button';
import { SettingsGroup, SettingsPanel } from '#components/SettingsGroup';
import { Label } from '#ui/label';
import { ConfirmDialog } from '#components/ConfirmDialog';
import { ErrorState } from '#components/ErrorState';
import { LoadingState } from '#components/LoadingState';
import { ProgressBar } from '#components/ProgressBar';
import { useSnackbar } from '#components/Snackbar';
import { useSavedNotice } from '#hooks/use-saved-notice';
import { useIpcEvent } from '#hooks/use-ipc-event';
import { formatBytes, formatDateTime } from '#lib/format';
import { BACKUP_ITEM_IDS } from '#shared/contracts/backup';
import type {
  BackupInspection,
  BackupItemId,
  BackupItemKind,
  BackupRestoreResult,
  RestoreMode,
} from '#shared/contracts/backup';
import type { ProgressEventPayload } from '#shared/contracts/events';
import { IpcEvents } from '#shared/events';

import {
  BackupStrings,
  EXCLUSION_LABELS,
  ITEM_LABELS,
  MODE_LABELS,
  countLabel,
} from '../backup-strings';
import {
  cancelBackup,
  useBackupPreview,
  useCreateBackup,
  useInspectBackup,
  useRestoreBackup,
} from '../hooks';
import { Strings } from '../strings';

interface SectionProps {
  onSaved: (restartRequired: boolean) => void;
}

export function BackupSection({ onSaved }: SectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <CreateBackupCard />
      <RestoreBackupCard onSaved={onSaved} />
    </div>
  );
}

/** Barra de progresso do backup ou da restauração, alimentada pelo evento `backup:progress`. */
function BackupProgress({ title }: { title: string }) {
  const [progress, setProgress] = useState<ProgressEventPayload | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useIpcEvent(IpcEvents.backupProgress, setProgress);

  const known = progress && progress.phase === 'running' && progress.total > 0;
  const text =
    !progress || progress.phase === 'preparing'
      ? BackupStrings.progress.preparing
      : progress.phase === 'verifying'
        ? BackupStrings.progress.verifying
        : BackupStrings.progress.running(progress.processed, progress.total);

  return (
    <div role="status" className="flex flex-col gap-2">
      <p className="text-sm font-medium">{title}</p>

      <ProgressBar
        value={progress?.processed ?? 0}
        total={known ? progress.total : progress?.phase === 'verifying' ? 1 : 0}
        label={BackupStrings.progress.label}
      />

      <div className="flex items-center justify-between gap-4">
        <p className="truncate text-xs text-muted-foreground">{text}</p>

        <Button
          variant="outline"
          size="sm"
          disabled={cancelling}
          onClick={() => {
            setCancelling(true);
            void cancelBackup();
          }}
        >
          {cancelling ? BackupStrings.cancelling : BackupStrings.cancel}
        </Button>
      </div>
    </div>
  );
}

interface ItemRow {
  id: BackupItemId;
  kind: BackupItemKind;
  count: number;
  bytes: number;
}

/** Itens com caixa de seleção, nome, contagem e tamanho (usada ao criar e ao restaurar). */
function ItemList({
  items,
  chosen,
  onToggle,
  disabled,
  idPrefix,
}: {
  items: ItemRow[];
  chosen: ReadonlySet<BackupItemId>;
  onToggle: (id: BackupItemId, checked: boolean) => void;
  disabled: boolean;
  idPrefix: string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const { label, hint } = ITEM_LABELS[item.id];
        const empty = item.count === 0;

        return (
          <li key={item.id} className="flex items-start gap-3">
            <input
              id={`${idPrefix}-${item.id}`}
              type="checkbox"
              className="mt-1 size-4 shrink-0 cursor-pointer accent-primary"
              checked={chosen.has(item.id)}
              disabled={disabled}
              onChange={(event) => onToggle(item.id, event.target.checked)}
            />

            <Label
              htmlFor={`${idPrefix}-${item.id}`}
              className="flex min-w-0 flex-1 flex-col items-start gap-0.5"
            >
              <span className="font-medium">{label}</span>
              <span className="text-xs font-normal text-muted-foreground">{hint}</span>
            </Label>

            <span className="shrink-0 text-right text-xs text-muted-foreground">
              {empty
                ? BackupStrings.emptyItem
                : `${countLabel(item.kind, item.count)} · ${formatBytes(item.bytes)}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function toggled(current: ReadonlySet<BackupItemId>, id: BackupItemId, checked: boolean) {
  const next = new Set(current);

  if (checked) {
    next.add(id);
  } else {
    next.delete(id);
  }

  return next;
}

function CreateBackupCard() {
  const preview = useBackupPreview();
  const create = useCreateBackup();
  const savedNotice = useSavedNotice();
  const [selected, setSelected] = useState<ReadonlySet<BackupItemId> | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  if (preview.isPending) {
    return <LoadingState message={Strings.loading} />;
  }

  if (preview.isError) {
    return (
      <ErrorState
        primaryMessage={BackupStrings.loadError}
        secondaryMessage={preview.error.message}
        action={() => void preview.refetch()}
      />
    );
  }

  const items = preview.data.items;
  const chosen = selected ?? new Set<BackupItemId>(BACKUP_ITEM_IDS);
  const picked = items.filter((item) => chosen.has(item.id));
  const original = picked.reduce((total, item) => total + item.bytes, 0);
  const zipped = picked.reduce((total, item) => total + item.estimatedZipBytes, 0);

  const start = () => {
    setOutcome(null);
    create.mutate(
      { items: picked.map((item) => item.id) },
      {
        onSuccess: (result) => {
          if (result.cancelled) {
            setOutcome(BackupStrings.createCancelled);

            return;
          }

          savedNotice(BackupStrings.created(formatBytes(result.bytes ?? 0)), result.path);
          setOutcome(BackupStrings.createdAt(result.path ?? ''));
        },
      },
    );
  };

  return (
    <SettingsGroup title={BackupStrings.createTitle} hint={BackupStrings.createHint}>
      <SettingsPanel>
        <ItemList
          items={items}
          chosen={chosen}
          disabled={create.isPending}
          idPrefix="backup"
          onToggle={(id, checked) => setSelected(toggled(chosen, id, checked))}
        />

        <p className="text-sm" data-testid="backup-total">
          {picked.length === 0
            ? BackupStrings.nothingSelected
            : BackupStrings.total(formatBytes(original), formatBytes(zipped))}
        </p>

        <div
          role="note"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
        >
          <p className="mb-1 flex items-center gap-2 font-medium">
            <TriangleAlert className="size-4 text-amber-500" />
            {BackupStrings.notIncludedTitle}
          </p>

          <ul className="list-disc space-y-0.5 pl-6 text-muted-foreground">
            {preview.data.notIncluded.map((id) => (
              <li key={id}>{EXCLUSION_LABELS[id]}</li>
            ))}
          </ul>
        </div>

        {create.isPending && <BackupProgress title={BackupStrings.creating} />}

        {create.isError && (
          <p role="alert" className="text-sm text-destructive">
            {create.error.message}
          </p>
        )}

        {outcome && !create.isPending && <p className="text-sm text-muted-foreground">{outcome}</p>}
        <div className="flex justify-end gap-2">
          <Button disabled={picked.length === 0 || create.isPending} onClick={start} loading={create.isPending}>
            {BackupStrings.create}
          </Button>
        </div>
      </SettingsPanel>
    </SettingsGroup>
  );
}

function RestoreBackupCard({ onSaved }: SectionProps) {
  const inspect = useInspectBackup();
  const restore = useRestoreBackup();
  const snackbar = useSnackbar();
  const [backup, setBackup] = useState<BackupInspection | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<BackupItemId>>(new Set());
  const [mode, setMode] = useState<RestoreMode>('merge');
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<BackupRestoreResult | null>(null);

  const choose = () => {
    setResult(null);
    inspect.mutate(undefined, {
      onSuccess: (data) => {
        if (data) {
          setBackup(data);
          setSelected(new Set(data.items.map((item) => item.id)));
          setMode('merge');
        }
      },
    });
  };

  const run = () => {
    if (!backup) {
      return;
    }

    setConfirming(false);
    restore.mutate(
      { token: backup.token, items: [...selected], mode },
      {
        onSuccess: (data) => {
          setResult(data);
          setBackup(null);
          snackbar.show(BackupStrings.done);
          onSaved(data.restartRequired);
        },
      },
    );
  };

  const busy = restore.isPending || inspect.isPending;

  return (
    <SettingsGroup title={BackupStrings.restoreTitle} hint={BackupStrings.restoreHint}>
      <SettingsPanel>
        {backup && (
          <>
            <div>
              <p className="font-medium">{backup.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {BackupStrings.backupFrom(
                  backup.createdAt ? formatDateTime(backup.createdAt) : '',
                  backup.appVersion,
                )}
              </p>
            </div>

            <ItemList
              items={backup.items}
              chosen={selected}
              disabled={restore.isPending}
              idPrefix="restore"
              onToggle={(id, checked) => setSelected(toggled(selected, id, checked))}
            />

            <fieldset className="flex flex-col gap-2" disabled={restore.isPending}>
              <legend className="mb-1 text-sm font-medium">{BackupStrings.modeTitle}</legend>

              {(Object.keys(MODE_LABELS) as RestoreMode[]).map((option) => (
                <div key={option} className="flex items-start gap-2">
                  <input
                    id={`mode-${option}`}
                    type="radio"
                    name="restore-mode"
                    className="mt-1 size-4 accent-primary"
                    checked={mode === option}
                    onChange={() => setMode(option)}
                  />

                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor={`mode-${option}`}>{MODE_LABELS[option].label}</Label>
                    <p className="text-xs text-muted-foreground">{MODE_LABELS[option].hint}</p>
                  </div>
                </div>
              ))}
            </fieldset>
          </>
        )}

        {restore.isPending && <BackupProgress title={BackupStrings.restoring} />}

        {(inspect.isError || restore.isError) && (
          <p role="alert" className="text-sm text-destructive">
            {(inspect.error ?? restore.error)?.message}
          </p>
        )}

        {result && (
          <div role="status" className="flex flex-col gap-1 text-sm">
            <p className="font-medium">{BackupStrings.done}</p>

            <ul className="list-disc pl-6 text-muted-foreground">
              {result.items.map((item) => (
                <li key={item.id}>
                  {BackupStrings.resultLine(ITEM_LABELS[item.id].label, item.added, item.skipped)}
                </li>
              ))}
            </ul>

            {result.safetyCopyPath && (
              <p className="text-xs text-muted-foreground">
                {BackupStrings.safetyCopy(result.safetyCopyPath)}
              </p>
            )}

            <p className="text-xs text-muted-foreground">{BackupStrings.geminiReminder}</p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          {backup && (
            <Button
              disabled={selected.size === 0 || busy}
              onClick={() => (mode === 'replace' ? setConfirming(true) : run())}
             loading={restore.isPending}>
              {BackupStrings.restore}
            </Button>
          )}

          <Button variant={backup ? 'outline' : 'default'} disabled={busy} onClick={choose} loading={inspect.isPending}>
            {inspect.isPending
              ? BackupStrings.choosing
              : backup || result
                ? BackupStrings.restoreAnother
                : BackupStrings.choose}
          </Button>
        </div>
      </SettingsPanel>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={BackupStrings.confirmReplaceTitle}
        description={BackupStrings.confirmReplace}
        confirmLabel={BackupStrings.confirmReplaceLabel}
        destructive
        onConfirm={run}
      />
    </SettingsGroup>
  );
}
