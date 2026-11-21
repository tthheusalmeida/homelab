import { useEffect, useState } from 'react';
import { ComponentChecklist } from '#components/ComponentChecklist';
import { HardwareCard } from '#components/HardwareCard';
import { HexLoader, Logo } from '#components/Hex';
import { InstallOverall } from '#components/InstallOverall';
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
} from '#hooks/use-components';
import { useInstallSelection } from '#hooks/use-install-selection';
import { ComponentStrings } from '#lib/components-text';

/**
 * Assistente de instalação: aparece sozinho quando falta algo para transcrever. Mostra o que o app
 * identificou do computador, a lista de componentes (obrigatórios travados, modelos à escolha, com a
 * recomendação já marcada) e acompanha o download item por item. "Agora não" fecha e a sidebar
 * continua lembrando; quem fecha durante o download não cancela nada.
 */
export function InstallAssistant() {
  const { data: status } = useComponentsStatus();
  const [dismissed, setDismissed] = useState(false);
  const [wasRunning, setWasRunning] = useState(false);
  const { chosen, bytes, toggle, start, isStarting } = useInstallSelection(
    status,
    (current) => current.hardware.recommendation.componentIds,
  );

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

        {status.running && status.overall && <InstallOverall overall={status.overall} />}

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
                <Button disabled={isStarting || bytes === 0} onClick={start} loading={isStarting}>
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
