/**
 * Abre as Configurações sozinhas na primeira execução sem chave do Gemini,
 * para o usuário novo chegar direto onde precisa configurar.
 */
export function needsInitialSetup(firstRun: boolean, hasGeminiKey: boolean): boolean {
  return firstRun && !hasGeminiKey;
}
