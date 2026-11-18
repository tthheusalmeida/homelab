import { useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "#ui/button";
import { DialogFooter, DialogForm } from "#ui/dialog";

import { buildDocumentHints } from "../hints";
import { useCreateVideoToTranscript } from "../hooks/useCreateVideoToTranscript";
import { useLinksField } from "../hooks/useLinksField";
import { VideoUrlStrings } from "../video-url-text";
import { JobDocumentFields } from "./JobDocumentFields";
import { VideoUrlField } from "./VideoUrlField";

interface VideoToTranscriptFormProps {
  /** Chamado quando o job foi criado (a janela usa para fechar e limpar o formulário). */
  onCreated?: () => void;
}

export function VideoToTranscriptForm({
  onCreated,
}: VideoToTranscriptFormProps) {
  const links = useLinksField();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const createJob = useCreateVideoToTranscript();
  const [sent, setSent] = useState(false);

  const isBatch = links.urls.length > 1;

  // Travado enquanto envia e depois de enviar: evita criar o mesmo job duas vezes.
  const locked = createJob.isPending || sent;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (locked || !links.canSubmit) {
      return;
    }

    createJob.mutate(
      {
        urls: links.urls,
        // Com vários links o título único não vale: cada documento usa o padrão.
        ...buildDocumentHints({
          title: isBatch ? "" : title,
          category,
          tags,
        }),
      },
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

  return (
    <DialogForm onSubmit={handleSubmit}>
      <VideoUrlField field={links} disabled={locked} />

      <JobDocumentFields
        idPrefix="transcript"
        defaultTitle="Transcrição de vídeo"
        title={title}
        onTitleChange={setTitle}
        category={category}
        onCategoryChange={setCategory}
        tags={tags}
        onTagsChange={setTags}
        disabled={locked}
        isBatch={isBatch}
      />

      {createJob.isError && (
        <p className="text-sm text-destructive">
          Não foi possível criar o job. Tente novamente.
        </p>
      )}

      <DialogFooter>
        <Button type="submit" disabled={!links.canSubmit || locked}>
          {createJob.isPending && <Loader2 className="animate-spin" />}
          {VideoUrlStrings.submit(links.urls.length)}
        </Button>
      </DialogFooter>
    </DialogForm>
  );
}
