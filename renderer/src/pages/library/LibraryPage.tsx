import { useMemo, useState } from "react";

import { Link, useLocation, useNavigate } from "react-router";
import { Inbox, SearchX, Library as LibraryIcon, Undo2 } from "lucide-react";

import { InboxStrings } from "#lib/inbox-text";
import { Button, buttonVariants } from "#ui/button";

import { ConfirmDialog } from "#components/ConfirmDialog";
import { EmptyState } from "#components/EmptyState";
import { useSnackbar } from "#components/Snackbar";
import { OptionSelect } from "#components/OptionSelect";
import { SearchInput } from "#components/SearchInput";
import { useDebouncedValue } from "#hooks/use-debounced-value";
import { useStoredState } from "#hooks/use-stored-state";

import { CategoryCreateDialog } from "./components/CategoryCreateDialog";
import {
  CategoryEditDialog,
  CategoryEditStrings,
} from "./components/CategoryEditDialog";
import { CategoryTree, type TreePage } from "./components/CategoryTree";
import { DocumentCard } from "./components/DocumentCard";
import { DraggableItem } from "./components/DraggableItem";
import { TagFilter } from "./components/TagFilter";
import { ViewToggle, viewModes, type ViewMode } from "./components/ViewToggle";
import { useCustomOrder } from "./hooks/useCustomOrder";
import { applyCustomOrder, moveInOrder } from "./customOrder";
import {
  useCategories,
  useDocuments,
  useDeleteCategory,
  useRenameCategory,
  useTags,
  useUpdateDocument,
} from "./hooks/useLibrary";
import {
  findCategory,
  followRenamedCategory,
  startsWithPath,
} from "./categories";
import {
  contentFilterLabels,
  contentFilterToHas,
  documentSourceLabels,
  documentTypeLabels,
  sortLabels,
  type ContentFilter,
  type DocumentSource,
  type DocumentType,
  type CategoryNode,
  type SortOption,
} from "./types/library.types";
import { PageHeader } from "#components/PageHeader";
import { PageLoading, PageError } from "#components/PageState";

const ALL = "all";

const toOptions = (labels: Record<string, string>, allLabel: string) => [
  { id: ALL, label: allLabel },
  ...Object.entries(labels).map(([id, label]) => ({ id, label })),
];

/** Lê `{ category: string[] }` do estado de navegação; ignora qualquer outra forma. */
export function initialCategory(state: unknown): string[] {
  const value = (state as { category?: unknown } | null)?.category;

  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

export function LibraryPage() {
  const [search, setSearch] = useState("");
  // Ao voltar de um documento removido, abre já na categoria dele.
  const location = useLocation();
  const [category, setCategory] = useState<string[]>(() =>
    initialCategory(location.state),
  );
  const [type, setType] = useState<DocumentType>();
  const [source, setSource] = useState<DocumentSource>();
  const [content, setContent] = useState<ContentFilter>();
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("title");
  // A categoria que está sendo editada (lápis ao lado dela na árvore).
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  // Onde uma categoria nova está sendo criada (`[]` = nível principal; `null` = ninguém está criando).
  const [creating, setCreating] = useState<string[] | null>(null);
  const [view, setView] = useStoredState<ViewMode>(
    "library:view",
    "grid",
    viewModes,
  );

  // Ordem personalizada (arrastar): vale até a pessoa voltar à ordem automática ou escolher um "Ordenar por".
  const [customOrder, setCustomOrder] = useCustomOrder("library:order");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Página sob o cursor durante o arrastar: ganha um destaque; a troca só acontece ao soltar.
  const [overId, setOverId] = useState<string | null>(null);

  const q = useDebouncedValue(search);

  // Todas as páginas publicadas, para mostrar na árvore (sem os filtros da lista ao lado). Vem antes
  // da lista para não mudar a ordem das consultas.
  const treePages = useDocuments({ sort: "title" });
  const documents = useDocuments({
    q,
    category,
    type,
    source,
    tags,
    has: contentFilterToHas(content),
    sort,
  });
  const categories = useCategories();
  const renameCategory = useRenameCategory();
  const updatePage = useUpdateDocument();
  const navigate = useNavigate();
  const removeCategory = useDeleteCategory();
  // A categoria vazia que está para ser excluída (a lixeira da árvore pede confirmação antes).
  const [deleting, setDeleting] = useState<CategoryNode | null>(null);
  const moving =
    renameCategory.isPending || updatePage.isPending || removeCategory.isPending;

  function deleteNow() {
    if (!deleting) {
      return;
    }

    const { path } = deleting;

    removeCategory.mutate(path, {
      onSuccess: () => {
        snackbar.success(CategoryEditStrings.deleted);
        setCategory((current) => (startsWithPath(current, path) ? [] : current));
        setDeleting(null);
      },
    });
  }
  const snackbar = useSnackbar();
  // Mover arrastando para uma categoria que já tem uma com esse nome pergunta antes de juntar.
  const [joining, setJoining] = useState<{
    node: CategoryNode;
    parent: string[];
  } | null>(null);

  function runMove(node: CategoryNode, parent: string[]) {
    const to = [...parent, node.name];

    renameCategory.mutate(
      { from: node.path, to },
      {
        onSuccess: ({ moved }) => {
          snackbar.success(CategoryEditStrings.done(moved));
          setCategory((current) => followRenamedCategory(current, node.path, to));
          setJoining(null);
        },
        onError: (error) => {
          // a janela de "juntar" mostra o erro; o arrastar direto avisa por aqui
          if (!joining) {
            snackbar.error(error.message || CategoryEditStrings.failed);
          }
        },
      },
    );
  }

  // Arrastar uma página para uma categoria: troca a categoria dela (o arquivo vai para a pasta).
  function movePage(page: TreePage, parent: string[]) {
    updatePage.mutate(
      { id: page.id, input: { category: parent } },
      {
        onSuccess: () =>
          snackbar.success(
            `“${page.title}” movida para ${parent.join(" › ")}.`,
          ),
        onError: (error) =>
          snackbar.error(error.message || "Não foi possível mover a página."),
      },
    );
  }

  function moveCategory(node: CategoryNode, parent: string[]) {
    if (findCategory(categories.data ?? [], [...parent, node.name])) {
      renameCategory.reset();
      setJoining({ node, parent });
    } else {
      runMove(node, parent);
    }
  }
  const tagList = useTags();

  const shown = useMemo(
    () =>
      customOrder && documents.data
        ? applyCustomOrder(documents.data, customOrder)
        : (documents.data ?? []),
    [documents.data, customOrder],
  );

  function finishDrag(dropOnId: string | null) {
    if (draggingId && dropOnId && dropOnId !== draggingId) {
      setCustomOrder(
        moveInOrder(
          shown.map((item) => item.id),
          customOrder ?? [],
          draggingId,
          dropOnId,
        ),
      );
    }

    setOverId(null);
    setDraggingId(null);
  }

  // Só a categoria escolhida filtra: se ela está sem páginas, a tela explica em vez de dizer "nenhum resultado".
  const onlyCategory =
    category.length > 0 &&
    q.trim() === "" &&
    type === undefined &&
    source === undefined &&
    content === undefined &&
    tags.length === 0;

  const hasFilters =
    q.trim() !== "" ||
    category.length > 0 ||
    type !== undefined ||
    source !== undefined ||
    content !== undefined ||
    tags.length > 0;

  function clearFilters() {
    setSearch("");
    setCategory([]);
    setType(undefined);
    setSource(undefined);
    setContent(undefined);
    setTags([]);
  }

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((own) => own !== tag)
        : [...current, tag],
    );
  }

  if (documents.isLoading) {
    return (
      <PageLoading />
    );
  }

  if (documents.isError || !documents.data) {
    return (
      <PageError
        primaryMessage="Oops! houve uma falha ao carregar a biblioteca."
        secondaryMessage="Tente novamente mais tarde."
        action={() => void documents.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Páginas"
        command="library --pages"
        description="Seus conhecimentos organizados por tema. Pesquise por título, tags, categorias ou pelo texto das páginas."
        toolbar={
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Pesquisar na biblioteca..."
            className="w-full sm:w-64"
          />

          <OptionSelect
            value={type ?? ALL}
            active={type !== undefined}
            options={toOptions(documentTypeLabels, "Todos os tipos")}
            placeholder="Tipo"
            label="Tipo"
            triggerWidth="w-40"
            contentWidth="w-44"
            onValueChange={(value) =>
              setType(
                !value || value === ALL ? undefined : (value as DocumentType),
              )
            }
          />

          <OptionSelect
            value={source ?? ALL}
            active={source !== undefined}
            options={toOptions(documentSourceLabels, "Todas as origens")}
            placeholder="Origem"
            label="Origem"
            triggerWidth="w-44"
            contentWidth="w-48"
            onValueChange={(value) =>
              setSource(
                !value || value === ALL ? undefined : (value as DocumentSource),
              )
            }
          />

          <OptionSelect
            value={content ?? ALL}
            active={content !== undefined}
            options={toOptions(contentFilterLabels, "Todo o conteúdo")}
            placeholder="Conteúdo"
            label="Conteúdo gerado"
            triggerWidth="w-52"
            contentWidth="w-60"
            onValueChange={(value) =>
              setContent(
                !value || value === ALL ? undefined : (value as ContentFilter),
              )
            }
          />

          <OptionSelect
            value={sort}
            options={Object.entries(sortLabels).map(([id, label]) => ({
              id,
              label,
            }))}
            placeholder="Ordenar"
            label="Ordenar por"
            triggerWidth="w-40"
            contentWidth="w-44"
            onValueChange={(value) => {
              setSort((value as SortOption) ?? "title");
              setCustomOrder(null);
            }}
          />

          {customOrder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomOrder(null)}
            >
              <Undo2 /> Voltar à ordem automática
            </Button>
          )}

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}

          <div className="ml-auto">
            <ViewToggle value={view} onChange={setView} />
          </div>
        </div>

        {(tagList.data?.length ?? 0) > 0 && (
          <TagFilter
            tags={tagList.data!}
            selected={tags}
            onToggle={toggleTag}
          />
        )}
      </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside>
          <CategoryTree
            nodes={categories.data ?? []}
            selected={category}
            onSelect={setCategory}
            onEdit={setEditing}
            onCreate={setCreating}
            onDelete={(node) => {
              removeCategory.reset();
              setDeleting(node);
            }}
            pages={treePages.data}
            onOpenPage={(page) => navigate(`/library/${page.id}`)}
            onMove={moveCategory}
            onMovePage={movePage}
            disabled={moving}
            persistKey="library:categories:open"
          />
        </aside>

        <ConfirmDialog
          open={deleting !== null}
          onOpenChange={(open) => !open && !removeCategory.isPending && setDeleting(null)}
          title={CategoryEditStrings.deleteTitle}
          description={
            deleting
              ? CategoryEditStrings.deleteDescription(
                  deleting.name,
                  deleting.children.length > 0,
                )
              : ""
          }
          confirmLabel={
            removeCategory.isPending ? CategoryEditStrings.deleting : CategoryEditStrings.delete
          }
          destructive
          isPending={removeCategory.isPending}
          errorMessage={
            removeCategory.isError
              ? removeCategory.error.message || CategoryEditStrings.deleteFailed
              : undefined
          }
          onConfirm={deleteNow}
        />

        <ConfirmDialog
          open={joining !== null}
          onOpenChange={(open) => !open && !renameCategory.isPending && setJoining(null)}
          title="Juntar as categorias?"
          description={
            joining
              ? `Já existe “${joining.node.name}” ${joining.parent.length > 0 ? `dentro de “${joining.parent.join(" › ")}”` : "no nível principal"}. As ${joining.node.count === 1 ? "1 página" : `${joining.node.count} páginas`} de “${joining.node.name}” vão se juntar a ela.`
              : ""
          }
          confirmLabel="Juntar"
          isPending={renameCategory.isPending}
          errorMessage={renameCategory.isError ? renameCategory.error.message : undefined}
          onConfirm={() => joining && runMove(joining.node, joining.parent)}
        />

        <CategoryCreateDialog
          parent={creating}
          tree={categories.data ?? []}
          onOpenChange={(open) => !open && setCreating(null)}
          onCreated={setCategory}
        />

        <CategoryEditDialog
          category={editing}
          tree={categories.data ?? []}
          onOpenChange={(open) => !open && setEditing(null)}
          onRenamed={(from, to) =>
            setCategory((current) => followRenamedCategory(current, from, to))
          }
          onDeleted={(path) =>
            setCategory((current) => (startsWithPath(current, path) ? [] : current))
          }
        />

        <section aria-label="Páginas" className="space-y-3">
          {documents.data.length === 0 ? (
            onlyCategory ? (
              <EmptyState
                icon={LibraryIcon}
                title="Esta categoria está vazia"
                description="Ainda não há páginas aqui. Escolha esta categoria ao adicionar ou editar uma página para guardá-la nela."
                action={
                  <Button variant="secondary" onClick={() => setCategory([])}>
                    Ver todas as categorias
                  </Button>
                }
              />
            ) : hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="Nenhum resultado encontrado"
                description="Tente outros termos ou remova alguns filtros."
                action={
                  <Button variant="secondary" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={LibraryIcon}
                title="A biblioteca está vazia"
                description={`Adicione resumos e transcrições ${InboxStrings.from} ou escreva uma página.`}
                action={
                  <Link
                    to="/library/inbox"
                    className={buttonVariants({ variant: "secondary" })}
                  >
                    <Inbox /> {InboxStrings.goTo}
                  </Link>
                }
              />
            )
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {documents.data.length} página(s)
              </p>

              <div
                className={
                  view === "grid"
                    ? "grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-x-8 gap-y-12"
                    : view === "list"
                      ? "space-y-1.5"
                      : "space-y-3"
                }
              >
                {shown.map((document, index) => (
                  <DraggableItem
                    key={document.id}
                    id={document.id}
                    index={index}
                    draggingId={draggingId}
                    onDragStart={setDraggingId}
                    dropTarget={overId === document.id}
                    onHover={setOverId}
                    onDrop={() => finishDrag(document.id)}
                    onDragEnd={() => finishDrag(null)}
                  >
                    <DocumentCard document={document} variant={view} />
                  </DraggableItem>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
