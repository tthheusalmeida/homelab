/**
 * Abre as Configurações sozinhas na primeira execução sem nenhuma chave de IA externa,
 * para o usuário novo chegar direto onde precisa configurar.
 */
export function needsInitialSetup(firstRun: boolean, hasAnyKey: boolean): boolean {
  return firstRun && !hasAnyKey;
}
