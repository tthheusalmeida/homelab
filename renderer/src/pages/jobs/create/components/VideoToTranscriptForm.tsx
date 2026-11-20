import { DialogForm } from "#ui/dialog";

import { useCreateVideoToTranscript } from "../hooks/useCreateVideoToTranscript";
import { useVideoJobForm } from "../hooks/useVideoJobForm";
import { JobDocumentFields } from "./JobDocumentFields";
import { VideoJobFooter } from "./VideoJobFooter";
import { VideoUrlField } from "./VideoUrlField";

interface VideoToTranscriptFormProps {
  /** Chamado quando o job foi criado (a janela usa para fechar e limpar o formulário). */
  onCreated?: () => void;
}

export function VideoToTranscriptForm({
  onCreated,
}: VideoToTranscriptFormProps) {
  const createJob = useCreateVideoToTranscript();
  const form = useVideoJobForm(createJob, onCreated);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.submit({});
  };

  return (
    <DialogForm onSubmit={handleSubmit}>
      <VideoUrlField field={form.links} disabled={form.locked} />

      <JobDocumentFields
        idPrefix="transcript"
        defaultTitle="Transcrição de vídeo"
        {...form.documentFields}
      />

      <VideoJobFooter
        linkCount={form.links.urls.length}
        canSubmit={form.links.canSubmit && !form.locked}
        isPending={createJob.isPending}
        isError={createJob.isError}
      />
    </DialogForm>
  );
}
