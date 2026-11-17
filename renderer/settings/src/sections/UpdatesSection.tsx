import { useState } from 'react';
import { CircleArrowUp, Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

import { ConfirmDialog } from '#components/ConfirmDialog';
import { ErrorState } from '#components/ErrorState';
import { LoadingState } from '#components/LoadingState';
import { MarkdownMessage } from '#components/MarkdownMessage';
import { ProgressBar } from '#components/ProgressBar';
import { SettingsGroup, SettingsPanel, SettingsRow } from '#components/SettingsGroup';
import {
  useCheckForUpdates,
  useInstallUpdate,
  useSetAutoCheck,
  useUpdateStatus,
} from '#hooks/use-updates';
import { formatDateTime } from '#lib/format';
import { UpdateStrings } from '#lib/update-text';
import { Button } from '#ui/button';
import { Label } from '#ui/label';

import { Strings } from '../strings';

/**
 * Sobre e atualizações: versão instalada, verificar agora, verificação automática, e a versão nova
 * (baixada sozinha, só a diferença; "Reiniciar e atualizar" quando pronta).
 */
export function UpdatesSection() {
  const { data: status, isPending, isError, refetch } = useUpdateStatus();
  const check = useCheckForUpdates();
  const install = useInstallUpdate();
  const setAutoCheck = useSetAutoCheck();
  const [confirming, setConfirming] = useState(false);

  if (isPending) {
    return <LoadingState message={Strings.loading} />;
  }

  if (isError || !status) {
    return <ErrorState primaryMessage={Strings.loadError} action={() => void refetch()} />;
  }

  const { latest } = status;
  const checking = status.state === 'checking' || check.isPending;
  const downloading = status.state === 'downloading';
  const ready = status.state === 'ready';
  const busy = checking || downloading || status.state === 'installing' || install.isPending;
  const error =
    status.error ??
    (check.isError || install.isError || setAutoCheck.isError ? UpdateStrings.requestFailed : null);

  return (
    <div className="flex flex-col gap-6">
      <SettingsGroup title="Versão">
        <SettingsPanel highlight={Boolean(latest)}>
          <div className="flex flex-col gap-2">
            <SettingsRow label={UpdateStrings.currentVersion}>
              <p className="font-mono text-sm">{status.currentVersion}</p>
            </SettingsRow>

            <SettingsRow label={UpdateStrings.lastCheck}>
              <p className="text-sm text-muted-foreground">
                {status.checkedAt
                  ? formatDateTime(new Date(status.checkedAt))
                  : UpdateStrings.neverChecked}
              </p>
            </SettingsRow>
          </div>

          <p className="flex items-center gap-2 text-sm font-medium">
            {latest ? (
              <>
                <CircleArrowUp aria-hidden className="size-4 text-primary" />
                {ready ? UpdateStrings.ready(latest.version) : UpdateStrings.available(latest.version)}
              </>
            ) : (
              status.checkedAt !== null && UpdateStrings.upToDate
            )}
          </p>

          {downloading && (
            <div role="status" className="flex flex-col gap-2">
              <ProgressBar
                value={status.progress}
                total={100}
                label={UpdateStrings.progressLabel}
              />
              <p className="text-xs text-muted-foreground">
                {UpdateStrings.downloading(status.progress)}
              </p>
            </div>
          )}

          {status.state === 'installing' && (
            <p role="status" className="text-sm text-muted-foreground">
              {UpdateStrings.installing}
            </p>
          )}

          {error && (
            <p role="alert" className="animate-enter-fade text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {ready && (
              <Button disabled={busy} onClick={() => setConfirming(true)}>
                <CircleArrowUp />
                {UpdateStrings.restart}
              </Button>
            )}

            {/* Download automático que falhou: dá para tentar de novo. */}
            {latest && status.canInstall && status.state === 'available' && (
              <Button disabled={busy} onClick={() => install.mutate()}>
                <Download />
                {UpdateStrings.download}
              </Button>
            )}

            {latest && !status.canInstall && (
              <Button disabled={busy} onClick={() => install.mutate()}>
                <ExternalLink />
                {UpdateStrings.openPage}
              </Button>
            )}

            <Button variant="outline" disabled={busy} onClick={() => check.mutate()}>
              {checking ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              {checking ? UpdateStrings.checking : UpdateStrings.check}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {status.canInstall ? UpdateStrings.keepData : UpdateStrings.noAutoInstall}
          </p>
        </SettingsPanel>
      </SettingsGroup>

      <SettingsGroup title="Verificação">
        <SettingsPanel>
          <SettingsRow label={UpdateStrings.autoCheck} hint={UpdateStrings.autoCheckHint}>
            <div className="flex items-center gap-2">
              <input
                id="updates-auto-check"
                type="checkbox"
                className="size-4 shrink-0 cursor-pointer accent-primary"
                checked={status.autoCheck}
                disabled={setAutoCheck.isPending}
                onChange={(event) => setAutoCheck.mutate(event.target.checked)}
              />

              <Label htmlFor="updates-auto-check" className="cursor-pointer text-sm font-normal">
                {UpdateStrings.autoCheck}
              </Label>
            </div>
          </SettingsRow>
        </SettingsPanel>
      </SettingsGroup>

      {latest && (
        <SettingsGroup title={UpdateStrings.notesTitle(latest.version)}>
          <SettingsPanel>
            {latest.notes.trim() ? (
              <MarkdownMessage content={latest.notes} />
            ) : (
              <p className="text-sm text-muted-foreground">{UpdateStrings.noNotes}</p>
            )}
          </SettingsPanel>
        </SettingsGroup>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={UpdateStrings.confirmTitle}
        description={UpdateStrings.confirmDescription}
        confirmLabel={UpdateStrings.confirm}
        isPending={install.isPending}
        onConfirm={() => {
          setConfirming(false);
          install.mutate();
        }}
      />
    </div>
  );
}
