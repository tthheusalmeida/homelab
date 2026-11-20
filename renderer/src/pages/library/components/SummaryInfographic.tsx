import { useEffect, useRef, useState } from 'react';

import { Check, Download, ImageOff, LayoutPanelTop, Pencil, Trash2, X } from 'lucide-react';

import { isDraftDirty, pieceAt, toSaveInput, withPiece } from '#lib/infographic-edit';
import { textAt, withText, type TextTarget } from '#lib/infographic-text-edit';
import { captureInfographicPng } from '#lib/infographic-image';
import {
  allowGeneration,
  dismissGeneration,
  isGenerationDismissed,
} from '#lib/dismissed-generation';
import {
  AUTO_LAYOUT,
  infographicImageName,
  LAYOUT_OPTIONS,
  type LayoutChoice,
} from '#lib/infographic';
import { cn } from '#lib/utils';

import { Callout } from '#components/Callout';
import { ConfirmDialog } from '#components/ConfirmDialog';
import { EmptyState } from '#components/EmptyState';
import { GenerateButton } from '#components/GenerateButton';
import { HexLoader } from '#components/Hex';
import { IconButton } from '#components/IconButton';
import { InfographicView } from '#components/InfographicView';
import { LoadingState } from '#components/LoadingState';
import { OptionSelect } from '#components/OptionSelect';
import type { PieceTarget } from '#components/infographic/common';
import { useSnackbar } from '#components/Snackbar';
import type { LibraryInfographic } from '#shared/contracts/library';

import {
  useDeleteInfographic,
  useGenerateInfographic,
  useInfographic,
  useSaveInfographic,
  useSaveMindMapImage,
} from '../hooks/useLibrary';

import { DeleteGeneratedDialog } from './DeleteGeneratedDialog';
import { PiecePickerDialog } from './PiecePickerDialog';
import { TextEditDialog } from './TextEditDialog';

interface SummaryInfographicProps {
  documentId: string;
  title: string;
  className?: string;
}

const DOWNLOAD_FAILED = 'Não foi possível gerar a imagem do infográfico.';

/**
 * Páginas para as quais a IA já foi chamada nesta sessão. Abrir a aba chama a IA **uma vez** por
 * resumo que ainda não tem infográfico (como no mapa mental): se falhar (sem chave, limite de uso,
 * sem internet), reabrir a aba não gasta de novo, e quem decide tentar outra vez é o botão.
 */
const requestedThisSession = new Set<string>();

/**
 * Rascunhos de edição em andamento, por página, nesta sessão. Trocar de aba, entrar no modo leitura
 * ou sair da página no meio da edição não perde as trocas já feitas: ao voltar, a edição continua.
 * Sai daqui ao salvar ou descartar.
 */
const draftsThisSession = new Map<string, LibraryInfographic>();

/**
 * Aba "Infográfico" de um resumo. Como no mapa mental, **na primeira vez que a aba abre e o resumo
 * ainda não tem infográfico, a IA já gera um** (história completa: capa, seções e fechamento). Se já
 * existe um, ele aparece na hora e a IA só roda de novo quando a pessoa clica em Gerar de novo.
 * O resultado fica guardado em disco e volta a abrir sem gastar.
 */
export function SummaryInfographic({ documentId, title, className }: SummaryInfographicProps) {
  const saved = useInfographic(documentId);
  const generate = useGenerateInfographic();
  const deleteInfographic = useDeleteInfographic();
  const saveInfographic = useSaveInfographic();
  const saveImage = useSaveMindMapImage();
  const snackbar = useSnackbar();

  const [choice, setChoice] = useState<LayoutChoice>(AUTO_LAYOUT);
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // O rascunho da edição (`null` = não está editando), o lugar da peça que está sendo trocada e a pergunta aberta.
  const [draft, setDraft] = useState<LibraryInfographic | null>(
    () => draftsThisSession.get(documentId) ?? null,
  );
  const [picking, setPicking] = useState<PieceTarget | null>(null);
  const [typing, setTyping] = useState<TextTarget | null>(null);
  const [confirm, setConfirm] = useState<'discard' | 'regenerate' | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const pending = generate.isPending;
  const data = saved.data ?? null;
  const failed = generate.isError && !pending;

  const generateNow = () => {
    allowGeneration("infographic", documentId);
    generate.mutate({ id: documentId, layout: choice === AUTO_LAYOUT ? undefined : choice });
  };
  // Infográfico editado à mão: gerar de novo apagaria as edições, então pergunta antes.
  const requestGenerate = () => (saved.data?.edited ? setConfirm('regenerate') : generateNow());

  const editing = draft !== null;
  const dirty = draft && data ? isDraftDirty(draft, data) : false;

  const changeDraft = (next: LibraryInfographic) => {
    draftsThisSession.set(documentId, next);
    setDraft(next);
  };

  const startEditing = () => {
    if (data) {
      changeDraft(structuredClone(data));
    }
  };

  const closeEditing = () => {
    draftsThisSession.delete(documentId);
    setDraft(null);
    setPicking(null);
    setTyping(null);
  };

  const cancelEditing = () => (dirty ? setConfirm('discard') : closeEditing());

  const saveEditing = async () => {
    if (!draft) {
      return;
    }

    try {
      await saveInfographic.mutateAsync({ id: documentId, infographic: toSaveInput(draft) });
      snackbar.success('Infográfico salvo.');
      closeEditing();
    } catch (error) {
      snackbar.error(
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível salvar o infográfico.',
      );
    }
  };

  const missing = !saved.isPending && saved.data === null;

  useEffect(() => {
    if (
      missing &&
      !requestedThisSession.has(documentId) &&
      !isGenerationDismissed("infographic", documentId)
    ) {
      requestedThisSession.add(documentId);
      generate.mutate({ id: documentId });
    }
    // `generate` muda a cada render; só a falta do infográfico dispara a geração.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing, documentId]);

  // Excluir só o infográfico: marca a página como "já tentada" e "excluída de propósito" (guardado
  // entre sessões), para a aba não gerar outro sozinha. Só o botão Gerar volta a gerar.
  const deleteNow = () => {
    requestedThisSession.add(documentId);
    deleteInfographic.mutate(documentId, {
      onSuccess: () => {
        dismissGeneration("infographic", documentId);
        setConfirmDelete(false);
        snackbar.success('Infográfico excluído.');
      },
    });
  };

  const download = async (transparent: boolean) => {
    const element = stage.current;

    if (!element || exporting) {
      return;
    }

    setExporting(true);

    try {
      const dataBase64 = await captureInfographicPng(element, transparent);
      const result = await saveImage.mutateAsync({
        fileName: infographicImageName(title, transparent),
        dataBase64,
      });

      if (result.saved) {
        snackbar.success('Imagem do infográfico salva.');
      }
    } catch (error) {
      snackbar.error(error instanceof Error && error.message ? error.message : DOWNLOAD_FAILED);
    } finally {
      setExporting(false);
    }
  };

  if (saved.isPending) {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <LoadingState message="Carregando o infográfico" />
      </div>
    );
  }

  let notice = null;

  if (editing) {
    notice = (
      <Callout role="note">
        Clique em uma peça para trocá-la ou em um texto para editá-lo. As mudanças só valem depois
        de salvar.
      </Callout>
    );
  } else if (failed) {
    notice = (
      <Callout
        tone="danger"
        role="alert"
        action={
          <GenerateButton pending={pending} onClick={requestGenerate} primary>
            Tentar de novo
          </GenerateButton>
        }
      >
        {`Não foi possível gerar com a IA: ${generate.error?.message ?? ''}`}
        {data ? ' O infográfico anterior continua aqui.' : ''}
      </Callout>
    );
  } else if (data?.stale && !pending) {
    notice = (
      <Callout
        tone="warning"
        role="status"
        action={
          <GenerateButton pending={pending} onClick={requestGenerate}>
            Atualizar com IA
          </GenerateButton>
        }
      >
        O resumo mudou depois que este infográfico foi gerado.
      </Callout>
    );
  }

  return (
    <div className={cn('space-y-4', className)} aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!editing && (
            <OptionSelect
              label="Estrutura do infográfico"
              value={choice}
              options={LAYOUT_OPTIONS}
              placeholder="Modelo"
              triggerWidth="w-44"
              contentWidth="w-56"
              disabled={pending}
              onValueChange={(value) => value && setChoice(value as LayoutChoice)}
            />
          )}

          {data && !notice && !editing && (
            <GenerateButton pending={pending} onClick={requestGenerate}>
              Gerar de novo
            </GenerateButton>
          )}
        </div>

        {data && editing && (
          <div className="flex items-center gap-2">
            <IconButton
              label={saveInfographic.isPending ? 'Salvando…' : 'Salvar alterações'}
              variant="default"
              disabled={!dirty || saveInfographic.isPending}
              aria-busy={saveInfographic.isPending}
              onClick={() => void saveEditing()}
            >
              {saveInfographic.isPending ? (
                <HexLoader className="size-4" label="Salvando" />
              ) : (
                <Check />
              )}
            </IconButton>

            <IconButton
              label="Cancelar edição"
              disabled={saveInfographic.isPending}
              onClick={cancelEditing}
            >
              <X />
            </IconButton>
          </div>
        )}

        {data && !editing && (
          <div className="flex items-center gap-2">
            {data.edited && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-brand-text">
                Editado
              </span>
            )}

            <span className="font-mono text-xs text-muted-foreground">
              {data.sections.length === 1 ? '1 seção' : `${data.sections.length} seções`}
            </span>

            <IconButton label="Editar as peças" disabled={pending} onClick={startEditing}>
              <Pencil />
            </IconButton>

            <IconButton
              label={exporting ? 'Gerando imagem…' : 'Baixar o infográfico como PNG com fundo'}
              disabled={exporting || pending}
              aria-busy={exporting}
              onClick={() => void download(false)}
            >
              {exporting ? <HexLoader className="size-4" label="Gerando imagem" /> : <Download />}
            </IconButton>

            <IconButton
              label={
                exporting
                  ? 'Gerando imagem…'
                  : 'Baixar o infográfico como PNG sem fundo (transparente)'
              }
              disabled={exporting || pending}
              onClick={() => void download(true)}
            >
              <ImageOff />
            </IconButton>

            <IconButton
              label="Excluir só o infográfico"
              disabled={exporting || pending}
              onClick={() => {
                deleteInfographic.reset();
                setConfirmDelete(true);
              }}
            >
              <Trash2 />
            </IconButton>
          </div>
        )}
      </div>

      {notice}

      {data ? (
        <div className={cn('transition-opacity', pending && 'opacity-50')}>
          <InfographicView
            ref={stage}
            data={draft ?? data}
            onPickPiece={draft ? setPicking : undefined}
            onPickText={draft ? setTyping : undefined}
          />
        </div>
      ) : pending ? (
        <div className="flex min-h-60 items-center justify-center rounded-xl border border-dashed">
          <LoadingState message="Montando o infográfico com a IA" />
        </div>
      ) : (
        <EmptyState
          icon={LayoutPanelTop}
          title="Este resumo ainda não tem infográfico"
          description="A IA conta a história do resumo em seções, cada uma no modelo que melhor a mostra, com os textos tirados do resumo e as peças ilustradas do HomeLab."
          action={
            <GenerateButton pending={pending} onClick={generateNow} primary>
              Gerar infográfico
            </GenerateButton>
          }
        />
      )}

      <PiecePickerDialog
        open={picking !== null && draft !== null}
        onOpenChange={(open) => !open && setPicking(null)}
        currentKey={draft && picking ? pieceAt(draft, picking) : ''}
        onPick={(key) => {
          if (draft && picking) {
            changeDraft(withPiece(draft, picking, key));
          }

          setPicking(null);
        }}
      />

      {draft && typing && (
        <TextEditDialog
          key={JSON.stringify(typing)}
          open
          onOpenChange={(open) => !open && setTyping(null)}
          kind={typing.kind}
          value={textAt(draft, typing)}
          onSave={(value) => {
            changeDraft(withText(draft, typing, value));
            setTyping(null);
          }}
        />
      )}

      <ConfirmDialog
        open={confirm === 'discard'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Descartar as alterações?"
        description="As peças e os textos que você mudou e ainda não salvou voltam como estavam."
        confirmLabel="Descartar alterações"
        destructive
        onConfirm={() => {
          setConfirm(null);
          closeEditing();
        }}
      />

      <ConfirmDialog
        open={confirm === 'regenerate'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Gerar de novo e perder as suas edições?"
        description="Você editou este infográfico à mão. Gerar de novo com a IA cria um infográfico novo a partir do resumo e apaga as suas edições. Não há como desfazer."
        confirmLabel="Gerar de novo"
        destructive
        onConfirm={() => {
          setConfirm(null);
          generateNow();
        }}
      />

      <DeleteGeneratedDialog
        kind="infographic"
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        isPending={deleteInfographic.isPending}
        errorMessage={deleteInfographic.error?.message}
        onConfirm={deleteNow}
      />
    </div>
  );
}
