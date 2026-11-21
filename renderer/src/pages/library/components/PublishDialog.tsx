import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "#ui/dialog";

import { DocumentFields } from "#components/DocumentFields";

import { useCategories, usePublishDocument } from "../hooks/useLibrary";
import { DocumentPreview } from "./DocumentPreview";
import { SuggestionPanel } from "./SuggestionPanel";
import type { DocumentSummary } from "../types/library.types";
import { useSnackbar } from "#components/Snackbar";
import { FormButtons } from "#components/FormButtons";
import { useErrorAlert } from "#hooks/use-error-alert";

interface PublishDialogProps {
  /** Documento a adicionar; `null` mantém o diálogo fechado. */
  document: DocumentSummary | null;
  onOpenChange: (open: boolean) => void;
}

export function PublishDialog({ document, onOpenChange }: PublishDialogProps) {
  return (
    <Dialog open={document !== null} onOpenChange={onOpenChange}>
      <DialogContent bare className="sm:max-w-xl">
        {document && (
          <PublishForm
            key={document.id}
            document={document}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PublishFormProps {
  document: DocumentSummary;
  onDone: () => void;
}

function PublishForm({ document, onDone }: PublishFormProps) {
  const [title, setTitle] = useState(document.title);
  const [category, setCategory] = useState(document.category);
  const [tags, setTags] = useState(document.tags);

  const categories = useCategories();
  const publish = usePublishDocument();
  const snackbar = useSnackbar();
  useErrorAlert(publish.isError && "Não foi possível adicionar. Verifique a categoria e tente novamente.");

  const isReadd = document.status === "archived";
  const canSubmit =
    title.trim() !== "" && category.length > 0 && !publish.isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    publish.mutate(
      { id: document.id, input: { title: title.trim(), category, tags } },
      {
        onSuccess: () => {
          snackbar.success(isReadd ? "Página readicionada à biblioteca" : "Página adicionada à biblioteca");
          onDone();
        },
      },
    );
  }

  return (
    <DialogForm onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>
          {isReadd ? "Readicionar à biblioteca" : "Adicionar à biblioteca"}
        </DialogTitle>

        <DialogDescription>
          Escolha a pasta (categoria, até 4 níveis) e as tags. Abaixo você vê
          como a página vai aparecer.
        </DialogDescription>
      </DialogHeader>

        <SuggestionPanel
          documentId={document.id}
          disabled={publish.isPending}
          onSuggestion={(suggestion) => {
            setTitle(suggestion.title);
            setCategory(suggestion.category);
            setTags(suggestion.tags);
          }}
        />

        <DocumentFields
          idPrefix="publish"
          title={title}
          onTitleChange={setTitle}
          category={category}
          onCategoryChange={setCategory}
          categoryOptions={categories.data ?? []}
          tags={tags}
          onTagsChange={setTags}
          disabled={publish.isPending}
        />

        <DocumentPreview
          title={title}
          category={category}
          tags={tags}
          excerpt={document.preview}
        />

      <DialogFooter>
        <FormButtons
          onCancel={onDone}
          pending={publish.isPending}
          canSubmit={canSubmit}
        >
          {isReadd ? "Readicionar" : "Adicionar"}
        </FormButtons>
      </DialogFooter>
    </DialogForm>
  );
}
