import type { ReactNode } from 'react';

import type { UseQueryResult } from '@tanstack/react-query';

import { Button } from '#ui/button';
import { ErrorState } from '#components/ErrorState';
import { LoadingState } from '#components/LoadingState';

import type { ProviderTestResult } from '#shared/contracts/providers';

import { Strings } from '../strings';
import { TestResultSlot } from './TestResultMessage';

/** Carregando e erro das listas de provedores (externos e locais): mostra `children` só com os dados. */
export function ProvidersGate<T>({
  query,
  children,
}: {
  query: UseQueryResult<T, Error>;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) {
    return <LoadingState message={Strings.loading} />;
  }

  if (query.isError) {
    return (
      <ErrorState
        primaryMessage={Strings.loadError}
        secondaryMessage={query.error.message}
        action={() => void query.refetch()}
      />
    );
  }

  return <>{children(query.data)}</>;
}

/** Os cartões de provedor de um grupo, em coluna. */
export function ProviderCardList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

/** Botões do rodapé do cartão: "Testar" e, quando o provedor é editável, "Salvar". */
export function ProviderActions({
  testing,
  testDisabled = false,
  onTest,
  saving,
  saveDisabled,
  onSave,
}: {
  testing: boolean;
  testDisabled?: boolean;
  onTest: () => void;
  saving: boolean;
  /** `undefined` = o provedor não é editável (só o teste). */
  saveDisabled?: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <Button variant="outline" className="min-w-24" disabled={testDisabled || testing} onClick={onTest}>
        {testing ? Strings.testing : Strings.test}
      </Button>

      {saveDisabled !== undefined && (
        <Button disabled={saveDisabled || saving} onClick={onSave}>
          {saving ? Strings.saving : Strings.save}
        </Button>
      )}
    </>
  );
}

/** Resultado do teste e erro ao salvar, no fim do cartão. Recebe só os dados, não as mutações. */
export function ProviderFeedback({
  testResult,
  saveError,
}: {
  testResult: ProviderTestResult | null;
  saveError?: string;
}) {
  return (
    <>
      <TestResultSlot result={testResult} />

      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      )}
    </>
  );
}

/** O resultado do teste de uma mutação: o dado, ou o erro com a mesma forma. */
export function testResultOf(test: {
  data?: ProviderTestResult;
  isError: boolean;
  error: Error | null;
}): ProviderTestResult | null {
  return test.data ?? (test.isError ? { ok: false, message: test.error?.message ?? '' } : null);
}
