import { CircleCheck, CircleX } from 'lucide-react';

import type { ProviderTestResult } from '#shared/contracts/providers';

/** Resultado de um teste de conexão: verde quando ok, vermelho quando falha. */
export function TestResultMessage({ result }: { result: ProviderTestResult }) {
  const Icon = result.ok ? CircleCheck : CircleX;

  return (
    <p
      role="status"
      className={`flex items-start gap-2 text-sm ${result.ok ? 'text-emerald-500' : 'text-destructive'}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 break-words">{result.message}</span>
    </p>
  );
}

/**
 * Espaço reservado para o resultado de um teste: ocupa a altura de uma linha mesmo vazio, então o
 * resultado aparecer não empurra os botões do card para baixo.
 */
export function TestResultSlot({ result }: { result: ProviderTestResult | null }) {
  return <div className="min-h-5">{result && <TestResultMessage result={result} />}</div>;
}
