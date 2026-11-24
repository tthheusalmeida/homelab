import type { AiModel, AiProvider, AiThinkingOption } from "../types/chat";

import { OptionSelect } from "#components/OptionSelect";

interface ChatSettingsProps {
  providers: AiProvider[];
  models: AiModel[];
  thinkingOptions: AiThinkingOption[];

  providerId?: string;
  modelId?: string;
  thinkingId?: string;

  onProviderChange: (value: string | null) => void;
  onModelChange: (value: string | null) => void;
  onThinkingChange: (value: string | null) => void;

  isLoadingProviders?: boolean;
  isLoadingModels?: boolean;
  isLoadingThinking?: boolean;
  /** Trava os três (ex.: enquanto o formulário envia). */
  disabled?: boolean;
}

/** Os três seletores da IA (provedor, modelo e raciocínio), do chat e dos formulários de resumo. */
export function ChatSettings({
  providers,
  models,
  thinkingOptions,
  providerId,
  modelId,
  thinkingId,
  onProviderChange,
  onModelChange,
  onThinkingChange,
  isLoadingProviders,
  isLoadingModels,
  isLoadingThinking,
  disabled,
}: ChatSettingsProps) {
  // Modelo sem opção de pensar não mostra o seletor (não há o que escolher).
  const showThinking = !modelId || isLoadingThinking || thinkingOptions.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <OptionSelect
        value={providerId}
        options={providers}
        placeholder="Provedor"
        label="Provedor"
        triggerWidth="w-32"
        contentWidth="w-32"
        disabled={isLoadingProviders || disabled}
        onValueChange={onProviderChange}
      />

      <OptionSelect
        value={modelId}
        options={models}
        placeholder="Modelo"
        label="Modelo"
        triggerWidth="w-40"
        contentWidth="w-md"
        disabled={!providerId || isLoadingModels || disabled}
        onValueChange={onModelChange}
      />

      {showThinking && (
        <OptionSelect
          value={thinkingId}
          options={thinkingOptions}
          placeholder="Pensar"
          label="Pensar"
          triggerWidth="w-32"
          contentWidth="w-40"
          disabled={!modelId || isLoadingThinking || disabled}
          onValueChange={onThinkingChange}
        />
      )}
    </div>
  );
}
