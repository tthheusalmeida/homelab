import { Button } from "#ui/button";
import { asDialogSlot, DialogFooter } from "#ui/dialog";

import { VideoUrlStrings } from "../video-url-text";

/**
 * Rodapé fixo dos formulários de vídeo: erro à esquerda (quando há) e o botão de enviar à direita.
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
  return (
    <DialogFooter className="sm:items-center">
      {isError && (
        <p role="alert" className="text-sm text-destructive sm:mr-auto">
          Não foi possível criar o job. Tente novamente.
        </p>
      )}

      <Button type="submit" disabled={!canSubmit} loading={isPending}>
        {VideoUrlStrings.submit(linkCount)}
      </Button>
    </DialogFooter>
  );
}, "footer");
