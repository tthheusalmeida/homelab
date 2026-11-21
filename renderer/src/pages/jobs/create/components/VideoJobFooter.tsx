import { Button } from "#ui/button";
import { useErrorAlert } from "#hooks/use-error-alert";
import { asDialogSlot, DialogFooter } from "#ui/dialog";

import { VideoUrlStrings } from "../video-url-text";

/**
 * Rodapé fixo dos formulários de criação de tarefa: o botão de enviar (o erro vira o alerta do rodapé
 * da tela). Marcado como rodapé para o diálogo mantê-lo fora da rolagem. Serve aos formulários de
 * vídeo (rótulo pelo número de links) e ao de PDF (`submitLabel` próprio e a mensagem do erro).
 */
export const VideoJobFooter = asDialogSlot(function VideoJobFooter({
  linkCount = 1,
  submitLabel,
  canSubmit,
  isPending,
  isError,
  errorMessage,
}: {
  linkCount?: number;
  /** Texto do botão; sem ele, vale o dos vídeos (pelo número de links). */
  submitLabel?: string;
  /** Tudo pronto para enviar (links válidos, não travado e os campos próprios do formulário). */
  canSubmit: boolean;
  isPending: boolean;
  isError: boolean;
  /** Motivo do erro, quando a tela sabe dizer (ex.: leitura do PDF expirada). */
  errorMessage?: string;
}) {
  useErrorAlert(isError && (errorMessage || "Não foi possível criar o job. Tente novamente."));

  return (
    <DialogFooter>
      <Button type="submit" disabled={!canSubmit} loading={isPending}>
        {submitLabel ?? VideoUrlStrings.submit(linkCount)}
      </Button>
    </DialogFooter>
  );
}, "footer");
