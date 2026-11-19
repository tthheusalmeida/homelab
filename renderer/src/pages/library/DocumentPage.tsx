import { useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";

import { InboxStrings } from "#lib/inbox-text";
import { Button } from "#ui/button";
import { Card, CardContent } from "#ui/card";

import { BackToTopButton } from "#components/BackToTopButton";
import { ConfirmDialog } from "#components/ConfirmDialog";
import { ErrorState } from "#components/ErrorState";
import { LoadingState } from "#components/LoadingState";
import { DocumentBody } from "#components/DocumentBody";
import { ReadingMode } from "#components/ReadingMode";
import { ReadingSection } from "#components/ReadingSection";
import { ReadingSurface } from "#components/ReadingSurface";
import { cn } from "#lib/utils";
import { useSummaryPreferences } from "#hooks/use-appearance";
import { useActiveSection } from "#hooks/use-active-section";
import { extractHeadings } from "#lib/markdown";
import { scrollToId } from "#lib/scroll";
import { parseTimedTranscript } from "#shared/transcript";

import { CategoryBreadcrumb } from "./components/CategoryBreadcrumb";
import { DocumentAboutDialog } from "./components/DocumentAboutDialog";
import { DocumentOutline, OUTLINE_MIN_HEADINGS } from "./components/DocumentOutline";
import { DocumentSidebar } from "./components/DocumentSidebar";
import { EditDocumentDialog } from "./components/EditDocumentDialog";
import { AddToBookDialog } from "./books/components/AddToBookDialog";
import { useArchiveDocument, useDocument } from "./hooks/useLibrary";
import { documentTypeLabels } from "./types/library.types";
import { useSnackbar } from "#components/Snackbar";

type Modal = "about" | "edit" | "remove" | "book" | null;

export function DocumentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Uma janela por vez: Editar e Remover fecham a "Sobre" e devolvem para ela.
  const [modal, setModal] = useState<Modal>(null);
  const [reading, setReading] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [railSlot, setRailSlot] = useState<HTMLElement | null>(null);

  const { data, isLoading, isError } = useDocument(id);
  const archive = useArchiveDocument();
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
  const hasLeftColumn = Boolean(excerpts) || sidebarHeadings.length >= OUTLINE_MIN_HEADINGS;

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

  // As janelas da página (Sobre, Editar, Remover, Adicionar ao livro) valem também no modo leitura.
  const dialogs = (
    <>
      <DocumentAboutDialog
        open={modal === "about"}
        onOpenChange={(open) => setModal(open ? "about" : null)}
        meta={meta}
        onEdit={published ? () => setModal("edit") : undefined}
        onRemove={published ? () => setModal("remove") : undefined}
        onAddToBook={published ? () => setModal("book") : undefined}
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
          onExit={() => setReading(false)}
          follow={
            excerpts ? (
              <div ref={setRailSlot} />
            ) : (
              hasLeftColumn && (
                <DocumentOutline headings={sidebarHeadings} activeId={activeId} />
              )
            )
          }
          options={
            <DocumentSidebar
              embedded
              hideOutline
              headings={sidebarHeadings}
              activeId={activeId}
              onOpenAbout={() => setModal("about")}
              onStartReading={() => undefined}
            />
          }
        >
          <div ref={setContainer} className="reading-column">
            {article}

            <BackToTopButton container={container} />
          </div>
        </ReadingMode>

        {dialogs}
      </>
    );
  }

  return (
    <article className="animate-enter-fade space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft /> Voltar
        </Button>

        <CategoryBreadcrumb category={meta.category} />
      </div>

      <div
        className={cn(
          "grid gap-8",
          hasLeftColumn
            ? "lg:grid-cols-[16rem_minmax(0,1fr)_16rem]"
            : "lg:grid-cols-[minmax(0,1fr)_16rem]",
        )}
      >
        {excerpts ? (
          <div ref={setRailSlot} className="hidden lg:block" />
        ) : (
          hasLeftColumn && (
            <aside
              aria-label="Onde você está"
              className="hidden lg:sticky lg:top-4 lg:block lg:self-start"
            >
              <DocumentOutline headings={sidebarHeadings} activeId={activeId} />
            </aside>
          )
        )}

        <div ref={setContainer} className="min-w-0 space-y-6">
          <ReadingSurface>
            <div className="reading-column">{article}</div>
          </ReadingSurface>

          <BackToTopButton container={container} />
        </div>

        <DocumentSidebar
          headings={sidebarHeadings}
          hideOutline
          activeId={activeId}
          onOpenAbout={() => setModal("about")}
          onStartReading={() => setReading(true)}
        />
      </div>

      {dialogs}
    </article>
  );
}
