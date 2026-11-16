import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { ComponentChecklist } from '#components/ComponentChecklist';
import { HardwareCard } from '#components/HardwareCard';
import { HexLoader, Logo } from '#components/Hex';
import { ProgressBar } from '#components/ProgressBar';
import { useSnackbar } from '#components/Snackbar';
import { Button } from '#ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#ui/dialog';
import {
  cancelComponentsInstall,
  openComponentsSettings,
  useComponentsStatus,
  useInstallComponents,
} from '#hooks/use-components';
import {
  ComponentStrings,
  idsToInstall,
  overallPercent,
  pendingBytes,
} from '#lib/components-text';
import { formatBytes } from '#lib/format';

/**
 * Assistente de instalação: aparece sozinho quando falta algo para transcrever. Mostra o que o app
 * identificou do computador, a lista de componentes (obrigatórios travados, modelos à escolha, com a
 * recomendação já marcada) e acompanha o download item por item. "Agora não" fecha e a sidebar
 * continua lembrando; quem fecha durante o download não cancela nada.
 */
export function InstallAssistant() {
  const { data: status } = useComponentsStatus();
  const install = useInstallComponents();
  const snackbar = useSnackbar();
  const [dismissed, setDismissed] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string> | null>(null);
  const [wasRunning, setWasRunning] = useState(false);

  useEffect(() => {
    if (status && selected === null) {
      setSelected(new Set(status.hardware.recommendation.componentIds));
    }
  }, [status, selected]);

  useEffect(() => {
    if (status?.running) {
      setWasRunning(true);
    }
  }, [status?.running]);

  if (!status) {
    return null;
  }

  const finished = wasRunning && !status.running && !status.needsSetup;
  const open = !dismissed && (status.needsSetup || status.running || finished);
  const chosen = selected ?? new Set<string>();
  const bytes = pendingBytes(status.components, chosen);

  const toggle = (id: string) => {
    const next = new Set(chosen);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    setSelected(next);
  };

  const start = () => {
    const ids = idsToInstall(status.components, chosen).map((component) => component.id);

    install.mutate(ids, {
      onError: (error) => snackbar.error(error.message || ComponentStrings.installFailed),
    });
  };

  const text = ComponentStrings.assistant;
  const title = finished ? text.doneTitle : status.running ? text.runningTitle : text.title;
  const description = finished
    ? text.doneDescription
    : status.running
      ? text.runningDescription
      : text.description;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setDismissed(true)}>
      <DialogContent
        className="sm:max-w-2xl"
        showCloseButton={!status.running}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            {status.running ? <HexLoader className="size-9" label={title} /> : <Logo />}

            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!status.running && !finished && <HardwareCard hardware={status.hardware} />}

        {status.running && status.overall && (
          <div role="status" className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">
                {ComponentStrings.overall(status.overall.done, status.overall.total)}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {formatBytes(status.overall.receivedBytes)} de{' '}
                {formatBytes(status.overall.totalBytes)} · {overallPercent(status.overall)}%
              </span>
            </div>

            <ProgressBar
              value={status.overall.receivedBytes}
              total={status.overall.totalBytes}
              label="Progresso da instalação"
            />
          </div>
        )}

        <ComponentChecklist
          components={status.components}
          selected={chosen}
          onToggle={toggle}
          locked={status.running}
        />

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {!status.running && !finished && bytes > 0 ? ComponentStrings.totalSize(bytes) : ''}
          </span>

          <div className="flex flex-wrap justify-end gap-2">
            {status.running ? (
              <>
                <Button variant="outline" onClick={() => void openComponentsSettings()}>
                  {text.details}
                </Button>
                <Button variant="outline" onClick={() => void cancelComponentsInstall()}>
                  {ComponentStrings.cancel}
                </Button>
              </>
            ) : finished ? (
              <Button onClick={() => setDismissed(true)}>{text.done}</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDismissed(true)}>
                  {text.later}
                </Button>
                <Button disabled={install.isPending || bytes === 0} onClick={start}>
                  {install.isPending && <Loader2 className="animate-spin" />}
                  {text.start}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
