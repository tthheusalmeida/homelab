import { RotateCw } from 'lucide-react';

import { SidebarNotice } from '#components/SidebarNotice';
import { Button } from '#ui/button';
import { useRestartPending } from '#hooks/use-restart-pending';
import { relaunchApp, RestartStrings } from '#lib/restart';

/**
 * Aviso fixo na barra lateral, acima de Configurações: aparece enquanto houver alteração salva que
 * só vale depois de reiniciar, mesmo com a janela de Configurações fechada, e traz o botão para
 * reiniciar. Fica oculto quando não há nada pendente. Visual padrão em `SidebarNotice`.
 */
export function SidebarRestartNotice() {
  const pending = useRestartPending();

  if (!pending) {
    return null;
  }

  return (
    <SidebarNotice
      role="alert"
      icon={RotateCw}
      title={RestartStrings.sidebarTitle}
      hint={RestartStrings.sidebarHint}
      action={
        <Button size="xs" onClick={() => void relaunchApp()}>
          <RotateCw /> {RestartStrings.action}
        </Button>
      }
    />
  );
}
