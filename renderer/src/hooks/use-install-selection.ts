import { useState } from 'react';

import { useSnackbar } from '#components/Snackbar';
import { useInstallComponents } from '#hooks/use-components';
import { ComponentStrings, idsToInstall, pendingBytes } from '#lib/components-text';
import type { ComponentsStatus } from '#shared/contracts/components';

/**
 * A escolha do que instalar (assistente e Configurações > Componentes): começa com o que `initial`
 * devolver, alterna itens, soma o que ainda falta baixar e inicia a instalação (erro no snackbar).
 */
export function useInstallSelection(
  status: ComponentsStatus | undefined,
  initial: (status: ComponentsStatus) => string[],
) {
  const install = useInstallComponents();
  const snackbar = useSnackbar();
  const [selected, setSelected] = useState<ReadonlySet<string> | null>(null);

  if (status && selected === null) {
    setSelected(new Set(initial(status)));
  }

  const chosen = selected ?? new Set<string>();
  const bytes = status ? pendingBytes(status.components, chosen) : 0;
  const fail = (error: Error) => snackbar.error(error.message || ComponentStrings.installFailed);

  const toggle = (id: string) => {
    const next = new Set(chosen);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    setSelected(next);
  };

  const start = () => {
    if (!status) {
      return;
    }

    install.mutate(
      idsToInstall(status.components, chosen).map((component) => component.id),
      { onError: fail },
    );
  };

  return { chosen, bytes, toggle, start, fail, isStarting: install.isPending };
}
