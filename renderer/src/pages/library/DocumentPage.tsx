import { useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router";
import { ArrowLeft, FileText, Network } from "lucide-react";

import { InboxStrings } from "#lib/inbox-text";
import { Button } from "#ui/button";
import { Card, CardContent } from "#ui/card";

import { BackToTopButton } from "#components/BackToTopButton";
import { ConfirmDialog } from "#components/ConfirmDialog";
import { ErrorState } from "#components/ErrorState";
import { LoadingState } from "#components/LoadingState";
import { OptionToggle, type ToggleOption } from "#components/OptionToggle";
import { DocumentBody } from "#components/DocumentBody";
import { ReadingMode } from "#components/ReadingMode";
import { ReadingSection } from "#components/ReadingSection";
import { ReadingSurface } from "#components/ReadingSurface";
import { cn } from "#lib/utils";
import { useSummaryPreferences } from "#hooks/use-appearance";
import { useActiveSection } from "#hooks/use-active-section";
import { useReadingSides } from "#hooks/use-reading-sides";
import { extractHeadings } from "#lib/markdown";
import { scrollToId } from "#lib/scroll";
import { parseTimedTranscript } from "#shared/transcript";

import { CategoryBreadcrumb } from "./components/CategoryBreadcrumb";
import { DeleteDocumentDialog, deletedMessage } from "./components/DeleteDocumentDialog";
import { DocumentActions } from "./components/DocumentActions";
import { DocumentAboutDialog } from "./components/DocumentAboutDialog";
import { DocumentOutline, OUTLINE_MIN_HEADINGS } from "./components/DocumentOutline";
import { DocumentSidebar } from "./components/DocumentSidebar";
import { SummaryMindMap } from "./components/SummaryMindMap";
import { EditDocumentDialog } from "./components/EditDocumentDialog";
import { AddToBookDialog } from "./books/components/AddToBookDialog";
import {
  useArchiveDocument,
  useDiscardDocument,
  useDocument,
} from "./hooks/useLibrary";
import { documentTypeLabels } from "./types/library.types";
import { useSnackbar } from "#components/Snackbar";

type Modal = "about" | "edit" | "remove" | "book" | "delete" | null;

/** Formas de ver o mesmo resumo: o texto ou o mapa mental feito a partir dele. */
type SummaryView = "text" | "mindmap";

const SUMMARY_VIEWS: readonly ToggleOption<SummaryView>[] = [
  { id: "text", label: "Resumo", icon: FileText },
  { id: "mindmap", label: "Mapa mental", icon: Network },
];

export function DocumentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Uma janela por vez: Editar e Remover fecham a "Sobre" e devolvem para ela.
  const [modal, setModal] = useState<Modal>(null);
  const [reading, setReading] = useState(false);
  const [view, setView] = useState<SummaryView>("text");
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [railSlot, setRailSlot] = useState<HTMLElement | null>(null);

  const { data, isLoading, isError } = useDocument(id);
  const archive = useArchiveDocument();
  const discard = useDiscardDocument();
  const snackbar = useSnackbar();

  const headings = useMemo(
    () => extractHeadings(data?.content ?? ""),
    [data?.content],
  );

  // Transcrição com tempo (`[HH:MM:SS] texto`): ganha a barra lateral e o link do horário.
  // As antigas, sem tempo, continuam como texto corrido.
  const excerpts = useMemo(
    () =>
      data?.meta.type === "transcription"
        ? parseTimedTranscript(data.content)
        : null,
    [data],
  );

  // Resumos podem esconder o sumário do painel (Configurações > Aparência > Resumo).
  const summary = useSummaryPreferences();
  const sidebarHeadings =
    data?.meta.type === "summary" && !summary.outline ? [] : headings;

  // Coluna da esquerda: a barra de trechos (transcrição com tempo) ou o Sumário, se houver.
  const mindMapOpen = view === "mindmap" && data?.meta.type === "summary";
  const hasLeftColumn =
    !mindMapOpen &&
    (Boolean(excerpts) || sidebarHeadings.length >= OUTLINE_MIN_HEADINGS);
  const sides = useReadingSides(hasLeftColumn);

  // Título em leitura agora (destacado no sumário).
  const activeId = useActiveSection(headings.map((heading) => heading.id));

  if (isLoading) {
    return (
      <div className="flex min-h-[80dvh] items-center justify-center">
        <LoadingState message="Carregando" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <ErrorState
            primaryMessage="Oops! não foi possível abrir a página."
            secondaryMessage="Ela pode ter sido removida ou o servidor está indisponível."
            actionLabel="Voltar à biblioteca"
            action={() => navigate("/library")}
          />
        </CardContent>
      </Card>
    );
  }

  const { meta, content } = data;

  const published = meta.status === "published";

  function handleArchive() {
    archive.mutate(meta.id, {
      onSuccess: () => {
        snackbar.success("Página arquivada");
        navigate("/library", { state: { category: meta.category } });
      },
      onError: (error) => snackbar.error(error.message),
    });
  }

  function handleDelete() {
    discard.mutate(meta.id, {
      onSuccess: () => {
        snackbar.success(deletedMessage(meta.type));
        navigate("/library");
      },
    });
  }

  // As janelas da página (Sobre, Editar, Remover, Excluir, Adicionar ao livro) valem também no modo leitura.
  const dialogs = (
    <>
      <DocumentAboutDialog
        open={modal === "about"}
        onOpenChange={(open) => setModal(open ? "about" : null)}
        meta={meta}
        onEdit={published ? () => setModal("edit") : undefined}
        onRemove={published ? () => setModal("remove") : undefined}
        onAddToBook={published ? () => setModal("book") : undefined}
        onDelete={() => setModal("delete")}
      />

      <DeleteDocumentDialog
        open={modal === "delete"}
        onOpenChange={(open) => {
          if (!open) {
            discard.reset();
          }

          setModal(open ? "delete" : "about");
        }}
        meta={meta}
        isPending={discard.isPending}
        errorMessage={
          discard.isError ? "Não foi possível excluir. Tente novamente." : undefined
        }
        onConfirm={handleDelete}
      />

      <AddToBookDialog
        open={modal === "book"}
        onOpenChange={(open) => setModal(open ? "book" : "about")}
        documentId={meta.id}
      />

      <EditDocumentDialog
        open={modal === "edit"}
        onOpenChange={(open) => setModal(open ? "edit" : "about")}
        document={data}
      />

      <ConfirmDialog
        open={modal === "remove"}
        onOpenChange={(open) => setModal(open ? "remove" : "about")}
        title="Remover da biblioteca?"
        description={`A página deixa de aparecer na biblioteca, mas o arquivo é mantido e pode ser readicionado ${InboxStrings.via}.`}
        confirmLabel="Remover"
        destructive
        isPending={archive.isPending}
        errorMessage={
          archive.isError
            ? "Não foi possível remover. Tente novamente."
            : undefined
        }
        onConfirm={handleArchive}
      />
    </>
  );

  // Resumo ou Mapa mental: a mesma escolha na página e no modo leitura (a que estiver aberta se mantém).
  const viewToggle =
    meta.type === "summary" ? (
      <OptionToggle
        label="Forma de ver o resumo"
        value={view}
        options={SUMMARY_VIEWS}
        onChange={setView}
        showLabels
      />
    ) : undefined;

  // O mapa mental ocupa toda a área (na página e no modo leitura), com os controles numa barra embaixo.
  const mindMap = (
    <SummaryMindMap
      key={meta.id}
      documentId={meta.id}
      title={meta.title}
      content={content}
    />
  );

  // O mesmo desenho na página e no modo leitura (só muda o que cerca o texto).
  const article = (
    <ReadingSection
      label={documentTypeLabels[meta.type]}
      title={meta.title}
    >
      <DocumentBody
        content={content}
        isTranscription={meta.type === "transcription"}
        sourceUrl={meta.sourceUrl}
        railSlot={railSlot}
      />
    </ReadingSection>
  );

  if (reading) {
    return (
      <>
        <ReadingMode
          title={meta.title}
          actions={viewToggle}
          // Mapa mental: tela cheia, sem sumário nem opções (elas são ajustes de leitura de texto,
          // e mexer nelas ao alternar entre Resumo e Mapa mental seria mudar a leitura sem querer).
          canvas={mindMapOpen}
          onExit={() => setReading(false)}
          follow={
            mindMapOpen ? undefined : excerpts ? (
              <div ref={setRailSlot} />
            ) : (
              hasLeftColumn && (
                <DocumentOutline headings={sidebarHeadings} activeId={activeId} />
              )
            )
          }
          options={
            mindMapOpen ? undefined : (
              <DocumentSidebar
                embedded
                hideOutline
                headings={sidebarHeadings}
                activeId={activeId}
                onOpenAbout={() => setModal("about")}
              />
            )
          }
        >
          {mindMapOpen ? (
            mindMap
          ) : (
            <div ref={setContainer} className="reading-column">
              {article}

              <BackToTopButton container={container} />
            </div>
          )}
        </ReadingMode>

        {dialogs}
      </>
    );
  }

  // Modo leitura e Sobre a página ficam na linha de cima, em todo tipo de página (com abas, ao lado
  // delas; sem abas, na linha do "Voltar"). O painel lateral fica só com os ajustes de leitura.
  const actions = (
    <DocumentActions
      onStartReading={() => setReading(true)}
      onOpenAbout={() => setModal("about")}
    />
  );

  return (
    <article className="animate-enter-fade space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft /> Voltar
        </Button>

        <CategoryBreadcrumb category={meta.category} />

        {!viewToggle && <div className="ml-auto">{actions}</div>}
      </div>

      {viewToggle && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {viewToggle}

          {actions}
        </div>
      )}

      {mindMapOpen ? (
        // Mapa mental: ocupa toda a área da página, sem o sumário nem as opções de leitura (são
        // ajustes de leitura de texto).
        <div className="h-[calc(100svh-13rem)] min-h-96 animate-enter-fade overflow-hidden rounded-lg border">
          {mindMap}
        </div>
      ) : (
        <div className={cn("grid gap-8", sides.columns)}>
          {excerpts ? (
            <div
              ref={setRailSlot}
              className={cn("hidden lg:block", sides.followOrder)}
            />
          ) : (
            hasLeftColumn && (
              <aside
                aria-label="Onde você está"
                className={cn(
                  "hidden lg:sticky lg:top-4 lg:block lg:self-start",
                  sides.followOrder,
                )}
              >
                <DocumentOutline headings={sidebarHeadings} activeId={activeId} />
              </aside>
            )
          )}

          <div
            ref={setContainer}
            className={cn("min-w-0 space-y-6", sides.textOrder)}
          >
            <ReadingSurface>
              <div className="reading-column">{article}</div>
            </ReadingSurface>

            <BackToTopButton container={container} />
          </div>

          <div className={cn("min-w-0", sides.optionsOrder)}>
            <DocumentSidebar
              headings={sidebarHeadings}
              hideOutline
              activeId={activeId}
            />
          </div>
        </div>
      )}

      {dialogs}
    </article>
  );
}
