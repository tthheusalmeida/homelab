import { PieceCatalog } from '#components/PieceCatalog';
import { pieceName } from '#components/InfographicPiece';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#ui/dialog';

/**
 * A busca fica fixa no topo do miolo que rola do diálogo (o miolo fica sem o espaçamento de cima,
 * `pt-0`, para as peças não aparecerem entre o cabeçalho e a busca). A margem lateral negativa
 * cancela o espaçamento do miolo (`px-5`) para o fundo cobrir a largura toda.
 */
const SEARCH_STICKY = 'sticky top-0 z-10 -mx-5 bg-popover px-5 py-3';

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
      <DialogContent className="max-w-3xl sm:max-w-3xl" bodyClassName="pt-0">
        <DialogHeader>
          <DialogTitle>Trocar a peça</DialogTitle>

          <DialogDescription>
            {currentKey
              ? `Escolha a peça que vai no lugar de “${pieceName(currentKey)}”. Só este espaço muda.`
              : 'Escolha a peça deste espaço. Só ele muda.'}
          </DialogDescription>
        </DialogHeader>

        <PieceCatalog
          details={false}
          selected={currentKey}
          onPick={onPick}
          searchClassName={SEARCH_STICKY}
        />
      </DialogContent>
    </Dialog>
  );
}
