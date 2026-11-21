import type { ReactNode } from "react";

import { Button } from "#ui/button";

interface FormButtonsProps {
  /** Fecha ou volta sem salvar. */
  onCancel: () => void;
  /** Enviando: trava o "Cancelar" e mostra o spinner no botão principal. */
  pending: boolean;
  /** Outra ação da janela está em andamento (ex.: excluir): trava o "Cancelar" sem mostrar spinner no principal. */
  locked?: boolean;
  /** O formulário está pronto para enviar. */
  canSubmit: boolean;
  /** O rótulo do botão principal (ex.: "Salvar"). */
  children: ReactNode;
  cancelLabel?: string;
  /** Sem `onSubmit` o botão principal envia o `<form>`; com ele, só chama a função (janelas sem `<form>`). */
  onSubmit?: () => void;
}

/**
 * Os dois botões de rodapé de todo formulário de edição ou criação: **Cancelar** (contorno) e o botão
 * principal com spinner enquanto envia. Ponha dentro de `DialogFooter` ou de uma linha do formulário.
 */
export function FormButtons({
  onCancel,
  pending,
  canSubmit,
  children,
  cancelLabel = "Cancelar",
  locked = false,
  onSubmit,
}: FormButtonsProps) {
  return (
    <>
      <Button type="button" variant="outline" disabled={pending || locked} onClick={onCancel}>
        {cancelLabel}
      </Button>

      <Button
        type={onSubmit ? "button" : "submit"}
        disabled={!canSubmit}
        loading={pending}
        onClick={onSubmit}
      >
        {children}
      </Button>
    </>
  );
}
