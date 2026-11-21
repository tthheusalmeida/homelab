import { Button } from "#ui/button";
import { useErrorAlert } from "#hooks/use-error-alert";
import { asDialogSlot, DialogFooter } from "#ui/dialog";

import { VideoUrlStrings } from "../video-url-text";

/**
 * Rodapé fixo dos formulários de vídeo: o botão de enviar (o erro vira o alerta do rodapé da tela).
 * Marcado como rodapé para o diálogo mantê-lo fora da rolagem.
 */
export const VideoJobFooter = asDialogSlot(function VideoJobFooter({
  linkCount,
  canSubmit,
  isPending,
  isError,
}: {
  linkCount: number;
  /** Tudo pronto para enviar (links válidos, não travado e os campos próprios do formulário). */
  canSubmit: boolean;
  isPending: boolean;
  isError: boolean;
}) {
  useErrorAlert(isError && "Não foi possível criar o job. Tente novamente.");

  return (
    <DialogFooter>
      <Button type="submit" disabled={!canSubmit} loading={isPending}>
        {VideoUrlStrings.submit(linkCount)}
      </Button>
    </DialogFooter>
  );
}, "footer");
