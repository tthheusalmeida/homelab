import { useQuery } from "@tanstack/react-query";

import { getAiModels } from "../api/chat";

/**
 * Modelos do provedor. Os do Ollama mudam fora desta janela (o usuário instala um assistente nas
 * Configurações, que é outra janela), então a lista **sempre** é conferida de novo ao voltar o foco
 * para o chat: o assistente recém-instalado aparece sem reiniciar o app.
 */
export function useAiModels(providerId?: string) {
  return useQuery({
    queryKey: ["ai", "models", providerId],
    queryFn: () => getAiModels(providerId!),
    enabled: Boolean(providerId),
    // Só o Ollama muda por fora; sem a chave, vale o padrão do app (um `undefined` explícito o anularia).
    ...(providerId === "ollama" ? { staleTime: 0 } : {}),
  });
}
