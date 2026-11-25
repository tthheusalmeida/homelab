import { ArrowUp, Download } from 'lucide-react';
import { useNavigate } from 'react-router';

import { ProgressBar } from '#components/ProgressBar';
import { SidebarNotice } from '#components/SidebarNotice';
import { useInstallUpdate, useUpdateStatus } from '#hooks/use-updates';
import { UpdateStrings, UPDATES_URL } from '#lib/update-text';
import { Button } from '#ui/button';

/**
 * Aviso na barra lateral: há versão nova do app e leva à seção de atualização. Durante o download
 * mostra o progresso; com a versão baixada (`ready`) oferece "Reiniciar e atualizar". Fica oculto
 * quando o app está em dia (e no app não empacotado, que não verifica atualizações). Visual padrão
 * em `SidebarNotice`.
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
    <SidebarNotice
      icon={downloading ? Download : ArrowUp}
      title={title}
      progress={
        downloading ? (
          <ProgressBar
            value={status.progress}
            total={100}
            label={UpdateStrings.progressLabel}
          />
        ) : undefined
      }
      hint={
        downloading ? undefined : ready ? UpdateStrings.sidebarReadyHint : UpdateStrings.sidebarHint
      }
      onOpen={() => void navigate(UPDATES_URL)}
      openLabel={UpdateStrings.sidebarOpen}
      action={
        ready ? (
          <Button size="xs" disabled={install.isPending} onClick={() => install.mutate()}>
            {UpdateStrings.restart}
          </Button>
        ) : undefined
      }
    />
  );
}
