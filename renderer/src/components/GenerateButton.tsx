import type { ReactNode } from 'react';

import { Sparkles } from 'lucide-react';

import { Button } from '#ui/button';

import { HexLoader } from '#components/Hex';

interface GenerateButtonProps {
  /** A IA está trabalhando: mostra a colmeia carregando e desabilita o botão. */
  pending: boolean;
  onClick: () => void;
  children: ReactNode;
  primary?: boolean;
}

/** Botão de gerar com IA: enquanto ela trabalha, mostra a colmeia carregando e fica desabilitado. */
export function GenerateButton({
  pending,
  onClick,
  children,
  primary = false,
}: GenerateButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={primary ? 'default' : 'outline'}
      disabled={pending}
      aria-busy={pending}
      onClick={onClick}
    >
      {pending ? (
        <>
          <span aria-hidden="true" className="inline-flex">
            <HexLoader className="size-4" />
          </span>
          Gerando…
        </>
      ) : (
        <>
          <Sparkles />
          {children}
        </>
      )}
    </Button>
  );
}
