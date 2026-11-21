import { useState } from "react";

import type { UseMutationResult } from "@tanstack/react-query";

import type { BatchResult } from "../api/create";
import { buildDocumentHints, type DocumentHints } from "../hints";
import { useLinksField } from "./useLinksField";

/**
 * O que os formulários de vídeo (resumo e transcrição) têm em comum: a lista de links, o título, a
 * categoria e as tags do documento, a trava depois de enviar (evita criar o mesmo job duas vezes) e o
 * envio em lote. Cada formulário só acrescenta os próprios campos em `submit(extra)`.
 */
export function useVideoJobForm<TParams extends { urls: string[] } & DocumentHints>(
  createJob: UseMutationResult<BatchResult, Error, TParams>,
  onCreated?: () => void,
) {
  const links = useLinksField();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  const isBatch = links.urls.length > 1;
  const locked = createJob.isPending || sent;

  const submit = (extra: Omit<TParams, keyof DocumentHints | "urls">) => {
    if (locked || !links.canSubmit) {
      return;
    }

    createJob.mutate(
      {
        urls: links.urls,
        ...extra,
        // Com vários links o título único não vale: cada documento usa o padrão.
        ...buildDocumentHints({ title: isBatch ? "" : title, category, tags }),
      } as TParams,
      {
        onSuccess: (result) => {
          if (links.applyResult(result)) {
            setSent(true);
            onCreated?.();
          }
        },
      },
    );
  };

  return {
    links,
    isBatch,
    locked,
    submit,
    /** Os campos do documento, prontos para `JobDocumentFields`. */
    documentFields: {
      title,
      onTitleChange: setTitle,
      category,
      onCategoryChange: setCategory,
      tags,
      onTagsChange: setTags,
      disabled: locked,
      isBatch,
    },
  };
}
