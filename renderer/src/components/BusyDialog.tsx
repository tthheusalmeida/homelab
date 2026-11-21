import { useEffect, useState, type ReactNode } from "react";

import { Dialog, DialogContent } from "#ui/dialog";

interface BusyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  /** O conteúdo recebe `onBusyChange`: avise por ele (ou por `useReportBusy`) quando algo estiver em andamento. */
  children: (onBusyChange: (busy: boolean) => void) => ReactNode;
}

/**
 * Janela que **não fecha enquanto uma operação roda** (Esc, clique fora ou X): fechar no meio faria a
 * operação continuar sem nenhum sinal na tela. O conteúdo avisa quando está ocupado; abrir continua
 * livre.
 */
export function BusyDialog({ open, onOpenChange, className, children }: BusyDialogProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => (next || !busy) && onOpenChange(next)}>
      <DialogContent bare className={className}>
        {children(setBusy)}
      </DialogContent>
    </Dialog>
  );
}

/** Avisa o `BusyDialog` de que há operação em andamento, e que acabou quando o conteúdo sai da tela. */
export function useReportBusy(busy: boolean, onBusyChange: (busy: boolean) => void) {
  useEffect(() => {
    onBusyChange(busy);

    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
}
