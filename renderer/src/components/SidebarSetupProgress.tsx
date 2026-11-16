import { Download } from 'lucide-react';

import { ProgressBar } from '#components/ProgressBar';
import { openComponentsSettings, useComponentsStatus } from '#hooks/use-components';
import { ComponentStrings, overallPercent } from '#lib/components-text';

/**
 * Cartão na barra lateral, acima de Configurações: mostra o progresso do que está sendo baixado
 * (n de N e porcentagem) e, quando falta instalar o essencial, lembra de concluir. Clicar abre
 * Configurações > Componentes, com o detalhe de cada item. Fica oculto quando não há nada a mostrar.
 */
export function SidebarSetupProgress() {
  const { data: status } = useComponentsStatus();

  if (!status || (!status.running && !status.needsSetup)) {
    return null;
  }

  const overall = status.running ? status.overall : null;

  return (
    <button
      type="button"
      aria-label={ComponentStrings.sidebarOpen}
      onClick={() => void openComponentsSettings()}
      className="flex w-full animate-enter-fade cursor-pointer flex-col gap-1.5 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-left transition-colors select-none hover:bg-primary/10"
    >
      <span className="flex items-center gap-2 text-[13px] font-medium">
        <Download aria-hidden className="size-3.5 text-primary" />
        {overall
          ? ComponentStrings.overall(overall.done, overall.total)
          : ComponentStrings.sidebarPending}
      </span>

      {overall ? (
        <>
          <ProgressBar
            value={overall.receivedBytes}
            total={overall.totalBytes}
            label="Progresso da instalação"
            className="h-1.5"
          />
          <span className="font-mono text-[11px] text-muted-foreground">
            {overallPercent(overall)}% · {ComponentStrings.sidebarOpen.toLowerCase()}
          </span>
        </>
      ) : (
        <span className="text-[11px] text-muted-foreground">
          {ComponentStrings.sidebarPendingHint}
        </span>
      )}
    </button>
  );
}
