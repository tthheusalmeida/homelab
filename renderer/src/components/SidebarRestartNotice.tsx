import { RotateCw } from 'lucide-react';

import { Button } from '#ui/button';
import { useRestartPending } from '#hooks/use-restart-pending';
import { relaunchApp, RestartStrings } from '#lib/restart';

/**
 * Aviso fixo na barra lateral, acima de Configurações: aparece enquanto houver alteração salva que
 * só vale depois de reiniciar, mesmo com a janela de Configurações fechada, e traz o botão para
 * reiniciar. Fica oculto quando não há nada pendente.
 */
export function SidebarRestartNotice() {
  const pending = useRestartPending();

  if (!pending) {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex animate-enter-fade flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 select-none"
    >
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-2 text-[13px] font-medium">
          <RotateCw aria-hidden className="size-3.5 text-primary" />
          {RestartStrings.sidebarTitle}
        </span>

        <span className="text-[11px] text-muted-foreground">{RestartStrings.sidebarHint}</span>
      </div>

      <Button size="sm" className="w-full" onClick={() => void relaunchApp()}>
        <RotateCw /> {RestartStrings.action}
      </Button>
    </div>
  );
}
