import { ComponentChecklist } from '#components/ComponentChecklist';
import { ErrorState } from '#components/ErrorState';
import { HardwareCard } from '#components/HardwareCard';
import { LoadingState } from '#components/LoadingState';
import { InstallOverall } from '#components/InstallOverall';
import { useSnackbar } from '#components/Snackbar';
import { SettingsStack } from '#components/SettingsGroup';
import { Button } from '#ui/button';
import {
  cancelComponentsInstall,
  useComponentsStatus,
  useRemoveComponent,
  useSetActiveModel,
} from '#hooks/use-components';
import { useInstallSelection } from '#hooks/use-install-selection';
import { ComponentStrings } from '#lib/components-text';
import type { ComponentInfo } from '#shared/contracts/components';

/**
 * Configurações > Componentes: o que está instalado, o que está sendo baixado agora (com detalhe de
 * cada item) e o que dá para baixar depois (outros modelos, aceleração por placa de vídeo). A mesma
 * lista do assistente de instalação (`ComponentChecklist`).
 */
export function ComponentsSection() {
  const { data: status, isLoading, isError, refetch } = useComponentsStatus();
  const remove = useRemoveComponent();
  const setActive = useSetActiveModel();
  const snackbar = useSnackbar();
  const { chosen, bytes, toggle, start, fail, isStarting } = useInstallSelection(status, (current) =>
    current.components
      .filter((component) => component.recommended && component.state !== 'installed')
      .map((component) => component.id),
  );

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
    <SettingsStack>
      <HardwareCard hardware={status.hardware} />

      {status.running && status.overall && (
        <InstallOverall
          overall={status.overall}
          className="rounded-lg border border-primary/30 p-3"
        />
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
          <Button disabled={isStarting || bytes === 0} onClick={start} loading={isStarting}>
            {ComponentStrings.install}
          </Button>
        )}
      </div>
    </SettingsStack>
  );
}
