import { useState } from "react";

import { useAiModels } from "./useAiModels";
import { useAiProviders } from "./useAiProviders";
import { useAiThinking } from "./useAiThinking";

interface AiSelectionOptions {
  /** O que foi usado por último (o chat aberto): vale quando nada foi escolhido à mão. */
  last?: { providerId?: string; modelId?: string; thinking?: string };
  /** Sem escolha nem último uso, assume o primeiro da lista (o chat faz isso; os formulários exigem escolha). */
  pickFirst?: boolean;
}

/**
 * A escolha de provedor, modelo e raciocínio da IA, com as listas de cada um e a regra em cascata
 * (trocar o provedor limpa o modelo e o raciocínio; trocar o modelo limpa o raciocínio). Serve ao
 * chat e aos formulários de resumo: o que vale é o escolhido à mão, senão o último uso, senão (se
 * `pickFirst`) o primeiro da lista.
 */
export function useAiSelection({ last, pickFirst = false }: AiSelectionOptions = {}) {
  const [chosenProvider, setChosenProvider] = useState<string>();
  const [chosenModel, setChosenModel] = useState<string>();
  const [chosenThinking, setChosenThinking] = useState<string>();

  const providersQuery = useAiProviders();
  const providerId =
    chosenProvider ?? last?.providerId ?? (pickFirst ? providersQuery.data?.[0]?.id : undefined);

  const modelsQuery = useAiModels(providerId);
  const modelId =
    chosenModel ??
    (last && last.providerId === providerId ? last.modelId : undefined) ??
    (pickFirst ? modelsQuery.data?.[0]?.id : undefined);

  const thinkingQuery = useAiThinking({ providerId, modelId });
  const thinkingId =
    chosenThinking ??
    (last && last.modelId === modelId ? last.thinking : undefined) ??
    (pickFirst ? thinkingQuery.data?.[0]?.id : undefined);

  const models = modelsQuery.data ?? [];
  const thinkingOptions = thinkingQuery.data ?? [];

  // Modelo sem opção de pensar (ex.: Claude): não há o que escolher, então não bloqueia o envio.
  const thinkingReady =
    Boolean(modelId) &&
    !thinkingQuery.isLoading &&
    (thinkingOptions.length === 0 || Boolean(thinkingId));

  return {
    providerId,
    modelId,
    thinkingId,
    /** Pensar está resolvido: escolhido, ou o modelo não oferece a opção. */
    thinkingReady,
    providers: providersQuery.data ?? [],
    models,
    thinkingOptions,
    activeModel: models.find((model) => model.id === modelId),
    isLoadingProviders: providersQuery.isLoading,
    isLoadingModels: modelsQuery.isLoading,
    isLoadingThinking: thinkingQuery.isLoading,
    onProviderChange: (value: string | null) => {
      setChosenProvider(value ?? undefined);
      setChosenModel(undefined);
      setChosenThinking(undefined);
    },
    onModelChange: (value: string | null) => {
      setChosenModel(value ?? undefined);
      setChosenThinking(undefined);
    },
    onThinkingChange: (value: string | null) => setChosenThinking(value ?? undefined),
    /** Volta a nada escolhido à mão (nova conversa). */
    reset: () => {
      setChosenProvider(undefined);
      setChosenModel(undefined);
      setChosenThinking(undefined);
    },
  };
}
