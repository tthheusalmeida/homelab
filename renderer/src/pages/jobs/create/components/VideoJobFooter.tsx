import { Button } from "#ui/button";
import { DialogFooter } from "#ui/dialog";

import { VideoUrlStrings } from "../video-url-text";

/** Erro e botão de enviar iguais nos formulários de vídeo; `ready` é o que falta além dos links. */
export function VideoJobFooter({
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
    <>
      {isError && (
        <p className="text-sm text-destructive">Não foi possível criar o job. Tente novamente.</p>
      )}

      <DialogFooter>
        <Button type="submit" disabled={!canSubmit} loading={isPending}>
          {VideoUrlStrings.submit(linkCount)}
        </Button>
      </DialogFooter>
    </>
  );
}
