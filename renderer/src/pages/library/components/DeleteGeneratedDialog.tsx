import { Callout } from '#components/Callout';
import { ConfirmDialog } from '#components/ConfirmDialog';

/** O que pode ser excluído sozinho de um resumo (sem apagar o resumo). */
export type GeneratedKind = 'mind-map' | 'infographic';

interface Texts {
  title: string;
  description: string;
  confirmLabel: string;
  /** O que será apagado. */
  gone: string;
  /** O que continua como está. */
  stays: string;
  /** O conteúdo gerado de novo, se a pessoa quiser. */
  again: string;
}

const TEXTS: Record<GeneratedKind, Texts> = {
  'mind-map': {
    title: 'Excluir só o mapa mental?',
    description: 'Você vai apagar apenas o mapa mental deste resumo do seu computador.',
    confirmLabel: 'Excluir só o mapa mental',
    gone: 'O mapa mental deste resumo',
    stays: 'O texto do resumo e o infográfico (se houver) continuam como estão.',
    again: 'Depois, dá para gerar um novo mapa mental com a IA quando quiser.',
  },
  infographic: {
    title: 'Excluir só o infográfico?',
    description: 'Você vai apagar apenas o infográfico deste resumo do seu computador.',
    confirmLabel: 'Excluir só o infográfico',
    gone: 'O infográfico deste resumo',
    stays: 'O texto do resumo e o mapa mental (se houver) continuam como estão.',
    again: 'Depois, dá para gerar um novo infográfico com a IA quando quiser.',
  },
};

interface DeleteGeneratedDialogProps {
  kind: GeneratedKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  /** Mostrada quando a exclusão falhou. */
  errorMessage?: string;
  /** O mapa foi editado pelo usuário: as edições também se perdem. */
  edited?: boolean;
  onConfirm: () => void;
}

/**
 * Confirmação de excluir **só um conteúdo gerado** (o mapa mental ou o infográfico) de um resumo.
 * É de propósito diferente da de excluir a página (`DeleteDocumentDialog`): o título e o botão dizem
 * "só", e a janela lista o que **continua**. Para apagar o resumo e tudo o que nasceu dele, o caminho
 * é a ação Excluir de "Sobre o documento".
 */
export function DeleteGeneratedDialog({
  kind,
  open,
  onOpenChange,
  isPending,
  errorMessage,
  edited = false,
  onConfirm,
}: DeleteGeneratedDialogProps) {
  const text = TEXTS[kind];

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={text.title}
      description={text.description}
      confirmLabel={text.confirmLabel}
      destructive
      isPending={isPending}
      errorMessage={errorMessage}
      onConfirm={onConfirm}
      details={
        <>
          <Callout tone="danger" role="note">
            Esta ação não pode ser desfeita.
          </Callout>

          <div className="space-y-1.5">
            <p className="font-medium">Será apagado:</p>

            <ul className="list-disc space-y-1 pl-5">
              <li>
                {text.gone}
                {edited && kind === 'mind-map' && (
                  <>
                    , <strong>inclusive todas as edições que você fez nele</strong>
                  </>
                )}
                .
              </li>
            </ul>
          </div>

          <p>{text.stays}</p>

          <p className="text-muted-foreground">
            {text.again} Para apagar o resumo inteiro, com tudo o que se baseia nele, use Excluir em
            “Sobre o documento”.
          </p>
        </>
      }
    />
  );
}
