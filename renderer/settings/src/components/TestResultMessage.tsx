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
