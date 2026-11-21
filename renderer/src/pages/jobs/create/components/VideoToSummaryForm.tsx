import { useState } from "react";

import { DialogForm } from "#ui/dialog";

import { ChatSettings } from "../../../ai/chat/components/ChatSettings";
import { useAiSelection } from "../../../ai/chat/hooks/useAiSelection";
import {
  DEFAULT_SUMMARY_DETAIL,
  isSummaryDetail,
  summaryDetailOptions,
  type SummaryDetail,
} from "../summary-detail";
import { useCreateVideoToSummary } from "../hooks/useCreateVideoToSummary";
import { useVideoJobForm } from "../hooks/useVideoJobForm";
import { JobDocumentFields } from "./JobDocumentFields";
import { VideoJobFooter } from "./VideoJobFooter";
import { VideoUrlField } from "./VideoUrlField";
import { OptionSelect } from "#components/OptionSelect";

interface VideoToSummaryFormProps {
  /** Chamado quando o job foi criado (a janela usa para fechar e limpar o formulário). */
  onCreated?: () => void;
}

export function VideoToSummaryForm({ onCreated }: VideoToSummaryFormProps) {
  const ai = useAiSelection();
  const [detail, setDetail] = useState<SummaryDetail>(DEFAULT_SUMMARY_DETAIL);

  const createJob = useCreateVideoToSummary();
  const form = useVideoJobForm(createJob, onCreated);
  const { links, locked } = form;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ai.providerId || !ai.modelId || !ai.thinkingId) {
      return;
    }

    form.submit({
      providerId: ai.providerId,
      modelId: ai.modelId,
      thinking: ai.thinkingId,
      detail,
    });
  };

  return (
    <DialogForm onSubmit={handleSubmit}>
      <VideoUrlField field={links} disabled={locked} />

      <ChatSettings {...ai} disabled={locked} />

      <div className="space-y-2">
        <OptionSelect
          value={detail}
          options={summaryDetailOptions}
          placeholder="Nível de detalhe"
          label="Nível de detalhe"
          triggerWidth="w-48"
          contentWidth="w-52"
          disabled={locked}
          onValueChange={(value) =>
            setDetail(isSummaryDetail(value) ? value : DEFAULT_SUMMARY_DETAIL)
          }
        />

        <p className="text-sm text-muted-foreground">
          {
            summaryDetailOptions.find((option) => option.id === detail)
              ?.description
          }
        </p>
      </div>

      <JobDocumentFields
        idPrefix="summary"
        defaultTitle="Resumo de vídeo"
        {...form.documentFields}
      />

      <VideoJobFooter
        linkCount={links.urls.length}
        canSubmit={links.canSubmit && !!ai.providerId && !!ai.modelId && !!ai.thinkingId && !locked}
        isPending={createJob.isPending}
        isError={createJob.isError}
      />
    </DialogForm>
  );
}
