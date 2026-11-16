import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { ComponentChecklist } from '#components/ComponentChecklist';
import { ErrorState } from '#components/ErrorState';
import { HardwareCard } from '#components/HardwareCard';
import { LoadingState } from '#components/LoadingState';
import { ProgressBar } from '#components/ProgressBar';
import { useSnackbar } from '#components/Snackbar';
import { Button } from '#ui/button';
import {
  cancelComponentsInstall,
  useComponentsStatus,
  useInstallComponents,
  useRemoveComponent,
  useSetActiveModel,
} from '#hooks/use-components';
import { ComponentStrings, overallPercent, pendingBytes } from '#lib/components-text';
import { formatBytes } from '#lib/format';
import type { ComponentInfo } from '#shared/contracts/components';

/**
 * Configurações > Componentes: o que está instalado, o que está sendo baixado agora (com detalhe de
 * cada item) e o que dá para baixar depois (outros modelos, aceleração por placa NVIDIA). A mesma
 * lista do assistente de instalação (`ComponentChecklist`).
 */
export function ComponentsSection() {
  const { data: status, isLoading, isError, refetch } = useComponentsStatus();
  const install = useInstallComponents();
  const remove = useRemoveComponent();
  const setActive = useSetActiveModel();
  const snackbar = useSnackbar();
  const [selected, setSelected] = useState<ReadonlySet<string> | null>(null);

  useEffect(() => {
    if (status && selected === null) {
      const missing = status.components.filter(
        (component) => component.recommended && component.state !== 'installed',
      );

      setSelected(new Set(missing.map((component) => component.id)));
    }
  }, [status, selected]);

  if (isLoading) {
    return <LoadingState message="Carregando componentes" />;
  }

  if (isError || !status) {
    return (
      <ErrorState
        primaryMessage="Não foi possível ler os componentes."
        action={() => void refetch()}
      />
    );
  }

  const chosen = selected ?? new Set<string>();
  const bytes = pendingBytes(status.components, chosen);
  const fail = (error: Error) => snackbar.error(error.message || ComponentStrings.installFailed);

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
    const ids = status.components
      .filter((component) => chosen.has(component.id) && !component.required)
      .map((component) => component.id);

    install.mutate(ids, { onError: fail });
  };

  const actions = (component: ComponentInfo) => {
    if (status.running || component.bundled || component.state !== 'installed') {
      return null;
    }

    return (
      <>
        {component.group === 'model' && !component.active && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setActive.mutate(component.id, {
                onSuccess: () => snackbar.success(ComponentStrings.activated(component.label)),
                onError: fail,
              })
            }
          >
            {ComponentStrings.use}
          </Button>
        )}

        {!component.active && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              remove.mutate(component.id, {
                onSuccess: () => snackbar.success(ComponentStrings.removed(component.label)),
                onError: fail,
              })
            }
          >
            {ComponentStrings.remove}
          </Button>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <HardwareCard hardware={status.hardware} />

      {status.running && status.overall && (
        <div
          role="status"
          className="flex flex-col gap-1.5 rounded-lg border border-primary/30 p-3"
        >
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
        actions={actions}
      />

      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          {bytes > 0 ? ComponentStrings.totalSize(bytes) : ComponentStrings.nothingToInstall}
        </span>

        {status.running ? (
          <Button variant="outline" onClick={() => void cancelComponentsInstall()}>
            {ComponentStrings.cancel}
          </Button>
        ) : (
          <Button disabled={install.isPending || bytes === 0} onClick={start}>
            {install.isPending && <Loader2 className="animate-spin" />}
            {ComponentStrings.install}
          </Button>
        )}
      </div>
    </div>
  );
}
