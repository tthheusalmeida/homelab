import { useEffect, useRef } from 'react';

import { useSnackbar, type SnackbarAction } from '#components/Snackbar';

/**
 * Padrão de erro do app: **alerta centralizado no rodapé** (`Snackbar`), nunca um parágrafo ou aviso
 * no meio do conteúdo (que empurra o resto da tela para baixo). Passe a mensagem quando houver erro
 * e `null`/`undefined`/`false` quando não houver; o alerta aparece quando a mensagem surge ou muda.
 * A ação opcional vira um botão dentro do alerta (ex.: "Tentar de novo").
 *
 * ```tsx
 * useErrorAlert(create.isError && (create.error.message || 'Não foi possível criar.'));
 * ```
 */
export function useErrorAlert(
  message: string | null | undefined | false,
  action?: SnackbarAction,
) {
  const { error } = useSnackbar();
  const latestAction = useRef(action);

  latestAction.current = action;

  useEffect(() => {
    if (message) {
      const retry = latestAction.current;

      if (retry) {
        error(message, retry);
      } else {
        error(message);
      }
    }
  }, [message, error]);
}
