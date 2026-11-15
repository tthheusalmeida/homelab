import { Button } from "#ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#ui/dialog";

import { ChatStrings } from "../strings";

interface ContextWarningDialogProps {
  open: boolean;
  /** Ex.: "~120 mil tokens". */
  tokens: string;
  /** Percentual do limite do modelo; `null` quando o limite não é conhecido. */
  percent: number | null;
  onSend: () => void;
  onNewChat: () => void;
  onCancel: () => void;
}

/** Avisa, antes de enviar, que a conversa está grande: enviar mesmo assim ou abrir um chat novo. */
export function ContextWarningDialog({
  open,
  tokens,
  percent,
  onSend,
  onNewChat,
  onCancel,
}: ContextWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{ChatStrings.warningTitle}</DialogTitle>

          <DialogDescription>{ChatStrings.warningDescription(tokens, percent)}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {ChatStrings.warningCancel}
          </Button>

          <Button variant="outline" onClick={onNewChat}>
            {ChatStrings.warningNewChat}
          </Button>

          <Button onClick={onSend}>{ChatStrings.warningSend}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
