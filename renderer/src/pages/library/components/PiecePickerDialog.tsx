import { PieceCatalog } from '#components/PieceCatalog';
import { pieceName } from '#components/InfographicPiece';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#ui/dialog';

interface PiecePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A peça que está no lugar (destacada; o nome entra na descrição). */
  currentKey: string;
  onPick: (key: string) => void;
}

/**
 * Janela de **trocar uma peça** do infográfico: o banco inteiro por tema, com busca. Escolher uma
 * peça troca só aquele espaço e fecha a janela; a troca só vale de vez ao salvar a edição.
 */
export function PiecePickerDialog({
  open,
  onOpenChange,
  currentKey,
  onPick,
}: PiecePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Trocar a peça</DialogTitle>

          <DialogDescription>
            {currentKey
              ? `Escolha a peça que vai no lugar de “${pieceName(currentKey)}”. Só este espaço muda.`
              : 'Escolha a peça deste espaço. Só ele muda.'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <PieceCatalog details={false} selected={currentKey} onPick={onPick} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
