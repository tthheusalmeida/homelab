import { useState, type CSSProperties } from "react";

import { Link, useLocation } from "react-router";
import { Inbox, SearchX, Library as LibraryIcon } from "lucide-react";

import { InboxStrings } from "#lib/inbox-text";
import { Button, buttonVariants } from "#ui/button";
import { Card, CardContent } from "#ui/card";

import { EmptyState } from "#components/EmptyState";
import { ErrorState } from "#components/ErrorState";
import { LoadingState } from "#components/LoadingState";
import { OptionSelect } from "#components/OptionSelect";
import { SearchInput } from "#components/SearchInput";
import { useDebouncedValue } from "#hooks/use-debounced-value";
import { useStoredState } from "#hooks/use-stored-state";

import { CategoryTree } from "./components/CategoryTree";
import { DocumentCard } from "./components/DocumentCard";
import { TagFilter } from "./components/TagFilter";
import { ViewToggle, viewModes, type ViewMode } from "./components/ViewToggle";
import { useCategories, useDocuments, useTags } from "./hooks/useLibrary";
import {
  contentFilterLabels,
  contentFilterToHas,
  documentSourceLabels,
  documentTypeLabels,
  sortLabels,
  type ContentFilter,
  type DocumentSource,
  type DocumentType,
  type SortOption,
} from "./types/library.types";
import { PageHeader } from "#components/PageHeader";

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
  const [view, setView] = useStoredState<ViewMode>(
    "library:view",
    "grid",
    viewModes,
  );

  const q = useDebouncedValue(search);

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
  const tagList = useTags();

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
      <div className="flex min-h-[80dvh] items-center justify-center">
        <LoadingState message="Carregando" />
      </div>
    );
  }

  if (documents.isError || !documents.data) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <ErrorState
            primaryMessage="Oops! houve uma falha ao carregar a biblioteca."
            secondaryMessage="Tente novamente mais tarde."
            action={() => void documents.refetch()}
          />
        </CardContent>
      </Card>
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
            onValueChange={(value) => setSort((value as SortOption) ?? "title")}
          />

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
          />
        </aside>

        <section aria-label="Páginas" className="space-y-3">
          {documents.data.length === 0 ? (
            hasFilters ? (
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
                {documents.data.map((document, index) => (
                  <div
                    key={document.id}
                    className="animate-enter [&>*]:h-full"
                    style={{ "--i": index } as CSSProperties}
                  >
                    <DocumentCard document={document} variant={view} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
