import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { useSnackbar } from '#components/Snackbar';
import { ipc } from '#lib/ipc';
import { IpcChannels } from '#shared/channels';
import { Button } from '#ui/button';

export const PlatformLoginsStrings = {
  title: 'Logins dos sites de vídeo',
  hint: 'Quando um vídeo pede login, você entra uma vez e o HomeLab guarda o acesso cifrado neste computador. Aqui você pode esquecer esses logins.',
  forget: 'Esquecer logins',
  forgotten: (count: number) =>
    count === 1 ? '1 login esquecido.' : `${count} logins esquecidos.`,
  none: 'Não havia nenhum login guardado.',
  failed: 'Não foi possível esquecer os logins.',
} as const;

/** Configurações > Acessos: apaga os logins guardados dos sites de onde se baixam vídeos. */
export function PlatformLoginsCard() {
  const snackbar = useSnackbar();
  const forget = useMutation({
    mutationFn: () => ipc.invoke(IpcChannels.platform.forgetLogins),
    onSuccess: ({ removed }) =>
      snackbar.success(
        removed > 0 ? PlatformLoginsStrings.forgotten(removed) : PlatformLoginsStrings.none,
      ),
    onError: (error: Error) => snackbar.error(error.message || PlatformLoginsStrings.failed),
  });

  return (
    <section
      aria-label={PlatformLoginsStrings.title}
      className="flex items-center justify-between gap-4 rounded-lg border p-3"
    >
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{PlatformLoginsStrings.title}</h3>
        <p className="text-xs text-muted-foreground">{PlatformLoginsStrings.hint}</p>
      </div>

      <Button variant="outline" disabled={forget.isPending} onClick={() => forget.mutate()}>
        {forget.isPending && <Loader2 className="animate-spin" />}
        {PlatformLoginsStrings.forget}
      </Button>
    </section>
  );
}
