import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { Check, Pencil, Sparkles, Trash2, X } from 'lucide-react';

import {
  allowGeneration,
  dismissGeneration,
  isGenerationDismissed,
} from '#lib/dismissed-generation';
import { buildMindMap, fromAiMap } from '#lib/mind-map';
import {
  draftFromMap,
  draftProblemMessages,
  isDraftDirty,
  toSavePayload,
  validateDraft,
  type MindMapDraft,
} from '#lib/mind-map-edit';
import { cn } from '#lib/utils';
import { Callout } from '#components/Callout';
import { DeleteGeneratedDialog } from './DeleteGeneratedDialog';
import { DiscardEditsDialog, RegenerateEditedDialog } from './GeneratedEditDialogs';
import { GenerateButton } from '#components/GenerateButton';
import { HexLoader } from '#components/Hex';
import { IconButton } from '#components/IconButton';
import { LoadingState } from '#components/LoadingState';
import { MindMapView } from '#components/MindMapView';
import { useSnackbar } from '#components/Snackbar';
import { ActionMenu } from '#components/ActionMenu';
import { useErrorAlert } from '#hooks/use-error-alert';
import { useSavedNotice } from '#hooks/use-saved-notice';

import {
  useGenerateMindMap,
  useMindMap,
  useDeleteMindMap,
  useSaveMindMap,
  useSaveMindMapImage,
} from '../hooks/useLibrary';

interface SummaryMindMapProps {
  documentId: string;
  title: string;
  /** O Markdown do resumo (para o mapa simples de reserva). */
  content: string;
  className?: string;
}

/**
 * Páginas para as quais a IA já foi chamada nesta sessão. Abrir a aba chama a IA **uma vez** por
 * resumo: se falhar (sem chave, limite de uso, sem internet), reabrir a aba não gasta de novo, e
 * quem decide tentar outra vez é o botão.
 */
const requestedThisSession = new Set<string>();

/**
 * Rascunhos de edição em andamento, por página, nesta sessão. Trocar de aba (Resumo), entrar no modo
 * leitura ou sair da página no meio da edição não perde o que foi digitado: ao voltar ao mapa, a
 * edição continua de onde parou. Sai daqui ao salvar ou descartar.
 */
const draftsThisSession = new Map<string, MindMapDraft>();

/**
 * Aba "Mapa mental" de um resumo (também a edição do mapa: termos, frases, subtítulo e nós a mais ou
 * a menos, guardados em disco). O mapa de **revisão** é gerado pela IA com um prompt próprio na
 * primeira vez que a aba abre e fica guardado em disco. Enquanto a IA trabalha, ou se ela falhar,
 * aparece um mapa simples montado do texto (sem IA), com o aviso do que está acontecendo e, se
 * falhou, o botão de tentar de novo **dentro** da mensagem de erro.
 */
export function SummaryMindMap({ documentId, title, content, className }: SummaryMindMapProps) {
  const saved = useMindMap(documentId);
  const generate = useGenerateMindMap();
  const saveMap = useSaveMindMap();
  const deleteMap = useDeleteMindMap();
  const saveImage = useSaveMindMapImage();
  const snackbar = useSnackbar();
  const savedNotice = useSavedNotice();

  // O rascunho da edição (`null` = não está editando) e qual confirmação está aberta.
  const [draft, setDraft] = useState<MindMapDraft | null>(
    () => draftsThisSession.get(documentId) ?? null,
  );
  const [confirm, setConfirm] = useState<'discard' | 'regenerate' | 'delete' | null>(null);

  const missing = saved.isSuccess && saved.data === null;

  useEffect(() => {
    if (
      missing &&
      !requestedThisSession.has(documentId) &&
      !isGenerationDismissed("mind-map", documentId)
    ) {
      requestedThisSession.add(documentId);
      generate.mutate({ id: documentId });
    }
    // `generate` muda a cada render; só a falta do mapa dispara a geração.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing, documentId]);

  const map = useMemo(
    () => (saved.data ? fromAiMap(title, saved.data) : buildMindMap(content, title)),
    [saved.data, title, content],
  );

  const pending = generate.isPending;
  const generateNow = () => {
    allowGeneration("mind-map", documentId);
    generate.mutate({ id: documentId });
  };
  // Mapa editado à mão: gerar de novo apagaria as edições, então pergunta antes.
  const regenerate = () => (saved.data?.edited ? setConfirm('regenerate') : generateNow());

  const editing = draft !== null;
  useErrorAlert(
    generate.isError &&
      !pending &&
      !editing &&
      `Não foi possível gerar com a IA: ${generate.error?.message ?? ''}${saved.data ? ' O mapa anterior continua aqui.' : ' Este é um mapa simples feito do texto.'}`,
    { label: 'Tentar de novo', onClick: regenerate },
  );
  const base = useMemo(() => draftFromMap(map), [map]);
  const dirty = draft ? isDraftDirty(draft, base) : false;
  const problem = draft ? validateDraft(draft) : null;

  const startEditing = () => {
    const next = draftFromMap(map);

    draftsThisSession.set(documentId, next);
    setDraft(next);
  };

  const changeDraft = (next: MindMapDraft) => {
    draftsThisSession.set(documentId, next);
    setDraft(next);
  };

  // Excluir só o mapa: marca a página como "já tentada" e "excluída de propósito" (guardado entre
  // sessões), para a aba não gerar outro sozinha. Só o botão Gerar volta a gerar.
  const deleteNow = () => {
    requestedThisSession.add(documentId);
    deleteMap.mutate(documentId, {
      onSuccess: () => {
        dismissGeneration("mind-map", documentId);
        setConfirm(null);
        snackbar.success('Mapa mental excluído.');
      },
    });
  };

  const closeEditing = () => {
    draftsThisSession.delete(documentId);
    setDraft(null);
  };

  const cancelEditing = () => (dirty ? setConfirm('discard') : closeEditing());

  const saveEditing = async () => {
    if (!draft || problem) {
      return;
    }

    try {
      await saveMap.mutateAsync({ id: documentId, ...toSavePayload(draft) });
      snackbar.success('Mapa salvo.');
      closeEditing();
    } catch (error) {
      snackbar.error(
        error instanceof Error && error.message ? error.message : 'Não foi possível salvar o mapa.',
      );
    }
  };

  if (saved.isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingState message="Carregando o mapa mental" />
      </div>
    );
  }

  const hasMap = Boolean(saved.data);
  const failed = generate.isError && !pending && !editing;

  // Um aviso por vez, com o botão do que fazer dentro dele (o erro e a ação ficam juntos).
  let notice: ReactNode = null;

  if (editing) {
    notice = problem ? (
      <Callout tone="warning" role="status">
        {draftProblemMessages[problem]}
      </Callout>
    ) : null;
  } else if (!hasMap) {
    notice = pending ? (
      <Callout role="status">
        Gerando o mapa de revisão com a IA. Enquanto isso, este é um mapa simples feito do texto.
      </Callout>
    ) : (
      <Callout
        role="note"
        action={
          <GenerateButton pending={pending} onClick={regenerate} primary>
            Gerar com IA
          </GenerateButton>
        }
      >
        Este é um mapa simples feito do texto, sem IA.
      </Callout>
    );
  } else if (saved.data?.stale && !pending) {
    notice = (
      <Callout
        tone="warning"
        role="status"
        action={
          <GenerateButton pending={pending} onClick={regenerate}>
            Atualizar com IA
          </GenerateButton>
        }
      >
        O resumo mudou depois que este mapa foi gerado.
      </Callout>
    );
  }

  // Controles do mapa: editar (ou salvar e cancelar, em edição) e, com mapa da IA e sem aviso, gerar
  // de novo. Só ícones, com tooltip.
  const toolbar = editing ? (
    <>
      <IconButton
        label={saveMap.isPending ? 'Salvando…' : 'Salvar alterações'}
        variant="default"
        disabled={Boolean(problem) || saveMap.isPending}
        aria-busy={saveMap.isPending}
        onClick={() => void saveEditing()}
      >
        {saveMap.isPending ? <HexLoader className="size-4" label="Salvando" /> : <Check />}
      </IconButton>

      <IconButton label="Cancelar edição" disabled={saveMap.isPending} onClick={cancelEditing}>
        <X />
      </IconButton>
    </>
  ) : (
    <>
      <IconButton label="Editar o mapa" disabled={pending} onClick={startEditing}>
        <Pencil />
      </IconButton>

      {hasMap && !notice && (
        <IconButton
          label={pending ? 'Gerando…' : 'Gerar de novo com IA'}
          disabled={pending}
          aria-busy={pending}
          onClick={regenerate}
        >
          {pending ? <HexLoader className="size-4" label="Gerando" /> : <Sparkles />}
        </IconButton>
      )}

      {hasMap && (
        <ActionMenu
          label="Mais ações"
          iconOnly
          variant="outline"
          disabled={pending}
          groups={[
            [
              {
                id: 'delete',
                label: 'Excluir mapa mental',
                icon: Trash2,
                destructive: true,
                onSelect: () => {
                  deleteMap.reset();
                  setConfirm('delete');
                },
              },
            ],
          ]}
        />
      )}
    </>
  );

  return (
    <div className={cn('h-full', className)} aria-live="polite">
      <MindMapView
        map={map}
        notice={notice}
        toolbar={toolbar}
        edit={draft ? { draft, onChange: changeDraft } : undefined}
        overlay={
          pending ? (
            <div aria-hidden="true">
              <LoadingState message="Gerando o mapa de revisão com a IA" />
            </div>
          ) : undefined
        }
        onDownloadImage={async (image) => {
          const result = await saveImage.mutateAsync(image);

          if (result.saved) {
            savedNotice('Imagem do mapa salva.', result.path);
          }
        }}
        onDownloadError={(message) => snackbar.error(message)}
      />

      <DiscardEditsDialog
        open={confirm === 'discard'}
        onOpenChange={(open) => !open && setConfirm(null)}
        description="As mudanças que você fez no mapa e ainda não salvou serão perdidas."
        onConfirm={() => {
          setConfirm(null);
          closeEditing();
        }}
      />

      <DeleteGeneratedDialog
        kind="mind-map"
        open={confirm === 'delete'}
        onOpenChange={(open) => !open && setConfirm(null)}
        isPending={deleteMap.isPending}
        errorMessage={deleteMap.error?.message}
        edited={saved.data?.edited}
        onConfirm={deleteNow}
      />

      <RegenerateEditedDialog
        open={confirm === 'regenerate'}
        onOpenChange={(open) => !open && setConfirm(null)}
        noun="mapa"
        onConfirm={() => {
          setConfirm(null);
          generateNow();
        }}
      />
    </div>
  );
}
