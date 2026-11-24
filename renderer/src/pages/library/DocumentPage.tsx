import { useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router";
import { ArrowLeft, FileText, LayoutPanelTop, Network } from "lucide-react";

import { InboxStrings } from "#lib/inbox-text";
import { Button } from "#ui/button";

import { BackToTopButton } from "#components/BackToTopButton";
import { FindBar } from "#components/FindBar";
import { useFind } from "#hooks/use-find";
import { AiInUse } from "#components/AiInUse";
import { ConfirmDialog } from "#components/ConfirmDialog";
import { OptionToggle, type ToggleOption } from "#components/OptionToggle";
import { DocumentBody } from "#components/DocumentBody";
import { ReadingMode } from "#components/ReadingMode";
import { ReadingSection } from "#components/ReadingSection";
import { ReadingSurface } from "#components/ReadingSurface";
import { cn } from "#lib/utils";
import { useReadingPreferences } from "#hooks/use-appearance";
import { useCtrlWheelZoom } from "#hooks/use-ctrl-wheel-zoom";
import { stepZoom } from "#lib/reading";
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
import { InfographicMeta } from "./components/InfographicMeta";
import { SummaryInfographic } from "./components/SummaryInfographic";
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
import { PageLoading, PageError } from "#components/PageState";

type Modal = "about" | "edit" | "remove" | "book" | "delete" | null;

/** Formas de ver o mesmo resumo: o texto, o mapa mental ou o infográfico feitos a partir dele. */
type SummaryView = "text" | "mindmap" | "infographic";

const SUMMARY_VIEWS: readonly ToggleOption<SummaryView>[] = [
  { id: "text", label: "Resumo", icon: FileText },
  { id: "mindmap", label: "Mapa mental", icon: Network },
  { id: "infographic", label: "Infográfico", icon: LayoutPanelTop },
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

  // Coluna da esquerda: a barra de trechos (transcrição com tempo) ou o Sumário, se houver.
  const mindMapOpen = view === "mindmap" && data?.meta.type === "summary";
  const infographicOpen = view === "infographic" && data?.meta.type === "summary";
  // Mapa e infográfico trocam o sumário e as opções de leitura (ajustes do texto) pela própria tela.
  const alternateView = mindMapOpen || infographicOpen;
  const hasLeftColumn =
    !alternateView &&
    (Boolean(excerpts) || headings.length >= OUTLINE_MIN_HEADINGS);
  const sides = useReadingSides(hasLeftColumn);

  // Ctrl + roda do mouse muda o zoom da leitura (o mesmo do painel "Leitura"). Mapa mental e infográfico
  // têm o seu próprio zoom, então aqui só vale no texto.
  const { reading: readingPrefs, updateReading } = useReadingPreferences();
  useCtrlWheelZoom(
    (direction) =>
      void updateReading?.({ zoom: stepZoom(readingPrefs.zoom, direction) }).catch(() => undefined),
    !alternateView,
  );

  // Título em leitura agora (destacado no sumário).
  const activeId = useActiveSection(headings.map((heading) => heading.id));

  // Ctrl+F: busca no texto da página (só onde há texto: não vale no mapa mental nem no infográfico).
  const find = useFind(container, data?.content);
  const findBar =
    find.open && !alternateView ? (
      <FindBar
        {...find.barProps}
        results={find.results}
        onClose={find.close}
      />
    ) : undefined;

  if (isLoading) {
    return (
      <PageLoading />
    );
  }

  if (isError || !data) {
    return (
      <PageError
        primaryMessage="Oops! não foi possível abrir a página."
        secondaryMessage="Ela pode ter sido removida ou o servidor está indisponível."
        actionLabel="Voltar à biblioteca"
        action={() => navigate("/library")}
      />
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

  // As janelas da página (Sobre, Editar, Remover, Excluir, Adicionar ao livro) e a busca flutuante
  // (Ctrl+F) valem também no modo leitura.
  const dialogs = (
    <>
      {findBar}

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

  // A IA em uso (mapa mental e infográfico): sempre ao lado do seletor acima, na página e no modo
  // leitura, então fica no mesmo lugar nas duas telas e não cobre nada do conteúdo.
  const aiInUse = alternateView ? <AiInUse collapsible /> : undefined;

  // Seções e "Editado" do infográfico: junto das ações (e na barra do modo leitura), não dentro dele,
  // para o infográfico começar no mesmo ponto do Resumo e do Mapa mental.
  const infographicMeta = infographicOpen ? <InfographicMeta documentId={meta.id} /> : undefined;

  // O mapa mental ocupa toda a área (na página e no modo leitura), com os controles numa barra embaixo.
  const mindMap = (
    <SummaryMindMap
      key={meta.id}
      documentId={meta.id}
      title={meta.title}
      content={content}
    />
  );

  // O infográfico não precisa da tela toda (diferente do mapa mental): fica numa coluna centralizada,
  // no fluxo da página, e rola com ela (na leitura, dentro da própria área).
  const infographic = (
    <SummaryInfographic key={meta.id} documentId={meta.id} title={meta.title} />
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
          actionsExtra={
            <>
              {aiInUse}

              {infographicMeta}
            </>
          }
          // Mapa mental: tela cheia, sem sumário nem opções (elas são ajustes de leitura de texto,
          // e mexer nelas ao alternar entre Resumo e Mapa mental seria mudar a leitura sem querer).
          canvas={alternateView}
          onExit={() => setReading(false)}
          follow={
            alternateView ? undefined : excerpts ? (
              <div ref={setRailSlot} />
            ) : (
              hasLeftColumn && (
                <DocumentOutline headings={headings} activeId={activeId} />
              )
            )
          }
          options={
            alternateView ? undefined : (
              <DocumentSidebar
                embedded
                hideOutline
                headings={headings}
                activeId={activeId}
                onOpenAbout={() => setModal("about")}
              />
            )
          }
        >
          {mindMapOpen ? (
            mindMap
          ) : infographicOpen ? (
            <div className="h-full overflow-y-auto">
              {/* O respiro fica aqui dentro: padding na área que rola desloca a barra flutuante (sticky). */}
              <div className="p-4">{infographic}</div>
            </div>
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
          <div className="flex flex-wrap items-center gap-2">
            {viewToggle}

            {aiInUse}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {infographicMeta}

            {actions}
          </div>
        </div>
      )}

      {mindMapOpen ? (
        // Mapa mental: ocupa toda a área da página, sem o sumário nem as opções de leitura (são
        // ajustes de leitura de texto).
        <div className="h-[calc(100svh-13rem+9px)] min-h-96 animate-enter-fade overflow-hidden rounded-lg border">
          {mindMap}
        </div>
      ) : infographicOpen ? (
        <div className="w-full animate-enter-fade">{infographic}</div>
      ) : (
        <div className={cn("grid gap-8", sides.columns)}>
          {excerpts ? (
            <div
              ref={setRailSlot}
              className={cn("hidden md:block", sides.followOrder)}
            />
          ) : (
            hasLeftColumn && (
              <aside
                aria-label="Onde você está"
                className={cn(
                  "hidden md:sticky md:top-4 md:block md:self-start",
                  sides.followOrder,
                )}
              >
                <DocumentOutline headings={headings} activeId={activeId} />
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
              headings={headings}
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
