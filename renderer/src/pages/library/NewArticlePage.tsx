import { useState } from "react";

import { useNavigate } from "react-router";
import { Button } from "#ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#ui/card";

import { DocumentFields } from "#components/DocumentFields";
import { MarkdownEditor } from "#components/MarkdownEditor";

import { countWords, formatReadingTime, minutesToRead } from "./books/stats";
import { DocumentPreview } from "./components/DocumentPreview";
import { useCategories, useCreateArticle } from "./hooks/useLibrary";
import { useSnackbar } from "#components/Snackbar";
import { PageHeader } from "#components/PageHeader";

export function NewArticlePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState("");

  const categories = useCategories();
  const createArticle = useCreateArticle();
  const snackbar = useSnackbar();

  const words = countWords(content);

  // O que ainda falta para poder salvar (mostrado ao lado do botão).
  const missing = [
    title.trim() === "" && "título",
    category.length === 0 && "categoria",
    content.trim() === "" && "texto",
  ].filter((item): item is string => item !== false);

  const canSave = missing.length === 0 && !createArticle.isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    createArticle.mutate(
      { title: title.trim(), category, tags, content },
      {
        onSuccess: ({ meta }) => {
          snackbar.created(`Página criada: ${meta.title}`);
          navigate(`/library/${meta.id}`);
        },
        onError: (error) => snackbar.error(error.message),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PageHeader
        title="Nova página"
        command="library --new"
        description="Escreva em Markdown (tabelas, links e imagens por URL funcionam) e acompanhe a prévia ao lado enquanto digita."
      />

      <section aria-label="Dados da página">
        <Card>
          <CardHeader>
            <CardTitle>1. Dados da página</CardTitle>

            <CardDescription>
              Onde ela fica guardada e como aparece na biblioteca.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <DocumentFields
                idPrefix="article"
                title={title}
                onTitleChange={setTitle}
                category={category}
                onCategoryChange={setCategory}
                categoryOptions={categories.data ?? []}
                tags={tags}
                onTagsChange={setTags}
                disabled={createArticle.isPending}
              />
            </div>

            <DocumentPreview
              title={title}
              category={category}
              tags={tags}
              excerpt={content.replace(/[#*>`|-]/g, "")}
            />
          </CardContent>
        </Card>
      </section>

      <section aria-label="Texto da página">
        <Card>
          <CardHeader>
            <CardTitle>2. Texto da página</CardTitle>

            <CardDescription>
              Escreva à esquerda e confira o resultado à direita enquanto
              digita.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <MarkdownEditor
              value={content}
              onChange={setContent}
              splitPreview
              disabled={createArticle.isPending}
            />

            <p className="text-xs text-muted-foreground">
              {words.toLocaleString("pt-BR")} palavra(s) · leitura estimada:{" "}
              {formatReadingTime(minutesToRead(words))}
            </p>
          </CardContent>
        </Card>
      </section>

      {createArticle.isError && (
        <p role="alert" className="animate-enter-fade text-sm text-destructive">
          Não foi possível salvar a página. Verifique a categoria e tente
          novamente.
        </p>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {missing.length > 0
            ? `Falta: ${missing.join(", ")}.`
            : "Tudo pronto para salvar."}
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={createArticle.isPending}
            onClick={() => navigate("/library")}
          >
            Cancelar
          </Button>

          <Button type="submit" disabled={!canSave} loading={createArticle.isPending}>
            Salvar página
          </Button>
        </div>
      </div>
    </form>
  );
}
