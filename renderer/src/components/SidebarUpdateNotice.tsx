import { CircleArrowUp } from 'lucide-react';
import { useNavigate } from 'react-router';

import { ProgressBar } from '#components/ProgressBar';
import { useInstallUpdate, useUpdateStatus } from '#hooks/use-updates';
import { UpdateStrings, UPDATES_URL } from '#lib/update-text';
import { Button } from '#ui/button';

/**
 * Cartão na barra lateral, acima de Configurações: avisa que há versão nova do app e leva à seção
 * de atualização. Durante o download mostra o progresso; com a versão baixada (`ready`) oferece
 * "Reiniciar e atualizar". Fica oculto quando o app está em dia.
 */
export function SidebarUpdateNotice() {
  const navigate = useNavigate();
  const { data: status } = useUpdateStatus();
  const install = useInstallUpdate();

  if (!status?.latest) {
    return null;
  }

  const downloading = status.state === 'downloading';
  const ready = status.state === 'ready';
  const title = downloading
    ? UpdateStrings.sidebarDownloading(status.progress)
    : status.state === 'installing'
      ? UpdateStrings.sidebarInstalling
      : ready
        ? UpdateStrings.sidebarReady(status.latest.version)
        : UpdateStrings.sidebarTitle(status.latest.version);

  return (
    <div className="flex w-full animate-enter-fade flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 transition-colors select-none hover:bg-primary/10">
      <button
        type="button"
        aria-label={UpdateStrings.sidebarOpen}
        onClick={() => void navigate(UPDATES_URL)}
        className="flex w-full cursor-pointer flex-col gap-1.5 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] font-medium">
          <CircleArrowUp aria-hidden className="size-3.5 text-primary" />
          {title}
        </span>

        {downloading ? (
          <ProgressBar
            value={status.progress}
            total={100}
            label={UpdateStrings.progressLabel}
            className="h-1.5"
          />
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {ready ? UpdateStrings.sidebarReadyHint : UpdateStrings.sidebarHint}
          </span>
        )}
      </button>

      {ready && (
        <Button size="xs" disabled={install.isPending} onClick={() => install.mutate()}>
          {UpdateStrings.restart}
        </Button>
      )}
    </div>
  );
}
