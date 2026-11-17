import { CircleArrowUp } from 'lucide-react';
import { useNavigate } from 'react-router';

import { ProgressBar } from '#components/ProgressBar';
import { useUpdateStatus } from '#hooks/use-updates';
import { UpdateStrings, UPDATES_URL } from '#lib/update-text';

/**
 * Cartão na barra lateral, acima de Configurações: avisa que há versão nova do app e leva à seção
 * de atualização (onde se baixa e aplica). Durante o download mostra o progresso. Fica oculto
 * quando o app está em dia.
 */
export function SidebarUpdateNotice() {
  const navigate = useNavigate();
  const { data: status } = useUpdateStatus();

  if (!status?.latest) {
    return null;
  }

  const downloading = status.state === 'downloading';
  const title = downloading
    ? UpdateStrings.sidebarDownloading(status.progress)
    : status.state === 'installing'
      ? UpdateStrings.sidebarInstalling
      : UpdateStrings.sidebarTitle(status.latest.version);

  return (
    <button
      type="button"
      aria-label={UpdateStrings.sidebarOpen}
      onClick={() => void navigate(UPDATES_URL)}
      className="flex w-full animate-enter-fade cursor-pointer flex-col gap-1.5 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-left transition-colors select-none hover:bg-primary/10"
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
        <span className="text-[11px] text-muted-foreground">{UpdateStrings.sidebarHint}</span>
      )}
    </button>
  );
}
