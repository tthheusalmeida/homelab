import { useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

import { Button } from '#ui/button';

/**
 * Executa a gravação de uma preferência (cada escolha vale na hora): guarda a mensagem de erro da
 * última tentativa e a limpa a cada nova. Usado por Leitura, Resumo e Transcrição.
 */
export function usePreferenceAction() {
  const [error, setError] = useState<string | null>(null);

  const run = (action: Promise<void>) => {
    setError(null);
    action.catch((failure: Error) => setError(failure.message));
  };

  return { error, run };
}

/** "Restaurar padrão" das preferências: botão pequeno, desabilitado quando já está tudo no padrão. */
export function RestoreButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button type="button" variant="ghost" size="xs" disabled={disabled} onClick={onClick}>
      <RotateCcw /> {children}
    </Button>
  );
}

/** Erro ao gravar uma preferência (some quando não há). */
export function PreferenceError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="animate-enter-fade text-sm text-destructive">
      {message}
    </p>
  );
}
