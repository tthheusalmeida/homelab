import { ConfirmDialog } from '#components/ConfirmDialog';

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Confirmações das abas geradas do resumo (mapa mental e infográfico) que têm edição à mão: um só
 * texto e um só jeito de perguntar nas duas, e o que muda é só o conteúdo (`noun`, `description`).
 */
export function DiscardEditsDialog({
  description,
  ...props
}: EditDialogProps & {
  /** O que se perde: "As mudanças que você fez no mapa e ainda não salvou serão perdidas." */
  description: string;
}) {
  return (
    <ConfirmDialog
      title="Descartar as alterações?"
      description={description}
      confirmLabel="Descartar alterações"
      destructive
      {...props}
    />
  );
}

/** Gerar de novo apaga as edições do usuário: pergunta antes. `noun`: "mapa" ou "infográfico". */
export function RegenerateEditedDialog({
  noun,
  ...props
}: EditDialogProps & { noun: 'mapa' | 'infográfico' }) {
  return (
    <ConfirmDialog
      title="Gerar de novo e perder as suas edições?"
      description={`Você editou este ${noun} à mão. Gerar de novo com a IA cria um ${noun} novo a partir do resumo e apaga as suas edições. Não há como desfazer.`}
      confirmLabel="Gerar de novo"
      destructive
      {...props}
    />
  );
}
