import { useState } from "react";

import { DialogFooter, DialogForm } from "#ui/dialog";

import { DocumentFields } from "#components/DocumentFields";
import { MarkdownEditor } from "#components/MarkdownEditor";

import { useCategories, useUpdateDocument } from "../hooks/useLibrary";
import type { DocumentDetail } from "../types/library.types";

import { DocumentPreview } from "./DocumentPreview";
import { useSnackbar } from "#components/Snackbar";
import { FormButtons } from "#components/FormButtons";
import { useErrorAlert } from "#hooks/use-error-alert";

interface EditDocumentFormProps {
  document: DocumentDetail;
  /** Chamado ao salvar com sucesso ou ao cancelar. */
  onClose: () => void;
  /** Dentro da janela de edição: botões fixos no rodapé e só o miolo rola. */
  dialog?: boolean;
}

/**
 * Formulário de edição de um documento publicado (título, categoria, tags e
 * texto com prévia ao lado). Usado na página de edição e na janela de edição.
 */
export function EditDocumentForm({ document, onClose, dialog = false }: EditDocumentFormProps) {
  const Wrapper = dialog ? DialogForm : "form";
  const Actions = dialog ? DialogFooter : "div";
  const { meta } = document;

  const [title, setTitle] = useState(meta.title);
  const [category, setCategory] = useState(meta.category);
  const [tags, setTags] = useState(meta.tags);
  const [content, setContent] = useState(document.content);

  const categories = useCategories();
  const update = useUpdateDocument();
  const snackbar = useSnackbar();
  useErrorAlert(update.isError && "Não foi possível salvar as alterações. Verifique a categoria e tente novamente.");

  const hasChanges =
    title.trim() !== meta.title ||
    content !== document.content ||
    JSON.stringify(category) !== JSON.stringify(meta.category) ||
    JSON.stringify(tags) !== JSON.stringify(meta.tags);

  const canSave =
    hasChanges &&
    title.trim() !== "" &&
    category.length > 0 &&
    content.trim() !== "" &&
    !update.isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    update.mutate(
      {
        id: meta.id,
        input: { title: title.trim(), category, tags, content },
      },
      {
        onSuccess: () => {
          snackbar.success("Página salva");
          onClose();
        },
      },
    );
  }

  return (
    <Wrapper onSubmit={handleSubmit} className={dialog ? undefined : "space-y-6"}>
      <DocumentFields
        idPrefix="edit"
        title={title}
        onTitleChange={setTitle}
        category={category}
        onCategoryChange={setCategory}
        categoryOptions={categories.data ?? []}
        tags={tags}
        onTagsChange={setTags}
        disabled={update.isPending}
      />

      <MarkdownEditor
        value={content}
        onChange={setContent}
        splitPreview
        disabled={update.isPending}
      />

      <DocumentPreview
        title={title}
        category={category}
        tags={tags}
        excerpt={content.replace(/[#*>`|-]/g, "")}
      />

      <Actions className={dialog ? undefined : "flex justify-end gap-2"}>
        <FormButtons
          onCancel={onClose}
          pending={update.isPending}
          canSubmit={canSave}
        >
          Salvar alterações
        </FormButtons>
      </Actions>
    </Wrapper>
  );
}
