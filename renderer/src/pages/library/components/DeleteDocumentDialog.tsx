import { Callout } from '#components/Callout';
import { ConfirmDialog } from '#components/ConfirmDialog';

import { documentTypeLabels, type DocumentMeta } from '../types/library.types';

interface DeleteDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: DocumentMeta;
  isPending: boolean;
  /** Mostrada quando a exclusão falhou. */
  errorMessage?: string;
  onConfirm: () => void;
}

/** "o resumo", "a transcrição", "a criação": a página com o artigo certo para a frase. */
const WITH_ARTICLE = {
  summary: 'o resumo',
  transcription: 'a transcrição',
  article: 'a criação',
} as const;

/** O que é dito ao concluir: serve de mensagem do aviso depois de excluir. */
export const deletedMessage = (type: DocumentMeta['type']) =>
  type === 'summary' ? 'Resumo e mapa mental excluídos' : `${documentTypeLabels[type]} excluída`;

/**
 * Confirmação de **excluir a página de vez**. Diz com todas as letras o que será apagado (o texto
 * e, em resumo, o mapa mental com as edições do usuário), que não há como desfazer e o que
 * acontece nos livros; e lembra que "Remover da biblioteca" é a opção que mantém o arquivo.
 */
export function DeleteDocumentDialog({
  open,
  onOpenChange,
  meta,
  isPending,
  errorMessage,
  onConfirm,
}: DeleteDocumentDialogProps) {
  const isSummary = meta.type === 'summary';
  const published = meta.status === 'published';

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Excluir ${WITH_ARTICLE[meta.type]}?`}
      description={`Você vai apagar ${WITH_ARTICLE[meta.type]} “${meta.title}” de vez do seu computador.`}
      confirmLabel={isSummary ? 'Excluir resumo e mapa mental' : 'Excluir'}
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
              <li>O texto {isSummary ? 'do resumo' : 'da página'}.</li>

              {isSummary && (
                <li>
                  <strong>O mapa mental deste resumo</strong>, inclusive todas as edições que você
                  fez nele.
                </li>
              )}
            </ul>
          </div>

          {published && (
            <p>
              Ele também sai da biblioteca e dos livros em que estiver: nos livros, o capítulo passa
              a aparecer como “Página indisponível”.
            </p>
          )}

          {published && (
            <p className="text-muted-foreground">
              Só quer tirar da biblioteca? Use “Remover da biblioteca”: o arquivo é mantido e pode
              ser readicionado depois.
            </p>
          )}
        </>
      }
    />
  );
}
