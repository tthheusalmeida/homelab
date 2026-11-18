import { Download } from 'lucide-react';

import { ProgressBar } from '#components/ProgressBar';
import { SidebarNotice } from '#components/SidebarNotice';
import { openComponentsSettings, useComponentsStatus } from '#hooks/use-components';
import { ComponentStrings, overallPercent, setupHint } from '#lib/components-text';

/**
 * Aviso na barra lateral, acima de Configurações: mostra o progresso do que está sendo baixado
 * (n de N e porcentagem) e, quando falta instalar o essencial, lembra de concluir. Clicar abre
 * Configurações > Componentes, com o detalhe de cada item. Fica oculto quando não há nada a mostrar.
 * Visual padrão em `SidebarNotice`.
 */
export function SidebarSetupProgress() {
  const { data: status } = useComponentsStatus();

  if (!status || (!status.running && !status.needsSetup)) {
    return null;
  }

  const overall = status.running ? status.overall : null;

  return (
    <SidebarNotice
      icon={Download}
      title={
        overall
          ? ComponentStrings.overall(overall.done, overall.total)
          : ComponentStrings.sidebarPending
      }
      progress={
        overall ? (
          <ProgressBar
            value={overall.receivedBytes}
            total={overall.totalBytes}
            label="Progresso da instalação"
            className="h-1.5"
          />
        ) : undefined
      }
      hint={
        overall
          ? `${overallPercent(overall)}% · ${ComponentStrings.sidebarOpen.toLowerCase()}`
          : setupHint(status.components)
      }
      onOpen={() => void openComponentsSettings()}
      openLabel={ComponentStrings.sidebarOpen}
    />
  );
}
