import { useState } from "react";

import { DialogForm } from "#ui/dialog";

import { useAiModels } from "../../../ai/chat/hooks/useAiModels";
import { useAiProviders } from "../../../ai/chat/hooks/useAiProviders";
import { useAiThinking } from "../../../ai/chat/hooks/useAiThinking";
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
  const [providerId, setProviderId] = useState<string>();
  const [modelId, setModelId] = useState<string>();
  const [thinkingId, setThinkingId] = useState<string>();
  const [detail, setDetail] = useState<SummaryDetail>(DEFAULT_SUMMARY_DETAIL);

  const { data: providers = [], isLoading: isLoadingProviders } =
    useAiProviders();

  const { data: models = [], isLoading: isLoadingModels } =
    useAiModels(providerId);

  const { data: thinkingOptions = [], isLoading: isLoadingThinking } =
    useAiThinking({
      providerId,
      modelId,
    });

  const createJob = useCreateVideoToSummary();
  const form = useVideoJobForm(createJob, onCreated);
  const { links, locked } = form;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!providerId || !modelId || !thinkingId) {
      return;
    }

    form.submit({ providerId, modelId, thinking: thinkingId, detail });
  };

  const handleProviderChange = (value: string | null) => {
    setProviderId(value ?? undefined);
    setModelId(undefined);
    setThinkingId(undefined);
  };

  const handleModelChange = (value: string | null) => {
    setModelId(value ?? undefined);
    setThinkingId(undefined);
  };

  const handleThinkingChange = (value: string | null) => {
    setThinkingId(value ?? undefined);
  };

  return (
    <DialogForm onSubmit={handleSubmit}>
      <VideoUrlField field={links} disabled={locked} />

      <div className="flex items-center gap-2">
        <OptionSelect
          value={providerId}
          options={providers}
          placeholder="Provedor"
          label="Provedor"
          triggerWidth="w-32"
          contentWidth="w-32"
          disabled={isLoadingProviders || locked}
          onValueChange={handleProviderChange}
        />

        <OptionSelect
          value={modelId}
          options={models}
          placeholder="Modelo"
          label="Modelo"
          triggerWidth="w-40"
          contentWidth="w-md"
          disabled={!providerId || isLoadingModels || locked}
          onValueChange={handleModelChange}
        />

        <OptionSelect
          value={thinkingId}
          options={thinkingOptions}
          placeholder="Thinking"
          label="Thinking"
          triggerWidth="w-32"
          contentWidth="w-40"
          disabled={!modelId || isLoadingThinking || locked}
          onValueChange={handleThinkingChange}
        />
      </div>

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
        canSubmit={links.canSubmit && !!providerId && !!modelId && !!thinkingId && !locked}
        isPending={createJob.isPending}
        isError={createJob.isError}
      />
    </DialogForm>
  );
}
