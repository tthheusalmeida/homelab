import { RotateCw } from 'lucide-react';

import { Button } from '#ui/button';

import { Strings } from '../strings';

/** Aviso fixo no rodapé: configuração salva só vale depois de reiniciar o app. */
export function RestartBanner({ onRestart }: { onRestart: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 border-t bg-card px-8 py-3 text-sm"
    >
      <p>{Strings.restart.message}</p>

      <Button size="sm" onClick={onRestart}>
        <RotateCw /> {Strings.restart.action}
      </Button>
    </div>
  );
}
